#!/usr/bin/env python3
"""Reserve a strictly newer Android build, then build a variant or a shared pair."""
import argparse
import fcntl
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys


def reserve_build(root):
    pubspec = root / 'pubspec.yaml'
    source = pubspec.read_text()
    match = re.search(r'^version:\s*(\d+\.\d+\.\d+)\+(\d+)\s*$', source, re.M)
    if not match:
        raise ValueError('pubspec.yaml doit contenir une version avec un build numérique.')
    counter = root / '.dart_tool/android-build-number'
    previous = int(counter.read_text()) if counter.exists() else 0
    number = max(int(match[2]), previous) + 1
    if number > 2100000000:
        raise ValueError('Limite Android versionCode dépassée.')
    # Reserve before compilation: a failed or interrupted build is never reused.
    counter.write_text(str(number) + '\n')
    pubspec.write_text(source[:match.start(2)] + str(number) + source[match.end(2):])
    return match[1], number


def build_android(root, variants, flutter):
    version, number = reserve_build(root)
    print(f'Android {version}+{number} : {", ".join(variants)}', flush=True)
    output = root / f'build/releases/android/{version}+{number}'
    output.mkdir(parents=True, exist_ok=True)
    for variant in variants:
        command = [flutter, 'build', 'apk', '--release', '--flavor', variant,
                   f'--build-number={number}', '--dart-define-from-file=config.local.json',
                   '--target-platform', 'android-arm,android-arm64']
        if variant == 'tv':
            command.append('--dart-define=TV_MODE=true')
        subprocess.run(command, cwd=root, check=True)
        name = 'AnisFlix-TV-reconstruit.apk' if variant == 'tv' else 'AnisFlix-mobile-reconstruit.apk'
        shutil.copy2(root / f'build/app/outputs/flutter-apk/app-{variant}-release.apk', output / name)
    command = [sys.executable, str(root / 'tool/generate_update_manifest.py'), str(output)]
    for variant in variants:
        command.extend(['--platform', 'android-tv' if variant == 'tv' else 'android-mobile'])
    subprocess.run(command, cwd=root, check=True)
    print(f'APK et manifeste : {output}', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('target', choices=['android', 'mobile', 'tv'])
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    (root / '.dart_tool').mkdir(exist_ok=True)
    # Keep the lock throughout both compilations and manifest generation.
    with (root / '.dart_tool/android-release.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            parser.exit(1, 'Une compilation Android est déjà en cours dans ce dossier.\n')
        variants = ['mobile', 'tv'] if args.target == 'android' else [args.target]
        build_android(root, variants, os.environ.get('FLUTTER_BIN', 'flutter'))


if __name__ == '__main__':
    main()
