import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';

import '../models/media.dart';
import '../services/library.dart';
import '../services/platform_bridge.dart';
import '../widgets/subtitle_settings.dart';

class PlayerScreen extends StatefulWidget {
  final Library library;
  final MediaItem item;
  final StreamSource source;
  final int? season, episode;
  const PlayerScreen({
    super.key,
    required this.library,
    required this.item,
    required this.source,
    this.season,
    this.episode,
  });
  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  late final player = Player();
  late final controller = VideoController(player);
  Timer? timer;
  StreamSubscription<String>? errorSubscription;
  StreamSubscription<bool>? playingSubscription;
  StreamSubscription<Duration>? durationSubscription;
  String? lastScrobble;
  bool pip = false;
  int subtitleDelayMilliseconds = 0;
  late double subtitleFontSize =
      widget.library.prefs.getDouble('subtitleFontSize') ?? 32;
  void pipChanged() {
    if (mounted) setState(() => pip = PlatformBridge.pictureInPicture.value);
  }

  String? error;
  bool closed = false;
  @override
  void initState() {
    super.initState();
    pip = PlatformBridge.pictureInPicture.value;
    PlatformBridge.pictureInPicture.addListener(pipChanged);
    playingSubscription = player.stream.playing.listen((playing) {
      unawaited(PlatformBridge.playbackActive(playing));
      unawaited(scrobble(playing ? 'start' : 'pause'));
    });
    durationSubscription = player.stream.duration.listen((duration) {
      if (duration > Duration.zero && player.state.playing) {
        unawaited(scrobble('start'));
      }
    });
    errorSubscription = player.stream.error.listen((_) {
      if (mounted) {
        setState(
          () => error = 'Impossible de lire cette source. Reviens à la liste pour en choisir une autre.',
        );
      }
    });
    unawaited(open());
    timer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => unawaited(save()),
    );
  }

  Future<void> open() async {
    try {
      await player.open(
        Media(widget.source.url, httpHeaders: widget.source.headers),
      );
      if (closed) return;
      final p =
          widget.library.progress[widget.library.progressKey(
            widget.item,
            widget.season,
            widget.episode,
          )];
      if (p != null && (p['position'] as num) < (p['duration'] as num) * .95) {
        await player.seek(Duration(seconds: (p['position'] as num).toInt()));
      }
    } catch (_) {
      if (mounted) setState(() => error = 'Ouverture de la vidéo impossible.');
    }
  }

  Future<void> scrobble(String action) async {
    final duration = player.state.duration.inMilliseconds;
    if (duration > 0 && action != lastScrobble) {
      lastScrobble = action;
      await widget.library.trakt.scrobble(
        widget.item,
        player.state.position.inMilliseconds / duration,
        action,
        season: widget.season,
        episode: widget.episode,
      );
    }
  }

  Future<void> save() async {
    try {
      await widget.library.saveProgress(
        widget.item,
        widget.season,
        widget.episode,
        player.state.position,
        player.state.duration,
      );
    } catch (_) {
      /* Playback continues if local storage is temporarily unavailable. */
    }
  }

  @override
  void dispose() {
    closed = true;
    PlatformBridge.pictureInPicture.removeListener(pipChanged);
    if (pip) unawaited(PlatformBridge.exitPip());
    unawaited(playingSubscription?.cancel());
    unawaited(durationSubscription?.cancel());
    unawaited(PlatformBridge.playbackActive(false));
    timer?.cancel();
    unawaited(errorSubscription?.cancel());
    unawaited(save());
    unawaited(scrobble('stop'));
    unawaited(player.dispose());
    super.dispose();
  }

  Future<void> seek(int seconds) async {
    final duration = player.state.duration;
    final target = player.state.position + Duration(seconds: seconds);
    await player.seek(
      Duration(
        milliseconds: target.inMilliseconds.clamp(0, duration.inMilliseconds),
      ),
    );
  }

  Future<void> showSubtitles() => showDialog<void>(
    context: context,
    builder: (_) => SubtitleSettingsDialog(
      player: player,
      externalTracks: widget.source.subtitles,
      delayMilliseconds: subtitleDelayMilliseconds,
      fontSize: subtitleFontSize,
      onDelayChanged: (milliseconds) async {
        final native = player.platform;
        if (closed || native is! NativePlayer) {
          throw StateError('Subtitle timing is unavailable.');
        }
        await native.setProperty(
          'sub-delay',
          (milliseconds / 1000).toStringAsFixed(3),
        );
        subtitleDelayMilliseconds = milliseconds;
      },
      onFontSizeChanged: (size) async {
        if (!mounted) return;
        await widget.library.prefs.setDouble('subtitleFontSize', size);
        if (mounted) setState(() => subtitleFontSize = size);
      },
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.black,
    body: CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.select): () =>
            player.playOrPause(),
        const SingleActivator(LogicalKeyboardKey.space): () =>
            player.playOrPause(),
        const SingleActivator(LogicalKeyboardKey.mediaPlayPause): () =>
            player.playOrPause(),
        const SingleActivator(LogicalKeyboardKey.arrowLeft): () => seek(-10),
        const SingleActivator(LogicalKeyboardKey.arrowRight): () => seek(10),
        const SingleActivator(LogicalKeyboardKey.escape): () =>
            pip ? PlatformBridge.exitPip() : Navigator.maybePop(context),
      },
      child: Focus(
        autofocus: true,
        child: Stack(
          // Positioned video must use the viewport, not the header's height.
          fit: StackFit.expand,
          children: [
            Positioned.fill(
              child: Video(
                controller: controller,
                controls: pip ? NoVideoControls : AdaptiveVideoControls,
                subtitleViewConfiguration: SubtitleViewConfiguration(
                  style: TextStyle(
                    fontSize: subtitleFontSize,
                    color: Colors.white,
                    backgroundColor: const Color(0x99000000),
                  ),
                ),
              ),
            ),
            if (pip && PlatformBridge.macos)
              Positioned(
                top: 4,
                right: 4,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    StreamBuilder<bool>(
                      stream: player.stream.playing,
                      initialData: player.state.playing,
                      builder: (_, state) => IconButton.filledTonal(
                        tooltip: state.data == true ? 'Pause' : 'Lecture',
                        onPressed: player.playOrPause,
                        icon: Icon(
                          state.data == true ? Icons.pause : Icons.play_arrow,
                        ),
                      ),
                    ),
                    IconButton.filledTonal(
                      tooltip: 'Revenir au lecteur',
                      onPressed: PlatformBridge.exitPip,
                      icon: const Icon(Icons.picture_in_picture_alt),
                    ),
                  ],
                ),
              ),
            if (!pip)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        IconButton.filledTonal(
                          tooltip: 'Retour',
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.arrow_back),
                        ),
                        if (PlatformBridge.supportsPip)
                          IconButton(
                            tooltip: 'Image dans l’image',
                            color: Colors.white,
                            onPressed: () async {
                              final entered = await PlatformBridge.enterPip();
                              if (!entered && context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Le mode image dans l’image n’est pas disponible.',
                                    ),
                                  ),
                                );
                              }
                            },
                            icon: const Icon(Icons.picture_in_picture_alt),
                          ),
                        IconButton(
                          tooltip: 'Sous-titres et décalage',
                          color: Colors.white,
                          onPressed: showSubtitles,
                          icon: const Icon(Icons.subtitles_outlined),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Text(
                            widget.item.title,
                            style: const TextStyle(color: Colors.white),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            if (error != null)
              Center(
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline, size: 40),
                        const SizedBox(height: 12),
                        Text(error!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Changer de source'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    ),
  );
}
