#!/bin/zsh
set -euo pipefail

SCRIPT_DIR=${0:A:h}
PROJECT_DIR=${SCRIPT_DIR:h}
FRAMEWORK_DIR="$PROJECT_DIR/Pods/MobileVLCKit/MobileVLCKit.xcframework/ios-arm64_i386_x86_64-simulator"
SOURCE="$SCRIPT_DIR/VidlinkPlaybackTest.swift"
BINARY="${TMPDIR:-/tmp}/vidlink-playback-test-ios"
SDK=$(xcrun --sdk iphonesimulator --show-sdk-path)

if ! xcrun simctl list devices booted | grep -q '(Booted)'; then
  echo "Aucun simulateur iOS démarré. Ouvrez-en un dans Xcode puis relancez ce script."
  exit 1
fi

xcrun --sdk iphonesimulator swiftc \
  -target arm64-apple-ios16.0-simulator \
  -sdk "$SDK" \
  -F "$FRAMEWORK_DIR" \
  -framework MobileVLCKit \
  -framework UIKit \
  "$SOURCE" \
  -o "$BINARY"

SIMCTL_CHILD_DYLD_FRAMEWORK_PATH="$FRAMEWORK_DIR" \
  xcrun simctl spawn booted "$BINARY" "${1:-1458857}"
