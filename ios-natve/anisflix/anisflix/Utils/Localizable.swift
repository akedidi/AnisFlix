//
//  Localizable.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import Foundation

/// Simple localization system matching web translations
struct Localizable {
    
    static func string(_ key: String, language: String = "fr") -> String {
        let translations = getTranslations(for: language)
        return translations[key] ?? key
    }
    
    private static func getTranslations(for language: String) -> [String: String] {
        switch language {
        case "fr":
            return frenchTranslations
        case "en":
            return englishTranslations
        case "es":
            return spanishTranslations
        case "de":
            return germanTranslations
        case "it":
            return italianTranslations
        case "pt":
            return portugueseTranslations
        case "ar":
            return arabicTranslations
        default:
            return frenchTranslations
        }
    }
    
    // MARK: - French Translations
    
    private static let frenchTranslations: [String: String] = [
        // Navigation
        "nav.home": "Accueil",
        "nav.movies": "Films",
        "nav.series": "Séries",
        "nav.tvChannels": "TV",
        "nav.favorites": "Favoris",
        "nav.settings": "Paramètres",
        
        // Common
        "common.loading": "Chargement...",
        "common.seeAll": "Voir tout",
        "common.back": "Retour",
        "common.search": "Rechercher...",
        
        // Home
        "home.continueWatching": "Continuer à regarder",
        "home.byProvider": "Par Plateforme",
        "movies.popular": "Films Populaires",
        "series.popular": "Séries Populaires",
        
        // Movies
        "movies.latest": "Derniers films",
        "movies.action": "Action",
        "movies.drama": "Drame",
        "movies.crime": "Policier",
        "movies.mystery": "Mystère",
        "movies.documentary": "Documentaire",
        "movies.sciFi": "Science-Fiction",
        "movies.animation": "Animation",
        
        // Series
        "series.latest": "Dernières séries",
        "series.action": "Action",
        "series.actions": "Action",
        "series.actionAdventure": "Action & Aventure",
        "series.drama": "Drame",
        "series.crime": "Policier",
        "series.mystery": "Mystère",
        "series.documentary": "Documentaire",
        "series.sciFi": "Sci-Fi & Fantasy",
        "series.animation": "Animation",
        
        // Detail
        "detail.overview": "Synopsis",
        "detail.rating": "Note",
        "detail.releaseDate": "Date de sortie",
        "detail.runtime": "Durée",
        "detail.genres": "Genres",
        "detail.similar": "Contenus similaires",
        "detail.resume": "Reprendre la lecture",
        "detail.streamingSources": "Sources de streaming",
        "detail.remove": "Retirer",
        "detail.trailer": "Bande-annonce",
        "detail.seasons": "Saisons",
        "detail.season": "Saison",
        "detail.noSources": "Aucune source disponible",
        "detail.specials": "Spéciaux/OAVs",
        
        // Settings
        "settings.title": "Paramètres",
        "settings.appearance": "Apparence",
        "settings.language": "Langue",
        "settings.darkMode": "Mode sombre",
        "settings.data": "Données",
        "settings.clearProgress": "Supprimer la progression",
        "settings.clearProgressDesc": "Cette action supprimera tout l'historique de lecture des films et séries.",
        "settings.clearAlertTitle": "Supprimer la progression ?",
        "settings.clearAlertMessage": "Êtes-vous sûr de vouloir supprimer tout votre historique de lecture ? Cette action est irréversible.",
        "settings.cancel": "Annuler",
        "settings.delete": "Supprimer",
        "detail.distribution": "Distribution",
        "detail.player": "Lecteur",
        "detail.close": "Fermer",
        "detail.noSourcesFor": "Aucune source disponible pour",
        "detail.availableSources": "Sources disponibles",
        "detail.favorites": "Ajouter aux favoris",
        
        // TV
        "tv.france": "France",
        "tv.arabWorld": "Monde Arabe",
        "tv.nowPlaying": "Lecture en cours :",
        // Downloads
        "nav.downloads": "Téléchargements",
        "downloads.title": "Téléchargements",
        "downloads.completed": "Terminés",
        "downloads.active": "En cours",
        "downloads.emptyCompleted": "Aucun téléchargement terminé",
        "downloads.emptyActive": "Aucun téléchargement en cours",
        "downloads.play": "Lire",
        "downloads.pause": "Pause",
        "downloads.resume": "Reprendre",
        "downloads.cancel": "Annuler",
        "downloads.delete": "Supprimer",
        "downloads.waiting": "En attente",
        "downloads.failed": "Échec",
        "downloads.paused": "En pause",
        "downloads.downloading": "Téléchargement...",
        "downloads.deleteAlertTitle": "Supprimer le téléchargement ?",
        "downloads.deleteAlertMessage": "Êtes-vous sûr de vouloir supprimer ce téléchargement ? Cette action est irréversible.",
        "downloads.deleteConfirm": "Supprimer",
        
        // Sources
        "VF": "VF",
        "VOSTFR": "VOSTFR",
        "VO": "VO",
    ]
    
    // MARK: - English Translations
    
    private static let englishTranslations: [String: String] = [
        "nav.home": "Home",
        "nav.movies": "Movies",
        "nav.series": "Series",
        "nav.tvChannels": "TV",
        "nav.favorites": "Favorites",
        "nav.settings": "Settings",
        "nav.downloads": "Downloads",
        
        "common.loading": "Loading...",
        "common.seeAll": "See All",
        "common.back": "Back",
        "common.search": "Search...",
        
        "home.continueWatching": "Continue Watching",
        "home.byProvider": "By Platform",
        "movies.popular": "Popular Movies",
        "series.popular": "Popular Series",
        
        "movies.latest": "Latest Movies",
        "movies.action": "Action",
        "movies.drama": "Drama",
        "movies.crime": "Crime",
        "movies.mystery": "Mystery",
        "movies.documentary": "Documentary",
        "movies.sciFi": "Science Fiction",
        "movies.animation": "Animation",
        
        "series.latest": "Latest Series",
        "series.action": "Action",
        "series.actions": "Action",
        "series.actionAdventure": "Action & Adventure",
        "series.drama": "Drama",
        "series.crime": "Crime",
        "series.mystery": "Mystery",
        "series.documentary": "Documentary",
        "series.sciFi": "Sci-Fi & Fantasy",
        "series.animation": "Animation",
        
        "detail.overview": "Overview",
        "detail.rating": "Rating",
        "detail.releaseDate": "Release Date",
        "detail.runtime": "Runtime",
        "detail.genres": "Genres",
        "detail.similar": "Similar Content",
        "detail.resume": "Resume Playing",
        "detail.streamingSources": "Streaming Sources",
        "detail.remove": "Remove",
        "detail.trailer": "Trailer",
        "detail.seasons": "Seasons",
        "detail.season": "Season",
        "detail.noSources": "No sources available",
        "detail.specials": "Specials/OAVs",
        
        "settings.title": "Settings",
        "settings.appearance": "Appearance",
        "settings.language": "Language",
        "settings.darkMode": "Dark Mode",
        "settings.data": "Data",
        "settings.clearProgress": "Clear Progress",
        "settings.clearProgressDesc": "This action will delete all movie and series watch history.",
        "settings.clearAlertTitle": "Clear Progress?",
        "settings.clearAlertMessage": "Are you sure you want to delete all your watch history? This action cannot be undone.",
        "settings.cancel": "Cancel",
        "settings.delete": "Delete",
        "detail.distribution": "Cast",
        "detail.player": "Player",
        "detail.close": "Close",
        "detail.noSourcesFor": "No sources available for",
        "detail.availableSources": "Available sources",
        "detail.favorites": "Add to favorites",
        
        // TV
        "tv.france": "France",
        "tv.arabWorld": "Arab World",
        "tv.nowPlaying": "Now Playing:",
        
        // Downloads
        "downloads.title": "Downloads",
        "downloads.completed": "Completed",
        "downloads.active": "Active",
        "downloads.emptyCompleted": "No completed downloads",
        "downloads.emptyActive": "No active downloads",
        "downloads.play": "Play",
        "downloads.pause": "Pause",
        "downloads.resume": "Resume",
        "downloads.cancel": "Cancel",
        "downloads.delete": "Delete",
        "downloads.waiting": "Waiting",
        "downloads.failed": "Failed",
        "downloads.paused": "Paused",
        "downloads.downloading": "Downloading...",
        "downloads.deleteAlertTitle": "Delete Download?",
        "downloads.deleteAlertMessage": "Are you sure you want to delete this download? This action cannot be undone.",
        "downloads.deleteConfirm": "Delete",
        
        "platform.hboMax": "HBO Max",
        "platform.crunchyroll": "Crunchyroll",
        "platform.canal": "Canal+",
        "platform.adn": "ADN",
        "platform.arte": "Arte",
        "platform.mubi": "MUBI",
        "platform.tf1": "TF1+",
        "platform.m6": "M6+",
        
        // Sources
        "VF": "French Dub",
        "VOSTFR": "French Sub",
        "VO": "Original",
    ]
    
    // MARK: - Spanish Translations
    
    private static let spanishTranslations: [String: String] = [
        "nav.home": "Inicio",
        "nav.movies": "Películas",
        "nav.series": "Series",
        "nav.tvChannels": "TV",
        "nav.favorites": "Favoritos",
        "nav.settings": "Ajustes",
        "nav.downloads": "Descargas",
        
        "common.loading": "Cargando...",
        "common.seeAll": "Ver todo",
        "common.back": "Volver",
        "common.search": "Buscar...",
        
        "home.continueWatching": "Continuar viendo",
        "home.byProvider": "Por Plataforma",
        "movies.popular": "Películas Populares",
        "series.popular": "Series Populares",
        
        "movies.latest": "Últimas películas",
        "movies.action": "Acción",
        "movies.drama": "Drama",
        "movies.crime": "Crimen",
        "movies.mystery": "Misterio",
        "movies.documentary": "Documental",
        "movies.sciFi": "Ciencia Ficción",
        "movies.animation": "Animación",
        
        "series.latest": "Últimas series",
        "series.action": "Acción",
        "series.actions": "Acción",
        "series.actionAdventure": "Acción y Aventura",
        "series.drama": "Drama",
        "series.crime": "Crimen",
        "series.mystery": "Misterio",
        "series.documentary": "Documental",
        "series.sciFi": "Ciencia Ficción y Fantasía",
        "series.animation": "Animación",
        
        "detail.overview": "Sinopsis",
        "detail.rating": "Calificación",
        "detail.releaseDate": "Fecha de estreno",
        "detail.runtime": "Duración",
        "detail.genres": "Géneros",
        "detail.similar": "Contenido similar",
        "detail.resume": "Reanudar",
        "detail.streamingSources": "Fuentes de streaming",
        "detail.remove": "Eliminar",
        "detail.trailer": "Tráiler",
        "detail.seasons": "Temporadas",
        "detail.season": "Temporada",
        "detail.noSources": "No hay fuentes disponibles",
        "detail.specials": "Especiales/OAVs",
        
        "settings.title": "Ajustes",
        "settings.appearance": "Apariencia",
        "settings.language": "Idioma",
        "settings.darkMode": "Modo oscuro",
        "settings.data": "Datos",
        "settings.clearProgress": "Borrar progreso",
        "settings.clearProgressDesc": "Esta acción eliminará todo el historial de visualización.",
        "settings.clearAlertTitle": "¿Borrar progreso?",
        "settings.clearAlertMessage": "¿Estás seguro de que quieres borrar todo tu historial? Esta acción es irreversible.",
        "settings.cancel": "Cancelar",
        "settings.delete": "Borrar",
        "detail.distribution": "Reparto",
        "detail.player": "Reproductor",
        "detail.close": "Cerrar",
        "detail.noSourcesFor": "No hay fuentes disponibles para",
        "detail.availableSources": "Fuentes disponibles",
        "detail.favorites": "Añadir a favoritos",
        
        // TV
        "tv.france": "Francia",
        "tv.arabWorld": "Mundo Árabe",
        "tv.nowPlaying": "Reproduciendo:",
        
        // Downloads
        "downloads.title": "Descargas",
        "downloads.completed": "Completados",
        "downloads.active": "Activos",
        "downloads.emptyCompleted": "No hay descargas completadas",
        "downloads.emptyActive": "No hay descargas activas",
        "downloads.play": "Reproducir",
        "downloads.pause": "Pausar",
        "downloads.resume": "Reanudar",
        "downloads.cancel": "Cancelar",
        "downloads.delete": "Eliminar",
        "downloads.waiting": "Esperando",
        "downloads.failed": "Fallido",
        "downloads.paused": "Pausado",
        "downloads.downloading": "Descargando...",
        "downloads.deleteAlertTitle": "¿Eliminar descarga?",
        "downloads.deleteAlertMessage": "¿Estás seguro de que quieres eliminar esta descarga? Esta acción no se puede deshacer.",
        "downloads.deleteConfirm": "Eliminar",
        
        // Sources
        "VF": "Doblaje Francés",
        "VOSTFR": "Subtítulos en Francés",
        "VO": "Original",
    ]
    
    // MARK: - Arabic Translations
    
    private static let arabicTranslations: [String: String] = [
        "nav.home": "الرئيسية",
        "nav.movies": "أفلام",
        "nav.series": "مسلسلات",
        "nav.tvChannels": "تلفاز",
        "nav.favorites": "المفضلة",
        "nav.settings": "الإعدادات",
        "nav.downloads": "التحميلات",
        
        "common.loading": "جاري التحميل...",
        "common.seeAll": "عرض الكل",
        "common.back": "عودة",
        "common.search": "بحث...",
        
        "home.continueWatching": "متابعة المشاهدة",
        "home.byProvider": "حسب المنصة",
        "movies.popular": "أفلام شائعة",
        "series.popular": "مسلسلات شائعة",
        
        "movies.latest": "أحدث الأفلام",
        "movies.action": "أكشن",
        "movies.drama": "دراما",
        "movies.crime": "جريمة",
        "movies.mystery": "غموض",
        "movies.documentary": "وثائقي",
        "movies.sciFi": "خيال علمي",
        "movies.animation": "رسوم متحركة",
        
        "series.latest": "أحدث المسلسلات",
        "series.action": "أكشن",
        "series.actions": "أكشن",
        "series.actionAdventure": "أكشن ومغامرة",
        "series.drama": "دراما",
        "series.crime": "جريمة",
        "series.mystery": "غموض",
        "series.documentary": "وثائقي",
        "series.sciFi": "خيال علمي وفانتازيا",
        "series.animation": "رسوم متحركة",
        
        "detail.overview": "نبذة",
        "detail.rating": "التقييم",
        "detail.releaseDate": "تاريخ الإصدار",
        "detail.runtime": "المدة",
        "detail.genres": "الأنواع",
        "detail.similar": "محتوى مشابه",
        "detail.resume": "استئناف المشاهدة",
        "detail.streamingSources": "مصادر البث",
        "detail.remove": "إزالة",
        "detail.trailer": "مقطع دعائي",
        "detail.seasons": "المواسم",
        "detail.season": "موسم",
        "detail.noSources": "لا توجد مصادر متاحة",
        "detail.specials": "خاص/OAVs",
        
        "settings.title": "الإعدادات",
        "settings.appearance": "المظهر",
        "settings.language": "اللغة",
        "settings.darkMode": "الوضع الداكن",
        "settings.data": "البيانات",
        "settings.clearProgress": "مسح السجل",
        "settings.clearProgressDesc": "سيؤدي هذا الإجراء إلى حذف سجل المشاهدة بالكامل.",
        "settings.clearAlertTitle": "مسح السجل؟",
        "settings.clearAlertMessage": "هل أنت متأكد أنك تريد حذف سجل المشاهدة؟ هذا الإجراء لا يمكن التراجع عنه.",
        "settings.cancel": "إلغاء",
        "settings.delete": "حذف",
        "detail.distribution": "طاقم العمل",
        "detail.player": "مشغل",
        "detail.close": "إغلاق",
        "detail.noSourcesFor": "لا توجد مصادر متاحة لـ",
        "detail.availableSources": "المصادر المتاحة",
        "detail.favorites": "إضافة للمفضلة",
        
        // TV
        "tv.france": "فرنسا",
        "tv.arabWorld": "العالم العربي",
        "tv.nowPlaying": "جاري التشغيل:",
        
        // Downloads
        "downloads.title": "التحميلات",
        "downloads.completed": "مكتملة",
        "downloads.active": "نشطة",
        "downloads.emptyCompleted": "لا توجد تحميلات مكتملة",
        "downloads.emptyActive": "لا توجد تحميلات نشطة",
        "downloads.play": "تشغيل",
        "downloads.pause": "إيقاف مؤقت",
        "downloads.resume": "استئناف",
        "downloads.cancel": "إلغاء",
        "downloads.delete": "حذف",
        "downloads.waiting": "انتظار",
        "downloads.failed": "فشل",
        "downloads.paused": "متوقف",
        "downloads.downloading": "جاري التحميل...",
        "downloads.deleteAlertTitle": "حذف التحميل؟",
        "downloads.deleteAlertMessage": "هل أنت متأكد أنك تريد حذف هذا التحميل؟ هذا الإجراء لا يمكن التراجع عنه.",
        "downloads.deleteConfirm": "حذف",
        
        // Sources
        "VF": "مدبلج فرنسي",
        "VOSTFR": "مترجم فرنسي",
        "VO": "أصلي",
    ]
    
    // MARK: - German Translations
    
    private static let germanTranslations: [String: String] = [
        "nav.home": "Startseite",
        "nav.movies": "Filme",
        "nav.series": "Serien",
        "nav.tvChannels": "TV",
        "nav.favorites": "Favoriten",
        "nav.settings": "Einstellungen",
        "nav.downloads": "Downloads",
        
        "common.loading": "Laden...",
        "common.seeAll": "Alle anzeigen",
        "common.back": "Zurück",
        "common.search": "Suchen...",
        
        "home.continueWatching": "Weiterschauen",
        "home.byProvider": "Nach Anbieter",
        "movies.popular": "Beliebte Filme",
        "series.popular": "Beliebte Serien",
        
        "movies.latest": "Neueste Filme",
        "movies.action": "Action",
        "movies.drama": "Drama",
        "movies.crime": "Krimi",
        "movies.mystery": "Mystery",
        "movies.documentary": "Dokumentation",
        "movies.sciFi": "Science-Fiction",
        "movies.animation": "Animation",
        
        "series.latest": "Neueste Serien",
        "series.action": "Action",
        "series.actions": "Action",
        "series.actionAdventure": "Action & Abenteuer",
        "series.drama": "Drama",
        "series.crime": "Krimi",
        "series.mystery": "Mystery",
        "series.documentary": "Dokumentation",
        "series.sciFi": "Sci-Fi & Fantasy",
        "series.animation": "Animation",
        
        "detail.overview": "Übersicht",
        "detail.rating": "Bewertung",
        "detail.releaseDate": "VÖ-Datum",
        "detail.runtime": "Laufzeit",
        "detail.genres": "Genres",
        "detail.similar": "Ähnliche Inhalte",
        "detail.resume": "Fortsetzen",
        "detail.streamingSources": "Streaming-Quellen",
        "detail.remove": "Entfernen",
        "detail.trailer": "Trailer",
        "detail.seasons": "Staffeln",
        "detail.season": "Staffel",
        "detail.noSources": "Keine Quellen verfügbar",
        "detail.specials": "Specials/OAVs",
        
        "settings.title": "Einstellungen",
        "settings.appearance": "Erscheinungsbild",
        "settings.language": "Sprache",
        "settings.darkMode": "Dunkelmodus",
        "settings.data": "Daten",
        "settings.clearProgress": "Verlauf löschen",
        "settings.clearProgressDesc": "Diese Aktion löscht den gesamten Wiedergabeverlauf.",
        "settings.clearAlertTitle": "Verlauf löschen?",
        "settings.clearAlertMessage": "Sind Sie sicher? Diese Aktion kann nicht rückgängig gemacht werden.",
        "settings.cancel": "Abbrechen",
        "settings.delete": "Löschen",
        "detail.distribution": "Besetzung",
        "detail.player": "Player",
        "detail.close": "Schließen",
        "detail.noSourcesFor": "Keine Quellen für",
        "detail.availableSources": "Verfügbare Quellen",
        "detail.favorites": "Zu Favoriten hinzufügen",
        
        // TV
        "tv.france": "Frankreich",
        "tv.arabWorld": "Arabische Welt",
        "tv.nowPlaying": "Läuft gerade:",
        
        // Downloads
        "downloads.title": "Downloads",
        "downloads.completed": "Abgeschlossen",
        "downloads.active": "Aktiv",
        "downloads.emptyCompleted": "Keine abgeschlossenen Downloads",
        "downloads.emptyActive": "Keine aktiven Downloads",
        "downloads.play": "Abspielen",
        "downloads.pause": "Pause",
        "downloads.resume": "Fortsetzen",
        "downloads.cancel": "Abbrechen",
        "downloads.delete": "Löschen",
        "downloads.waiting": "Warten",
        "downloads.failed": "Fehlgeschlagen",
        "downloads.paused": "Pausiert",
        "downloads.downloading": "Wird heruntergeladen...",
        "downloads.deleteAlertTitle": "Download löschen?",
        "downloads.deleteAlertMessage": "Möchten Sie diesen Download wirklich löschen?",
        "downloads.deleteConfirm": "Löschen",
        
        // Sources
        "VF": "Franz. Synchro",
        "VOSTFR": "Franz. Untertitel",
        "VO": "Original",
    ]
    
    // MARK: - Italian Translations
    
    private static let italianTranslations: [String: String] = [
        "nav.home": "Home",
        "nav.movies": "Film",
        "nav.series": "Serie TV",
        "nav.tvChannels": "TV",
        "nav.favorites": "Preferiti",
        "nav.settings": "Impostazioni",
        "nav.downloads": "Download",
        
        "common.loading": "Caricamento...",
        "common.seeAll": "Vedi tutto",
        "common.back": "Indietro",
        "common.search": "Cerca...",
        
        "home.continueWatching": "Continua a guardare",
        "home.byProvider": "Per Piattaforma",
        "movies.popular": "Film Popolari",
        "series.popular": "Serie Popolari",
        
        "movies.latest": "Ultimi Film",
        "movies.action": "Azione",
        "movies.drama": "Drammatico",
        "movies.crime": "Crime",
        "movies.mystery": "Mistero",
        "movies.documentary": "Documentario",
        "movies.sciFi": "Fantascienza",
        "movies.animation": "Animazione",
        
        "series.latest": "Ultime Serie",
        "series.action": "Azione",
        "series.actions": "Azione",
        "series.actionAdventure": "Azione & Avventura",
        "series.drama": "Drammatico",
        "series.crime": "Crime",
        "series.mystery": "Mistero",
        "series.documentary": "Documentario",
        "series.sciFi": "Fantascienza & Fantasy",
        "series.animation": "Animazione",
        
        "detail.overview": "Trama",
        "detail.rating": "Valutazione",
        "detail.releaseDate": "Uscita",
        "detail.runtime": "Durata",
        "detail.genres": "Generi",
        "detail.similar": "Simili",
        "detail.resume": "Riprendi",
        "detail.streamingSources": "Fonti streaming",
        "detail.remove": "Rimuovi",
        "detail.trailer": "Trailer",
        "detail.seasons": "Stagioni",
        "detail.season": "Stagione",
        "detail.noSources": "Nessuna fonte",
        "detail.specials": "Speciali/OAVs",
        
        "settings.title": "Impostazioni",
        "settings.appearance": "Aspetto",
        "settings.language": "Lingua",
        "settings.darkMode": "Modalità scura",
        "settings.data": "Dati",
        "settings.clearProgress": "Cancella cronologia",
        "settings.clearProgressDesc": "Questa azione cancellerà tutta la cronologia.",
        "settings.clearAlertTitle": "Cancellare?",
        "settings.clearAlertMessage": "Sei sicuro? Azione irreversibile.",
        "settings.cancel": "Annulla",
        "settings.delete": "Elimina",
        "detail.distribution": "Cast",
        "detail.player": "Player",
        "detail.close": "Chiudi",
        "detail.noSourcesFor": "Nessuna fonte per",
        "detail.availableSources": "Fonti disponibili",
        "detail.favorites": "Aggiungi ai preferiti",
        
        // TV
        "tv.france": "Francia",
        "tv.arabWorld": "Mondo Arabo",
        "tv.nowPlaying": "In riproduzione:",
        
        // Downloads
        "downloads.title": "Download",
        "downloads.completed": "Completati",
        "downloads.active": "Attivi",
        "downloads.emptyCompleted": "Nessun download completato",
        "downloads.emptyActive": "Nessun download attivo",
        "downloads.play": "Riproduci",
        "downloads.pause": "Pausa",
        "downloads.resume": "Riprendi",
        "downloads.cancel": "Annulla",
        "downloads.delete": "Elimina",
        "downloads.waiting": "In attesa",
        "downloads.failed": "Fallito",
        "downloads.paused": "In pausa",
        "downloads.downloading": "Scaricamento...",
        "downloads.deleteAlertTitle": "Eliminare?",
        "downloads.deleteAlertMessage": "Sei sicuro di voler eliminare questo download?",
        "downloads.deleteConfirm": "Elimina",
        
        // Sources
        "VF": "Doppiaggio Francese",
        "VOSTFR": "Sottotitoli in Francese",
        "VO": "Originale",
    ]
    
    // MARK: - Portuguese Translations
    
    private static let portugueseTranslations: [String: String] = [
        "nav.home": "Início",
        "nav.movies": "Filmes",
        "nav.series": "Séries",
        "nav.tvChannels": "TV",
        "nav.favorites": "Favoritos",
        "nav.settings": "Definições",
        "nav.downloads": "Downloads",
        
        "common.loading": "A carregar...",
        "common.seeAll": "Ver tudo",
        "common.back": "Voltar",
        "common.search": "Pesquisar...",
        
        "home.continueWatching": "Continuar a ver",
        "home.byProvider": "Por Plataforma",
        "movies.popular": "Filmes Populares",
        "series.popular": "Séries Populares",
        
        "movies.latest": "Últimos Filmes",
        "movies.action": "Ação",
        "movies.drama": "Drama",
        "movies.crime": "Crime",
        "movies.mystery": "Mistério",
        "movies.documentary": "Documentário",
        "movies.sciFi": "Ficção Científica",
        "movies.animation": "Animação",
        
        "series.latest": "Últimas Séries",
        "series.action": "Ação",
        "series.actions": "Ação",
        "series.actionAdventure": "Ação e Aventura",
        "series.drama": "Drama",
        "series.crime": "Crime",
        "series.mystery": "Mistério",
        "series.documentary": "Documentário",
        "series.sciFi": "Ficção e Fantasia",
        "series.animation": "Animação",
        
        "detail.overview": "Sinopse",
        "detail.rating": "Classificação",
        "detail.releaseDate": "Lançamento",
        "detail.runtime": "Duração",
        "detail.genres": "Géneros",
        "detail.similar": "Semelhantes",
        "detail.resume": "Retomar",
        "detail.streamingSources": "Fontes",
        "detail.remove": "Remover",
        "detail.trailer": "Trailer",
        "detail.seasons": "Temporadas",
        "detail.season": "Temporada",
        "detail.noSources": "Sem fontes",
        "detail.specials": "Especiais/OAVs",
        
        "settings.title": "Definições",
        "settings.appearance": "Aparência",
        "settings.language": "Idioma",
        "settings.darkMode": "Modo escuro",
        "settings.data": "Dados",
        "settings.clearProgress": "Limpar progresso",
        "settings.clearProgressDesc": "Apagar todo o histórico de visualização.",
        "settings.clearAlertTitle": "Limpar?",
        "settings.clearAlertMessage": "Tem a certeza? Ação irreversível.",
        "settings.cancel": "Cancelar",
        "settings.delete": "Apagar",
        "detail.distribution": "Elenco",
        "detail.player": "Leitor",
        "detail.close": "Fechar",
        "detail.noSourcesFor": "Sem fontes para",
        "detail.availableSources": "Fontes disponíveis",
        "detail.favorites": "Adicionar aos favoritos",
        
         // TV
        "tv.france": "França",
        "tv.arabWorld": "Mundo Árabe",
        "tv.nowPlaying": "A reproduzir:",
        
        // Downloads
        "downloads.title": "Downloads",
        "downloads.completed": "Concluídos",
        "downloads.active": "Ativos",
        "downloads.emptyCompleted": "Sem downloads concluídos",
        "downloads.emptyActive": "Sem downloads ativos",
        "downloads.play": "Reproduzir",
        "downloads.pause": "Pausa",
        "downloads.resume": "Retomar",
        "downloads.cancel": "Cancelar",
        "downloads.delete": "Apagar",
        "downloads.waiting": "A aguardar",
        "downloads.failed": "Falhou",
        "downloads.paused": "Em pausa",
        "downloads.downloading": "A transferir...",
        "downloads.deleteAlertTitle": "Apagar download?",
        "downloads.deleteAlertMessage": "Tem a certeza de que deseja apagar?",
        "downloads.deleteConfirm": "Apagar",
        
        // Sources
        "VF": "Dobragem Francesa",
        "VOSTFR": "Legendas em Francês",
        "VO": "Original",
    ]
}

// Extension for convenience
extension AppTheme {
    func t(_ key: String) -> String {
        return Localizable.string(key, language: selectedLanguage)
    }
}
