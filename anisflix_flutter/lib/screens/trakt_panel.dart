import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/trakt.dart';

class TraktPanel extends StatefulWidget {
  final TraktService service;
  const TraktPanel({super.key, required this.service});
  @override
  State<TraktPanel> createState() => _TraktPanelState();
}

class _TraktPanelState extends State<TraktPanel> {
  Timer? timer;
  @override
  void initState() {
    super.initState();
    timer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => widget.service.poll(),
    );
  }

  @override
  void dispose() {
    timer?.cancel();
    if (widget.service.challenge != null) widget.service.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.service,
    builder: (context, _) {
      final service = widget.service, c = service.challenge;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Image.asset(
                'assets/images/trakt_icon.png',
                width: 32,
                height: 32,
              ),
              const SizedBox(width: 12),
              Text('Trakt', style: Theme.of(context).textTheme.titleLarge),
            ],
          ),
          const SizedBox(height: 12),
          if (service.connected) ...[
            const Text('Compte connecté · suivi de lecture activé'),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () async {
                try {
                  await service.disconnect();
                } catch (_) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Le stockage sécurisé est indisponible.'),
                      ),
                    );
                  }
                }
              },
              child: const Text('Déconnecter cet appareil'),
            ),
          ] else if (c != null) ...[
            const Text('Ouvre trakt.tv/activate et saisis ce code :'),
            const SizedBox(height: 8),
            SelectableText(
              c.userCode,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              children: [
                FilledButton(
                  onPressed: () => launchUrl(
                    c.verification,
                    mode: LaunchMode.externalApplication,
                  ),
                  child: const Text('Ouvrir Trakt'),
                ),
                TextButton(
                  onPressed: service.cancel,
                  child: const Text('Annuler'),
                ),
              ],
            ),
          ] else
            FilledButton(
              onPressed: service.busy ? null : service.begin,
              child: Text(service.busy ? 'Connexion…' : 'Connecter Trakt'),
            ),
          if (service.error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(service.error!),
            ),
        ],
      );
    },
  );
}
