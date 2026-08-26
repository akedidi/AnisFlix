import Foundation
import AVFoundation

let manifest = """
#EXTM3U
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2076121,RESOLUTION=1920x1080,FRAME-RATE=23.974,CODECS="avc1.640032,mp4a.40.2"
http://172.20.7.199:8080/manifest?url64=aHR0cHM6Ly9jZG4ud2F0Y2hpbmcub25sL2FuaW1lL2JjYTgyZTQxZWU3YjA4MzM1ODgzOTliMWZjZDE3N2M3L2Y4MGU4Mzc3OWIwMjVjMmUwMDMyZjAyOWZmMTIyZWJmL2luZGV4LWYxLXYxLWExLm0zdTg%3D&referer=https://megaplay.buzz/&origin=https://megaplay.buzz&user_agent=Mozilla/5.0%20(Windows%20NT%2010.0;%20Win64;%20x64)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/120.0.0.0%20Safari/537.36
"""

print(manifest)
