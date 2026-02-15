#!/bin/bash
set -e

# Configuration
IPA_SOURCE="ios-natve/anisflix/anisflix_unsigned.ipa"
PUBLIC_DIR="client/public"
IPA_DEST="$PUBLIC_DIR/anisflix.ipa"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting IPA deployment to Vercel public dir...${NC}"

# Check if IPA exists
if [ ! -f "$IPA_SOURCE" ]; then
    echo "❌ Error: Source IPA not found at $IPA_SOURCE"
    echo "   Run ./scripts/build-ipa.sh first"
    exit 1
fi

# Create directory if needed
mkdir -p "$PUBLIC_DIR"

# Copy IPA
echo -e "${BLUE}📦 Copying IPA to public directory...${NC}"
cp "$IPA_SOURCE" "$IPA_DEST"

# Update generic IPA name (users download "anisflix.ipa")
echo "✅ IPA copied to $IPA_DEST"

# Add to git
echo -e "${BLUE}📝 Staging changes for git...${NC}"
git add "$IPA_DEST"
git add "ios-natve/anisflix/anisflix/Info.plist"

echo -e "${GREEN}✨ Ready to commit and push!${NC}"
echo "   Run: git commit -m 'Update IPA to latest version' && git push"
