import 'dart:io';

import 'package:flutter/material.dart';

import '../models/media.dart';
import '../services/downloads.dart';
import '../services/library.dart';
import 'player.dart';

class DownloadsScreen extends StatelessWidget {
  final Library library;
  const DownloadsScreen({super.key, required this.library});
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: Listenable.merge([library, Downloads.changes]),
    builder: (context, _) => ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          'Téléchargements',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: 16),
        for (final entry in Downloads.errors.entries)
          Card(
            child: ListTile(
              leading: const Icon(Icons.error_outline),
              title: Text(entry.value),
              trailing: IconButton(
                tooltip: 'Fermer',
                onPressed: () {
                  Downloads.errors.remove(entry.key);
                  Downloads.notify(force: true);
                },
                icon: const Icon(Icons.close),
              ),
            ),
          ),
        if (Downloads.active.isEmpty && library.downloads.isEmpty)
          const Text('Tes fichiers téléchargés apparaîtront ici.'),
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
                          '${job.title} · ${(job.received / 1048576).toStringAsFixed(1)} Mo',
                        ),
                      ),
                      IconButton(
                        tooltip: 'Annuler',
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
        for (final entry in library.downloads)
          Card(
            child: ListTile(
              leading: const Icon(Icons.offline_pin_outlined),
              title: Text((entry['media'] as Map)['title'] ?? 'Vidéo'),
              subtitle: entry['season'] == null
                  ? const Text('Disponible hors ligne')
                  : Text(
                      'Saison ${entry['season']} · Épisode ${entry['episode']}',
                    ),
              onTap: () async {
                if (!await File(entry['path'] as String).exists()) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Ce fichier a été déplacé ou supprimé.'),
                      ),
                    );
                  }
                  return;
                }
                if (context.mounted) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => PlayerScreen(
                        library: library,
                        item: MediaItem.fromJson(
                          Map<String, dynamic>.from(entry['media']),
                        ),
                        source: StreamSource(entry['path'], 'Hors ligne'),
                        season: entry['season'],
                        episode: entry['episode'],
                      ),
                    ),
                  );
                }
              },
              trailing: IconButton(
                tooltip: 'Supprimer le fichier',
                icon: const Icon(Icons.delete_outline),
                onPressed: () async {
                  final confirmed = await showDialog<bool>(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Supprimer ce téléchargement ?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context, false),
                          child: const Text('Conserver'),
                        ),
                        FilledButton(
                          onPressed: () => Navigator.pop(context, true),
                          child: const Text('Supprimer'),
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
                          const SnackBar(
                            content: Text(
                              'Impossible de supprimer ce fichier.',
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
