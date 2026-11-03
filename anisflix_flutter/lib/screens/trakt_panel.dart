import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../l10n/app_localizations.dart';
import '../services/trakt.dart';

class TraktPanel extends StatelessWidget {
  final TraktService service;
  const TraktPanel({super.key, required this.service});

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: service,
    builder: (context, _) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (service.connected) ...[
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.check_circle, color: Colors.green),
            title: Text(context.tr('Connecté à Trakt')),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(context.tr('Déconnecter cet appareil')),
            textColor: Theme.of(context).colorScheme.error,
            trailing: const Icon(Icons.cancel_outlined),
            onTap: () async {
              try {
                await service.disconnect();
              } catch (_) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        context.tr('Le stockage sécurisé est indisponible.'),
                      ),
                    ),
                  );
                }
              }
            },
          ),
        ] else
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(context.tr('Connecter Trakt')),
            trailing: const Icon(Icons.link),
            onTap: () async {
              await showDialog<void>(
                context: context,
                builder: (_) => _TraktAuthDialog(service: service),
              );
              if (!service.connected) service.cancel();
            },
          ),
      ],
    ),
  );
}

class _TraktAuthDialog extends StatefulWidget {
  final TraktService service;
  const _TraktAuthDialog({required this.service});
  @override
  State<_TraktAuthDialog> createState() => _TraktAuthDialogState();
}

class _TraktAuthDialogState extends State<_TraktAuthDialog> {
  Timer? timer;
  bool closing = false;

  @override
  void initState() {
    super.initState();
    widget.service.addListener(authChanged);
    timer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => widget.service.poll(),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(widget.service.begin());
    });
  }

  void authChanged() {
    if (!widget.service.connected || closing || !mounted) return;
    closing = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.pop(context);
    });
  }

  @override
  void dispose() {
    timer?.cancel();
    widget.service.removeListener(authChanged);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.service,
    builder: (context, _) {
      final service = widget.service, challenge = service.challenge;
      return AlertDialog(
        title: Text(context.tr('Connecter Trakt')),
        content: SizedBox(
          width: 400,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (challenge != null) ...[
                  Text(
                    context.tr('Ouvre trakt.tv/activate et saisis ce code :'),
                  ),
                  const SizedBox(height: 16),
                  SelectableText(
                    challenge.userCode,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: () => launchUrl(
                      challenge.verification,
                      mode: LaunchMode.externalApplication,
                    ),
                    icon: const Icon(Icons.open_in_new),
                    label: Text(context.tr('Ouvrir Trakt')),
                  ),
                  const SizedBox(height: 16),
                  Text(context.tr('En attente d’autorisation…')),
                ] else if (service.busy)
                  const Center(child: CircularProgressIndicator()),
                if (service.error != null) ...[
                  const SizedBox(height: 12),
                  Text(context.l10n.message(service.error!)),
                  TextButton(
                    onPressed: service.busy ? null : service.begin,
                    child: Text(context.tr('Réessayer')),
                  ),
                ],
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(context.tr('Annuler')),
          ),
        ],
      );
    },
  );
}
