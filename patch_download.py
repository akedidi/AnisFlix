import sys

file_path = "ios-natve/anisflix/anisflix/Services/DownloadManager.swift"
with open(file_path, "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '"animepahe", "animekai", "moviebox", "fsvid"].contains(p)' in line:
        lines[i] = line.replace('"fsvid"', '"fsvid", "hianime"')

with open(file_path, "w") as f:
    f.writelines(lines)
