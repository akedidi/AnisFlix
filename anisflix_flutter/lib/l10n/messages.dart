// French source messages with English and Spanish translations.
// Keep numbered placeholders identical in all three languages.
const appMessages = <String, List<String>>{
  "Langue": ["Language", "Idioma"],
  "Mode sombre": ["Dark Mode", "Modo oscuro"],
  "Données": ["Data", "Datos"],
  "Version": ["Version", "Versión"],
  "Réduire la taille des sous-titres": [
    "Decrease subtitle size",
    "Reducir el tamaño de los subtítulos",
  ],
  "Augmenter la taille des sous-titres": [
    "Increase subtitle size",
    "Aumentar el tamaño de los subtítulos",
  ],
  "Vider le cache d’images": [
    "Clear image cache",
    "Vaciar la caché de imágenes",
  ],
  "Vider le cache ?": ["Clear cache?", "¿Vaciar la caché?"],
  "Cela supprimera toutes les images en cache. Elles seront rechargées depuis le réseau.":
      [
        "This will remove all cached images. They will be downloaded again.",
        "Se eliminarán todas las imágenes en caché. Se volverán a descargar.",
      ],
  "Vider": ["Clear", "Vaciar"],
  "Cache d’images vidé.": [
    "Image cache cleared.",
    "Caché de imágenes vaciada.",
  ],
  "Impossible de vider le cache d’images. Réessaie.": [
    "Could not clear the image cache. Try again.",
    "No se pudo vaciar la caché de imágenes. Inténtalo de nuevo.",
  ],
  "Supprimer la progression": ["Clear Progress", "Borrar progreso"],
  "Supprimer la progression ?": ["Clear Progress?", "¿Borrar progreso?"],
  "Cette action supprimera tout l’historique de lecture des films et séries.": [
    "This action will delete all movie and series watch history.",
    "Esta acción eliminará todo el historial de películas y series.",
  ],
  "Êtes-vous sûr de vouloir supprimer tout votre historique de lecture ? Cette action est irréversible.":
      [
        "Are you sure you want to delete all your watch history? This action cannot be undone.",
        "¿Seguro que quieres borrar todo tu historial? Esta acción es irreversible.",
      ],
  "Progression supprimée.": ["Watch history cleared.", "Historial eliminado."],
  "Impossible de supprimer la progression. Réessaie.": [
    "Could not clear watch history. Try again.",
    "No se pudo borrar el historial. Inténtalo de nuevo.",
  ],
  "Connecté à Trakt": ["Connected to Trakt", "Conectado a Trakt"],
  "Synchronise ta progression de lecture avec Trakt.tv.": [
    "Sync your watch progress with Trakt.tv.",
    "Sincroniza tu progreso con Trakt.tv.",
  ],
  "En attente d’autorisation…": [
    "Waiting for authorization…",
    "Esperando autorización…",
  ],

  'VF': ['FR dub', 'Doblaje FR'],
  'VOSTFR': ['FR subs', 'Subs. FR'],
  'VO': ['Original', 'Original'],
  'Fournisseur indisponible.': [
    'Provider unavailable.',
    'Proveedor no disponible.',
  ],
  "Accueil": ["Home", "Inicio"],
  "Films": ["Movies", "Películas"],
  "Films d'Action": ["Action movies", "Películas de acción"],
  'Films de Drame': ['Drama movies', 'Películas de drama'],
  'Films de Comédie': ['Comedy movies', 'Películas de comedia'],
  "Séries d'Action": ["Action TV shows", "Series de acción"],
  'Séries de Drame': ['Drama TV shows', 'Series de drama'],
  'Séries de Comédie': ['Comedy TV shows', 'Series de comedia'],
  'Action': ['Action', 'Acción'],
  'Action & Aventure': ['Action & Adventure', 'Acción y aventura'],
  'Drame': ['Drama', 'Drama'],
  'Policier': ['Crime', 'Crimen'],
  'Mystère': ['Mystery', 'Misterio'],
  'Documentaire': ['Documentary', 'Documental'],
  'Science-fiction': ['Science fiction', 'Ciencia ficción'],
  'Animation': ['Animation', 'Animación'],
  "Séries": ["TV shows", "Series"],
  "Animés": ["Anime", "Anime"],
  "Recherche": ["Search", "Búsqueda"],
  "Favoris": ["Favorites", "Favoritos"],
  "Téléchargements": ["Downloads", "Descargas"],
  "Paramètres": ["Settings", "Ajustes"],
  "Plateformes": ["Platforms", "Plataformas"],
  "Plus": ["More", "Más"],
  "Langue de l’application et du catalogue": [
    "App and catalog language",
    "Idioma de la aplicación y del catálogo",
  ],
  "Rechercher": ["Search", "Buscar"],
  "Rechercher un film, une série ou un anime…": [
    "Search for a movie, TV show or anime…",
    "Buscar una película, serie o anime…",
  ],
  "Apparence": ["Appearance", "Apariencia"],
  "Apparence : clair / sombre": [
    "Appearance: light / dark",
    "Apariencia: claro / oscuro",
  ],
  "Clair": ["Light", "Claro"],
  "Sombre": ["Dark", "Oscuro"],
  "Système": ["System", "Sistema"],
  "Clair, sombre ou thème du système": [
    "Light, dark or system theme",
    "Tema claro, oscuro o del sistema",
  ],
  "Réglages avancés": ["Advanced settings", "Ajustes avanzados"],
  "Adresse du service AnisFlix": [
    "AnisFlix service URL",
    "Dirección del servicio AnisFlix",
  ],
  "Saisis une adresse HTTPS valide.": [
    "Enter a valid HTTPS URL.",
    "Introduce una dirección HTTPS válida.",
  ],
  "Clé TMDB (configuration avancée)": [
    "TMDB key (advanced configuration)",
    "Clave TMDB (configuración avanzada)",
  ],
  "Déjà incluse dans cette application. Aucune saisie nécessaire.": [
    "Already included in this app. No entry required.",
    "Ya está incluida en esta aplicación. No es necesario introducirla.",
  ],
  "Paramètres enregistrés.": ["Settings saved.", "Ajustes guardados."],
  "Enregistrer": ["Save", "Guardar"],
  "Ouvrir une vidéo": ["Open a video", "Abrir un vídeo"],
  "Adresse HTTPS du fichier vidéo": [
    "Video file HTTPS URL",
    "Dirección HTTPS del archivo de vídeo",
  ],
  "Vidéo": ["Video", "Vídeo"],
  "Vidéo directe": ["Direct video", "Vídeo directo"],
  "Lire la vidéo": ["Play video", "Reproducir vídeo"],
  "AnisFlix · Édition reconstruite\nRessources récupérées des APK Android, code Flutter réécrit.":
      [
        "AnisFlix · Rebuilt edition\nAssets recovered from Android APKs, rewritten Flutter code.",
        "AnisFlix · Edición reconstruida\nRecursos recuperados de APK de Android, código Flutter reescrito.",
      ],
  "Ce produit utilise l’API TMDB mais n’est ni approuvé ni certifié par TMDB.": [
    "This product uses the TMDB API but is not endorsed or certified by TMDB.",
    "Este producto utiliza la API de TMDB, pero TMDB no lo avala ni lo certifica.",
  ],
  "Mises à jour": ["Updates", "Actualizaciones"],
  "Version installée : {0}": [
    "Installed version: {0}",
    "Versión instalada: {0}",
  ],
  "Vérifier au démarrage": ["Check on startup", "Comprobar al iniciar"],
  "Le téléchargement demande ton accord.": [
    "Downloads require your approval.",
    "Las descargas requieren tu autorización.",
  ],
  "Nouvelle version : {0}": ["New version: {0}", "Nueva versión: {0}"],
  "Nouveautés": ["What’s new", "Novedades"],
  "Vérification…": ["Checking…", "Comprobando…"],
  "Vérifier les mises à jour": ["Check for updates", "Buscar actualizaciones"],
  "Télécharger la mise à jour": ["Download update", "Descargar actualización"],
  "Afficher dans le Finder": ["Show in Finder", "Mostrar en Finder"],
  "Installer": ["Install", "Instalar"],
  "AnisFlix {0} est disponible.": [
    "AnisFlix {0} is available.",
    "AnisFlix {0} está disponible.",
  ],
  "Plus tard": ["Later", "Más tarde"],
  "Voir la mise à jour": ["View update", "Ver actualización"],
  "Film": ["Movie", "Película"],
  "Série": ["TV show", "Serie"],
  "Plus d’infos": ["More info", "Más información"],
  "Dans les favoris": ["In favorites", "En favoritos"],
  "Ajouter aux favoris": ["Add to favorites", "Añadir a favoritos"],
  "Reprendre": ["Continue watching", "Seguir viendo"],
  "Voir tout": ["View all", "Ver todo"],
  "Ce catalogue est momentanément indisponible.": [
    "This catalog is temporarily unavailable.",
    "Este catálogo no está disponible temporalmente.",
  ],
  "Réessayer": ["Retry", "Reintentar"],
  "Aucun titre pour le moment.": ["No titles yet.", "Todavía no hay títulos."],
  "Derniers films": ["Latest movies", "Últimas películas"],
  "Derniers épisodes": ["Latest episodes", "Últimos episodios"],
  "Dernières séries": ["Latest TV shows", "Últimas series"],
  "Films Populaires": ["Popular movies", "Películas populares"],
  "Séries Populaires": ["Popular TV shows", "Series populares"],
  "Anime - Derniers Films": [
    "Anime - Latest movies",
    "Anime - Últimas películas",
  ],
  "Anime - Dernières Séries": [
    "Anime - Latest TV shows",
    "Anime - Últimas series",
  ],
  "Anime - Films Populaires": [
    "Anime - Popular movies",
    "Anime - Películas populares",
  ],
  "Anime - Séries Populaires": [
    "Anime - Popular TV shows",
    "Anime - Series populares",
  ],
  "Connexion impossible. Réessaie.": [
    "Unable to connect. Try again.",
    "No se puede conectar. Inténtalo de nuevo.",
  ],
  "À découvrir": ["Discover", "Descubrir"],
  "Mes favoris": ["My favorites", "Mis favoritos"],
  "Un film, une série…": ["A movie, a TV show…", "Una película, una serie…"],
  "Effacer": ["Clear", "Borrar"],
  "Toutes les plateformes": ["All platforms", "Todas las plataformas"],
  "Dernières sorties": ["Latest releases", "Últimos estrenos"],
  "Aucun titre à afficher.": [
    "No titles to display.",
    "No hay títulos para mostrar.",
  ],
  "Voir plus": ["Show more", "Ver más"],
  "Recherche indisponible. Réessaie.": [
    "Search unavailable. Try again.",
    "Búsqueda no disponible. Inténtalo de nuevo.",
  ],
  "Effacer la recherche": ["Clear search", "Borrar búsqueda"],
  "Espace": ["Space", "Espacio"],
  "Retour": ["Back", "Volver"],
  "Réessayer de charger la fiche": [
    "Retry loading details",
    "Reintentar cargar la ficha",
  ],
  "Saisons et épisodes": ["Seasons and episodes", "Temporadas y episodios"],
  "Saison {0}": ["Season {0}", "Temporada {0}"],
  "Saison 4 partie 1": ["Season 4 part 1", "Temporada 4 parte 1"],
  "Saison 4 partie 2": ["Season 4 part 2", "Temporada 4 parte 2"],
  "Saison 4 partie {0}": ["Season 4 part {0}", "Temporada 4 parte {0}"],
  "Réessayer les épisodes": [
    "Retry episodes",
    "Reintentar cargar los episodios",
  ],
  "Épisode": ["Episode", "Episodio"],
  "Sélectionne un épisode pour afficher ses sources.": [
    "Select an episode to see its sources.",
    "Selecciona un episodio para ver sus fuentes.",
  ],
  "Saison {0} · Épisode {1}": [
    "Season {0} · Episode {1}",
    "Temporada {0} · Episodio {1}",
  ],
  "Aucun résumé disponible.": [
    "No synopsis available.",
    "No hay sinopsis disponible.",
  ],
  "Bande-annonce": ["Trailer", "Tráiler"],
  "Disponible sur": ["Available on", "Disponible en"],
  "Contenus similaires": ["Similar titles", "Títulos similares"],
  "Impossible de charger les liens.": [
    "Unable to load links.",
    "No se pueden cargar los enlaces.",
  ],
  "Téléchargement demandé. Suivi dans Téléchargements.": [
    "Download requested. Track it in Downloads.",
    "Descarga solicitada. Consulta el progreso en Descargas.",
  ],
  "Impossible d’ouvrir ce lien.": [
    "Unable to open this link.",
    "No se puede abrir este enlace.",
  ],
  "Sources disponibles": ["Available sources", "Fuentes disponibles"],
  "Recherche des sources…": ["Finding sources…", "Buscando fuentes…"],
  "Recherche d’autres liens…": ["Finding more links…", "Buscando más enlaces…"],
  "Aucun lien disponible pour ce titre.": [
    "No links available for this title.",
    "No hay enlaces disponibles para este título.",
  ],
  "Aucun lien {0} disponible.": [
    "No {0} links available.",
    "No hay enlaces {0} disponibles.",
  ],
  "Télécharger": ["Download", "Descargar"],
  "{0} fournisseur(s) momentanément indisponible(s).": [
    "{0} provider(s) temporarily unavailable.",
    "{0} proveedor(es) no disponible(s) temporalmente.",
  ],
  "Actualiser les liens": ["Refresh links", "Actualizar enlaces"],
  "Fermer": ["Close", "Cerrar"],
  "Tes fichiers téléchargés apparaîtront ici.": [
    "Your downloaded files will appear here.",
    "Tus archivos descargados aparecerán aquí.",
  ],
  "Annuler": ["Cancel", "Cancelar"],
  "Disponible hors ligne": ["Available offline", "Disponible sin conexión"],
  "Ce fichier a été déplacé ou supprimé.": [
    "This file has been moved or deleted.",
    "Este archivo se ha movido o eliminado.",
  ],
  "Hors ligne": ["Offline", "Sin conexión"],
  "Supprimer le fichier": ["Delete file", "Eliminar archivo"],
  "Supprimer ce téléchargement ?": [
    "Delete this download?",
    "¿Eliminar esta descarga?",
  ],
  "Conserver": ["Keep", "Conservar"],
  "Supprimer": ["Delete", "Eliminar"],
  "Impossible de supprimer ce fichier.": [
    "Unable to delete this file.",
    "No se puede eliminar este archivo.",
  ],
  "{0} · {1} Mo": ["{0} · {1} MB", "{0} · {1} MB"],
  "Sans titre": ["Untitled", "Sin título"],
  "Compte connecté · suivi de lecture activé": [
    "Account connected · playback tracking enabled",
    "Cuenta conectada · seguimiento de reproducción activado",
  ],
  "Le stockage sécurisé est indisponible.": [
    "Secure storage is unavailable.",
    "El almacenamiento seguro no está disponible.",
  ],
  "Déconnecter cet appareil": [
    "Disconnect this device",
    "Desconectar este dispositivo",
  ],
  "Ouvre trakt.tv/activate et saisis ce code :": [
    "Open trakt.tv/activate and enter this code:",
    "Abre trakt.tv/activate e introduce este código:",
  ],
  "Ouvrir Trakt": ["Open Trakt", "Abrir Trakt"],
  "Connexion…": ["Connecting…", "Conectando…"],
  "Connecter Trakt": ["Connect Trakt", "Conectar Trakt"],
  "Impossible de lire cette source. Reviens à la liste pour en choisir une autre.":
      [
        "Unable to play this source. Go back to the list and choose another.",
        "No se puede reproducir esta fuente. Vuelve a la lista para elegir otra.",
      ],
  "Ouverture de la vidéo impossible.": [
    "Unable to open the video.",
    "No se puede abrir el vídeo.",
  ],
  "Pause": ["Pause", "Pausar"],
  "Lecture": ["Play", "Reproducir"],
  "Revenir au lecteur": ["Return to player", "Volver al reproductor"],
  "Image dans l’image": ["Picture in picture", "Imagen en imagen"],
  "Le mode image dans l’image n’est pas disponible.": [
    "Picture in picture is unavailable.",
    "El modo imagen en imagen no está disponible.",
  ],
  "Sous-titres et décalage": [
    "Subtitles and timing",
    "Subtítulos y sincronización",
  ],
  "Changer de source": ["Change source", "Cambiar fuente"],
  "Sous-titres": ["Subtitles", "Subtítulos"],
  'Recherche sur OpenSubtitles…': [
    'Searching OpenSubtitles…',
    'Buscando en OpenSubtitles…',
  ],
  'Recherche de sous-titres indisponible.': [
    'Subtitle search unavailable.',
    'Búsqueda de subtítulos no disponible.',
  ],
  'Français': ['French', 'Francés'],
  'Anglais': ['English', 'Inglés'],
  'Espagnol': ['Spanish', 'Español'],
  'Allemand': ['German', 'Alemán'],
  'Italien': ['Italian', 'Italiano'],
  'Portugais': ['Portuguese', 'Portugués'],
  'Russe': ['Russian', 'Ruso'],
  'Turc': ['Turkish', 'Turco'],
  'Arabe': ['Arabic', 'Árabe'],
  'Chinois': ['Chinese', 'Chino'],
  'Japonais': ['Japanese', 'Japonés'],
  'Coréen': ['Korean', 'Coreano'],
  'Néerlandais': ['Dutch', 'Neerlandés'],
  'Polonais': ['Polish', 'Polaco'],
  'Suédois': ['Swedish', 'Sueco'],
  'Danois': ['Danish', 'Danés'],
  'Finnois': ['Finnish', 'Finés'],
  'Norvégien': ['Norwegian', 'Noruego'],
  'Tchèque': ['Czech', 'Checo'],
  'Hongrois': ['Hungarian', 'Húngaro'],
  'Roumain': ['Romanian', 'Rumano'],
  'Bulgare': ['Bulgarian', 'Búlgaro'],
  'Grec': ['Greek', 'Griego'],
  'Hébreu': ['Hebrew', 'Hebreo'],
  'Thaï': ['Thai', 'Tailandés'],
  'Vietnamien': ['Vietnamese', 'Vietnamita'],
  'Indonésien': ['Indonesian', 'Indonesio'],
  'Malais': ['Malay', 'Malayo'],
  'Persan': ['Persian', 'Persa'],
  'Ukrainien': ['Ukrainian', 'Ucraniano'],
  'Croate': ['Croatian', 'Croata'],
  'Serbe': ['Serbian', 'Serbio'],
  'Slovène': ['Slovenian', 'Esloveno'],
  'Slovaque': ['Slovak', 'Eslovaco'],
  'Lituanien': ['Lithuanian', 'Lituano'],
  'Letton': ['Latvian', 'Letón'],
  'Estonien': ['Estonian', 'Estonio'],
  "Désactivés": ["Off", "Desactivados"],
  "Automatique": ["Automatic", "Automático"],
  "Piste {0}": ["Track {0}", "Pista {0}"],
  "{0} · Fournisseur": ["{0} · Provider", "{0} · Proveedor"],
  "Aucune piste de sous-titres disponible.": [
    "No subtitle tracks available.",
    "No hay pistas de subtítulos disponibles.",
  ],
  "Décalage": ["Timing offset", "Desfase"],
  "Avancer les sous-titres de 0,1 s": [
    "Show subtitles 0.1 s earlier",
    "Adelantar los subtítulos 0,1 s",
  ],
  "Retarder les sous-titres de 0,1 s": [
    "Show subtitles 0.1 s later",
    "Retrasar los subtítulos 0,1 s",
  ],
  "Secondes": ["Seconds", "Segundos"],
  "Appliquer": ["Apply", "Aplicar"],
  "Décalage appliqué : {0} s": [
    "Applied offset: {0} s",
    "Desfase aplicado: {0} s",
  ],
  "Positif : plus tard · Négatif : plus tôt": [
    "Positive: later · Negative: earlier",
    "Positivo: más tarde · Negativo: antes",
  ],
  "Réinitialiser le décalage": ["Reset timing", "Restablecer el desfase"],
  "Taille du texte": ["Text size", "Tamaño del texto"],
  "Indique un décalage entre −600 et 600 secondes.": [
    "Enter an offset between −600 and 600 seconds.",
    "Introduce un desfase entre −600 y 600 segundos.",
  ],
  "Impossible d’appliquer ce réglage. Réessaie.": [
    "Unable to apply this setting. Try again.",
    "No se puede aplicar este ajuste. Inténtalo de nuevo.",
  ],
  "Format d’image": ["Aspect ratio", "Relación de aspecto"],
  "Original": ["Original", "Original"],
  "Étiré": ["Stretched", "Estirado"],
  "Plein écran": ["Fullscreen", "Pantalla completa"],
  "Quitter le plein écran": ["Exit fullscreen", "Salir de pantalla completa"],
  "Reculer de 10 secondes": ["Rewind 10 seconds", "Retroceder 10 segundos"],
  "Avancer de 10 secondes": ["Forward 10 seconds", "Avanzar 10 segundos"],
  "Mises à jour indisponibles sur ce système.": [
    "Updates are unavailable on this system.",
    "Las actualizaciones no están disponibles en este sistema.",
  ],
  "Adresse de mise à jour invalide.": [
    "Invalid update URL.",
    "Dirección de actualización no válida.",
  ],
  "Limite GitHub atteinte. Réessaie plus tard.": [
    "GitHub rate limit reached. Try again later.",
    "Se ha alcanzado el límite de GitHub. Inténtalo más tarde.",
  ],
  "Vérification indisponible (HTTP {0}).": [
    "Update check unavailable (HTTP {0}).",
    "Comprobación no disponible (HTTP {0}).",
  ],
  "Réponse de mise à jour trop volumineuse.": [
    "Update response is too large.",
    "La respuesta de actualización es demasiado grande.",
  ],
  "Paquet de mise à jour incompatible.": [
    "Incompatible update package.",
    "Paquete de actualización incompatible.",
  ],
  "Paquet de mise à jour absent.": [
    "Update package is missing.",
    "Falta el paquete de actualización.",
  ],
  "Informations de vérification invalides.": [
    "Invalid verification information.",
    "Información de verificación no válida.",
  ],
  "Trop de releases pour terminer la vérification.": [
    "Too many releases to complete the check.",
    "Demasiadas versiones para completar la comprobación.",
  ],
  "Téléchargement incomplet ou indisponible.": [
    "Download incomplete or unavailable.",
    "Descarga incompleta o no disponible.",
  ],
  "Le fichier est corrompu : vérification SHA-256 échouée.": [
    "The file is corrupt: SHA-256 verification failed.",
    "El archivo está dañado: ha fallado la verificación SHA-256.",
  ],
  "Vérification indisponible : version de l’application inconnue.": [
    "Update check unavailable: unknown app version.",
    "Comprobación no disponible: versión de la aplicación desconocida.",
  ],
  "Version de l’application indisponible.": [
    "App version unavailable.",
    "Versión de la aplicación no disponible.",
  ],
  "Aucune mise à jour compatible publiée pour cette édition.": [
    "No compatible update published for this edition.",
    "No hay actualizaciones compatibles publicadas para esta edición.",
  ],
  "La version {0} est disponible.": [
    "Version {0} is available.",
    "La versión {0} está disponible.",
  ],
  "Vérification impossible. Vérifie ta connexion et réessaie.": [
    "Unable to check for updates. Check your connection and try again.",
    "No se pueden buscar actualizaciones. Comprueba la conexión e inténtalo de nuevo.",
  ],
  "Archive vérifiée. Ouvre-la puis remplace AnisFlix dans Applications après avoir quitté l’app.":
      [
        "Archive verified. Open it, then quit the app and replace AnisFlix in Applications.",
        "Archivo verificado. Ábrelo, cierra la aplicación y sustituye AnisFlix en Aplicaciones.",
      ],
  "Paquet vérifié. Tu peux lancer l’installation.": [
    "Package verified. You can start installation.",
    "Paquete verificado. Ya puedes iniciar la instalación.",
  ],
  "Téléchargement impossible. Réessaie.": [
    "Unable to download. Try again.",
    "No se puede descargar. Inténtalo de nuevo.",
  ],
  "Paquet modifié. Télécharge-le à nouveau.": [
    "Package changed. Download it again.",
    "El paquete ha cambiado. Descárgalo de nuevo.",
  ],
  "Autorise AnisFlix à installer des apps, puis reviens et sélectionne Installer.":
      [
        "Allow AnisFlix to install apps, then return and select Install.",
        "Permite que AnisFlix instale aplicaciones, vuelve y selecciona Instalar.",
      ],
  "Archive affichée dans le Finder. Décompresse-la et remplace AnisFlix après avoir quitté l’app.":
      [
        "Archive shown in Finder. Unzip it, quit the app and replace AnisFlix.",
        "Archivo mostrado en Finder. Descomprímelo, cierra la aplicación y sustituye AnisFlix.",
      ],
  "Installation confiée à Android. Confirme dans la fenêtre système.": [
    "Installation handed to Android. Confirm in the system dialog.",
    "Instalación enviada a Android. Confirma en la ventana del sistema.",
  ],
  "Installation indisponible.": [
    "Installation unavailable.",
    "Instalación no disponible.",
  ],
  "Impossible d’ouvrir l’installateur.": [
    "Unable to open the installer.",
    "No se puede abrir el instalador.",
  ],
  "Taille du paquet incorrecte.": [
    "Incorrect package size.",
    "Tamaño de paquete incorrecto.",
  ],
  "Le stockage sécurisé du compte est indisponible.": [
    "Secure account storage is unavailable.",
    "El almacenamiento seguro de la cuenta no está disponible.",
  ],
  "Connexion à Trakt indisponible ({0}).": [
    "Trakt connection unavailable ({0}).",
    "Conexión a Trakt no disponible ({0}).",
  ],
  "Adresse de connexion Trakt invalide.": [
    "Invalid Trakt connection URL.",
    "Dirección de conexión a Trakt no válida.",
  ],
  "Impossible de démarrer la connexion à Trakt.": [
    "Unable to start the Trakt connection.",
    "No se puede iniciar la conexión a Trakt.",
  ],
  "Le code Trakt a expiré. Recommence la connexion.": [
    "The Trakt code has expired. Start connecting again.",
    "El código de Trakt ha caducado. Inicia la conexión de nuevo.",
  ],
  "Le code Trakt a expiré.": [
    "The Trakt code has expired.",
    "El código de Trakt ha caducado.",
  ],
  "La connexion à Trakt a été refusée.": [
    "The Trakt connection was denied.",
    "La conexión a Trakt ha sido rechazada.",
  ],
  "Connexion à Trakt interrompue ({0}).": [
    "Trakt connection interrupted ({0}).",
    "Conexión a Trakt interrumpida ({0}).",
  ],
  "Connexion réseau interrompue. Nouvelle tentative en cours.": [
    "Network connection interrupted. Retrying.",
    "Conexión de red interrumpida. Reintentando.",
  ],
  "Réponse Trakt invalide.": [
    "Invalid Trakt response.",
    "Respuesta de Trakt no válida.",
  ],
  "La synchronisation Trakt est momentanément indisponible.": [
    "Trakt sync is temporarily unavailable.",
    "La sincronización con Trakt no está disponible temporalmente.",
  ],
  "Le service ne répond pas ({0}).": [
    "The service is not responding ({0}).",
    "El servicio no responde ({0}).",
  ],
  "Réponse du service illisible.": [
    "Unreadable service response.",
    "Respuesta del servicio ilegible.",
  ],
  "Ajoute une clé TMDB dans les paramètres pour la recherche et les fiches.": [
    "Add a TMDB key in settings for search and details.",
    "Añade una clave TMDB en los ajustes para la búsqueda y las fichas.",
  ],
  "Impossible de charger les sources du moteur iOS natif. Réessaie.": [
    "Unable to load sources from the native iOS engine. Try again.",
    "No se pueden cargar las fuentes del motor nativo de iOS. Inténtalo de nuevo.",
  ],
  "Les services de lecture sont indisponibles. Réessaie plus tard.": [
    "Playback services are unavailable. Try again later.",
    "Los servicios de reproducción no están disponibles. Inténtalo más tarde.",
  ],
  "Cet hébergeur ne peut pas encore être ouvert dans le lecteur. Choisis un autre lien.":
      [
        "This host cannot be opened in the player yet. Choose another link.",
        "Este servidor aún no se puede abrir en el reproductor. Elige otro enlace.",
      ],
  "Impossible d’ouvrir ce lien. Essaie un autre hébergeur.": [
    "Unable to open this link. Try another host.",
    "No se puede abrir este enlace. Prueba con otro servidor.",
  ],
  "Ce téléchargement est déjà en cours.": [
    "This download is already in progress.",
    "Esta descarga ya está en curso.",
  ],
  "Ce format vidéo n’est pas téléchargeable.": [
    "This video format cannot be downloaded.",
    "Este formato de vídeo no se puede descargar.",
  ],
  "Le téléchargement a échoué. Réessaie.": [
    "Download failed. Try again.",
    "La descarga ha fallado. Inténtalo de nuevo.",
  ],
  "Téléchargement annulé.": ["Download canceled.", "Descarga cancelada."],
  "Adresse de média invalide.": [
    "Invalid media URL.",
    "Dirección de contenido no válida.",
  ],
  "Le serveur a refusé le téléchargement ({0}).": [
    "The server refused the download ({0}).",
    "El servidor ha rechazado la descarga ({0}).",
  ],
  "Le serveur a renvoyé une page Web au lieu du média.": [
    "The server returned a web page instead of media.",
    "El servidor ha devuelto una página web en lugar del contenido.",
  ],
  "Téléchargement incomplet.": ["Incomplete download.", "Descarga incompleta."],
  "Seuls les fichiers DASH à la demande sont téléchargeables.": [
    "Only on-demand DASH files can be downloaded.",
    "Solo se pueden descargar archivos DASH bajo demanda.",
  ],
  "Cette source DASH protégée ne peut pas être téléchargée.": [
    "This protected DASH source cannot be downloaded.",
    "Esta fuente DASH protegida no se puede descargar.",
  ],
  "Aucune piste DASH compatible.": [
    "No compatible DASH tracks.",
    "No hay pistas DASH compatibles.",
  ],
  "Le fichier DASH ne contient aucune piste.": [
    "The DASH file contains no tracks.",
    "El archivo DASH no contiene pistas.",
  ],
  "Ce format de segmentation DASH n’est pas pris en charge.": [
    "This DASH segmentation format is unsupported.",
    "Este formato de segmentación DASH no es compatible.",
  ],
  "Modèle DASH sans adresse de segment.": [
    "DASH template has no segment URL.",
    "La plantilla DASH no tiene dirección de segmento.",
  ],
  "Échelle de temps DASH invalide.": [
    "Invalid DASH timescale.",
    "Escala de tiempo DASH no válida.",
  ],
  "Durée de segment DASH invalide.": [
    "Invalid DASH segment duration.",
    "Duración de segmento DASH no válida.",
  ],
  "Chronologie DASH sans borne.": [
    "Unbounded DASH timeline.",
    "Cronología DASH sin límite.",
  ],
  "La vidéo contient trop de segments.": [
    "The video contains too many segments.",
    "El vídeo contiene demasiados segmentos.",
  ],
  "Durée DASH manquante.": [
    "Missing DASH duration.",
    "Falta la duración de DASH.",
  ],
  "La vidéo DASH est vide.": [
    "The DASH video is empty.",
    "El vídeo DASH está vacío.",
  ],
  "Liste de segments DASH invalide.": [
    "Invalid DASH segment list.",
    "Lista de segmentos DASH no válida.",
  ],
  "Segment DASH sans adresse.": [
    "DASH segment has no URL.",
    "El segmento DASH no tiene dirección.",
  ],
  "Plage DASH invalide.": ["Invalid DASH range.", "Rango DASH no válido."],
  "Modèle DASH non pris en charge.": [
    "Unsupported DASH template.",
    "Plantilla DASH no compatible.",
  ],
  "La liste de lecture contient trop de redirections.": [
    "The playlist contains too many redirects.",
    "La lista de reproducción contiene demasiadas redirecciones.",
  ],
  "La liste de lecture est trop volumineuse.": [
    "The playlist is too large.",
    "La lista de reproducción es demasiado grande.",
  ],
  "Liste HLS invalide.": ["Invalid HLS playlist.", "Lista HLS no válida."],
  "Variante HLS incomplète.": [
    "Incomplete HLS variant.",
    "Variante HLS incompleta.",
  ],
  "Cette variante HLS contient une ressource externe non prise en charge.": [
    "This HLS variant contains an unsupported external resource.",
    "Esta variante HLS contiene un recurso externo no compatible.",
  ],
  "Le téléchargement hors ligne des flux en direct n’est pas disponible.": [
    "Offline downloads of live streams are unavailable.",
    "No se pueden descargar emisiones en directo para verlas sin conexión.",
  ],
  "Ce chiffrement HLS n’est pas pris en charge.": [
    "This HLS encryption is unsupported.",
    "Este cifrado HLS no es compatible.",
  ],
  "Clé HLS invalide.": ["Invalid HLS key.", "Clave HLS no válida."],
  "Initialisation HLS invalide.": [
    "Invalid HLS initialization.",
    "Inicialización HLS no válida.",
  ],
  "Plage HLS invalide.": ["Invalid HLS range.", "Rango HLS no válido."],
  "Plage HLS sans point de départ.": [
    "HLS range has no starting point.",
    "El rango HLS no tiene punto de inicio.",
  ],
  "Liste HLS incomplète.": [
    "Incomplete HLS playlist.",
    "Lista HLS incompleta.",
  ],
  "La liste HLS ne contient aucun segment.": [
    "The HLS playlist contains no segments.",
    "La lista HLS no contiene segmentos.",
  ],
  "1 fichier en cours": ["1 file in progress", "1 archivo en curso"],
  "{0} fichiers en cours": ["{0} files in progress", "{0} archivos en curso"],
  "Archive de mise à jour invalide.": [
    "Invalid update archive.",
    "Archivo de actualización no válido.",
  ],
  "Installation impossible : paquet incompatible, signature différente ou installateur indisponible.":
      [
        "Unable to install: incompatible package, different signature or installer unavailable.",
        "No se puede instalar: paquete incompatible, firma diferente o instalador no disponible.",
      ],
  "Téléchargement en arrière-plan indisponible": [
    "Background downloads unavailable",
    "Descargas en segundo plano no disponibles",
  ],
};
