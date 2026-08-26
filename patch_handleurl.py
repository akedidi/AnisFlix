import sys

file_path = "ios-natve/anisflix/anisflix/Views/Components/CustomVideoPlayer.swift"
with open(file_path, "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "} else {" in line and "playerVM.setup(url: newUrl" in lines[i+1]:
        lines[i] = line.replace("} else {", "} else if playerVM.currentUrl != newUrl && playerVM.originalUrl != newUrl {")

with open(file_path, "w") as f:
    f.writelines(lines)
