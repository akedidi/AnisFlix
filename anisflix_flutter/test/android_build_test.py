"""Release numbering contract; uses temporary projects, never real builds."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    'build_android', Path(__file__).resolve().parents[1] / 'tool/build_android.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class AndroidBuildTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        (self.root / '.dart_tool').mkdir()
        (self.root / 'pubspec.yaml').write_text('name: test\nversion: 0.5.1+9\n')

    def test_pair_uses_one_new_number_and_exports_both_platforms(self):
        commands = []
        def run(command, **kwargs):
            commands.append(command)
            if '--flavor' in command:
                variant = command[command.index('--flavor') + 1]
                apk = self.root / f'build/app/outputs/flutter-apk/app-{variant}-release.apk'
                apk.parent.mkdir(parents=True, exist_ok=True)
                apk.write_bytes(variant.encode())
        with patch.object(builder.subprocess, 'run', side_effect=run):
            builder.build_android(self.root, ['mobile', 'tv'], 'flutter')
        self.assertEqual(len(commands), 3)
        for command in commands[:2]:
            self.assertIn('--build-number=10', command)
        self.assertIn('--dart-define=TV_MODE=true', commands[1])
        self.assertEqual(commands[2][-4:], ['--platform', 'android-mobile', '--platform', 'android-tv'])
        output = self.root / 'build/releases/android/0.5.1+10'
        self.assertEqual((output / 'AnisFlix-mobile-reconstruit.apk').read_bytes(), b'mobile')
        self.assertEqual((output / 'AnisFlix-TV-reconstruit.apk').read_bytes(), b'tv')

    def test_failed_build_is_not_reused_even_after_pubspec_rollback(self):
        with patch.object(builder.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, 'flutter')):
            with self.assertRaises(subprocess.CalledProcessError):
                builder.build_android(self.root, ['mobile', 'tv'], 'flutter')
        (self.root / 'pubspec.yaml').write_text('version: 0.5.1+9\n')
        self.assertEqual(builder.reserve_build(self.root), ('0.5.1', 11))

    def test_higher_source_build_wins_over_local_counter(self):
        builder.reserve_build(self.root)
        (self.root / 'pubspec.yaml').write_text('version: 0.5.2+20\n')
        self.assertEqual(builder.reserve_build(self.root), ('0.5.2', 21))


if __name__ == '__main__':
    unittest.main()
