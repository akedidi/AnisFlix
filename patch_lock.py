import sys

file_path = "ios-natve/anisflix/anisflix/Services/LocalStreamingServer.swift"
with open(file_path, "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "private var manifestCache: [String: String] = [:]" in line:
        lines.insert(i+1, "    private let manifestCacheLock = NSLock()\n")
        break

for i, line in enumerate(lines):
    if "if let cachedManifest = self.manifestCache[validUrlString] {" in line:
        lines[i] = "            self.manifestCacheLock.lock()\n            let cachedManifest = self.manifestCache[validUrlString]\n            self.manifestCacheLock.unlock()\n            if let cachedManifest = cachedManifest {\n"
    elif "self.manifestCache[validUrlString] = rewrittenContent" in line:
        lines[i] = "                self.manifestCacheLock.lock()\n                self.manifestCache[validUrlString] = rewrittenContent\n                self.manifestCacheLock.unlock()\n"

with open(file_path, "w") as f:
    f.writelines(lines)
