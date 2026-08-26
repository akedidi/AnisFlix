import sys

file_path = "ios-natve/anisflix/anisflix/Views/Components/CustomVideoPlayer.swift"
with open(file_path, "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'print("📱 Cast disconnected! Switching back to local player.")' in line:
        lines[i+1] = lines[i+1].replace("playerVM.setup", "if playerVM.currentUrl == nil { playerVM.setup(url: url, title: title, posterUrl: posterUrl, localPosterPath: localPosterPath) } // ")

with open(file_path, "w") as f:
    f.writelines(lines)
