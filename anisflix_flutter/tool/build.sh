#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -f .toolchain.env ]; then . ./.toolchain.env; fi
FLUTTER_BIN=${FLUTTER_BIN:-flutter}
case "${1:-}" in
  android|mobile|tv) export FLUTTER_BIN; python3 tool/build_android.py "$1" ;;
  macos)
    "$FLUTTER_BIN" build macos --release --dart-define-from-file=config.local.json
    # Flutter may modify App.framework after Xcode signs it. Renew the local
    # signatures in order, preserving the production sandbox/network rights.
    macos_app=build/macos/Build/Products/Release/AnisFlix.app
    codesign --force --sign "${MACOS_SIGN_IDENTITY:--}" "$macos_app/Contents/Frameworks/App.framework"
    codesign --force --sign "${MACOS_SIGN_IDENTITY:--}" --entitlements macos/Runner/Release.entitlements "$macos_app"
    codesign --verify --deep --strict "$macos_app"
    ;;
  *) echo 'Usage: tool/build.sh android|mobile|tv|macos'; exit 2 ;;
esac
