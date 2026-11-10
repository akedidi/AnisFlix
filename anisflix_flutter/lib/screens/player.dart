import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:media_kit/media_kit.dart';
import 'package:flutter_chrome_cast/flutter_chrome_cast.dart';
import 'package:media_kit_video/media_kit_video.dart';

import '../l10n/app_localizations.dart';
import '../models/media.dart';
import '../services/library.dart';
import '../services/platform_bridge.dart';
import '../services/remote_playback.dart';
import '../widgets/android_player_controls.dart';
import '../widgets/player_settings_sheet.dart';
import '../services/subtitle_service.dart';
import '../widgets/subtitle_settings.dart';
import '../widgets/aspect_ratio_button.dart';
import '../widgets/player_controls_overlay.dart';

class PlayerScreen extends StatefulWidget {
  final Library library;
  final MediaItem item;
  final StreamSource source;
  final int? season, episode;
  final VoidCallback? onClose;
  static Route<void>? _mobileSession;

  static Future<void> present(
    BuildContext context, {
    required Library library,
    required MediaItem item,
    required StreamSource source,
    int? season,
    int? episode,
  }) async {
    final mobile =
        PlatformBridge.android &&
        !PlatformBridge.deviceIsTv &&
        !const bool.fromEnvironment('TV_MODE');
    if (!mobile) {
      await Navigator.of(context, rootNavigator: true).push(
        MaterialPageRoute<void>(
          builder: (_) => PlayerScreen(
            library: library,
            item: item,
            source: source,
            season: season,
            episode: episode,
          ),
        ),
      );
      return;
    }
    final navigator = Navigator.of(context, rootNavigator: true);
    final previous = _mobileSession;
    if (previous?.navigator != null) previous!.navigator!.removeRoute(previous);
    late final Route<void> route;
    route = _MobilePlayerRoute(
      child: PlayerScreen(
        library: library,
        item: item,
        source: source,
        season: season,
        episode: episode,
        onClose: () {
          if (route.navigator != null) route.navigator!.removeRoute(route);
        },
      ),
    );
    _mobileSession = route;
    unawaited(
      navigator.push(route).whenComplete(() {
        if (identical(_mobileSession, route)) _mobileSession = null;
      }),
    );
  }

  const PlayerScreen({
    super.key,
    required this.library,
    required this.item,
    required this.source,
    this.season,
    this.episode,
    this.onClose,
  });
  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

/// The minimized player leaves the catalogue underneath interactive.
class _MobilePlayerRoute extends PopupRoute<void> {
  final Widget child;
  _MobilePlayerRoute({required this.child});
  @override
  Color? get barrierColor => null;
  @override
  bool get barrierDismissible => false;
  @override
  String? get barrierLabel => null;
  @override
  Duration get transitionDuration => Duration.zero;
  @override
  Widget buildModalBarrier() => const SizedBox.shrink();
  @override
  Widget buildPage(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
  ) => child;
}

class _PlayerScreenState extends State<PlayerScreen> {
  late final player = Player();
  late final controller = VideoController(player);
  late final subtitleService = SubtitleService(widget.library);
  final tvPlayFocus = FocusNode();
  late final remote = RemotePlayback(onDisconnected: resumeLocal);
  bool minimized = false;
  bool get androidControls => PlatformBridge.android;
  Duration get playbackPosition =>
      remote.active ? remote.position : player.state.position;
  Duration get playbackDuration =>
      remote.active ? remote.duration : player.state.duration;
  bool get isPlaying => remote.active ? remote.playing : player.state.playing;
  void closePlayer() {
    if (widget.onClose != null) {
      widget.onClose!();
    } else {
      unawaited(Navigator.maybePop(context));
    }
  }

  Future<void> resumeLocal() async {
    if (closed) return;
    await player.seek(remote.position);
    if (remote.playing) await player.play();
  }

  void remoteChanged() {
    if (mounted) {
      setState(() {});
      if (remote.active) unawaited(scrobble(isPlaying ? 'start' : 'pause'));
    }
  }

  Future<void> playOrPause() async {
    try {
      if (remote.active) {
        await remote.playOrPause();
      } else {
        await player.playOrPause();
      }
    } catch (_) {
      remoteError();
    }
  }

  Future<void> seekTo(Duration value) async {
    try {
      if (remote.active) {
        await remote.seek(value);
      } else {
        await player.seek(value);
      }
    } catch (_) {
      remoteError();
    }
  }

  void remoteError() {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(context.tr('Connexion au lecteur distant impossible.')),
        ),
      );
    }
  }

  bool get tv =>
      const bool.fromEnvironment('TV_MODE') || PlatformBridge.deviceIsTv;
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
    remote.addListener(remoteChanged);
    pip = PlatformBridge.pictureInPicture.value;
    PlatformBridge.pictureInPicture.addListener(pipChanged);
    playingSubscription = player.stream.playing.listen((playing) {
      unawaited(PlatformBridge.playbackActive(playing));
      unawaited(scrobble(isPlaying ? 'start' : 'pause'));
    });
    durationSubscription = player.stream.duration.listen((duration) {
      if (duration > Duration.zero && player.state.playing) {
        unawaited(scrobble('start'));
      }
    });
    errorSubscription = player.stream.error.listen((_) {
      showPlaybackError(
        'Impossible de lire cette source. Reviens à la liste pour en choisir une autre.',
      );
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
      final progress =
          widget.library.progress[widget.library.progressKey(
            widget.item,
            widget.season,
            widget.episode,
          )];
      final position = progress?['position'];
      final duration = progress?['duration'];
      final start =
          position is num &&
              duration is num &&
              position.isFinite &&
              duration.isFinite &&
              position >= 1 &&
              position < duration * .95
          ? Duration(seconds: position.toInt())
          : null;

      await player.open(
        Media(
          widget.source.url,
          httpHeaders: widget.source.headers,
          start: start,
        ),
      );
    } catch (_) {
      showPlaybackError('Ouverture de la vidéo impossible.');
    }
  }

  void showPlaybackError(String message) {
    // macOS can report decoder or network errors while playback continues.
    if (!PlatformBridge.macos && !remote.active && mounted) {
      setState(() => error = message);
    }
  }

  Future<void> scrobble(String action) async {
    final duration = playbackDuration.inMilliseconds;
    if (duration > 0 && action != lastScrobble) {
      lastScrobble = action;
      await widget.library.trakt.scrobble(
        widget.item,
        playbackPosition.inMilliseconds / duration,
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
        playbackPosition,
        playbackDuration,
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
    tvPlayFocus.dispose();
    remote.removeListener(remoteChanged);
    remote.dispose();
    super.dispose();
  }

  Future<void> seek(int seconds) async {
    final duration = playbackDuration;
    final target = playbackPosition + Duration(seconds: seconds);
    await seekTo(
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

  Future<void> showSubtitles() {
    final panel = SubtitleSettingsDialog(
      releaseStyle: androidControls,
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
    );
    return androidControls
        ? showPlayerSettings<void>(context, panel)
        : showDialog<void>(context: context, builder: (_) => panel);
  }

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
          [
            context.l10n.mediaTitle(widget.item.title),
            if (PlatformBridge.android &&
                widget.season != null &&
                widget.episode != null)
              'S${widget.season.toString().padLeft(2, '0')}'
                  'E${widget.episode.toString().padLeft(2, '0')}',
          ].join('  '),
          style: const TextStyle(color: Colors.white),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
    ],
  );

  void changeVolume(double delta) =>
      unawaited(player.setVolume((player.state.volume + delta).clamp(0, 100)));

  Future<void> showVolume() => showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(context.tr('Volume')),
      content: SizedBox(
        width: 360,
        child: StreamBuilder<double>(
          stream: player.stream.volume,
          initialData: player.state.volume,
          builder: (_, snapshot) => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('${(snapshot.data ?? 100).round()} %'),
              Slider(
                autofocus: true,
                value: (snapshot.data ?? 100).clamp(0, 100),
                max: 100,
                divisions: 20,
                label: '${(snapshot.data ?? 100).round()} %',
                onChanged: player.setVolume,
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(context.tr('Fermer')),
        ),
      ],
    ),
  );

  Widget tvSeekBar(
    VoidCallback hold,
    VoidCallback release,
  ) => StreamBuilder<Duration>(
    stream: player.stream.position,
    initialData: player.state.position,
    builder: (_, snapshot) {
      final duration = player.state.duration.inMilliseconds.toDouble();
      return Slider(
        key: const ValueKey('tv-seek-bar'),
        value: (snapshot.data ?? Duration.zero).inMilliseconds.toDouble().clamp(
          0,
          duration,
        ),
        max: duration > 0 ? duration : 1,
        semanticFormatterCallback: (value) =>
            '${Duration(milliseconds: value.round()).inSeconds} / ${player.state.duration.inSeconds}',
        onChangeStart: (_) => hold(),
        onChangeEnd: (_) => release(),
        onChanged: duration > 0
            ? (value) =>
                  unawaited(player.seek(Duration(milliseconds: value.round())))
            : null,
      );
    },
  );

  Widget focusableTvControls(Widget child) => !tv
      ? child
      : IconButtonTheme(
          data: IconButtonThemeData(
            style: ButtonStyle(
              backgroundColor: WidgetStateProperty.resolveWith(
                (states) => states.contains(WidgetState.focused)
                    ? const Color(0xffbc123c)
                    : null,
              ),
              side: WidgetStateProperty.resolveWith(
                (states) => states.contains(WidgetState.focused)
                    ? const BorderSide(color: Colors.white, width: 2)
                    : null,
              ),
            ),
          ),
          child: child,
        );

  Widget desktopControls(
    VideoState state,
    BuildContext controlsContext,
    MaterialDesktopVideoControlsThemeData theme,
  ) => Stack(
    children: [
      PlayerControlsOverlay(
        remote: tv,
        remoteFocusNode: tvPlayFocus,
        onRemoteSelect: player.playOrPause,
        onRemoteSeek: (seconds) => unawaited(seek(seconds)),
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
          if (!tv)
            const SingleActivator(LogicalKeyboardKey.arrowLeft): () =>
                seek(-10),
          const SingleActivator(LogicalKeyboardKey.keyJ): () => seek(-10),
          if (!tv)
            const SingleActivator(LogicalKeyboardKey.arrowRight): () =>
                seek(10),
          const SingleActivator(LogicalKeyboardKey.keyI): () => seek(10),
          if (!tv)
            const SingleActivator(LogicalKeyboardKey.arrowUp): () =>
                changeVolume(5),
          if (!tv)
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
        builder: (hold, release) => focusableTvControls(
          DecoratedBox(
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
                  if (tv)
                    Expanded(
                      child: Center(
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              key: const ValueKey('tv-rewind'),
                              tooltip: context.tr('Reculer de 10 secondes'),
                              color: Colors.white,
                              iconSize: 40,
                              onPressed: () => seek(-10),
                              icon: const Icon(Icons.replay_10),
                            ),
                            const SizedBox(width: 32),
                            StreamBuilder<bool>(
                              stream: player.stream.playing,
                              initialData: player.state.playing,
                              builder: (_, snapshot) => IconButton(
                                key: const ValueKey('tv-play-pause'),
                                focusNode: tvPlayFocus,
                                tooltip: context.tr(
                                  snapshot.data == true ? 'Pause' : 'Lecture',
                                ),
                                color: Colors.white,
                                iconSize: 64,
                                onPressed: player.playOrPause,
                                icon: Icon(
                                  snapshot.data == true
                                      ? Icons.pause
                                      : Icons.play_arrow,
                                ),
                              ),
                            ),
                            const SizedBox(width: 32),
                            IconButton(
                              key: const ValueKey('tv-forward'),
                              tooltip: context.tr('Avancer de 10 secondes'),
                              color: Colors.white,
                              iconSize: 40,
                              onPressed: () => seek(10),
                              icon: const Icon(Icons.forward_10),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    const Spacer(),
                  if (tv)
                    tvSeekBar(hold, release)
                  else
                    MaterialDesktopSeekBar(
                      onSeekStart: hold,
                      onSeekEnd: release,
                    ),
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

  Widget miniPlayer() => Material(
    key: const ValueKey('mobile-mini-player'),
    color: const Color(0xff33292a),
    borderRadius: BorderRadius.circular(16),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: () => setState(() => minimized = false),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          StreamBuilder<Duration>(
            stream: player.stream.position,
            builder: (_, _) => LinearProgressIndicator(
              minHeight: 3,
              color: AndroidPlayerControls.red,
              backgroundColor: Colors.white12,
              value: playbackDuration.inMilliseconds > 0
                  ? (playbackPosition.inMilliseconds /
                            playbackDuration.inMilliseconds)
                        .clamp(0, 1)
                  : 0,
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(
              children: [
                if (widget.item.posterUrl case final poster?)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: Image.network(
                      poster,
                      width: 36,
                      height: 48,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) =>
                          const SizedBox(width: 36, height: 48),
                    ),
                  ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.item.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (widget.season != null && widget.episode != null)
                        Text(
                          'S${widget.season.toString().padLeft(2, '0')} E${widget.episode.toString().padLeft(2, '0')}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AndroidPlayerControls.tint,
                          ),
                        ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: context.tr('Diffuser sur Chromecast'),
                  onPressed: () => showRemoteChooser(false),
                  icon: const Icon(
                    Icons.cast,
                    color: AndroidPlayerControls.tint,
                  ),
                ),
                StreamBuilder<bool>(
                  stream: player.stream.playing,
                  builder: (_, _) => IconButton(
                    key: const ValueKey('mini-play-pause'),
                    tooltip: context.tr(isPlaying ? 'Pause' : 'Lecture'),
                    onPressed: playOrPause,
                    icon: Icon(
                      isPlaying
                          ? Icons.pause_rounded
                          : Icons.play_arrow_rounded,
                      color: AndroidPlayerControls.tint,
                    ),
                  ),
                ),
                IconButton(
                  key: const ValueKey('mini-close'),
                  tooltip: context.tr('Fermer'),
                  onPressed: closePlayer,
                  icon: const Icon(
                    Icons.close,
                    color: AndroidPlayerControls.tint,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );

  Future<void> showRemoteChooser(bool airPlay) async {
    try {
      if (airPlay) {
        await PlatformBridge.discoverAirPlay();
      } else {
        await remote.initializeCast();
        await GoogleCastDiscoveryManager.instance.startDiscovery(
          activeScan: true,
        );
      }
      if (!mounted) return;
      var busy = false;
      String? failure;
      await showModalBottomSheet<void>(
        context: context,
        backgroundColor: const Color(0xff33292a),
        isScrollControlled: true,
        builder: (sheetContext) => StatefulBuilder(
          builder: (sheetContext, update) {
            Future<void> connect(Object device) async {
              if (busy) return;
              update(() {
                busy = true;
                failure = null;
              });
              final wasRemote = remote.active;
              try {
                final start = playbackPosition;
                final total = playbackDuration;
                if (remote.active) await remote.disconnect();
                if (airPlay) {
                  await remote.airPlayTo(
                    device as Map<String, dynamic>,
                    widget.source,
                    start,
                    total,
                  );
                } else {
                  await remote.castTo(
                    device as GoogleCastDevice,
                    widget.source,
                    widget.item.title,
                    start,
                    total,
                  );
                }
                await player.pause();
                if (sheetContext.mounted) Navigator.pop(sheetContext);
              } catch (_) {
                if (wasRemote && !remote.active && !closed) await resumeLocal();
                if (sheetContext.mounted) {
                  update(() {
                    failure = 'Connexion impossible. Vérifie le récepteur et réessaie.';
                    busy = false;
                  });
                }
              }
            }

            Widget devices(List<Object> values) => Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (busy) const LinearProgressIndicator(),
                if (failure != null)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(context.tr(failure!)),
                  ),
                if (remote.active)
                  ListTile(
                    leading: const Icon(Icons.stop_circle_outlined),
                    title: Text(context.tr('Arrêter la diffusion')),
                    onTap: busy
                        ? null
                        : () async {
                            try {
                              await remote.disconnect();
                              await resumeLocal();
                              if (sheetContext.mounted) {
                                Navigator.pop(sheetContext);
                              }
                            } catch (_) {
                              remoteError();
                            }
                          },
                  ),
                if (values.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      context.tr('Aucun appareil trouvé sur le réseau local.'),
                    ),
                  ),
                for (final device in values)
                  ListTile(
                    leading: Icon(airPlay ? Icons.airplay : Icons.cast),
                    title: Text(
                      device is GoogleCastDevice
                          ? device.friendlyName
                          : '${(device as Map)['name']}',
                    ),
                    subtitle: Text(airPlay ? 'AirPlay' : 'Chromecast'),
                    onTap: busy ? null : () => connect(device),
                  ),
              ],
            );
            return SafeArea(
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.sizeOf(sheetContext).height * .7,
                ),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                context.tr(
                                  airPlay
                                      ? 'Diffuser avec AirPlay'
                                      : 'Diffuser sur Chromecast',
                                ),
                                style: const TextStyle(fontSize: 16),
                              ),
                            ),
                            IconButton(
                              tooltip: context.tr('Fermer'),
                              onPressed: () => Navigator.pop(sheetContext),
                              icon: const Icon(Icons.close),
                            ),
                          ],
                        ),
                      ),
                      if (airPlay)
                        ValueListenableBuilder<List<Map<String, dynamic>>>(
                          valueListenable: PlatformBridge.airPlayDevices,
                          builder: (_, values, _) => devices(values),
                        )
                      else
                        StreamBuilder<List<GoogleCastDevice>>(
                          stream:
                              GoogleCastDiscoveryManager.instance.devicesStream,
                          initialData:
                              GoogleCastDiscoveryManager.instance.devices,
                          builder: (_, snapshot) =>
                              devices(snapshot.data ?? []),
                        ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      );
    } catch (_) {
      remoteError();
    } finally {
      if (airPlay) {
        await PlatformBridge.stopAirPlayDiscovery();
      } else if (remote.initialized) {
        await GoogleCastDiscoveryManager.instance.stopDiscovery();
      }
    }
  }

  Widget androidVideoControls(VideoState state, BuildContext controlsContext) {
    final fullscreen = isFullscreen(controlsContext);
    final title = widget.item.title;
    return Stack(
      children: [
        PlayerControlsOverlay(
          remote: tv,
          remoteFocusNode: tvPlayFocus,
          onRemoteSelect: playOrPause,
          onRemoteSeek: (seconds) => unawaited(seek(seconds)),
          onExit: () {
            if (fullscreen) {
              unawaited(exitFullscreen(controlsContext));
            } else {
              closePlayer();
            }
          },
          onDoubleTap: () {},
          onDoubleTapAt: tv
              ? null
              : (offset) {
                  final width =
                      controlsContext.size?.width ??
                      MediaQuery.sizeOf(controlsContext).width;
                  if (offset.dx < width / 3) unawaited(seek(-10));
                  if (offset.dx > width * 2 / 3) unawaited(seek(10));
                },
          onVisibilityChanged: (visible) => state.setSubtitleViewPadding(
            EdgeInsets.only(bottom: visible ? 96 : 24),
          ),
          shortcuts: {
            const SingleActivator(LogicalKeyboardKey.space): playOrPause,
            const SingleActivator(LogicalKeyboardKey.mediaPlayPause):
                playOrPause,
          },
          builder: (hold, release) {
            Future<void> menu(Future<void> Function() action) async {
              hold();
              try {
                await action();
              } finally {
                release();
              }
            }

            return StreamBuilder<Duration>(
              stream: player.stream.position,
              builder: (_, _) => StreamBuilder<bool>(
                stream: player.stream.playing,
                builder: (_, _) => StreamBuilder<double>(
                  stream: player.stream.volume,
                  builder: (_, _) => AndroidPlayerControls(
                    tv: tv,
                    title: title,
                    fullscreen: fullscreen,
                    playing: isPlaying,
                    position: playbackPosition,
                    duration: playbackDuration,
                    buffered: player.state.buffer,
                    volume: player.state.volume,
                    playFocus: tvPlayFocus,
                    hold: hold,
                    release: release,
                    onClose: closePlayer,
                    onMinimize: () async {
                      if (fullscreen) await exitFullscreen(controlsContext);
                      if (!mounted) return;
                      if (widget.onClose != null) {
                        setState(() => minimized = true);
                      } else {
                        closePlayer();
                      }
                    },
                    onPlayPause: playOrPause,
                    onRewind: () => seek(-10),
                    onForward: () => seek(10),
                    onSubtitles: () => menu(showSubtitles),
                    onPip: () => enterPip(controlsContext),
                    onFullscreen: () => togglePlayerFullscreen(controlsContext),
                    onCast: () => menu(() => showRemoteChooser(false)),
                    onAirPlay: () => menu(() => showRemoteChooser(true)),
                    onSeek: (target) => unawaited(seekTo(target)),
                    onVolume: (value) => unawaited(player.setVolume(value)),
                    aspectButton: AspectRatioButton(
                      mode: aspectMode,
                      color: tv ? Colors.white : AndroidPlayerControls.tint,
                      releaseStyle: true,
                      tv: tv,
                      onMenuOpen: hold,
                      onMenuClose: release,
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
                          widget.library.prefs.setString(
                            'videoAspectMode',
                            mode.name,
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),
            );
          },
        ),
        StreamBuilder<bool>(
          stream: player.stream.buffering,
          initialData: player.state.buffering,
          builder: (_, snapshot) => snapshot.data == true && !remote.active
              ? const Center(
                  child: IgnorePointer(child: CircularProgressIndicator()),
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }

  Widget videoControls(VideoState state) => LayoutBuilder(
    builder: (context, constraints) {
      if (androidControls) return androidVideoControls(state, context);
      final compact = constraints.maxWidth < 600;
      // Use this controls tree: VideoState can briefly retain the fullscreen
      // route's deactivated context while returning to the normal player.
      final fullscreen = isFullscreen(context);
      final actions = [
        if (tv)
          IconButton(
            key: const ValueKey('player-volume'),
            tooltip: context.tr('Volume'),
            color: Colors.white,
            onPressed: showVolume,
            icon: const Icon(Icons.volume_up),
          ),
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
        seekBarPositionColor: const Color(0xffed214d),
        seekBarThumbColor: const Color(0xffed214d),
        // The release places the timeline above the time and action row.
        seekBarMargin: const EdgeInsets.fromLTRB(16, 0, 16, 56),
        primaryButtonBar: [
          if (PlatformBridge.android)
            IconButton(
              tooltip: context.tr('Reculer de 10 secondes'),
              color: Colors.white,
              iconSize: 40,
              onPressed: () => seek(-10),
              icon: const Icon(Icons.replay_10),
            ),
          MaterialPlayOrPauseButton(
            iconSize: PlatformBridge.android ? 64 : null,
          ),
          if (PlatformBridge.android)
            IconButton(
              tooltip: context.tr('Avancer de 10 secondes'),
              color: Colors.white,
              iconSize: 40,
              onPressed: () => seek(10),
              icon: const Icon(Icons.forward_10),
            ),
        ],
        // The timeline retains its own row, leaving room for all actions on phones.
        bottomButtonBar: [
          if (PlatformBridge.deviceIsTv) const MaterialDesktopVolumeButton(),
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
          if (!tv) const MaterialDesktopPlayOrPauseButton(),
          if (!compact) ...[
            if (!tv) const MaterialDesktopVolumeButton(),
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
      final controls = tv || !mobilePlatform
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
  Widget build(BuildContext context) =>
      !androidControls || tv || widget.onClose == null
      ? expandedPlayer()
      : PopScope(
          canPop: minimized,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) setState(() => minimized = true);
          },
          child: Stack(
            children: [
              Offstage(offstage: minimized, child: expandedPlayer()),
              if (minimized)
                Positioned(
                  left: 10,
                  right: 10,
                  bottom: MediaQuery.paddingOf(context).bottom + 80,
                  child: miniPlayer(),
                ),
            ],
          ),
        );

  Widget expandedPlayer() => Scaffold(
    backgroundColor: Colors.black,
    body: CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.space): () =>
            player.playOrPause(),
        const SingleActivator(LogicalKeyboardKey.mediaPlayPause): () =>
            player.playOrPause(),
        if (!tv)
          const SingleActivator(LogicalKeyboardKey.arrowLeft): () => seek(-10),
        if (!tv)
          const SingleActivator(LogicalKeyboardKey.arrowRight): () => seek(10),
        const SingleActivator(LogicalKeyboardKey.escape): () =>
            pip ? exitPip() : closePlayer(),
      },
      child: Actions(
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) => player.playOrPause(),
          ),
        },
        child: Focus(
          // Desktop and TV overlays own focus, including hidden-control keys.
          autofocus:
              pip ||
              (!tv &&
                  [
                    TargetPlatform.android,
                    TargetPlatform.iOS,
                  ].contains(Theme.of(context).platform)),
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
                        padding: androidControls
                            ? const EdgeInsets.fromLTRB(16, 0, 16, 96)
                            : const EdgeInsets.fromLTRB(16, 0, 16, 24),
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
                  !PlatformBridge.android &&
                  !tv &&
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
                            onPressed: closePlayer,
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
