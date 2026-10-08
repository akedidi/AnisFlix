#!/bin/zsh
set -euo pipefail

SCRIPT_DIR=${0:A:h}
PROJECT_DIR=${SCRIPT_DIR:h}
FRAMEWORK_DIR="$PROJECT_DIR/Pods/MobileVLCKit/MobileVLCKit.xcframework/ios-arm64_i386_x86_64-simulator"
DERIVED_DATA="${TMPDIR:-/tmp}/anisflix-vidlink-test-derived"
GCD_FRAMEWORK_DIR="$DERIVED_DATA/Build/Products/Debug-iphonesimulator/GCDWebServer"
SOURCE="$SCRIPT_DIR/VidlinkPlaybackTest.swift"
LOCAL_SERVER_SOURCE="$PROJECT_DIR/anisflix/Services/LocalStreamingServer.swift"
BINARY="${TMPDIR:-/tmp}/vidlink-playback-test-ios"
SDK=$(xcrun --sdk iphonesimulator --show-sdk-path)

if ! xcrun simctl list devices booted | grep -q '(Booted)'; then
  echo "Aucun simulateur iOS démarré. Ouvrez-en un dans Xcode puis relancez ce script."
  exit 1
fi

if [ ! -d "$GCD_FRAMEWORK_DIR/GCDWebServer.framework" ]; then
  xcodebuild \
    -workspace "$PROJECT_DIR/anisflix.xcworkspace" \
    -scheme GCDWebServer \
    -configuration Debug \
    -destination 'generic/platform=iOS Simulator' \
    -derivedDataPath "$DERIVED_DATA" \
    CODE_SIGNING_ALLOWED=NO \
    build >/dev/null
fi

xcrun --sdk iphonesimulator swiftc \
  -target arm64-apple-ios16.0-simulator \
  -sdk "$SDK" \
  -F "$FRAMEWORK_DIR" \
  -F "$GCD_FRAMEWORK_DIR" \
  -framework MobileVLCKit \
  -framework GCDWebServer \
  -framework UIKit \
  "$LOCAL_SERVER_SOURCE" \
  "$SOURCE" \
  -o "$BINARY"

# The application itself owns port 8080 while running. Stop its simulator
# process so this isolated probe can exercise the exact same local proxy port.
xcrun simctl terminate booted com.anis.anisflix 2>/dev/null || true

SIMCTL_CHILD_DYLD_FRAMEWORK_PATH="$FRAMEWORK_DIR:$GCD_FRAMEWORK_DIR" \
  xcrun simctl spawn booted "$BINARY" "${1:-1458857}"
