import 'dart:io';

import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../models/media.dart';
import '../services/downloads.dart';
import '../services/library.dart';
import '../services/platform_bridge.dart';
import 'player.dart';

class DownloadsScreen extends StatefulWidget {
  final Library library;
  const DownloadsScreen({super.key, required this.library});
  @override
  State<DownloadsScreen> createState() => _DownloadsScreenState();
}

class _DownloadsScreenState extends State<DownloadsScreen> {
  bool inProgress = false;
  Library get library => widget.library;
  bool get mobile => PlatformBridge.android && !PlatformBridge.deviceIsTv;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: Listenable.merge([library, Downloads.changes]),
    builder: (context, _) => ListView(
      padding: const EdgeInsets.all(24),
      children: [
        if (mobile) ...[
          SegmentedButton<bool>(
            segments: [
              ButtonSegment(value: false, label: Text(context.tr('Terminés'))),
              ButtonSegment(value: true, label: Text(context.tr('En cours'))),
            ],
            selected: {inProgress},
            onSelectionChanged: (value) =>
                setState(() => inProgress = value.single),
          ),
          const SizedBox(height: 24),
          if (inProgress ? Downloads.active.isEmpty : library.downloads.isEmpty)
            Center(
              child: Text(
                context.tr(
                  inProgress
                      ? 'Aucun téléchargement en cours'
                      : 'Aucun téléchargement terminé',
                ),
              ),
            ),
        ],
        for (final entry in Downloads.errors.entries)
          Card(
            child: ListTile(
              leading: const Icon(Icons.error_outline),
              title: Text(context.l10n.message(entry.value)),
              trailing: IconButton(
                tooltip: context.tr("Fermer"),
                onPressed: () {
                  Downloads.errors.remove(entry.key);
                  Downloads.notify(force: true);
                },
                icon: const Icon(Icons.close),
              ),
            ),
          ),
        if (!mobile && Downloads.active.isEmpty && library.downloads.isEmpty)
          Text(context.tr("Tes fichiers téléchargés apparaîtront ici.")),
        if (!mobile || inProgress)
          for (final job in Downloads.active.values)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            context.tr("{0} · {1} Mo", [
                              job.title,
                              context.l10n.decimal(job.received / 1048576),
                            ]),
                          ),
                        ),
                        IconButton(
                          tooltip: context.tr("Annuler"),
                          onPressed: job.cancel,
                          icon: const Icon(Icons.close),
                        ),
                      ],
                    ),
                    LinearProgressIndicator(value: job.progress),
                  ],
                ),
              ),
            ),
        if (!mobile || !inProgress)
          for (final entry in library.downloads)
            Card(
              child: ListTile(
                leading: const Icon(Icons.offline_pin_outlined),
                title: Text(
                  (entry['media'] as Map)['title'] ?? context.tr("Vidéo"),
                ),
                subtitle: entry['season'] == null
                    ? Text(context.tr("Disponible hors ligne"))
                    : Text(
                        context.tr("Saison {0} · Épisode {1}", [
                          entry['season'],
                          entry['episode'],
                        ]),
                      ),
                onTap: () async {
                  if (!await File(entry['path'] as String).exists()) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            context.tr("Ce fichier a été déplacé ou supprimé."),
                          ),
                        ),
                      );
                    }
                    return;
                  }
                  if (context.mounted) {
                    await PlayerScreen.present(
                      context,
                      library: library,
                      item: MediaItem.fromJson(
                        Map<String, dynamic>.from(entry['media']),
                      ),
                      source: StreamSource(
                        entry['path'],
                        context.tr('Hors ligne'),
                      ),
                      season: entry['season'],
                      episode: entry['episode'],
                    );
                  }
                },
                trailing: IconButton(
                  tooltip: context.tr("Supprimer le fichier"),
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: Text(
                          context.tr("Supprimer ce téléchargement ?"),
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: Text(context.tr("Conserver")),
                          ),
                          FilledButton(
                            onPressed: () => Navigator.pop(context, true),
                            child: Text(context.tr("Supprimer")),
                          ),
                        ],
                      ),
                    );
                    if (confirmed == true) {
                      try {
                        await Downloads.remove(library, entry);
                      } catch (_) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                context.tr(
                                  "Impossible de supprimer ce fichier.",
                                ),
                              ),
                            ),
                          );
                        }
                      }
                    }
                  },
                ),
              ),
            ),
      ],
    ),
  );
}
