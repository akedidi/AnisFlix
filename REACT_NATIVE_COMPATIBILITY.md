# Guide de Compatibilité React Native

## 📱 État de la Compatibilité

### ✅ **Composants Compatibles**
- ✅ Composants UI (Button, Card, etc.) - Compatibles avec NativeWind
- ✅ Navigation - Expo Router configuré
- ✅ Internationalisation - Wrappers créés
- ✅ Stockage - AsyncStorage wrapper créé
- ✅ Hooks personnalisés - Versions RN créées

### ⚠️ **Composants Partiellement Compatibles**
- ⚠️ Lecteurs vidéo - Versions séparées créées (Web vs RN)
- ⚠️ Animations - Framer Motion → React Native Reanimated
- ⚠️ Icônes - Lucide React → Lucide React Native

### ❌ **Composants Non Compatibles**
- ❌ HLS.js - Remplacé par expo-av sur RN
- ❌ Mux.js - Pas disponible sur RN
- ❌ Puppeteer - Pas disponible sur RN
- ❌ Certaines APIs web (window, document, navigator)

## 🔧 **Fichiers de Migration Créés**

### **Storage & Persistence**
- `client/src/lib/storage.ts` - Wrapper universel pour localStorage/AsyncStorage
- `client/src/lib/watchProgressRN.ts` - Version RN du suivi de progression
- `client/src/lib/watchProgressUniversal.ts` - Wrapper universel

### **Hooks**
- `client/src/hooks/useDeviceTypeRN.ts` - Version RN du hook device type
- `client/src/hooks/useIsMobileRN.ts` - Version RN du hook mobile
- `client/src/hooks/useDeviceTypeUniversal.ts` - Wrapper universel

### **Composants**
- `client/src/components/VideoPlayerRN.tsx` - Lecteur vidéo pour RN (expo-av)
- `client/src/components/VideoPlayerUniversal.tsx` - Wrapper universel

### **Configuration**
- `client/src/config/platform.ts` - Configuration par plateforme
- `client/src/lib/i18n/LanguageContextRN.tsx` - Version RN du contexte i18n

## 🚀 **Prochaines Étapes**

### **1. Installer les Dépendances RN Manquantes**
```bash
npm install @react-native-async-storage/async-storage
npm install expo-av
npm install react-native-reanimated
```

### **2. Remplacer les Imports**
```typescript
// Au lieu de
import { useDeviceType } from '@/hooks/useDeviceType';
import VideoPlayer from '@/components/VideoPlayer';

// Utiliser
import { useDeviceType } from '@/hooks/useDeviceTypeUniversal';
import VideoPlayer from '@/components/VideoPlayerUniversal';
```

### **3. Mettre à Jour les Composants**
- Remplacer `framer-motion` par `react-native-reanimated`
- Utiliser `expo-av` au lieu de `hls.js` pour les vidéos
- Remplacer `wouter` par `expo-router` pour la navigation

### **4. Tests de Compatibilité**
```bash
# Tester sur iOS
npm run expo:ios

# Tester sur Android  
npm run expo:android

# Build pour production
npm run expo:build:ios
npm run expo:build:android
```

## 📋 **Checklist de Migration**

- [ ] Installer les dépendances RN manquantes
- [ ] Remplacer tous les imports problématiques
- [ ] Tester la navigation avec expo-router
- [ ] Vérifier le fonctionnement des lecteurs vidéo
- [ ] Tester le stockage local (AsyncStorage)
- [ ] Vérifier l'internationalisation
- [ ] Tester sur simulateur iOS
- [ ] Tester sur émulateur Android
- [ ] Build de production iOS
- [ ] Build de production Android

## 🐛 **Problèmes Connus**

1. **HLS.js** - Non compatible RN, utiliser expo-av
2. **Framer Motion** - Non compatible RN, utiliser react-native-reanimated
3. **Puppeteer** - Non compatible RN, utiliser des alternatives natives
4. **Certaines APIs web** - Wrappers créés pour la compatibilité

## 📚 **Ressources**

- [Expo AV Documentation](https://docs.expo.dev/versions/latest/sdk/av/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [Expo Router Documentation](https://expo.github.io/router/)
