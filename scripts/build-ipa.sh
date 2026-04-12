#!/bin/bash
set -e

PROJECT_PATH="ios-natve/anisflix/anisflix.xcodeproj"
WORKSPACE_PATH="ios-natve/anisflix/anisflix.xcworkspace"
SCHEME="AnisFlix"
CONFIGURATION="Release"
ARCHIVE_PATH="build/anisflix.xcarchive"
EXPORT_PATH="build/export"
IPA_NAME="anisflix_unsigned.ipa"

echo "🧹 Cleaning previous build..."
xcodebuild clean -workspace "$WORKSPACE_PATH" -scheme "$SCHEME" -configuration "$CONFIGURATION"

echo "📦 Archiving..."
xcodebuild archive \
  -workspace "$WORKSPACE_PATH" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -archivePath "$ARCHIVE_PATH" \
  -sdk iphoneos \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO

echo "📦 Exporting IPA..."
rm -rf "$EXPORT_PATH"
mkdir -p "$EXPORT_PATH/Payload"
# Must match Xcode product (PBX: AnisFlix.app / productName anisflix)
cp -r "$ARCHIVE_PATH/Products/Applications/AnisFlix.app" "$EXPORT_PATH/Payload/"

cd "$EXPORT_PATH"
zip -r "$IPA_NAME" Payload

echo "✅ IPA created at: $EXPORT_PATH/$IPA_NAME"
mv "$IPA_NAME" ../../ios-natve/anisflix/

echo "🚀 Build complete: ios-natve/anisflix/$IPA_NAME"
