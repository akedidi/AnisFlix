import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart';

import 'messages.dart';
import 'native_messages.dart';

class AppLocalizations {
  final Locale locale;
  const AppLocalizations(this.locale);

  static const supportedLanguages = [
    (code: 'fr-FR', name: 'Français', flag: '🇫🇷'),
    (code: 'en-US', name: 'English', flag: '🇬🇧'),
    (code: 'es-ES', name: 'Español', flag: '🇪🇸'),
    (code: 'de-DE', name: 'Deutsch', flag: '🇩🇪'),
    (code: 'it-IT', name: 'Italiano', flag: '🇮🇹'),
    (code: 'pt-PT', name: 'Português', flag: '🇵🇹'),
    (code: 'ar-SA', name: 'العربية', flag: '🇸🇦'),
  ];
  static const supportedLocales = [
    Locale('fr'),
    Locale('en'),
    Locale('es'),
    Locale('de'),
    Locale('it'),
    Locale('pt'),
    Locale('ar'),
  ];
  static const delegates = <LocalizationsDelegate<dynamic>>[
    _AppLocalizationsDelegate(),
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ];

  static Locale resolve(String language) {
    final code = language.split(RegExp('[-_]')).first;
    return supportedLocales.firstWhere(
      (locale) => locale.languageCode == code,
      orElse: () => supportedLocales.first,
    );
  }

  static AppLocalizations of(BuildContext context) =>
      Localizations.of<AppLocalizations>(context, AppLocalizations) ??
      const AppLocalizations(Locale('fr'));

  String text(String source, [List<Object?> arguments = const []]) {
    final translations = appMessages[source];
    final template = switch (locale.languageCode) {
      'en' => translations?.first ?? source,
      'es' => translations?.last ?? source,
      _ => nativeMessages[locale.languageCode]?[source] ?? source,
    };
    // Replace in a single pass so user-provided values containing {0} stay intact.
    return template.replaceAllMapped(RegExp(r'\{(\d+)\}'), (match) {
      final index = int.parse(match[1]!);
      return index < arguments.length ? '${arguments[index]}' : match[0]!;
    });
  }

  /// Services retain their source messages, including persisted download errors.
  /// Translate them when displayed so changing language also updates existing errors.
  String message(String source) {
    if (appMessages.containsKey(source)) return text(source);
    for (final entry in _messagePatterns.entries) {
      final match = entry.value.firstMatch(source);
      if (match != null) {
        return text(entry.key, [
          for (var i = 1; i <= match.groupCount; i++) match[i],
        ]);
      }
    }
    return source;
  }

  String decimal(num value, {int digits = 1}) =>
      NumberFormat.decimalPatternDigits(
        locale: locale.languageCode,
        decimalDigits: digits,
      ).format(value);

  String mediaTitle(String title) =>
      title == 'Sans titre' ? text('Sans titre') : title;

  static final _messagePatterns = {
    for (final source in appMessages.keys.where((s) => s.contains('{0}')))
      source: RegExp(
        '^${source.split(RegExp(r'\{\d+\}')).map(RegExp.escape).join('(.*?)')}\$',
        dotAll: true,
      ),
  };
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();
  @override
  bool isSupported(Locale locale) => AppLocalizations.supportedLocales.any(
    (supported) => supported.languageCode == locale.languageCode,
  );
  @override
  Future<AppLocalizations> load(Locale locale) =>
      SynchronousFuture(AppLocalizations(locale));
  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

extension LocalizedContext on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
  String tr(String source, [List<Object?> arguments = const []]) =>
      l10n.text(source, arguments);
}
