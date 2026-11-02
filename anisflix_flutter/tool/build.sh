#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -f .toolchain.env ]; then . ./.toolchain.env; fi
FLUTTER_BIN=${FLUTTER_BIN:-flutter}
case "${1:-}" in
  mobile) "$FLUTTER_BIN" build apk --release --flavor mobile --dart-define-from-file=config.local.json --target-platform android-arm,android-arm64 ;;
  tv) "$FLUTTER_BIN" build apk --release --flavor tv --dart-define=TV_MODE=true --dart-define-from-file=config.local.json --target-platform android-arm,android-arm64 ;;
  macos)
    "$FLUTTER_BIN" build macos --release --dart-define-from-file=config.local.json
    # Flutter may modify App.framework after Xcode signs it. Renew the local
    # signatures in order, preserving the production sandbox/network rights.
    macos_app=build/macos/Build/Products/Release/AnisFlix.app
    codesign --force --sign "${MACOS_SIGN_IDENTITY:--}" "$macos_app/Contents/Frameworks/App.framework"
    codesign --force --sign "${MACOS_SIGN_IDENTITY:--}" --entitlements macos/Runner/Release.entitlements "$macos_app"
    codesign --verify --deep --strict "$macos_app"
    ;;
  *) echo 'Usage: tool/build.sh mobile|tv|macos'; exit 2 ;;
esac
