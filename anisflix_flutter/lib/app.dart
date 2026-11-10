import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'l10n/app_localizations.dart';

import 'widgets/theme_picker.dart';
import 'widgets/anime_icon.dart';
import 'widgets/update_panel.dart';
import 'services/app_updates.dart';
import 'widgets/search_box.dart';
import 'widgets/mobile_navigation_bar.dart';
import 'widgets/app_display.dart';
import 'screens/details.dart';
import 'services/catalog_api.dart';
import 'services/library.dart';
import 'services/platform_bridge.dart';
import 'screens/catalog.dart';
import 'screens/catalog_categories.dart';
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
  late final updates = UpdateController(widget.library.prefs);
  @override
  void initState() {
    super.initState();
    unawaited(updates.initialize());
  }

  @override
  void dispose() {
    updates.dispose();
    api.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.library,
    builder: (context, _) => MaterialApp(
      title: 'AnisFlix',
      debugShowCheckedModeBanner: false,
      locale: AppLocalizations.resolve(widget.library.language),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.delegates,
      shortcuts: {
        ...WidgetsApp.defaultShortcuts,
        const SingleActivator(LogicalKeyboardKey.select):
            const ActivateIntent(),
      },
      theme: appTheme(Brightness.light),
      darkTheme: appTheme(Brightness.dark),
      themeMode: widget.library.themeMode,
      builder: (context, child) => AppDisplay(
        mobile:
            PlatformBridge.android &&
            !PlatformBridge.deviceIsTv &&
            !const bool.fromEnvironment('TV_MODE'),
        child: child!,
      ),
      home: AnimatedBuilder(
        animation: widget.library,
        builder: (_, _) =>
            Shell(api: api, library: widget.library, updates: updates),
      ),
    ),
  );
}

ThemeData appTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final mobile = PlatformBridge.android && !PlatformBridge.deviceIsTv;
  return ThemeData(
    fontFamily: 'Roboto',
    brightness: brightness,
    useMaterial3: true,
    colorScheme:
        ColorScheme.fromSeed(
          seedColor: const Color(0xffed214d),
          brightness: brightness,
        ).copyWith(
          primary: dark ? const Color(0xffffb1ba) : const Color(0xffbc123c),
          surface: dark ? const Color(0xff211b1c) : const Color(0xfffff8f8),
        ),
    scaffoldBackgroundColor: dark
        ? (mobile ? const Color(0xff0e0e0e) : const Color(0xff101216))
        : const Color(0xfffffbfc),
    focusColor: const Color(0xffec2747),
    cardTheme: const CardThemeData(clipBehavior: Clip.antiAlias),
    inputDecorationTheme: const InputDecorationTheme(
      border: OutlineInputBorder(),
    ),
  );
}

class Shell extends StatefulWidget {
  final UpdateController updates;
  final CatalogApi api;
  final Library library;
  const Shell({
    super.key,
    required this.api,
    required this.library,
    required this.updates,
  });
  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  int selected = 0;
  int explorerSection = 1;
  String searchQuery = '';
  final mobileNavigator = GlobalKey<NavigatorState>();
  static const mobileTabs = [0, 1, 6, 5, 7];
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
    Icon(Icons.home_outlined),
    Icon(Icons.movie_outlined),
    Icon(Icons.live_tv_outlined),
    AnimeIcon(),
    Icon(Icons.search),
    Icon(Icons.favorite_outline),
    Icon(Icons.download_outlined),
    Icon(Icons.settings_outlined),
    Icon(Icons.grid_view_rounded),
  ];
  static const menuOrder = [0, 1, 2, 3, 8, 5, 6, 7];
  void navigate(int index) => setState(() {
    selected = index;
    if (index >= 1 && index <= 3) explorerSection = index;
  });
  Future<void> languagePicker() async {
    final value = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: Text(context.tr("Langue de l’application et du catalogue")),
        children: [
          for (final item in AppLocalizations.supportedLanguages)
            SimpleDialogOption(
              onPressed: () => Navigator.pop(context, item.code),
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Text('${item.flag} ${item.name}'),
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
    1 || 2 => CatalogCategoriesScreen(
      key: ValueKey(
        'categories:$selected:${widget.library.language}:${widget.library.backend}',
      ),
      api: widget.api,
      library: widget.library,
      type: selected == 2 ? 'tv' : 'movie',
      tv: tv,
    ),
    0 => HomeScreen(
      key: ValueKey(
        'home:${widget.library.language}:${widget.library.backend}',
      ),
      api: widget.api,
      library: widget.library,
      tv: tv,
    ),
    6 => DownloadsScreen(library: widget.library),
    7 => SettingsScreen(library: widget.library, updates: widget.updates),
    8 => ProviderDirectoryScreen(
      api: widget.api,
      library: widget.library,
      tv: tv,
    ),
    _ => CatalogScreen(
      key: ValueKey(
        '$selected:$searchQuery:${widget.library.language}:${widget.library.backend}',
      ),
      api: widget.api,
      library: widget.library,
      section: selected,
      tv: tv,
      latestOverride: selected == 3,
      initialQuery: selected == 4 ? searchQuery : '',
      showSearchField: tv || MediaQuery.sizeOf(context).width < 900,
      showHeading: false,
    ),
  };

  Widget mobileShell(String flag) {
    final explorer = selected == 1 || selected == 2 || selected == 3;
    final tab = explorer || selected == 4 || selected == 8 ? 1 : selected;
    final hasHeader = selected == 0 || explorer;
    return Scaffold(
      body: NavigatorPopHandler<Object?>(
        onPopWithResult: (result) => mobileNavigator.currentState!.pop(result),
        child: Navigator(
          key: mobileNavigator,
          pages: [
            MaterialPage<void>(
              key: const ValueKey('android-mobile-root'),
              child: SafeArea(
                bottom: false,
                child: Builder(
                  builder: (routeContext) => Column(
                    children: [
                      if (hasHeader)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 12, 8),
                          child: Row(
                            children: [
                              Expanded(
                                child: SearchBox(
                                  api: widget.api,
                                  compact: true,
                                  onSubmitted: (_) {},
                                  onSelected: (item) =>
                                      Navigator.of(routeContext).push(
                                        MaterialPageRoute(
                                          builder: (_) => DetailScreen(
                                            api: widget.api,
                                            library: widget.library,
                                            item: item,
                                          ),
                                        ),
                                      ),
                                ),
                              ),
                              TextButton(
                                onPressed: languagePicker,
                                child: Text(flag),
                              ),
                              ThemePicker(library: widget.library),
                            ],
                          ),
                        ),
                      if (explorer)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
                          child: SizedBox(
                            width: double.infinity,
                            child: SegmentedButton<int>(
                              showSelectedIcon: false,
                              segments: [
                                for (final index in [1, 2, 3])
                                  ButtonSegment(
                                    value: index,
                                    label: Text(routeContext.tr(labels[index])),
                                  ),
                              ],
                              selected: {selected},
                              onSelectionChanged: (value) =>
                                  navigate(value.single),
                            ),
                          ),
                        ),
                      UpdateNotice(
                        controller: widget.updates,
                        onOpen: () => navigate(7),
                      ),
                      Expanded(child: page(false)),
                    ],
                  ),
                ),
              ),
            ),
          ],
          onDidRemovePage: (_) {},
        ),
      ),
      bottomNavigationBar: MobileNavigationBar(
        selectedIndex: mobileTabs.indexOf(tab),
        onDestinationSelected: (index) {
          FocusManager.instance.primaryFocus?.unfocus();
          mobileNavigator.currentState?.popUntil((route) => route.isFirst);
          navigate(
            mobileTabs[index] == 1 ? explorerSection : mobileTabs[index],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tv =
        const bool.fromEnvironment('TV_MODE') || PlatformBridge.deviceIsTv;
    final wide = tv || MediaQuery.sizeOf(context).width >= 900;
    final content = FocusTraversalGroup(
      policy: ReadingOrderTraversalPolicy(),
      child: Column(
        children: [
          UpdateNotice(controller: widget.updates, onOpen: () => navigate(7)),
          Expanded(child: page(tv)),
        ],
      ),
    );
    final flag = AppLocalizations.supportedLanguages
        .firstWhere(
          (item) => item.code == widget.library.language,
          orElse: () => AppLocalizations.supportedLanguages.first,
        )
        .flag;
    if (PlatformBridge.android && !tv) return mobileShell(flag);
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
                if (selected == 0) ThemePicker(library: widget.library),
                IconButton(
                  tooltip: context.tr("Rechercher"),
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
                        leading: icons[i],
                        title: Text(context.tr(labels[i])),
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
                  width: 170,
                  child: ColoredBox(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? (tv
                              ? const Color(0xff18191d)
                              : const Color(0xff251a1b))
                        : const Color(0xfffff0f2),
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
                                      label: context.tr(labels[i]),
                                      icon: icons[i],
                                      selected: selected == i,
                                      autofocus: i == 0,
                                      compact: tv,
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
                      if (!(selected == 4 && tv))
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
                                  child: tv
                                      ? OutlinedButton.icon(
                                          onPressed: () => navigate(4),
                                          style: OutlinedButton.styleFrom(
                                            alignment: Alignment.centerLeft,
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                            ),
                                          ),
                                          icon: const Icon(Icons.search),
                                          label: Text(
                                            context.tr(
                                              "Rechercher un film, une série ou un anime…",
                                            ),
                                          ),
                                        )
                                      : SearchBox(
                                          api: widget.api,
                                          onSubmitted: (query) => setState(() {
                                            searchQuery = query;
                                            selected = 4;
                                          }),
                                          onSelected: (item) => Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => DetailScreen(
                                                api: widget.api,
                                                library: widget.library,
                                                item: item,
                                              ),
                                            ),
                                          ),
                                        ),
                                ),
                              ),
                              if (selected == 0 && !tv) ...[
                                const SizedBox(width: 8),
                                ThemePicker(library: widget.library),
                              ],
                              const SizedBox(width: 8),
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
                                leading: icons[j],
                                title: Text(context.tr(labels[j])),
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
              destinations: [
                NavigationDestination(
                  icon: Icon(Icons.home),
                  label: context.tr("Accueil"),
                ),
                NavigationDestination(
                  icon: Icon(Icons.movie),
                  label: context.tr("Films"),
                ),
                NavigationDestination(
                  icon: Icon(Icons.tv),
                  label: context.tr("Séries"),
                ),
                NavigationDestination(
                  icon: Icon(Icons.more_horiz),
                  label: context.tr("Plus"),
                ),
              ],
            ),
    );
  }
}

class SidebarButton extends StatefulWidget {
  final String label;
  final Widget icon;
  final bool selected, autofocus, compact;
  final VoidCallback onPressed;
  const SidebarButton({
    super.key,
    required this.label,
    required this.icon,
    required this.selected,
    required this.onPressed,
    this.autofocus = false,
    this.compact = false,
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
        padding: EdgeInsets.symmetric(
          horizontal: widget.compact ? 8 : 12,
          vertical: widget.compact ? 7 : 12,
        ),
        child: Row(
          children: [
            IconTheme.merge(
              data: IconThemeData(
                size: 20,
                color: widget.selected ? Colors.white : null,
              ),
              child: widget.icon,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                widget.label,
                style: TextStyle(
                  color: widget.selected ? Colors.white : null,
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
