import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';

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
          Text(
            context.tr("Mises à jour"),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            context.tr("Version installée : {0}", [
              controller.installed ?? '…',
            ]),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(context.tr("Vérifier au démarrage")),
            subtitle: Text(context.tr("Le téléchargement demande ton accord.")),
            value: controller.automatic,
            onChanged: controller.setAutomatic,
          ),
          if (controller.message != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                context.l10n.message(controller.message!),
                key: const ValueKey('update-message'),
              ),
            ),
          if (controller.available case final update?) ...[
            Text(context.tr("Nouvelle version : {0}", [update.version])),
            if (update.notes.isNotEmpty)
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                title: Text(context.tr("Nouveautés")),
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
                      ? context.tr("Vérification…")
                      : context.tr("Vérifier les mises à jour"),
                ),
              ),
              if (controller.available != null && controller.downloaded == null)
                FilledButton.icon(
                  onPressed: busy ? null : controller.download,
                  icon: const Icon(Icons.download),
                  label: Text(context.tr("Télécharger la mise à jour")),
                ),
              if (controller.downloaded != null)
                FilledButton.icon(
                  onPressed: busy ? null : controller.install,
                  icon: const Icon(Icons.system_update),
                  label: Text(
                    controller.target?.platform == 'macos'
                        ? context.tr("Afficher dans le Finder")
                        : context.tr("Installer"),
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
        content: Text(
          context.tr("AnisFlix {0} est disponible.", [update.version.name]),
        ),
        actions: [
          TextButton(
            onPressed: () =>
                setState(() => dismissed = update.version.toString()),
            child: Text(context.tr("Plus tard")),
          ),
          TextButton(
            onPressed: widget.onOpen,
            child: Text(context.tr("Voir la mise à jour")),
          ),
        ],
      );
    },
  );
}
