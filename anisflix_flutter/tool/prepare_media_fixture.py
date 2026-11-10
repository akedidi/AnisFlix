"""Create a short legal test fixture. Requires ffmpeg, or imageio-ffmpeg.

Run: python3 tool/prepare_media_fixture.py work/media-fixture
Then: adb -s <device> push work/media-fixture /data/local/tmp/anisflix-media
"""
import pathlib
import shutil
import subprocess
import sys
import urllib.request

folder = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'work/media-fixture')
folder.mkdir(parents=True, exist_ok=True)
ffmpeg = shutil.which('ffmpeg')
if not ffmpeg:
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
source = folder / 'sample.mp4'
if not source.exists():
    urllib.request.urlretrieve('https://raw.githubusercontent.com/flutter/assets-for-api-docs/master/assets/videos/bee.mp4', source)
def run(*args):
    subprocess.run([ffmpeg, '-y', *map(str, args)], check=True)
run('-stream_loop', '-1', '-i', source, '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'ultrafast', '-g', '30', '-c:a', 'aac', '-t', '8', folder/'test.mp4')
run('-i', folder/'test.mp4', '-c', 'copy', '-hls_time', '2', '-hls_playlist_type', 'vod', folder/'index.m3u8')
run('-i', folder/'test.mp4', '-c', 'copy', '-seg_duration', '2', '-f', 'dash', folder/'index.mpd')
(folder/'subtitles.srt').write_text('1\n00:00:02,000 --> 00:00:04,000\nSOUS-TITRE EMBARQUÉ\n', encoding='utf-8')
run('-i', folder/'test.mp4', '-i', folder/'subtitles.srt', '-map', '0', '-map', '1:0', '-c', 'copy', '-metadata:s:s:0', 'language=fra', '-metadata:s:s:0', 'title=Français embarqué', folder/'test-subtitles.mkv')
