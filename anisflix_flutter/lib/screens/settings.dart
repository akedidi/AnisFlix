import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../services/app_updates.dart';
import '../services/library.dart';
import '../widgets/cached_media_image.dart';
import '../widgets/subtitle_size_control.dart';
import '../widgets/update_panel.dart';
import 'trakt_panel.dart';

class SettingsScreen extends StatefulWidget {
  final Library library;
  final UpdateController updates;
  const SettingsScreen({
    super.key,
    required this.library,
    required this.updates,
  });
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool clearingCache = false, clearingProgress = false;

  Future<bool> confirm({
    required String title,
    required String message,
    required String action,
  }) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(context.tr(title)),
          content: Text(context.tr(message)),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(context.tr('Annuler')),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(
                context.tr(action),
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          ],
        ),
      ) ??
      false;

  void message(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(context.tr(text))));
  }

  Future<void> clearCache() async {
    if (!await confirm(
      title: 'Vider le cache ?',
      message: 'Cela supprimera toutes les images en cache. Elles seront rechargées depuis le réseau.',
      action: 'Vider',
    )) {
      return;
    }
    if (!mounted) return;
    setState(() => clearingCache = true);
    try {
      await MediaImageCache.clear();
      message('Cache d’images vidé.');
    } catch (_) {
      message('Impossible de vider le cache d’images. Réessaie.');
    } finally {
      if (mounted) setState(() => clearingCache = false);
    }
  }

  Future<void> clearProgress() async {
    if (!await confirm(
      title: 'Supprimer la progression ?',
      message: 'Êtes-vous sûr de vouloir supprimer tout votre historique de lecture ? Cette action est irréversible.',
      action: 'Supprimer',
    )) {
      return;
    }
    if (!mounted) return;
    setState(() => clearingProgress = true);
    try {
      await widget.library.clearProgress();
      message('Progression supprimée.');
    } catch (_) {
      message('Impossible de supprimer la progression. Réessaie.');
    } finally {
      if (mounted) setState(() => clearingProgress = false);
    }
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.library,
    builder: (context, _) => ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Align(
          alignment: AlignmentDirectional.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 840),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  context.tr('Paramètres'),
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 24),
                _SettingsSection(
                  title: 'Apparence',
                  child: Column(
                    children: [
                      DropdownButtonFormField<String>(
                        key: ValueKey(widget.library.language),
                        initialValue: widget.library.language,
                        decoration: InputDecoration(
                          labelText: context.tr('Langue'),
                        ),
                        isExpanded: true,
                        items: [
                          for (final language
                              in AppLocalizations.supportedLanguages)
                            DropdownMenuItem(
                              value: language.code,
                              child: Text('${language.flag} ${language.name}'),
                            ),
                        ],
                        onChanged: (value) async {
                          if (value == null) return;
                          await widget.library.saveSettings(
                            language: value,
                            backend: widget.library.backend,
                            apiKey: widget.library.apiKey,
                          );
                        },
                      ),
                      const SizedBox(height: 8),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(context.tr('Mode sombre')),
                        value: Theme.of(context).brightness == Brightness.dark,
                        onChanged: (value) => widget.library.setThemeMode(
                          value ? ThemeMode.dark : ThemeMode.light,
                        ),
                      ),
                    ],
                  ),
                ),
                _SettingsSection(
                  title: 'Sous-titres',
                  child: SubtitleSizeControl(
                    fontSize: widget.library.subtitleFontSize,
                    onChanged: widget.library.setSubtitleFontSize,
                  ),
                ),
                _SettingsSection(
                  title: 'Trakt',
                  icon: Image.asset(
                    'assets/images/trakt_icon.png',
                    width: 25,
                    height: 25,
                  ),
                  footer:
                      'Synchronise ta progression de lecture avec Trakt.tv.',
                  child: TraktPanel(service: widget.library.trakt),
                ),
                _SettingsSection(
                  title: 'Données',
                  footer: 'Cette action supprimera tout l’historique de lecture des films et séries.',
                  child: Column(
                    children: [
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(context.tr('Vider le cache d’images')),
                        textColor: Theme.of(context).colorScheme.error,
                        trailing: const Icon(Icons.photo_library_outlined),
                        onTap: clearingCache ? null : clearCache,
                        enabled: !clearingCache,
                      ),
                      const Divider(height: 1),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(context.tr('Supprimer la progression')),
                        textColor: Theme.of(context).colorScheme.error,
                        trailing: const Icon(Icons.delete_outline),
                        onTap: clearingProgress ? null : clearProgress,
                        enabled: !clearingProgress,
                      ),
                    ],
                  ),
                ),
                _SettingsSection(
                  child: ListenableBuilder(
                    listenable: widget.updates,
                    builder: (context, _) => Row(
                      children: [
                        Expanded(child: Text(context.tr('Version'))),
                        Text(widget.updates.installed?.name ?? '…'),
                      ],
                    ),
                  ),
                ),
                _SettingsSection(
                  child: UpdatePanel(controller: widget.updates),
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}

class _SettingsSection extends StatelessWidget {
  final String? title, footer;
  final Widget child;
  final Widget? icon;
  const _SettingsSection({
    this.title,
    this.footer,
    this.icon,
    required this.child,
  });

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 24),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (title != null) ...[
          Row(
            children: [
              if (icon != null) ...[icon!, const SizedBox(width: 8)],
              Text(
                context.tr(title!),
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ],
          ),
          const SizedBox(height: 8),
        ],
        Card(
          margin: EdgeInsets.zero,
          child: Padding(padding: const EdgeInsets.all(16), child: child),
        ),
        if (footer != null) ...[
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              context.tr(footer!),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ],
    ),
  );
}
