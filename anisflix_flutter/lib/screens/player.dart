import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';

import '../l10n/app_localizations.dart';
import '../models/media.dart';
import '../services/library.dart';
import '../services/platform_bridge.dart';
import '../services/subtitle_service.dart';
import '../widgets/subtitle_settings.dart';
import '../widgets/aspect_ratio_button.dart';
import '../widgets/player_controls_overlay.dart';

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
  late final subtitleService = SubtitleService(widget.library);
  bool get canSearchSubtitles =>
      ['movie', 'tv'].contains(widget.item.type) &&
      ['http', 'https'].contains(Uri.tryParse(widget.source.url)?.scheme);
  Timer? timer;
  StreamSubscription<String>? errorSubscription;
  StreamSubscription<bool>? playingSubscription;
  StreamSubscription<Duration>? durationSubscription;
  String? lastScrobble;
  bool pip = false;
  late final aspectMode = ValueNotifier(
    VideoAspectMode.values.firstWhere(
      (mode) => mode.name == widget.library.prefs.getString('videoAspectMode'),
      orElse: () => VideoAspectMode.original,
    ),
  );
  int subtitleDelayMilliseconds = 0;
  late double subtitleFontSize = widget.library.subtitleFontSize;
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
    if (canSearchSubtitles) {
      // Fetch independently of video startup. The menu shares this request and
      // retains embedded/provider tracks if the external service is down.
      unawaited(
        loadOpenSubtitles().then<void>(
          (_) {},
          onError: (Object _, StackTrace _) {},
        ),
      );
    }
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
    subtitleService.close();
    aspectMode.dispose();
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

  Future<List<SourceSubtitle>> loadOpenSubtitles() => subtitleService.load(
    widget.item,
    season: widget.season,
    episode: widget.episode,
  );

  Future<void> showSubtitles() => showDialog<void>(
    context: context,
    builder: (_) => SubtitleSettingsDialog(
      player: player,
      externalTracks: widget.source.subtitles,
      loadOpenSubtitles: canSearchSubtitles ? loadOpenSubtitles : null,
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
        await widget.library.setSubtitleFontSize(size);
        if (mounted) setState(() => subtitleFontSize = size);
      },
    ),
  );

  Future<void> enterPip(BuildContext controlsContext) async {
    await dismissTooltips();
    if (closed || !controlsContext.mounted) return;
    if (isFullscreen(controlsContext)) await exitFullscreen(controlsContext);
    if (closed) return;
    final entered = await PlatformBridge.enterPip();
    if (!entered && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.tr('Le mode image dans l’image n’est pas disponible.'),
          ),
        ),
      );
    }
  }

  Future<void> dismissTooltips() async {
    if (Tooltip.dismissAllToolTips()) {
      // Remove tooltip overlays before a native window changes its dimensions.
      await Future<void>.delayed(const Duration(milliseconds: 200));
    }
  }

  Future<void> togglePlayerFullscreen(BuildContext controlsContext) async {
    await dismissTooltips();
    if (!closed && controlsContext.mounted) {
      await toggleFullscreen(controlsContext);
    }
  }

  Future<void> exitPip() async {
    await dismissTooltips();
    if (!closed) await PlatformBridge.exitPip();
  }

  Widget playerHeader() => Row(
    children: [
      IconButton.filledTonal(
        tooltip: context.tr('Retour'),
        onPressed: () => Navigator.pop(context),
        icon: const Icon(Icons.arrow_back),
      ),
      const SizedBox(width: 16),
      Expanded(
        child: Text(
          context.l10n.mediaTitle(widget.item.title),
          style: const TextStyle(color: Colors.white),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
    ],
  );

  void changeVolume(double delta) =>
      unawaited(player.setVolume((player.state.volume + delta).clamp(0, 100)));

  Widget desktopControls(
    VideoState state,
    BuildContext controlsContext,
    MaterialDesktopVideoControlsThemeData theme,
  ) => Stack(
    children: [
      PlayerControlsOverlay(
        onExit: () {
          if (isFullscreen(controlsContext)) {
            unawaited(exitFullscreen(controlsContext));
          } else {
            unawaited(Navigator.maybePop(context));
          }
        },
        onDoubleTap: () => togglePlayerFullscreen(controlsContext),
        onVisibilityChanged: (visible) => state.setSubtitleViewPadding(
          state.widget.subtitleViewConfiguration.padding +
              EdgeInsets.only(bottom: visible ? theme.buttonBarHeight : 0),
        ),
        shortcuts: {
          const SingleActivator(LogicalKeyboardKey.space): player.playOrPause,
          const SingleActivator(LogicalKeyboardKey.mediaPlayPause):
              player.playOrPause,
          const SingleActivator(LogicalKeyboardKey.mediaPlay): player.play,
          const SingleActivator(LogicalKeyboardKey.mediaPause): player.pause,
          const SingleActivator(LogicalKeyboardKey.mediaTrackNext): player.next,
          const SingleActivator(LogicalKeyboardKey.mediaTrackPrevious):
              player.previous,
          const SingleActivator(LogicalKeyboardKey.arrowLeft): () => seek(-10),
          const SingleActivator(LogicalKeyboardKey.keyJ): () => seek(-10),
          const SingleActivator(LogicalKeyboardKey.arrowRight): () => seek(10),
          const SingleActivator(LogicalKeyboardKey.keyI): () => seek(10),
          const SingleActivator(LogicalKeyboardKey.arrowUp): () =>
              changeVolume(5),
          const SingleActivator(LogicalKeyboardKey.arrowDown): () =>
              changeVolume(-5),
          const SingleActivator(LogicalKeyboardKey.keyF): () =>
              togglePlayerFullscreen(controlsContext),
        },
        onPointerSignal: (event) {
          if (event is PointerScrollEvent) {
            changeVolume(event.scrollDelta.dy > 0 ? -5 : 5);
          }
        },
        builder: (hold, release) => DecoratedBox(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0x61000000),
                Colors.transparent,
                Color(0x61000000),
              ],
            ),
          ),
          child: SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: playerHeader(),
                ),
                const Spacer(),
                MaterialDesktopSeekBar(onSeekStart: hold, onSeekEnd: release),
                Container(
                  height: theme.buttonBarHeight,
                  margin: theme.bottomButtonBarMargin,
                  child: Row(children: theme.bottomButtonBar),
                ),
              ],
            ),
          ),
        ),
      ),
      StreamBuilder<bool>(
        stream: player.stream.buffering,
        initialData: player.state.buffering,
        builder: (_, snapshot) => snapshot.data == true
            ? const Center(
                child: IgnorePointer(child: CircularProgressIndicator()),
              )
            : const SizedBox.shrink(),
      ),
    ],
  );

  Widget videoControls(VideoState state) => LayoutBuilder(
    builder: (context, constraints) {
      final compact = constraints.maxWidth < 600;
      // Use this controls tree: VideoState can briefly retain the fullscreen
      // route's deactivated context while returning to the normal player.
      final fullscreen = isFullscreen(context);
      final actions = [
        if (PlatformBridge.supportsPip)
          IconButton(
            key: const ValueKey('player-pip'),
            tooltip: context.tr('Image dans l’image'),
            color: Colors.white,
            onPressed: () => enterPip(context),
            icon: const Icon(Icons.picture_in_picture_alt),
          ),
        IconButton(
          key: const ValueKey('player-subtitles'),
          tooltip: context.tr('Sous-titres et décalage'),
          color: Colors.white,
          onPressed: showSubtitles,
          icon: const Icon(Icons.subtitles_outlined),
        ),
        AspectRatioButton(
          mode: aspectMode,
          onSelected: (mode) {
            if (!mounted || closed) return;
            aspectMode.value = mode;
            state.update(
              aspectRatio: mode.ratio(
                player.state.videoParams.aspect ?? 16 / 9,
              ),
              fit: mode.fit,
            );
            unawaited(
              widget.library.prefs.setString('videoAspectMode', mode.name),
            );
          },
        ),
        IconButton(
          tooltip: context.tr(
            fullscreen ? 'Quitter le plein écran' : 'Plein écran',
          ),
          color: Colors.white,
          onPressed: () => togglePlayerFullscreen(context),
          icon: Icon(fullscreen ? Icons.fullscreen_exit : Icons.fullscreen),
        ),
      ];
      final mobile = MaterialVideoControlsThemeData(
        visibleOnMount: true,
        padding: MediaQuery.paddingOf(context),
        // The timeline retains its own row, leaving room for all actions on phones.
        bottomButtonBar: [
          const Expanded(
            child: Align(
              alignment: Alignment.centerLeft,
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: MaterialPositionIndicator(),
              ),
            ),
          ),
          ...actions,
        ],
      );
      final desktop = MaterialDesktopVideoControlsThemeData(
        visibleOnMount: true,
        padding: MediaQuery.paddingOf(context),
        bottomButtonBar: [
          const MaterialDesktopPlayOrPauseButton(),
          if (!compact) ...[
            const MaterialDesktopVolumeButton(),
            const MaterialDesktopPositionIndicator(),
          ],
          if (compact)
            const Expanded(
              child: Align(
                alignment: Alignment.centerLeft,
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: MaterialDesktopPositionIndicator(),
                ),
              ),
            )
          else
            const Spacer(),
          ...actions,
        ],
      );
      final mobilePlatform = switch (Theme.of(context).platform) {
        TargetPlatform.android || TargetPlatform.iOS => true,
        _ => false,
      };
      Offset? doubleTapPosition;
      final controls = !mobilePlatform
          ? desktopControls(state, context, desktop)
          : fullscreen
          ? GestureDetector(
              // Preserve fullscreen double-tap seeking without the library's
              // hard-coded English "seconds" indicator.
              onDoubleTapDown: (details) =>
                  doubleTapPosition = details.localPosition,
              onDoubleTap: () {
                final x = doubleTapPosition?.dx;
                if (x == null) return;
                if (x < constraints.maxWidth / 3) unawaited(seek(-10));
                if (x > constraints.maxWidth * 2 / 3) unawaited(seek(10));
              },
              child: AdaptiveVideoControls(state),
            )
          : AdaptiveVideoControls(state);
      return MaterialVideoControlsTheme(
        // media_kit's theme does not notify descendants when its data changes.
        // Recreate the controls when the responsive layout or language changes.
        key: ValueKey((compact, context.l10n.locale.languageCode)),
        normal: mobile,
        fullscreen: mobile.copyWith(
          volumeGesture: true,
          brightnessGesture: true,
          seekGesture: true,
        ),
        child: MaterialDesktopVideoControlsTheme(
          normal: desktop,
          fullscreen: desktop,
          child: controls,
        ),
      );
    },
  );

  Widget pipControls() => PlayerControlsOverlay(
    key: const ValueKey('pip-controls'),
    onExit: exitPip,
    onDoubleTap: () {},
    onDragStart: PlatformBridge.dragPip,
    shortcuts: const {},
    builder: (_, _) => Stack(
      fit: StackFit.expand,
      children: [
        Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton.filledTonal(
                key: const ValueKey('pip-rewind'),
                tooltip: context.tr('Reculer de 10 secondes'),
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xaa000000),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.square(48),
                ),
                onPressed: () => seek(-10),
                icon: const Icon(Icons.replay_10, size: 28),
              ),
              const SizedBox(width: 12),
              StreamBuilder<bool>(
                stream: player.stream.playing,
                initialData: player.state.playing,
                builder: (_, state) => IconButton.filledTonal(
                  key: const ValueKey('pip-play-pause'),
                  tooltip: state.data == true
                      ? context.tr("Pause")
                      : context.tr("Lecture"),
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xaa000000),
                    foregroundColor: Colors.white,
                    minimumSize: const Size.square(56),
                  ),
                  onPressed: player.playOrPause,
                  icon: Icon(
                    state.data == true ? Icons.pause : Icons.play_arrow,
                    size: 32,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              IconButton.filledTonal(
                key: const ValueKey('pip-forward'),
                tooltip: context.tr('Avancer de 10 secondes'),
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xaa000000),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.square(48),
                ),
                onPressed: () => seek(10),
                icon: const Icon(Icons.forward_10, size: 28),
              ),
            ],
          ),
        ),
        Positioned(
          bottom: 0,
          right: 0,
          child: IconButton.filledTonal(
            tooltip: context.tr("Revenir au lecteur"),
            style: IconButton.styleFrom(
              backgroundColor: const Color(0xaa000000),
              foregroundColor: Colors.white,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              minimumSize: const Size.square(40),
            ),
            onPressed: exitPip,
            icon: const Icon(Icons.picture_in_picture_alt),
          ),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.black,
    body: CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.space): () =>
            player.playOrPause(),
        const SingleActivator(LogicalKeyboardKey.mediaPlayPause): () =>
            player.playOrPause(),
        const SingleActivator(LogicalKeyboardKey.arrowLeft): () => seek(-10),
        const SingleActivator(LogicalKeyboardKey.arrowRight): () => seek(10),
        const SingleActivator(LogicalKeyboardKey.escape): () =>
            pip ? exitPip() : Navigator.maybePop(context),
      },
      child: Actions(
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) => player.playOrPause(),
          ),
        },
        child: Focus(
          // Desktop controls own keyboard focus, including their Escape order.
          autofocus:
              pip ||
              [
                TargetPlatform.android,
                TargetPlatform.iOS,
              ].contains(Theme.of(context).platform),
          child: Stack(
            // Positioned video must use the viewport, not the header's height.
            fit: StackFit.expand,
            children: [
              Positioned.fill(
                child: ValueListenableBuilder<VideoAspectMode>(
                  valueListenable: aspectMode,
                  builder: (context, mode, _) => StreamBuilder<VideoParams>(
                    stream: player.stream.videoParams,
                    initialData: player.state.videoParams,
                    builder: (context, params) => Video(
                      controller: controller,
                      // An explicit native ratio also restores Original after a forced
                      // ratio: media_kit's copyWith retains the old value for null.
                      aspectRatio: mode.ratio(params.data?.aspect ?? 16 / 9),
                      fit: mode.fit,
                      // NoVideoControls is null; media_kit's copyWith would
                      // retain the previous controls when switching to PiP.
                      controls: pip
                          ? (_) => const SizedBox.shrink()
                          : videoControls,
                      subtitleViewConfiguration: SubtitleViewConfiguration(
                        style: TextStyle(
                          fontSize: subtitleFontSize,
                          color: Colors.white,
                          backgroundColor: const Color(0x99000000),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              if (pip && PlatformBridge.macos)
                Positioned.fill(child: pipControls()),
              if (!pip &&
                  [
                    TargetPlatform.android,
                    TargetPlatform.iOS,
                  ].contains(Theme.of(context).platform))
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: playerHeader(),
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
                          Text(
                            context.l10n.message(error!),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),
                          FilledButton(
                            onPressed: () => Navigator.pop(context),
                            child: Text(context.tr("Changer de source")),
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
    ),
  );
}
