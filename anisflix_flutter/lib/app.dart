import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'services/catalog_api.dart';
import 'services/library.dart';
import 'services/platform_bridge.dart';
import 'screens/catalog.dart';
import 'screens/home.dart';
import 'screens/settings.dart';
import 'screens/downloads.dart';
import 'screens/providers.dart';

class AnisFlixApp extends StatefulWidget {
  final Library library;
  const AnisFlixApp({super.key, required this.library});
  @override
  State<AnisFlixApp> createState() => _AnisFlixAppState();
}

class _AnisFlixAppState extends State<AnisFlixApp> {
  late final api = CatalogApi(widget.library);
  @override
  void dispose() {
    api.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'AnisFlix',
    debugShowCheckedModeBanner: false,
    shortcuts: {
      ...WidgetsApp.defaultShortcuts,
      const SingleActivator(LogicalKeyboardKey.select): const ActivateIntent(),
    },
    theme: ThemeData(
      brightness: Brightness.dark,
      useMaterial3: true,
      colorScheme:
          ColorScheme.fromSeed(
            seedColor: const Color(0xffed214d),
            brightness: Brightness.dark,
          ).copyWith(
            primary: const Color(0xffffb1ba),
            surface: const Color(0xff211b1c),
          ),
      scaffoldBackgroundColor: const Color(0xff101216),
      focusColor: const Color(0xffec2747),
      cardTheme: const CardThemeData(clipBehavior: Clip.antiAlias),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
      ),
    ),
    home: AnimatedBuilder(
      animation: widget.library,
      builder: (_, _) => Shell(api: api, library: widget.library),
    ),
  );
}

class Shell extends StatefulWidget {
  final CatalogApi api;
  final Library library;
  const Shell({super.key, required this.api, required this.library});
  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  int selected = 0;
  static const labels = [
    'Accueil',
    'Films',
    'Séries',
    'Animés',
    'Recherche',
    'Favoris',
    'Téléchargements',
    'Paramètres',
    'Plateformes',
  ];
  static const icons = [
    Icons.home_outlined,
    Icons.movie_outlined,
    Icons.live_tv_outlined,
    Icons.auto_awesome,
    Icons.search,
    Icons.favorite_outline,
    Icons.download_outlined,
    Icons.settings_outlined,
    Icons.grid_view_rounded,
  ];
  static const menuOrder = [0, 1, 2, 8, 3, 5, 6, 7];
  void navigate(int index) => setState(() => selected = index);
  Future<void> languagePicker() async {
    final value = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Langue du catalogue'),
        children: [
          for (final item in [
            ('fr-FR', '🇫🇷 Français'),
            ('en-US', '🇬🇧 English'),
            ('es-ES', '🇪🇸 Español'),
          ])
            SimpleDialogOption(
              onPressed: () => Navigator.pop(context, item.$1),
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Text(item.$2),
              ),
            ),
        ],
      ),
    );
    if (value != null) {
      await widget.library.saveSettings(
        language: value,
        backend: widget.library.backend,
        apiKey: widget.library.apiKey,
      );
    }
  }

  Widget page(bool tv) => switch (selected) {
    0 => HomeScreen(
      key: ValueKey(
        'home:${widget.library.language}:${widget.library.backend}',
      ),
      api: widget.api,
      library: widget.library,
      tv: tv,
    ),
    6 => DownloadsScreen(library: widget.library),
    7 => SettingsScreen(library: widget.library),
    8 => ProviderDirectoryScreen(
      api: widget.api,
      library: widget.library,
      tv: tv,
    ),
    _ => CatalogScreen(
      key: ValueKey(
        '$selected:${widget.library.language}:${widget.library.backend}',
      ),
      api: widget.api,
      library: widget.library,
      section: selected,
      tv: tv,
    ),
  };
  @override
  Widget build(BuildContext context) {
    final tv =
        const bool.fromEnvironment('TV_MODE') || PlatformBridge.deviceIsTv;
    final wide = tv || MediaQuery.sizeOf(context).width >= 900;
    final content = FocusTraversalGroup(
      policy: ReadingOrderTraversalPolicy(),
      child: page(tv),
    );
    final flag = widget.library.language.startsWith('fr')
        ? '🇫🇷'
        : widget.library.language.startsWith('es')
        ? '🇪🇸'
        : '🇬🇧';
    return Scaffold(
      appBar: wide
          ? null
          : AppBar(
              title: const Text(
                'AnisFlix',
                style: TextStyle(
                  color: Color(0xffed214d),
                  fontWeight: FontWeight.w800,
                ),
              ),
              actions: [
                IconButton(
                  tooltip: 'Rechercher',
                  onPressed: () => navigate(4),
                  icon: const Icon(Icons.search),
                ),
                TextButton(
                  onPressed: languagePicker,
                  child: Text(flag, style: const TextStyle(fontSize: 23)),
                ),
              ],
            ),
      drawer: wide
          ? null
          : Drawer(
              child: SafeArea(
                child: ListView(
                  children: [
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(
                        'AnisFlix',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    for (final i in menuOrder)
                      ListTile(
                        leading: Icon(icons[i]),
                        title: Text(labels[i]),
                        selected: selected == i,
                        onTap: () {
                          Navigator.pop(context);
                          navigate(i);
                        },
                      ),
                  ],
                ),
              ),
            ),
      body: wide
          ? Row(
              children: [
                SizedBox(
                  width: 190,
                  child: ColoredBox(
                    color: const Color(0xff251a1b),
                    child: SafeArea(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Padding(
                            padding: EdgeInsets.fromLTRB(17, 20, 12, 16),
                            child: Text(
                              'AnisFlix',
                              style: TextStyle(
                                fontSize: 24,
                                color: Color(0xffed214d),
                                fontWeight: FontWeight.w900,
                                letterSpacing: -1,
                              ),
                            ),
                          ),
                          Expanded(
                            child: ListView(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                              ),
                              children: [
                                for (final i in menuOrder)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 5),
                                    child: SidebarButton(
                                      label: labels[i],
                                      icon: icons[i],
                                      selected: selected == i,
                                      autofocus: i == 0,
                                      onPressed: () => navigate(i),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const VerticalDivider(width: 1, thickness: 1),
                Expanded(
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 22,
                          vertical: 16,
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: SizedBox(
                                height: 48,
                                child: OutlinedButton.icon(
                                  onPressed: () => navigate(4),
                                  icon: const Icon(Icons.search),
                                  style: OutlinedButton.styleFrom(
                                    alignment: Alignment.centerLeft,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                  ),
                                  label: const Text(
                                    'Rechercher un film, une série ou un anime…',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            SizedBox(
                              height: 48,
                              width: 48,
                              child: OutlinedButton(
                                onPressed: languagePicker,
                                style: OutlinedButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                child: Text(
                                  flag,
                                  style: const TextStyle(fontSize: 24),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 1),
                      Expanded(child: content),
                    ],
                  ),
                ),
              ],
            )
          : content,
      bottomNavigationBar: wide
          ? null
          : NavigationBar(
              selectedIndex: selected <= 2 ? selected : 3,
              onDestinationSelected: (i) => i == 3
                  ? showModalBottomSheet<void>(
                      context: context,
                      builder: (context) => SafeArea(
                        child: ListView(
                          shrinkWrap: true,
                          children: [
                            for (final j in [3, 8, 4, 5, 6, 7])
                              ListTile(
                                leading: Icon(icons[j]),
                                title: Text(labels[j]),
                                onTap: () {
                                  Navigator.pop(context);
                                  navigate(j);
                                },
                              ),
                          ],
                        ),
                      ),
                    )
                  : navigate(i),
              destinations: const [
                NavigationDestination(icon: Icon(Icons.home), label: 'Accueil'),
                NavigationDestination(icon: Icon(Icons.movie), label: 'Films'),
                NavigationDestination(icon: Icon(Icons.tv), label: 'Séries'),
                NavigationDestination(
                  icon: Icon(Icons.more_horiz),
                  label: 'Plus',
                ),
              ],
            ),
    );
  }
}

class SidebarButton extends StatefulWidget {
  final String label;
  final IconData icon;
  final bool selected, autofocus;
  final VoidCallback onPressed;
  const SidebarButton({
    super.key,
    required this.label,
    required this.icon,
    required this.selected,
    required this.onPressed,
    this.autofocus = false,
  });
  @override
  State<SidebarButton> createState() => _SidebarButtonState();
}

class _SidebarButtonState extends State<SidebarButton> {
  bool focused = false;
  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: widget.selected ? const Color(0xffed214d) : Colors.transparent,
      borderRadius: BorderRadius.circular(10),
      border: Border.all(
        width: 2.5,
        color: focused ? const Color(0xfff1dcdf) : Colors.transparent,
      ),
    ),
    child: InkWell(
      autofocus: widget.autofocus,
      onTap: widget.onPressed,
      borderRadius: BorderRadius.circular(8),
      onFocusChange: (value) {
        setState(() => focused = value);
        if (value) {
          Scrollable.ensureVisible(
            context,
            alignment: .5,
            duration: const Duration(milliseconds: 150),
          );
        }
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: Row(
          children: [
            Icon(widget.icon, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                widget.label,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
