#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -f .toolchain.env ]; then . ./.toolchain.env; fi
FLUTTER_BIN=${FLUTTER_BIN:-flutter}
case "${1:-macos}" in
  mobile) "$FLUTTER_BIN" run --flavor mobile --dart-define-from-file=config.local.json ;;
  tv) "$FLUTTER_BIN" run --flavor tv --dart-define=TV_MODE=true --dart-define-from-file=config.local.json ;;
  macos) "$FLUTTER_BIN" run -d macos --dart-define-from-file=config.local.json ;;
  *) echo 'Usage: tool/run-local.sh mobile|tv|macos'; exit 2 ;;
esac
