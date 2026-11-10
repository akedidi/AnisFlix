import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Owns desktop controls visibility so Escape and auto-hide share one state.
class PlayerControlsOverlay extends StatefulWidget {
  final Widget Function(VoidCallback hold, VoidCallback release) builder;
  final VoidCallback onExit;
  final VoidCallback onDoubleTap;
  final ValueChanged<Offset>? onDoubleTapAt;
  final ValueChanged<bool>? onVisibilityChanged;
  final ValueChanged<PointerSignalEvent>? onPointerSignal;
  final Future<void> Function()? onDragStart;
  final Map<ShortcutActivator, VoidCallback> shortcuts;
  final bool remote;
  final FocusNode? remoteFocusNode;
  final VoidCallback? onRemoteSelect;
  final ValueChanged<int>? onRemoteSeek;

  const PlayerControlsOverlay({
    super.key,
    required this.builder,
    required this.onExit,
    required this.onDoubleTap,
    this.onDoubleTapAt,
    required this.shortcuts,
    this.onVisibilityChanged,
    this.onPointerSignal,
    this.onDragStart,
    this.remote = false,
    this.remoteFocusNode,
    this.onRemoteSelect,
    this.onRemoteSeek,
  });

  @override
  State<PlayerControlsOverlay> createState() => _PlayerControlsOverlayState();
}

class _PlayerControlsOverlayState extends State<PlayerControlsOverlay> {
  final focus = FocusNode();
  Timer? timer;
  bool visible = true;
  bool holding = false;
  DateTime? lastTap;
  Offset? lastTapPosition;

  @override
  void initState() {
    super.initState();
    scheduleHide();
  }

  void scheduleHide() {
    timer?.cancel();
    if (!mounted) return;
    if (!holding) timer = Timer(const Duration(seconds: 3), hide);
  }

  void show() {
    if (!mounted) return;
    if (!visible) {
      setState(() => visible = true);
      widget.onVisibilityChanged?.call(true);
    }
    scheduleHide();
  }

  void hide() {
    timer?.cancel();
    if (!mounted || !visible) return;
    Tooltip.dismissAllToolTips();
    setState(() => visible = false);
    widget.onVisibilityChanged?.call(false);
    // Keyboard input must not remain attached to an invisible button.
    if (focus.hasFocus && ModalRoute.of(context)?.isCurrent != false) {
      focus.requestFocus();
    }
  }

  void hold() {
    holding = true;
    timer?.cancel();
  }

  void release() {
    holding = false;
    scheduleHide();
  }

  KeyEventResult remoteKey(FocusNode _, KeyEvent event) {
    if (!widget.remote ||
        ModalRoute.of(context)?.isCurrent == false ||
        (event is! KeyDownEvent && event is! KeyRepeatEvent)) {
      return KeyEventResult.ignored;
    }
    final key = event.logicalKey;
    final select =
        key == LogicalKeyboardKey.select ||
        key == LogicalKeyboardKey.enter ||
        key == LogicalKeyboardKey.numpadEnter;
    final horizontal =
        key == LogicalKeyboardKey.arrowLeft ||
        key == LogicalKeyboardKey.arrowRight;
    final vertical =
        key == LogicalKeyboardKey.arrowUp ||
        key == LogicalKeyboardKey.arrowDown;
    if (!select && !horizontal && !vertical) return KeyEventResult.ignored;
    final wasHidden = !visible;
    show();
    if (wasHidden || focus.hasPrimaryFocus) {
      if (select) {
        if (event is KeyDownEvent) widget.onRemoteSelect?.call();
      } else if (horizontal) {
        widget.onRemoteSeek?.call(
          key == LogicalKeyboardKey.arrowLeft ? -10 : 10,
        );
      } else {
        // ExcludeFocus must rebuild before a hidden control can take focus.
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && visible) widget.remoteFocusNode?.requestFocus();
        });
      }
      return KeyEventResult.handled;
    }
    // Visible buttons use directional traversal and their own activation.
    return KeyEventResult.ignored;
  }

  void tap(TapUpDetails details) {
    show();
    focus.requestFocus();
    final now = DateTime.now();
    final previous = lastTap;
    final position = lastTapPosition;
    if (previous != null &&
        position != null &&
        now.difference(previous) < const Duration(milliseconds: 400) &&
        (details.localPosition - position).distance < 20) {
      lastTap = null;
      widget.onDoubleTap();
      widget.onDoubleTapAt?.call(details.localPosition);
    } else {
      lastTap = now;
      lastTapPosition = details.localPosition;
    }
  }

  @override
  void dispose() {
    timer?.cancel();
    focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !widget.remote || !visible,
    onPopInvokedWithResult: (didPop, _) {
      if (!didPop && widget.remote) hide();
    },
    child: CallbackShortcuts(
      bindings: {
        ...widget.shortcuts,
        const SingleActivator(
          LogicalKeyboardKey.escape,
          includeRepeats: false,
        ): () =>
            visible ? hide() : widget.onExit(),
      },
      child: Focus(
        autofocus: true,
        focusNode: focus,
        onKeyEvent: (node, event) {
          if (event is KeyRepeatEvent &&
              event.logicalKey == LogicalKeyboardKey.escape) {
            return KeyEventResult.handled;
          }
          return remoteKey(node, event);
        },
        child: SizedBox.expand(
          child: MouseRegion(
            onEnter: (_) => show(),
            onHover: (_) => show(),
            onExit: (_) {
              if (!holding && ModalRoute.of(context)?.isCurrent != false) {
                hide();
              }
            },
            child: Listener(
              onPointerSignal: widget.onPointerSignal,
              onPointerDown: (_) => hold(),
              onPointerUp: (_) => release(),
              onPointerCancel: (_) => release(),
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                // A double-tap recognizer would delay every child button's tap.
                onTapUp: tap,
                onPanStart: widget.onDragStart == null
                    ? null
                    : (_) {
                        hold();
                        unawaited(widget.onDragStart!());
                      },
                onPanEnd: widget.onDragStart == null ? null : (_) => release(),
                onPanCancel: widget.onDragStart == null ? null : release,
                child: IgnorePointer(
                  ignoring: !visible,
                  child: ExcludeFocus(
                    excluding: !visible,
                    child: ExcludeSemantics(
                      excluding: !visible,
                      child: AnimatedOpacity(
                        key: const ValueKey('player-controls-visibility'),
                        opacity: visible ? 1 : 0,
                        duration: const Duration(milliseconds: 150),
                        child: widget.builder(hold, release),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
