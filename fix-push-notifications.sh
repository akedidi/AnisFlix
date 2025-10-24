#!/bin/bash

echo "🔔 Correction des erreurs Push Notifications"
echo "============================================="

# Vérifier si nous sommes dans le bon répertoire
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ Erreur : Fichier capacitor.config.ts non trouvé"
    exit 1
fi

echo "✅ Répertoire de travail correct"

# Vérifier la configuration iOS
echo ""
echo "🍎 Vérification de la configuration iOS..."

# Vérifier Info.plist
if [ -f "ios/App/App/Info.plist" ]; then
    echo "✅ Info.plist trouvé"
    
    # Vérifier les permissions de notifications
    if grep -q "UIBackgroundModes" ios/App/App/Info.plist; then
        echo "✅ Permissions de notifications configurées"
    else
        echo "⚠️  Permissions de notifications manquantes"
        echo "   Ajout des permissions..."
        
        # Ajouter les permissions de notifications
        /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes array" ios/App/App/Info.plist 2>/dev/null || true
        /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes:0 string remote-notification" ios/App/App/Info.plist 2>/dev/null || true
        /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes:1 string background-processing" ios/App/App/Info.plist 2>/dev/null || true
        
        echo "✅ Permissions ajoutées"
    fi
else
    echo "❌ Info.plist non trouvé"
fi

# Vérifier la configuration Android
echo ""
echo "🤖 Vérification de la configuration Android..."

if [ -f "android/app/src/main/AndroidManifest.xml" ]; then
    echo "✅ AndroidManifest.xml trouvé"
    
    # Vérifier les permissions
    if grep -q "android.permission.INTERNET" android/app/src/main/AndroidManifest.xml; then
        echo "✅ Permissions Internet configurées"
    else
        echo "⚠️  Permissions Internet manquantes"
    fi
    
    if grep -q "android.permission.WAKE_LOCK" android/app/src/main/AndroidManifest.xml; then
        echo "✅ Permissions Wake Lock configurées"
    else
        echo "⚠️  Permissions Wake Lock manquantes"
    fi
else
    echo "❌ AndroidManifest.xml non trouvé"
fi

# Vérifier la configuration Capacitor
echo ""
echo "⚙️  Vérification de la configuration Capacitor..."

# Vérifier que la configuration est correcte
if grep -q "handleApplicationNotifications.*true" capacitor.config.ts; then
    echo "✅ Notifications d'application activées"
else
    echo "❌ Notifications d'application non configurées"
fi

# Synchroniser la configuration
echo ""
echo "🔄 Synchronisation de la configuration..."
npx cap sync

if [ $? -eq 0 ]; then
    echo "✅ Synchronisation réussie"
else
    echo "❌ Erreur lors de la synchronisation"
    echo "   Tentative de correction..."
    
    # Nettoyer et resynchroniser
    rm -rf ios/App/App/public
    rm -rf android/app/src/main/assets/public
    npx cap sync --force
fi

# Vérifier les plugins installés
echo ""
echo "🔌 Vérification des plugins..."
npx cap doctor

echo ""
echo "✅ Correction des notifications push terminée !"
echo ""
echo "📱 Pour tester les notifications :"
echo "   - iOS : Ouvrir dans Xcode et tester sur simulateur"
echo "   - Android : Ouvrir dans Android Studio et tester sur émulateur"
echo ""
echo "🔧 Si des erreurs persistent :"
echo "   - Vérifiez les logs avec : npx cap doctor"
echo "   - Nettoyez les caches : npm cache clean --force"
echo "   - Redémarrez les IDE (Xcode/Android Studio)"
