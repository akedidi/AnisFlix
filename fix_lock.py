import sys

file_path = "ios-natve/anisflix/anisflix/Services/LocalStreamingServer.swift"
with open(file_path, "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "var dashSessions: [String: DashSession] = [:]" in line:
        lines.insert(i+1, "    private let dashSessionsLock = NSLock()\n")
        break

for i, line in enumerate(lines):
    if "self.dashSessions[String(mappingId)] = DashSession(" in line:
        if "lock" not in lines[i-1]:
            lines[i] = "            self.dashSessionsLock.lock()\n" + line + "            self.dashSessionsLock.unlock()\n"

with open(file_path, "w") as f:
    f.writelines(lines)
