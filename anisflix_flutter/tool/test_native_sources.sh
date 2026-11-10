#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -f .toolchain.env ]; then . ./.toolchain.env; fi
native_test_dir=$(mktemp -d "${TMPDIR:-/tmp}/anisflix-native-test.XXXXXX")
trap 'rm -rf "$native_test_dir"' EXIT
set --
for native_source in macos/Runner/NativeSources/*.swift; do
  case "$native_source" in */NativeSourceBridge.swift) continue ;; esac
  set -- "$@" "$native_source"
done
xcrun swiftc -swift-version 5 "$@" test/native_anime_sources_test.swift -o "$native_test_dir/native-anime-tests" > "$native_test_dir/compiler.log" 2>&1 || {
  cat "$native_test_dir/compiler.log"
  exit 1
}
"$native_test_dir/native-anime-tests"
