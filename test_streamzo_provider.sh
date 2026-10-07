#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUTPUT_PATH="${TMPDIR:-/tmp}/anisflix-streamzo-provider-test"

xcrun swiftc -parse-as-library \
  "$ROOT_DIR/ios-natve/anisflix/anisflix/Services/JsPackerUnpacker.swift" \
  "$ROOT_DIR/ios-natve/anisflix/anisflix/Services/FrenchAnimeProvidersService.swift" \
  "$ROOT_DIR/test_streamzo_provider.swift" \
  -o "$OUTPUT_PATH"

"$OUTPUT_PATH"
