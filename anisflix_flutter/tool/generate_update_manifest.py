#!/usr/bin/env python3
"""Generate the GitHub release update feed from all three verified artifacts.
Run after tool/build.sh macos|mobile|tv and local macOS code signing.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import subprocess
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('artifacts', type=Path, help='Folder containing final ZIP and APKs')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
version, build = re.search(r'^version:\s*(\d+\.\d+\.\d+)\+(\d+)\s*$',
                           (root / 'pubspec.yaml').read_text(), re.M).groups()
build = int(build)
sdk = Path(os.environ['ANDROID_HOME']) / 'build-tools'
build_tools = sorted(sdk.iterdir(), key=lambda p: [int(x) for x in p.name.split('.') if x.isdigit()])[-1]
packages = {
    'macos': ('com.anisflix.reconstructed.anisflixFlutter', f'AnisFlix-macOS-{version}.zip'),
    'android-mobile': ('com.anisflix.reconstructed.anisflix_flutter.mobile', 'AnisFlix-mobile-reconstruit.apk'),
    'android-tv': ('com.anisflix.reconstructed.anisflix_flutter.tv', 'AnisFlix-TV-reconstruit.apk'),
}
manifest = {'schema': 1, 'track': 'flutter-reconstruction', 'version': version,
            'build': build, 'platforms': {}}
for platform, (package, name) in packages.items():
    path = args.artifacts / name
    if platform == 'macos':
        with zipfile.ZipFile(path) as archive:
            info = plistlib.loads(archive.read('AnisFlix.app/Contents/Info.plist'))
            assert info['CFBundleIdentifier'] == package, 'Wrong macOS application'
            assert info['CFBundleShortVersionString'] == version, 'Wrong macOS version'
            assert int(info['CFBundleVersion']) == build, 'Wrong macOS build'
    else:
        badging = subprocess.check_output([str(build_tools / 'aapt'), 'dump', 'badging', str(path)], text=True)
        assert f"name='{package}' versionCode='{build}' versionName='{version}'" in badging, 'Wrong APK package/version'
        subprocess.run([str(build_tools / 'apksigner'), 'verify', str(path)], check=True)
    digest = hashlib.file_digest(path.open('rb'), 'sha256').hexdigest() if hasattr(hashlib, 'file_digest') else hashlib.sha256(path.read_bytes()).hexdigest()
    manifest['platforms'][platform] = {'packageId': package, 'asset': name,
                                      'size': path.stat().st_size, 'sha256': digest}
output = args.artifacts / 'anisflix-update.json'
output.write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Generated {output.name}: {version}+{build}, {len(packages)} verified packages.')
