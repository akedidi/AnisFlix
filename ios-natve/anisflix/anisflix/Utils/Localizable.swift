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
        "detail.availableSources": "Available Sources",
        "detail.favorites": "Add to Favorites",
        
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
    ]
    
    // MARK: - German, Italian, Portuguese (using English as fallback for now)
    
    private static let germanTranslations: [String: String] = englishTranslations
    private static let italianTranslations: [String: String] = englishTranslations
    private static let portugueseTranslations: [String: String] = englishTranslations
}

// Extension for convenience
extension AppTheme {
    func t(_ key: String) -> String {
        return Localizable.string(key, language: selectedLanguage)
    }
}
