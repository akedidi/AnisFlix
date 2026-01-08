#!/bin/bash

# Script pour générer l'archive et l'IPA non signée pour AnisFlix
# Adapté selon la demande utilisateur
echo "📱 Build Archive et IPA Non Signée - AnisFlix"
echo "=============================================="

# Variables
SCHEME="AnisFlix"
WORKSPACE="anisflix.xcworkspace"
CONFIGURATION="Release"
ARCHIVE_PATH="./build/anisflix.xcarchive"
IPA_NAME="anisflix_unsigned.ipa"
PAYLOAD_DIR="Payload"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

error() {
    echo -e "${RED}❌ Erreur: $1${NC}"
    exit 1
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

    # 0. Increment Build Number (Auto-increment version)
    info "Incrémentation de la version..."
    
    # Check if agvtool is available
    if command -v xcrun agvtool &> /dev/null; then
        # Increment version
        xcrun agvtool next-version -all
        
        # Read new version
        BUILD_NUMBER=$(xcrun agvtool what-version -terse)
        MARKETING_VERSION=$(xcrun agvtool what-marketing-version -terse1)
        if [ -z "$MARKETING_VERSION" ]; then
            MARKETING_VERSION="1.0"
        fi
        
        # Construct full version string (Example: 1.0.42)
        FULL_VERSION="$MARKETING_VERSION.$BUILD_NUMBER"
        success "Nouvelle version : $FULL_VERSION"
    else
        error "agvtool non trouvé. Impossible d'incrémenter la version."
    fi

# 1. Nettoyage
info "Nettoyage..."
rm -rf "./build"
rm -rf "$PAYLOAD_DIR"
rm -f "$IPA_NAME"

# 2. Build de l'archive avec la commande adaptée
info "Lancement de l'archivage..."
# Note: Ajout de -destination generic/platform=iOS requis pour archive sinon erreur "Supported platforms empty"
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -archivePath "$ARCHIVE_PATH" \
  -destination 'generic/platform=iOS' \
  archive \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" || error "L'archivage a échoué"

success "Archive créée: $ARCHIVE_PATH"

# 3. Création manuelle de l'IPA depuis l'archive
info "Création du paquet IPA..."

# Chemin vers l'app dans l'archive
APP_PATH="$ARCHIVE_PATH/Products/Applications/$SCHEME.app"

if [ ! -d "$APP_PATH" ]; then
    error "Application .app non trouvée dans l'archive : $APP_PATH"
fi

mkdir -p "$PAYLOAD_DIR"
cp -R "$APP_PATH" "$PAYLOAD_DIR/"

# Zip
zip -r "$IPA_NAME" "$PAYLOAD_DIR" > /dev/null || error "Échec de la compression zip"

# Nettoyage temporaire
rm -rf "$PAYLOAD_DIR"

if [ -f "$IPA_NAME" ]; then
    SIZE=$(du -h "$IPA_NAME" | cut -f1)
    echo ""
    echo "================================================"
    echo -e "${GREEN}🎉 IPA GÉNÉRÉE AVEC SUCCÈS!${NC}"
    echo "================================================"
    echo "📦 Archive: $ARCHIVE_PATH"
    echo "📱 IPA: $(pwd)/$IPA_NAME"
    echo "📦 Taille: $SIZE"
    echo ""

    # 4. SideStore Automation
    echo "🔄 Mise à jour SideStore..."
    
    PUBLIC_DIR="../../client/public"
    DEST_IPA="$PUBLIC_DIR/anisflix.ipa"
    DEST_ICON="$PUBLIC_DIR/icon.png"
    JSON_FILE="$PUBLIC_DIR/sidestore.json"
    
    # Copy IPA
    cp "$IPA_NAME" "$DEST_IPA"
    success "IPA copiée vers $DEST_IPA"
    
     # Extract and Copy Icon (Try to find AppIcon60x60@2x.png which is 120x120, good for SideStore)
    ICON_SRC="$ARCHIVE_PATH/Products/Applications/$SCHEME.app/AppIcon60x60@2x.png"
    if [ -f "$ICON_SRC" ]; then
        cp "$ICON_SRC" "$DEST_ICON"
        success "Icône copiée vers $DEST_ICON"
    else
        echo "⚠️ Icône non trouvée à $ICON_SRC"
    fi
    
    # Get File Size in Bytes
    FILE_SIZE_BYTES=$(stat -f%z "$IPA_NAME")
    
    # Get Bundle ID from Info.plist
    INFO_PLIST="$ARCHIVE_PATH/Products/Applications/$SCHEME.app/Info.plist"
    if [ -f "$INFO_PLIST" ]; then
        BUNDLE_ID=$(/usr/libexec/PlistBuddy -c "Print CFBundleIdentifier" "$INFO_PLIST")
        success "Bundle ID détecté : $BUNDLE_ID"
    else
        BUNDLE_ID="com.anis.anisflix" # Fallback (should ideally error out)
        echo "⚠️ Info.plist non trouvé, fallback sur $BUNDLE_ID"
    fi
    
    # Date YYYY-MM-DD
    DATE=$(date +%Y-%m-%d)
    
    # Use the ACTUAL version we just built
    VERSION="$FULL_VERSION"
    DOWNLOAD_URL="https://raw.githubusercontent.com/akedidi/AnisFlix/main/client/public/anisflix.ipa"
    
    # Check if JSON exists
    if [ -f "$JSON_FILE" ]; then
        # Create temp file
        TMP_JSON=$(mktemp)
        
        # Use node to update JSON cleanly
        
        node -e "
            const fs = require('fs');
            const data = JSON.parse(fs.readFileSync('$JSON_FILE', 'utf8'));
            const newVersion = {
                version: '$VERSION',
                date: '$DATE',
                size: $FILE_SIZE_BYTES,
                downloadURL: '$DOWNLOAD_URL',
                minOSVersion: '15.0'
            };
            
            // Update Top Level Bundle ID if needed
            data.identifier = '$BUNDLE_ID';
            
            // Add to beginning of versions array
            if (data.apps && data.apps.length > 0) {
                // Update App Bundle ID
                data.apps[0].bundleIdentifier = '$BUNDLE_ID';
                
                // SINGLE VERSION POLICY: Overwrite versions array with ONLY the new version
                data.apps[0].versions = [newVersion];
            }
            
            fs.writeFileSync('$JSON_FILE', JSON.stringify(data, null, 2));
        " && success "sidestore.json mis à jour avec la version unique : $VERSION" || error "Erreur lors de la mise à jour du JSON"
        
    else
        error "Fichier $JSON_FILE introuvable"
    fi
    
else
    error "Le fichier IPA n'a pas été créé"
fi
