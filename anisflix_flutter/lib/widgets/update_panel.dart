import 'package:flutter/material.dart';

import '../services/app_updates.dart';

class UpdatePanel extends StatelessWidget {
  final UpdateController controller;
  const UpdatePanel({super.key, required this.controller});
  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: controller,
    builder: (context, _) {
      final busy = controller.checking || controller.downloading;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Mises à jour', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text('Version installée : ${controller.installed ?? '…'}'),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Vérifier au démarrage'),
            subtitle: const Text('Le téléchargement demande ton accord.'),
            value: controller.automatic,
            onChanged: controller.setAutomatic,
          ),
          if (controller.message != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                controller.message!,
                key: const ValueKey('update-message'),
              ),
            ),
          if (controller.available case final update?) ...[
            Text('Nouvelle version : ${update.version}'),
            if (update.notes.isNotEmpty)
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                title: const Text('Nouveautés'),
                children: [SelectableText(update.notes)],
              ),
          ],
          if (controller.downloading) ...[
            const SizedBox(height: 12),
            LinearProgressIndicator(value: controller.progress),
            Text('${(controller.progress * 100).round()} %'),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              OutlinedButton.icon(
                onPressed: busy ? null : controller.check,
                icon: const Icon(Icons.refresh),
                label: Text(
                  controller.checking
                      ? 'Vérification…'
                      : 'Vérifier les mises à jour',
                ),
              ),
              if (controller.available != null && controller.downloaded == null)
                FilledButton.icon(
                  onPressed: busy ? null : controller.download,
                  icon: const Icon(Icons.download),
                  label: const Text('Télécharger la mise à jour'),
                ),
              if (controller.downloaded != null)
                FilledButton.icon(
                  onPressed: busy ? null : controller.install,
                  icon: const Icon(Icons.system_update),
                  label: Text(
                    controller.target?.platform == 'macos'
                        ? 'Afficher dans le Finder'
                        : 'Installer',
                  ),
                ),
            ],
          ),
        ],
      );
    },
  );
}

class UpdateNotice extends StatefulWidget {
  final UpdateController controller;
  final VoidCallback onOpen;
  const UpdateNotice({
    super.key,
    required this.controller,
    required this.onOpen,
  });
  @override
  State<UpdateNotice> createState() => _UpdateNoticeState();
}

class _UpdateNoticeState extends State<UpdateNotice> {
  String? dismissed;
  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.controller,
    builder: (context, _) {
      final update = widget.controller.available;
      if (update == null || dismissed == update.version.toString()) {
        return const SizedBox.shrink();
      }
      return MaterialBanner(
        content: Text('AnisFlix ${update.version.name} est disponible.'),
        actions: [
          TextButton(
            onPressed: () =>
                setState(() => dismissed = update.version.toString()),
            child: const Text('Plus tard'),
          ),
          TextButton(
            onPressed: widget.onOpen,
            child: const Text('Voir la mise à jour'),
          ),
        ],
      );
    },
  );
}
