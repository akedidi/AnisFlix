# Contrôle visuel — 2 novembre 2026

Référence : APK TV 1.0.9 build 50 exécuté à 1920×1080 (960×540 logiques). Fiche de Spider-Man : Brand New Day, TMDB 969681. Référence conservée dans `reference-tv-film.png`. Rendu macOS capturé par `RenderRepaintBoundary` dans le test natif, aux mêmes dimensions logiques, thèmes sombre puis clair.

Constats sur la fiche : fond plein écran, informations à gauche, sources à droite, onglets VF/VOSTFR/VO, bande-annonce, favori et plateformes présents. Aucun débordement détecté par le test Flutter. Les liens sont parcourables indépendamment des informations ; leur chargement progressif ne bloque pas la fiche.

Correction après la première capture : le libellé long « 720p H.264 AAC » faisait passer plusieurs lignes de sources sur deux lignes et réduisait le nombre de liens visibles. Le rendu affiche maintenant la résolution compacte et numérote les liens d'un même fournisseur ; le texte long est tronqué dans la ligne, sans supprimer le lien. La lecture conserve la qualité et les en-têtes complets.

Différences visibles restantes : espacement/typographie de la fiche, commande de téléchargement dans chaque ligne, bouton de thème, bordures/arrondis Material 3. La capture de référence a le focus télécommande sur une source ; la capture macOS n'a pas ce même état de focus. Ces captures ne permettent donc pas d'affirmer une identité pixel à pixel.

Accueil : les neuf rangées ont été vérifiées par tests de requêtes et navigation ; des captures natives montrent les rangées « Derniers épisodes » et animés. Le harnais de capture de l'accueil monte HomeScreen sans la coque de navigation, et certains visuels réseau sont encore en chargement. **Comparaison complète de l'accueil non validée** : elle doit inclure coque, images chargées et même contenu de carrousel pour conclure à la fidélité globale.

Recherche : test du délai d'autocomplétion, rejet d'une réponse obsolète, choix aux flèches puis action de recherche, et effacement. Pas de validation visuelle complète de tous les états clavier de l'APK TV.

Statut : contrôle fonctionnel et visuel ciblé des sources effectué ; conformité visuelle complète avec l'ancienne application non établie.

## Mise à jour 0.4.0

Le test natif affiche la grille des 14 logos carrés provenant de la liste iOS. Les listes de liens utilisent maintenant le moteur Swift iOS ; les captures de la fiche montrent les blocs de fournisseurs filtrés et leurs libellés natifs. La comparaison automatisée de catégories, ordre et libellés repose sur les fonctions Swift de référence exécutées séparément. La validation complète de l’accueil reste distincte de ces corrections.
