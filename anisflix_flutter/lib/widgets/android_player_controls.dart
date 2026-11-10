import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';

/// Android release layout. Playback stays in PlayerScreen so hiding controls,
/// opening a menu or minimizing never creates another playback session.
class AndroidPlayerControls extends StatelessWidget {
  final bool tv, playing, fullscreen;
  final String title;
  final Duration position, duration, buffered;
  final double volume;
  final FocusNode playFocus;
  final VoidCallback onClose, onMinimize, onPlayPause, onRewind, onForward;
  final VoidCallback onSubtitles, onPip, onFullscreen, onCast, onAirPlay;
  final ValueChanged<Duration> onSeek;
  final ValueChanged<double> onVolume;
  final VoidCallback hold, release;
  final Widget aspectButton;

  const AndroidPlayerControls({
    super.key,
    required this.tv,
    required this.title,
    required this.playing,
    required this.fullscreen,
    required this.position,
    required this.duration,
    required this.buffered,
    required this.volume,
    required this.playFocus,
    required this.onClose,
    required this.onMinimize,
    required this.onPlayPause,
    required this.onRewind,
    required this.onForward,
    required this.onSubtitles,
    required this.onPip,
    required this.onFullscreen,
    required this.onCast,
    required this.onAirPlay,
    required this.onSeek,
    required this.onVolume,
    required this.hold,
    required this.release,
    required this.aspectButton,
  });

  static const tint = Color(0xffd9c2c5);
  static const red = Color(0xffed214d);

  static String time(Duration value) {
    final seconds = value.inSeconds.clamp(0, 359999);
    final minutes = (seconds ~/ 60).toString().padLeft(2, '0');
    final tail = (seconds % 60).toString().padLeft(2, '0');
    return seconds >= 3600
        ? '${seconds ~/ 3600}:${(seconds ~/ 60 % 60).toString().padLeft(2, '0')}:$tail'
        : '$minutes:$tail';
  }

  Widget button(
    BuildContext context,
    String key,
    IconData icon,
    String label,
    VoidCallback action, {
    double size = 24,
    double? diameter,
    FocusNode? focus,
  }) => IconButton(
    key: ValueKey(key),
    focusNode: focus,
    tooltip: context.tr(label),
    onPressed: action,
    iconSize: size,
    style: ButtonStyle(
      foregroundColor: WidgetStatePropertyAll(tv ? Colors.white : tint),
      minimumSize: WidgetStatePropertyAll(
        Size.square(diameter ?? (tv ? 56 : 48)),
      ),
      fixedSize: diameter == null
          ? null
          : WidgetStatePropertyAll(Size.square(diameter)),
      backgroundColor: WidgetStateProperty.resolveWith(
        (states) => tv && states.contains(WidgetState.focused)
            ? red
            : Colors.transparent,
      ),
      side: WidgetStateProperty.resolveWith(
        (states) => !tv
            ? null
            : BorderSide(
                color: states.contains(WidgetState.focused)
                    ? Colors.white
                    : Colors.white38,
                width: states.contains(WidgetState.focused) ? 4 : 1,
              ),
      ),
      shape: const WidgetStatePropertyAll(CircleBorder()),
      shadowColor: const WidgetStatePropertyAll(red),
      elevation: WidgetStateProperty.resolveWith(
        (states) => tv && states.contains(WidgetState.focused) ? 16 : 0,
      ),
    ),
    icon: Icon(icon),
  );

  @override
  Widget build(BuildContext context) {
    final total = duration.inMilliseconds.toDouble();
    final elapsed = position.inMilliseconds.toDouble().clamp(0.0, total);
    final timeStyle = TextStyle(
      color: tv ? Colors.white : const Color(0xffded8e0),
      fontSize: tv ? 12 : 12,
    );
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withValues(alpha: .55),
            Colors.transparent,
            Colors.black.withValues(alpha: .65),
          ],
        ),
      ),
      child: SafeArea(
        child: Stack(
          fit: StackFit.expand,
          children: [
            Positioned(
              top: tv ? 8 : 16,
              left: 16,
              right: 16,
              child: Row(
                children: [
                  if (tv) ...[
                    button(
                      context,
                      'player-close',
                      Icons.close,
                      'Fermer',
                      onClose,
                      size: 28,
                    ),
                    const SizedBox(width: 16),
                  ],
                  if (tv)
                    Expanded(
                      child: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xffded8e0),
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    )
                  else ...[
                    Expanded(
                      child: InkWell(
                        key: const ValueKey('player-minimize'),
                        onTap: onMinimize,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Flexible(
                                child: Text(
                                  title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Color(0xffded8e0),
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              const Icon(
                                Icons.keyboard_arrow_down,
                                color: Color(0xffb9c1cd),
                                size: 20,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    button(
                      context,
                      'player-airplay',
                      Icons.airplay,
                      'Diffuser avec AirPlay',
                      onAirPlay,
                    ),
                  ],
                ],
              ),
            ),
            Align(
              alignment: Alignment(0, tv ? -.075 : -.04),
              child: LayoutBuilder(
                builder: (context, constraints) => Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    button(
                      context,
                      tv ? 'tv-rewind' : 'mobile-rewind',
                      Icons.replay_10,
                      'Reculer de 10 secondes',
                      onRewind,
                      size: tv ? 36 : 40,
                      diameter: tv ? 56 : 60,
                    ),
                    SizedBox(
                      width: tv
                          ? 60
                          : (constraints.maxWidth / 4 - 68).clamp(0.0, 10000),
                    ),
                    button(
                      context,
                      tv ? 'tv-play-pause' : 'mobile-play-pause',
                      playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                      playing ? 'Pause' : 'Lecture',
                      onPlayPause,
                      size: tv ? 64 : 48,
                      diameter: tv ? 100 : 76,
                      focus: playFocus,
                    ),
                    SizedBox(
                      width: tv
                          ? 60
                          : (constraints.maxWidth / 4 - 68).clamp(0.0, 10000),
                    ),
                    button(
                      context,
                      tv ? 'tv-forward' : 'mobile-forward',
                      Icons.forward_10,
                      'Avancer de 10 secondes',
                      onForward,
                      size: tv ? 36 : 40,
                      diameter: tv ? 56 : 60,
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              bottom: tv ? 78 : 68,
              left: 36,
              right: 36,
              child: SliderTheme(
                data: SliderTheme.of(context).copyWith(
                  trackHeight: 3,
                  activeTrackColor: red,
                  inactiveTrackColor: Colors.white30,
                  secondaryActiveTrackColor: Colors.white54,
                  thumbColor: red,
                  thumbShape: RoundSliderThumbShape(
                    enabledThumbRadius: tv ? 6 : 6,
                  ),
                  overlayShape: const RoundSliderOverlayShape(
                    overlayRadius: 14,
                  ),
                  padding: EdgeInsets.zero,
                ),
                child: Slider(
                  key: ValueKey(tv ? 'tv-seek-bar' : 'mobile-seek-bar'),
                  value: elapsed,
                  secondaryTrackValue: buffered.inMilliseconds.toDouble().clamp(
                    elapsed,
                    total > 0 ? total : 1.0,
                  ),
                  max: total > 0 ? total : 1,
                  semanticFormatterCallback: (value) =>
                      '${time(Duration(milliseconds: value.round()))} / ${time(duration)}',
                  onChangeStart: (_) => hold(),
                  onChangeEnd: (_) => release(),
                  onChanged: total > 0
                      ? (value) => onSeek(Duration(milliseconds: value.round()))
                      : null,
                ),
              ),
            ),
            Positioned(
              bottom: tv ? 10 : 8,
              left: 16,
              right: 16,
              child: LayoutBuilder(
                builder: (context, constraints) => FittedBox(
                  fit: BoxFit.scaleDown,
                  child: SizedBox(
                    width: tv
                        ? constraints.maxWidth
                        : constraints.maxWidth.clamp(360.0, double.infinity),
                    child: Row(
                      children: [
                        Text(
                          time(position),
                          key: const ValueKey('player-elapsed'),
                          style: timeStyle,
                        ),
                        const Spacer(),
                        button(
                          context,
                          'player-subtitles',
                          Icons.closed_caption,
                          'Sous-titres',
                          onSubtitles,
                        ),
                        if (!tv) ...[
                          button(
                            context,
                            'player-cast',
                            Icons.cast,
                            'Diffuser sur Chromecast',
                            onCast,
                          ),
                          button(
                            context,
                            'player-pip',
                            Icons.picture_in_picture_alt_outlined,
                            'Image dans l’image',
                            onPip,
                          ),
                        ],
                        if (tv) const SizedBox(width: 20),
                        aspectButton,
                        if (!tv)
                          button(
                            context,
                            'player-fullscreen',
                            fullscreen
                                ? Icons.fullscreen_exit
                                : Icons.fullscreen,
                            fullscreen
                                ? 'Quitter le plein écran'
                                : 'Plein écran',
                            onFullscreen,
                          ),
                        SizedBox(width: tv ? 17 : 8),
                        Text(
                          time(duration),
                          key: const ValueKey('player-duration'),
                          style: timeStyle,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
