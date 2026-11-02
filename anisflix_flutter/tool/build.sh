#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -f .toolchain.env ]; then . ./.toolchain.env; fi
FLUTTER_BIN=${FLUTTER_BIN:-flutter}
case "${1:-}" in
  mobile) "$FLUTTER_BIN" build apk --release --flavor mobile --dart-define-from-file=config.local.json --target-platform android-arm,android-arm64 ;;
  tv) "$FLUTTER_BIN" build apk --release --flavor tv --dart-define=TV_MODE=true --dart-define-from-file=config.local.json --target-platform android-arm,android-arm64 ;;
  macos) "$FLUTTER_BIN" build macos --release --dart-define-from-file=config.local.json ;;
  *) echo 'Usage: tool/build.sh mobile|tv|macos'; exit 2 ;;
esac
