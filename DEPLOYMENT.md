# Guide de déploiement AnisFlix sur Netlify

## 🚀 Déploiement rapide

### Option 1: Déploiement via Git (Recommandé)

1. **Poussez votre code sur GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push origin main
   ```

2. **Connectez votre repository à Netlify**
   - Allez sur [netlify.com](https://netlify.com)
   - Cliquez sur "New site from Git"
   - Choisissez votre provider (GitHub, GitLab, etc.)
   - Sélectionnez votre repository AnisFlix

3. **Configuration du build**
   - **Build command**: `npm run build:netlify`
   - **Publish directory**: `dist/public`
   - **Node version**: `18`

### Option 2: Déploiement par drag & drop

1. **Build local**
   ```bash
   npm run build:netlify
   ```

2. **Déployez le dossier `dist/public`**
   - Allez sur [netlify.com](https://netlify.com)
   - Glissez-déposez le dossier `dist/public` dans la zone de déploiement

## ⚙️ Configuration des variables d'environnement

Dans le dashboard Netlify, allez dans **Site settings > Environment variables** et ajoutez :

### Variables obligatoires
- `VITE_TMDB_API_KEY`: Votre clé API TMDB
- `VITE_API_BASE_URL`: URL de votre site Netlify (ex: `https://your-app-name.netlify.app`)

### Variables optionnelles
- `DATABASE_URL`: Si vous utilisez une base de données
- `SESSION_SECRET`: Pour les sessions utilisateur
- `CORS_ORIGIN`: Pour la configuration CORS

## 🔧 Configuration avancée

### Redirections personnalisées
Le fichier `netlify.toml` est déjà configuré avec :
- Redirections SPA (Single Page Application)
- Headers de sécurité
- Cache pour les assets statiques

### Fonctions serverless (si nécessaire)
Si vous avez besoin de fonctions serverless, créez le dossier :
```
netlify/functions/
```

## 📝 Notes importantes

### Limitations Netlify
- **Fonctionnalités serveur**: Netlify héberge uniquement des sites statiques
- **API backend**: Votre serveur Express ne peut pas tourner sur Netlify
- **Solutions alternatives**:
  - Utilisez Netlify Functions pour l'API
  - Déployez le backend sur Vercel, Railway, ou Heroku
  - Utilisez des APIs externes (comme vous le faites déjà avec TMDB)

### Architecture recommandée
```
Frontend (React) → Netlify
Backend (Express) → Vercel/Railway/Heroku
Base de données → Neon/Supabase/PlanetScale
```

## 🐛 Dépannage

### Erreurs de build courantes
1. **"Module not found"**: Vérifiez que toutes les dépendances sont dans `package.json`
2. **"Build timeout"**: Augmentez le timeout dans `netlify.toml`
3. **"Environment variables not found"**: Vérifiez la configuration dans le dashboard Netlify

### Logs de build
- Consultez les logs dans le dashboard Netlify
- Utilisez `netlify logs` si vous avez l'CLI installé

## 🔗 Liens utiles

- [Documentation Netlify](https://docs.netlify.com/)
- [Configuration netlify.toml](https://docs.netlify.com/configure-builds/file-based-configuration/)
- [Variables d'environnement Netlify](https://docs.netlify.com/environment-variables/overview/)
