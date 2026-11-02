import 'package:flutter/material.dart';

import '../services/library.dart';
import '../models/media.dart';
import 'player.dart';
import 'trakt_panel.dart';

class SettingsScreen extends StatefulWidget {
  final Library library;
  const SettingsScreen({super.key, required this.library});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final backend = TextEditingController(text: widget.library.backend);
  late final keyController = TextEditingController(text: widget.library.apiKey);
  final video = TextEditingController();
  late String language = widget.library.language;
  final form = GlobalKey<FormState>();
  @override
  void dispose() {
    backend.dispose();
    keyController.dispose();
    video.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      Text('Paramètres', style: Theme.of(context).textTheme.headlineMedium),
      const SizedBox(height: 24),
      Form(
        key: form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DropdownButtonFormField<String>(
              initialValue: language,
              decoration: const InputDecoration(
                labelText: 'Langue du catalogue',
              ),
              items: const [
                DropdownMenuItem(value: 'fr-FR', child: Text('Français')),
                DropdownMenuItem(value: 'en-US', child: Text('English')),
                DropdownMenuItem(value: 'es-ES', child: Text('Español')),
              ],
              onChanged: (value) => language = value!,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: backend,
              decoration: const InputDecoration(
                labelText: 'Adresse du service AnisFlix',
              ),
              validator: (value) {
                final uri = Uri.tryParse(value ?? '');
                return uri?.scheme == 'https' && uri!.host.isNotEmpty
                    ? null
                    : 'Saisis une adresse HTTPS valide.';
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: keyController,
              obscureText: true,
              autocorrect: false,
              enableSuggestions: false,
              decoration: const InputDecoration(
                labelText: 'Clé TMDB',
                helperText: 'Conservée pour cette session uniquement.',
              ),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () async {
                if (!form.currentState!.validate()) return;
                await widget.library.saveSettings(
                  language: language,
                  backend: backend.text.trim(),
                  apiKey: keyController.text,
                );
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Paramètres enregistrés.')),
                  );
                }
              },
              child: const Text('Enregistrer'),
            ),
          ],
        ),
      ),
      const SizedBox(height: 36),
      TraktPanel(service: widget.library.trakt),
      const SizedBox(height: 36),
      Text('Ouvrir une vidéo', style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 12),
      TextField(
        controller: video,
        decoration: const InputDecoration(
          labelText: 'Adresse HTTPS du fichier vidéo',
        ),
      ),
      const SizedBox(height: 12),
      OutlinedButton.icon(
        onPressed: () {
          final uri = Uri.tryParse(video.text.trim());
          if (uri?.scheme != 'https' || uri!.host.isEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Saisis une adresse HTTPS valide.')),
            );
            return;
          }
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => PlayerScreen(
                library: widget.library,
                item: MediaItem(
                  id: uri.toString().codeUnits.fold<int>(
                    0,
                    (a, b) => (a * 31 + b) & 0x7fffffff,
                  ),
                  type: 'external',
                  title: 'Vidéo',
                ),
                source: StreamSource(uri.toString(), 'Vidéo directe'),
              ),
            ),
          );
        },
        icon: const Icon(Icons.play_arrow),
        label: const Text('Lire la vidéo'),
      ),
      const SizedBox(height: 36),
      const Text(
        'AnisFlix · Édition reconstruite\nRessources récupérées des APK Android, code Flutter réécrit.',
      ),
      const SizedBox(height: 12),
      const Text(
        'Ce produit utilise l’API TMDB mais n’est ni approuvé ni certifié par TMDB.',
      ),
    ],
  );
}
