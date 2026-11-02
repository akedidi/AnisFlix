import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';

import '../models/media.dart';

class SubtitleSettingsDialog extends StatefulWidget {
  final Player player;
  final List<SourceSubtitle> externalTracks;
  final int delayMilliseconds;
  final double fontSize;
  final Future<void> Function(int) onDelayChanged;
  final Future<void> Function(double) onFontSizeChanged;

  const SubtitleSettingsDialog({
    super.key,
    required this.player,
    required this.externalTracks,
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
  late final input = TextEditingController(text: formatDelay(delay));
  String? error;
  bool busy = false;

  static String formatDelay(int milliseconds) =>
      (milliseconds / 1000).toStringAsFixed(3).replaceAll('.', ',');

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

  Widget trackOption(SubtitleTrack track, String label) =>
      RadioListTile<SubtitleTrack>(
        value: track,
        title: Text(label),
        enabled: !busy,
        contentPadding: EdgeInsets.zero,
      );

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Sous-titres'),
    content: SizedBox(
      width: 440,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            StreamBuilder<Tracks>(
              stream: widget.player.stream.tracks,
              initialData: widget.player.state.tracks,
              builder: (context, tracks) => StreamBuilder<Track>(
                stream: widget.player.stream.track,
                initialData: widget.player.state.track,
                builder: (context, selected) => RadioGroup<SubtitleTrack>(
                  groupValue: selected.data!.subtitle,
                  onChanged: (track) {
                    if (track != null) {
                      perform(() => widget.player.setSubtitleTrack(track));
                    }
                  },
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      trackOption(SubtitleTrack.no(), 'Désactivés'),
                      trackOption(SubtitleTrack.auto(), 'Automatique'),
                      for (final track in tracks.data!.subtitle.where(
                        (track) => !['no', 'auto'].contains(track.id),
                      ))
                        trackOption(
                          track,
                          track.title ?? track.language ?? 'Piste ${track.id}',
                        ),
                      for (final track in widget.externalTracks)
                        trackOption(
                          SubtitleTrack.uri(
                            track.url,
                            title: track.label,
                            language: track.language,
                          ),
                          '${track.label} · Fournisseur',
                        ),
                      if (tracks.data!.subtitle.every(
                            (track) => ['no', 'auto'].contains(track.id),
                          ) &&
                          widget.externalTracks.isEmpty)
                        const Padding(
                          padding: EdgeInsets.only(bottom: 12),
                          child: Text(
                            'Aucune piste de sous-titres disponible.',
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            const Divider(),
            const Text('Décalage'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                IconButton.outlined(
                  tooltip: 'Avancer les sous-titres de 0,1 s',
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
                    decoration: const InputDecoration(
                      labelText: 'Secondes',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onSubmitted: (_) => applyDelay(),
                  ),
                ),
                IconButton.outlined(
                  tooltip: 'Retarder les sous-titres de 0,1 s',
                  onPressed: busy ? null : () => applyDelay(100),
                  icon: const Icon(Icons.add),
                ),
                TextButton(
                  onPressed: busy ? null : () => applyDelay(),
                  child: const Text('Appliquer'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('Décalage appliqué : ${formatDelay(delay)} s'),
            const Text('Positif : plus tard · Négatif : plus tôt'),
            TextButton(
              onPressed: busy ? null : () => applyDelay(0, true),
              child: const Text('Réinitialiser le décalage'),
            ),
            const Divider(),
            DropdownButtonFormField<double>(
              initialValue: fontSize,
              decoration: const InputDecoration(labelText: 'Taille du texte'),
              items: [
                for (final value in [20, 24, 28, 32, 36, 40, 48, 56, 64])
                  DropdownMenuItem(
                    value: value.toDouble(),
                    child: Text('$value'),
                  ),
              ],
              onChanged: busy
                  ? null
                  : (value) {
                      if (value == null) return;
                      perform(() async {
                        await widget.onFontSizeChanged(value);
                        if (mounted) setState(() => fontSize = value);
                      });
                    },
            ),
            if (error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Fermer'),
      ),
    ],
  );
}
