#!/bin/zsh
set -euo pipefail

repo_dir="${0:A:h}"
build_dir="$(mktemp -d "${TMPDIR:-/tmp}/anisflix-vidlink-test.XXXXXX")"
trap 'rm -rf "$build_dir"' EXIT

swiftc \
  "$repo_dir/ios-natve/anisflix/anisflix/Services/VidlinkService.swift" \
  "$repo_dir/test_vidlink_provider.swift" \
  -o "$build_dir/test_vidlink_provider"

"$build_dir/test_vidlink_provider"
