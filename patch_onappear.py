import sys

file_path = "ios-natve/anisflix/anisflix/Views/Components/CustomVideoPlayer.swift"
with open(file_path, "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "let isAlreadyPlaying = playerVM.currentUrl == url" in line and "originalUrl" not in line:
        lines[i] = line.replace("playerVM.currentUrl == url", "playerVM.currentUrl == url || playerVM.originalUrl == url")
    
    if "} else {" in line and "playerVM.setup(url: url, title: title" in lines[i+1]:
        lines[i] = line.replace("} else {", "} else if !isAlreadyPlaying {")

with open(file_path, "w") as f:
    f.writelines(lines)
