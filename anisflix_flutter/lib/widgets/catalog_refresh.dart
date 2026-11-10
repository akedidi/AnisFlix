import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart' show ScrollCacheExtent;

import '../l10n/app_localizations.dart';

/// Shares the same refresh gesture and loading feedback across catalogues.
class CatalogRefresh extends StatefulWidget {
  final Future<void> Function() onRefresh;
  final List<Widget> slivers;
  final ScrollController? controller;
  final Key? scrollKey;
  final ScrollCacheExtent? scrollCacheExtent;
  final bool reserveRefreshSpace, showButton;

  const CatalogRefresh({
    super.key,
    required this.onRefresh,
    required this.slivers,
    this.controller,
    this.scrollKey,
    this.scrollCacheExtent,
    this.reserveRefreshSpace = false,
    this.showButton = true,
  });

  @override
  State<CatalogRefresh> createState() => _CatalogRefreshState();
}

class _CatalogRefreshState extends State<CatalogRefresh> {
  final ownController = ScrollController();
  ScrollController get controller => widget.controller ?? ownController;
  bool refreshing = false;
  bool revealing = false;

  @override
  void dispose() {
    ownController.dispose();
    super.dispose();
  }

  Future<void> showRefresh() async {
    if (refreshing || revealing || !controller.hasClients) return;
    setState(() => revealing = true);
    try {
      await controller.animateTo(
        controller.position.minScrollExtent - 140,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    } finally {
      if (mounted) setState(() => revealing = false);
    }
  }

  Future<void> refresh() async {
    if (refreshing) return;
    setState(() => refreshing = true);
    try {
      // Keep feedback visible on fast responses without blocking Flutter's UI.
      await Future.wait([
        Future<void>.sync(widget.onRefresh),
        Future<void>.delayed(const Duration(seconds: 2)),
      ]);
    } finally {
      if (mounted) setState(() => refreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) => Stack(
    children: [
      Positioned.fill(
        top: widget.reserveRefreshSpace ? 56 : 0,
        child: ScrollConfiguration(
          behavior: ScrollConfiguration.of(context).copyWith(
            dragDevices: {
              ...ScrollConfiguration.of(context).dragDevices,
              PointerDeviceKind.mouse,
            },
          ),
          child: AbsorbPointer(
            absorbing: refreshing,
            child: CustomScrollView(
              key: widget.scrollKey,
              controller: controller,
              scrollCacheExtent: widget.scrollCacheExtent,
              physics: const BouncingScrollPhysics(
                parent: AlwaysScrollableScrollPhysics(),
              ),
              slivers: [
                // Occupy space in the scroll view until refresh completes,
                // so the content stays pulled down during the loading pause.
                CupertinoSliverRefreshControl(onRefresh: refresh),
                ...widget.slivers,
              ],
            ),
          ),
        ),
      ),
      if (widget.showButton)
        Positioned(
          top: 12,
          right: 16,
          child: IconButton.filledTonal(
            tooltip: context.tr('Actualiser'),
            onPressed: refreshing || revealing
                ? null
                : () => unawaited(showRefresh()),
            icon: const Icon(Icons.refresh),
          ),
        ),
    ],
  );
}
