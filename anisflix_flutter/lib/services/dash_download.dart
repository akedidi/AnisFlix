import 'dart:io';

import 'package:xml/xml.dart';

import 'download_transport.dart';

class DashDownloader {
  final DownloadTransport transport;
  final Directory directory;
  final void Function(int total) onPlanned;
  final void Function() onSegment;
  int serial = 0;
  DashDownloader({
    required this.transport,
    required this.directory,
    required this.onPlanned,
    required this.onSegment,
  });
  Future<String> download(Uri uri) async {
    final document = XmlDocument.parse(await transport.text(uri));
    final root = document.rootElement;
    if (root.name.local != 'MPD' || root.getAttribute('type') == 'dynamic') {
      throw StateError(
        'Seuls les fichiers DASH à la demande sont téléchargeables.',
      );
    }
    if (root.descendants.whereType<XmlElement>().any(
      (e) => e.name.local == 'ContentProtection',
    )) {
      throw StateError(
        'Cette source DASH protégée ne peut pas être téléchargée.',
      );
    }
    final localRoot = element(root);
    final rootBase = base(uri, root);
    final totalDuration = duration(
      root.getAttribute('mediaPresentationDuration'),
    );
    final periods = children(root, 'Period');
    if (periods.isEmpty) {
      throw StateError('Le fichier DASH ne contient aucune piste.');
    }
    var elapsed = 0.0;
    for (var periodIndex = 0; periodIndex < periods.length; periodIndex++) {
      final period = periods[periodIndex];
      final start = duration(period.getAttribute('start')) ?? elapsed;
      final nextStart = periodIndex + 1 < periods.length
          ? duration(periods[periodIndex + 1].getAttribute('start'))
          : null;
      final periodDuration =
          duration(period.getAttribute('duration')) ??
          (nextStart != null
              ? nextStart - start
              : totalDuration == null
              ? null
              : totalDuration - start);
      final localPeriod = element(period);
      localRoot.children.add(localPeriod);
      final periodBase = base(rootBase, period);
      final adaptations = children(period, 'AdaptationSet');
      var audioChosen = false, videoChosen = false;
      for (final adaptation in adaptations) {
        final representations = children(adaptation, 'Representation');
        if (representations.isEmpty) continue;
        final kind =
            adaptation.getAttribute('contentType') ??
            adaptation.getAttribute('mimeType')?.split('/').first ??
            representations.first.getAttribute('mimeType')?.split('/').first;
        if (kind != 'audio' && kind != 'video') continue;
        if ((kind == 'audio' && audioChosen) ||
            (kind == 'video' && videoChosen)) {
          continue;
        }
        if (kind == 'audio') {
          audioChosen = true;
        } else {
          videoChosen = true;
        }
        representations.sort(
          (a, b) => (int.tryParse(b.getAttribute('bandwidth') ?? '0') ?? 0)
              .compareTo(int.tryParse(a.getAttribute('bandwidth') ?? '0') ?? 0),
        );
        final representation = representations.first;
        final representationBase = base(
          base(periodBase, adaptation),
          representation,
        );
        final localAdaptation = element(adaptation),
            localRepresentation = element(representation);
        for (final child in adaptation.childElements.where(
          (e) => [
            'Role',
            'Accessibility',
            'AudioChannelConfiguration',
            'EssentialProperty',
            'SupplementalProperty',
          ].contains(e.name.local),
        )) {
          localAdaptation.children.add(child.copy());
        }
        for (final child in representation.childElements.where(
          (e) => [
            'AudioChannelConfiguration',
            'EssentialProperty',
            'SupplementalProperty',
          ].contains(e.name.local),
        )) {
          localRepresentation.children.add(child.copy());
        }
        final hierarchy = [root, period, adaptation, representation];
        XmlElement? segmentList;
        for (final node in hierarchy) {
          segmentList = first(node, 'SegmentList') ?? segmentList;
        }
        if (segmentList != null) {
          await convertList(
            segmentList,
            localRepresentation,
            representationBase,
          );
        } else {
          final templates = hierarchy
              .map((e) => first(e, 'SegmentTemplate'))
              .whereType<XmlElement>()
              .toList();
          if (templates.isEmpty) {
            throw StateError(
              'Ce format de segmentation DASH n’est pas pris en charge.',
            );
          }
          final attrs = <String, String>{};
          XmlElement? timeline;
          for (final template in templates) {
            for (final a in template.attributes) {
              attrs[a.name.local] = a.value;
            }
            timeline = first(template, 'SegmentTimeline') ?? timeline;
          }
          await convertTemplate(
            attrs,
            timeline,
            representation,
            localRepresentation,
            representationBase,
            periodDuration,
          );
        }
        localAdaptation.children.add(localRepresentation);
        localPeriod.children.add(localAdaptation);
      }
      if (!videoChosen && !audioChosen) {
        throw StateError('Aucune piste DASH compatible.');
      }
      if (periodDuration != null) elapsed = start + periodDuration;
    }
    await File('${directory.path}/index.mpd')
        .writeAsString(XmlDocument([localRoot]).toXmlString(pretty: true));
    return 'index.mpd';
  }

  Future<void> convertList(
    XmlElement original,
    XmlElement output,
    Uri uri,
  ) async {
    final list = element(original);
    final initialization = first(original, 'Initialization');
    if (initialization != null) {
      final source = initialization.getAttribute('sourceURL');
      final local = await resource(
        source == null ? uri : uri.resolve(source),
        range: parseRange(initialization.getAttribute('range')),
      );
      list.children.add(
        XmlElement(XmlName.parts('Initialization'), [
          XmlAttribute(XmlName.parts('sourceURL'), local),
        ]),
      );
    }
    final timeline = first(original, 'SegmentTimeline');
    if (timeline != null) list.children.add(timeline.copy());
    final segments = children(original, 'SegmentURL');
    if (segments.isEmpty || segments.length > 20000) {
      throw StateError('Liste de segments DASH invalide.');
    }
    onPlanned(segments.length);
    for (final segment in segments) {
      final source = segment.getAttribute('media');
      if (source == null) throw StateError('Segment DASH sans adresse.');
      final local = await resource(
        uri.resolve(source),
        range: parseRange(segment.getAttribute('mediaRange')),
      );
      list.children.add(
        XmlElement(XmlName.parts('SegmentURL'), [
          XmlAttribute(XmlName.parts('media'), local),
        ]),
      );
      onSegment();
    }
    output.children.add(list);
  }

  Future<void> convertTemplate(
    Map<String, String> attrs,
    XmlElement? timeline,
    XmlElement original,
    XmlElement output,
    Uri uri,
    double? seconds,
  ) async {
    final media = attrs['media'];
    if (media == null) throw StateError('Modèle DASH sans adresse de segment.');
    final timescale = int.tryParse(attrs['timescale'] ?? '1') ?? 0;
    final firstNumber = int.tryParse(attrs['startNumber'] ?? '1') ?? 1;
    final offset = int.tryParse(attrs['presentationTimeOffset'] ?? '0') ?? 0;
    if (timescale <= 0) throw StateError('Échelle de temps DASH invalide.');
    final segments = <({int number, int time})>[];
    if (timeline != null) {
      final entries = children(timeline, 'S');
      var time = 0, number = firstNumber;
      for (var index = 0; index < entries.length; index++) {
        final entry = entries[index],
            d = int.tryParse(entries[index].getAttribute('d') ?? '0') ?? 0;
        if (d <= 0) throw StateError('Durée de segment DASH invalide.');
        time = int.tryParse(entry.getAttribute('t') ?? '') ?? time;
        var repeat = int.tryParse(entry.getAttribute('r') ?? '0') ?? 0;
        if (repeat < 0) {
          final next = index + 1 < entries.length
              ? int.tryParse(entries[index + 1].getAttribute('t') ?? '')
              : null;
          final end =
              next ??
              (seconds == null ? null : (seconds * timescale).ceil() + offset);
          if (end == null || end <= time) {
            throw StateError('Chronologie DASH sans borne.');
          }
          repeat = ((end - time) / d).ceil() - 1;
        }
        if (repeat > 20000 || segments.length + repeat + 1 > 20000) {
          throw StateError('La vidéo contient trop de segments.');
        }
        for (var n = 0; n <= repeat; n++) {
          segments.add((number: number++, time: time));
          time += d;
        }
      }
    } else {
      final d = int.tryParse(attrs['duration'] ?? '0') ?? 0;
      if (d <= 0 || seconds == null || seconds <= 0) {
        throw StateError('Durée DASH manquante.');
      }
      final count = (seconds * timescale / d).ceil();
      if (count > 20000) {
        throw StateError('La vidéo contient trop de segments.');
      }
      for (var n = 0; n < count; n++) {
        segments.add((number: firstNumber + n, time: n * d));
      }
    }
    if (segments.isEmpty) throw StateError('La vidéo DASH est vide.');
    final list = XmlElement(XmlName.parts('SegmentList'), [
      for (final key in ['timescale', 'duration', 'presentationTimeOffset'])
        if (attrs[key] != null) XmlAttribute(XmlName.parts(key), attrs[key]!),
    ]);
    if (attrs['initialization'] != null) {
      final local = await resource(
        uri.resolve(expand(attrs['initialization']!, original, firstNumber, 0)),
      );
      list.children.add(
        XmlElement(XmlName.parts('Initialization'), [
          XmlAttribute(XmlName.parts('sourceURL'), local),
        ]),
      );
    }
    if (timeline != null) list.children.add(timeline.copy());
    onPlanned(segments.length);
    for (final segment in segments) {
      final local = await resource(
        uri.resolve(expand(media, original, segment.number, segment.time)),
      );
      list.children.add(
        XmlElement(XmlName.parts('SegmentURL'), [
          XmlAttribute(XmlName.parts('media'), local),
        ]),
      );
      onSegment();
    }
    output.children.add(list);
  }

  static String expand(
    String template,
    XmlElement representation,
    int number,
    int time,
  ) {
    final marker = '\u0001';
    final value = template.replaceAll(r'$$', marker).replaceAllMapped(
      RegExp(r'\$(RepresentationID|Bandwidth|Number|Time)(?:%0(\d+)d)?\$'),
      (match) {
        final raw = switch (match.group(1)) {
          'RepresentationID' => representation.getAttribute('id') ?? '',
          'Bandwidth' => representation.getAttribute('bandwidth') ?? '',
          'Time' => '$time',
          _ => '$number',
        };
        return match.group(2) == null
            ? raw
            : raw.padLeft(
                (int.tryParse(match.group(2)!) ?? 0).clamp(0, 32),
                '0',
              );
      },
    );
    if (value.contains(r'$')) {
      throw StateError('Modèle DASH non pris en charge.');
    }
    return value.replaceAll(marker, r'$');
  }

  Future<String> resource(Uri uri, {ByteRange? range}) async {
    final filename = 'dash-${serial++}.m4s';
    await transport.file(
      uri,
      File('${directory.path}/$filename'),
      range: range,
    );
    return filename;
  }

  static ByteRange? parseRange(String? text) {
    if (text == null) return null;
    final values = text.split('-');
    final start = int.tryParse(values.first),
        end = values.length == 2 ? int.tryParse(values.last) : null;
    if (start == null || end == null || start < 0 || end < start) {
      throw StateError('Plage DASH invalide.');
    }
    return ByteRange(start, end - start + 1);
  }

  static List<XmlElement> children(XmlElement node, String name) =>
      node.childElements.where((e) => e.name.local == name).toList();
  static XmlElement? first(XmlElement node, String name) {
    final rows = children(node, name);
    return rows.isEmpty ? null : rows.first;
  }

  static Uri base(Uri uri, XmlElement node) {
    final value = first(node, 'BaseURL')?.innerText.trim();
    return value == null ? uri : uri.resolve(value);
  }

  static XmlElement element(XmlElement node) =>
      XmlElement(node.name, node.attributes.map((a) => a.copy()).toList());
  static double? duration(String? text) {
    if (text == null) return null;
    final m = RegExp(
      r'^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$',
    ).firstMatch(text);
    if (m == null) return null;
    return (double.tryParse(m.group(1) ?? '0') ?? 0) * 86400 +
        (double.tryParse(m.group(2) ?? '0') ?? 0) * 3600 +
        (double.tryParse(m.group(3) ?? '0') ?? 0) * 60 +
        (double.tryParse(m.group(4) ?? '0') ?? 0);
  }
}
