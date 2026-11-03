import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Owns desktop controls visibility so Escape and auto-hide share one state.
class PlayerControlsOverlay extends StatefulWidget {
  final Widget Function(VoidCallback hold, VoidCallback release) builder;
  final VoidCallback onExit;
  final VoidCallback onDoubleTap;
  final ValueChanged<bool>? onVisibilityChanged;
  final ValueChanged<PointerSignalEvent>? onPointerSignal;
  final Map<ShortcutActivator, VoidCallback> shortcuts;

  const PlayerControlsOverlay({
    super.key,
    required this.builder,
    required this.onExit,
    required this.onDoubleTap,
    required this.shortcuts,
    this.onVisibilityChanged,
    this.onPointerSignal,
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
    if (!holding) timer = Timer(const Duration(seconds: 3), hide);
  }

  void show() {
    if (!visible) {
      setState(() => visible = true);
      widget.onVisibilityChanged?.call(true);
    }
    scheduleHide();
  }

  void hide() {
    timer?.cancel();
    if (!visible) return;
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

  void tap(TapUpDetails details) {
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
  Widget build(BuildContext context) => CallbackShortcuts(
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
      onKeyEvent: (_, event) =>
          event is KeyRepeatEvent &&
              event.logicalKey == LogicalKeyboardKey.escape
          ? KeyEventResult.handled
          : KeyEventResult.ignored,
      child: SizedBox.expand(
        child: MouseRegion(
          onEnter: (_) => show(),
          onHover: (_) => show(),
          onExit: (_) {
            if (!holding && ModalRoute.of(context)?.isCurrent != false) hide();
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
  );
}
