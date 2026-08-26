import sys

file_path = "ios-natve/anisflix/anisflix/Services/DownloadManager.swift"
with open(file_path, "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '"vidmoly", "vidlink", "yflix", "moviebox", "fsvid", "vixsrc", "animekai"' in line:
        lines[i] = line.replace('"animekai"', '"animekai", "hianime"')

with open(file_path, "w") as f:
    f.writelines(lines)
