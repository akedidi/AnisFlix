import 'dart:async';

import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';

import '../l10n/app_localizations.dart';
import '../models/media.dart';
import '../services/subtitle_languages.dart';
import 'subtitle_size_control.dart';
import 'player_settings_sheet.dart';

class SubtitleSettingsDialog extends StatefulWidget {
  final Player player;
  final bool releaseStyle;
  final List<SourceSubtitle> externalTracks;
  final Future<List<SourceSubtitle>> Function()? loadOpenSubtitles;
  final int delayMilliseconds;
  final double fontSize;
  final Future<void> Function(int) onDelayChanged;
  final Future<void> Function(double) onFontSizeChanged;

  const SubtitleSettingsDialog({
    super.key,
    required this.player,
    this.releaseStyle = false,
    required this.externalTracks,
    this.loadOpenSubtitles,
    required this.delayMilliseconds,
    required this.fontSize,
    required this.onDelayChanged,
    required this.onFontSizeChanged,
  });

  @override
  State<SubtitleSettingsDialog> createState() => _SubtitleSettingsDialogState();
}

class _SubtitleSettingsDialogState extends State<SubtitleSettingsDialog> {
  late int delay = widget.delayMilliseconds;
  late double fontSize = widget.fontSize;
  final input = TextEditingController();
  bool inputInitialized = false;
  String? error;
  bool busy = false;
  List<SourceSubtitle> openSubtitles = [];
  bool loadingSubtitles = false;
  bool subtitleSearchFailed = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!inputInitialized) {
      input.text = formatDelay(delay);
      inputInitialized = true;
    }
  }

  @override
  void initState() {
    super.initState();
    if (widget.loadOpenSubtitles != null) unawaited(loadSubtitles());
  }

  Future<void> loadSubtitles() async {
    setState(() {
      loadingSubtitles = true;
      subtitleSearchFailed = false;
    });
    try {
      final tracks = await widget.loadOpenSubtitles!();
      if (mounted) setState(() => openSubtitles = tracks);
    } catch (_) {
      if (mounted) setState(() => subtitleSearchFailed = true);
    } finally {
      if (mounted) setState(() => loadingSubtitles = false);
    }
  }

  String formatDelay(int milliseconds) =>
      context.l10n.decimal(milliseconds / 1000, digits: 3);

  @override
  void dispose() {
    input.dispose();
    super.dispose();
  }

  Future<void> applyDelay([int increment = 0, bool reset = false]) async {
    final submittedText = input.text;
    final seconds = double.tryParse(input.text.trim().replaceAll(',', '.'));
    if (!reset &&
        (seconds == null || !seconds.isFinite || seconds.abs() > 600)) {
      setState(() => error = 'Indique un décalage entre −600 et 600 secondes.');
      return;
    }
    final value = reset
        ? 0
        : ((seconds! * 1000).round() + increment).clamp(-600000, 600000);
    await perform(() async {
      await widget.onDelayChanged(value);
      if (!mounted) return;
      setState(() {
        delay = value;
        if (reset || input.text == submittedText) {
          final formatted = formatDelay(delay);
          input.value = TextEditingValue(
            text: formatted,
            selection: TextSelection.collapsed(offset: formatted.length),
          );
        }
      });
    });
  }

  Future<void> perform(Future<void> Function() action) async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await action();
    } catch (_) {
      if (mounted) {
        setState(() => error = 'Impossible d’appliquer ce réglage. Réessaie.');
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Widget trackOption(SubtitleTrack track, String label) => widget.releaseStyle
      ? PlayerSettingOption(
          selected:
              widget.player.state.track.subtitle == track ||
              (track.id == 'no' &&
                  widget.player.state.track.subtitle.id == 'auto' &&
                  widget.player.state.tracks.subtitle.every(
                    (available) => ['no', 'auto'].contains(available.id),
                  )),
          onTap: busy
              ? null
              : () => perform(() => widget.player.setSubtitleTrack(track)),
          child: Text(
            context.tr(
              label == 'Désactivés' ? 'Sous-titres désactivés' : label,
            ),
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        )
      : RadioListTile<SubtitleTrack>(
          value: track,
          title: Text(context.tr(label)),
          enabled: !busy,
          contentPadding: EdgeInsets.zero,
        );

  Widget openSubtitleOption(SourceSubtitle track, List<SourceSubtitle> tracks) {
    final versions = tracks
        .where((value) => value.language == track.language)
        .toList();
    final number = versions.length > 1
        ? ' #${versions.indexOf(track) + 1}'
        : '';
    final flag = SubtitleLanguages.flags[track.language] ?? '🏳️';
    return trackOption(
      SubtitleTrack.uri(
        track.url,
        title: track.label,
        language: track.language,
      ),
      '$flag ${context.tr(track.label)}$number · OpenSubtitles',
    );
  }

  Widget trackList() => StreamBuilder<Tracks>(
    stream: widget.player.stream.tracks,
    initialData: widget.player.state.tracks,
    builder: (context, tracks) => StreamBuilder<Track>(
      stream: widget.player.stream.track,
      initialData: widget.player.state.track,
      builder: (context, selected) {
        final urls = widget.externalTracks.map((track) => track.url).toSet();
        final additional = openSubtitles
            .where((track) => urls.add(track.url))
            .toList();
        return RadioGroup<SubtitleTrack>(
          groupValue: selected.data!.subtitle,
          onChanged: (track) {
            if (track != null) {
              perform(() => widget.player.setSubtitleTrack(track));
            }
          },
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              trackOption(SubtitleTrack.no(), context.tr("Désactivés")),
              if (!widget.releaseStyle)
                trackOption(SubtitleTrack.auto(), context.tr("Automatique")),
              for (final track in tracks.data!.subtitle.where(
                (track) =>
                    !['no', 'auto'].contains(track.id) &&
                    !urls.contains(track.id),
              ))
                trackOption(
                  track,
                  track.title ??
                      track.language ??
                      context.tr("Piste {0}", [track.id]),
                ),
              for (final track in widget.externalTracks)
                trackOption(
                  SubtitleTrack.uri(
                    track.url,
                    title: track.label,
                    language: track.language,
                  ),
                  context.tr("{0} · Fournisseur", [context.tr(track.label)]),
                ),
              for (final track in additional)
                openSubtitleOption(track, additional),
              if (loadingSubtitles) ...[
                const LinearProgressIndicator(),
                const SizedBox(height: 8),
                Text(context.tr('Recherche sur OpenSubtitles…')),
                const SizedBox(height: 12),
              ],
              if (subtitleSearchFailed) ...[
                Text(context.tr('Recherche de sous-titres indisponible.')),
                TextButton.icon(
                  onPressed: loadingSubtitles ? null : loadSubtitles,
                  icon: const Icon(Icons.refresh),
                  label: Text(context.tr('Réessayer')),
                ),
              ],
              if (tracks.data!.subtitle.every(
                    (track) => ['no', 'auto'].contains(track.id),
                  ) &&
                  widget.externalTracks.isEmpty &&
                  additional.isEmpty &&
                  !loadingSubtitles &&
                  !subtitleSearchFailed)
                Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: Text(
                    context.tr("Aucune piste de sous-titres disponible."),
                  ),
                ),
            ],
          ),
        );
      },
    ),
  );

  Widget releasePanel() => PlayerSettingsSheet(
    title: 'Sous-titres',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        section('SYNCHRONISATION'),
        PlayerSettingOption(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          child: Row(
            children: [
              IconButton(
                tooltip: context.tr('Avancer les sous-titres de 0,1 s'),
                onPressed: busy ? null : () => applyDelay(-100),
                icon: const Icon(Icons.remove),
              ),
              Expanded(
                child: Text(
                  context.tr('Décalage'),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              TextButton(
                onPressed: () => showDialog<void>(
                  context: context,
                  builder: (dialogContext) => AlertDialog(
                    title: Text(context.tr('Décalage')),
                    content: TextField(
                      key: const ValueKey('subtitle-delay-input'),
                      controller: input,
                      keyboardType: const TextInputType.numberWithOptions(
                        signed: true,
                        decimal: true,
                      ),
                    ),
                    actions: [
                      TextButton(
                        onPressed: () async {
                          await applyDelay();
                          if (dialogContext.mounted) {
                            Navigator.pop(dialogContext);
                          }
                        },
                        child: Text(context.tr('Appliquer')),
                      ),
                    ],
                  ),
                ),
                child: Text('${(delay / 1000).toStringAsFixed(1)} s'),
              ),
              IconButton(
                tooltip: context.tr('Retarder les sous-titres de 0,1 s'),
                onPressed: busy ? null : () => applyDelay(100),
                icon: const Icon(Icons.add),
              ),
            ],
          ),
        ),
        section('TAILLE DU TEXTE'),
        PlayerSettingOption(
          child: SubtitleSizeControl(
            fontSize: fontSize,
            onChanged: busy
                ? null
                : (value) => perform(() async {
                    await widget.onFontSizeChanged(value);
                    if (mounted) setState(() => fontSize = value);
                  }),
          ),
        ),
        section('SOUS-TITRES'),
        trackList(),
        if (error != null) Text(context.l10n.message(error!)),
      ],
    ),
  );

  Widget section(String text) => Padding(
    padding: const EdgeInsets.only(top: 8, bottom: 8),
    child: Text(
      context.tr(text),
      style: const TextStyle(
        color: Color(0xffb9bec8),
        fontSize: 12,
        fontWeight: FontWeight.bold,
        letterSpacing: .5,
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => widget.releaseStyle
      ? releasePanel()
      : AlertDialog(
          title: Text(context.tr("Sous-titres")),
          content: SizedBox(
            width: 440,
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(context.tr("Décalage")),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      IconButton.outlined(
                        tooltip: context.tr("Avancer les sous-titres de 0,1 s"),
                        onPressed: busy ? null : () => applyDelay(-100),
                        icon: const Icon(Icons.remove),
                      ),
                      SizedBox(
                        width: 120,
                        child: TextField(
                          key: const ValueKey('subtitle-delay-input'),
                          controller: input,
                          keyboardType: const TextInputType.numberWithOptions(
                            signed: true,
                            decimal: true,
                          ),
                          decoration: InputDecoration(
                            labelText: context.tr("Secondes"),
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                          onSubmitted: (_) => applyDelay(),
                        ),
                      ),
                      IconButton.outlined(
                        tooltip: context.tr(
                          "Retarder les sous-titres de 0,1 s",
                        ),
                        onPressed: busy ? null : () => applyDelay(100),
                        icon: const Icon(Icons.add),
                      ),
                      TextButton(
                        onPressed: busy ? null : () => applyDelay(),
                        child: Text(context.tr("Appliquer")),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    context.tr("Décalage appliqué : {0} s", [
                      formatDelay(delay),
                    ]),
                  ),
                  Text(context.tr("Positif : plus tard · Négatif : plus tôt")),
                  TextButton(
                    onPressed: busy ? null : () => applyDelay(0, true),
                    child: Text(context.tr("Réinitialiser le décalage")),
                  ),
                  const Divider(),
                  trackList(),
                  const Divider(),
                  SubtitleSizeControl(
                    fontSize: fontSize,
                    onChanged: busy
                        ? null
                        : (value) => perform(() async {
                            await widget.onFontSizeChanged(value);
                            if (mounted) setState(() => fontSize = value);
                          }),
                  ),
                  if (error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(
                        context.l10n.message(error!),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(context.tr("Fermer")),
            ),
          ],
        );
}
