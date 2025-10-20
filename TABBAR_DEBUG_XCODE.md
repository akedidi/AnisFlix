# 🔍 Debug Tab Bar dans Xcode

## Comment voir les logs dans Xcode

### 1. Ouvrir Xcode
```bash
npx cap open ios
```

### 2. Lancer l'app dans le simulateur
- Cliquez sur le bouton "Play" dans Xcode
- Ou utilisez `Cmd + R`

### 3. Ouvrir la console de debug
- Dans Xcode, allez dans `View > Debug Area > Activate Console`
- Ou utilisez `Cmd + Shift + C`

### 4. Filtrer les logs
Dans la console Xcode, utilisez ces filtres :
- `ANISFLIX-TABBAR` - pour tous les logs de la tab bar
- `ANISFLIX-TABBAR-ERROR` - pour les erreurs spécifiques
- `ANISFLIX-BOTTOMNAV` - pour les logs du composant BottomNav

### 5. Logs à surveiller

#### Logs normaux :
```
[ANISFLIX-BOTTOMNAV] Rendering BottomNav component
[ANISFLIX-BOTTOMNAV] Location changed to: /
[ANISFLIX-BOTTOMNAV] Scrolled to top
[ANISFLIX-TABBAR] Touch Start - Tab Bar Check
[ANISFLIX-TABBAR] Position Changed: {...}
```

#### Logs d'erreur (à surveiller) :
```
[ANISFLIX-TABBAR-ERROR] Tab Bar moved from fixed position!
```

### 6. Test de la tab bar

#### Pour reproduire le problème :
1. Ouvrez une page avec du contenu long
2. Scrollez jusqu'en bas de la page
3. Observez si la tab bar bouge
4. Regardez les logs dans Xcode

#### Ce qui devrait apparaître dans les logs :
- Position initiale de la tab bar
- Changements de position lors du scroll
- Événements touch
- Erreurs si la tab bar bouge

### 7. Informations utiles dans les logs

Les logs contiennent :
- `current`: Position actuelle de la tab bar
- `previous`: Position précédente
- `windowHeight`: Hauteur de la fenêtre
- `scrollY`: Position de scroll verticale
- `isAtBottom`: Si la tab bar est en bas de l'écran
- `difference`: Différence entre position attendue et réelle

### 8. Commandes utiles

```bash
# Synchroniser avec iOS
npx cap sync ios

# Ouvrir Xcode
npx cap open ios

# Build et test
npx cap run ios
```

### 9. Dépannage

Si les logs n'apparaissent pas :
1. Vérifiez que l'app est bien lancée dans le simulateur
2. Assurez-vous que la console Xcode est ouverte
3. Vérifiez que les filtres sont corrects
4. Redémarrez l'app si nécessaire
