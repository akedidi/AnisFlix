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
        lines[i] = "            self.dashSessionsLock.lock()\n" + line + "            self.dashSessionsLock.unlock()\n"
    elif "let dashSession = self.dashSessions[String(components[1])]" in line:
        lines.insert(i, "            self.dashSessionsLock.lock()\n            let dashSession = self.dashSessions[String(components[1])]\n            self.dashSessionsLock.unlock()\n")
        lines[i+3] = lines[i+3].replace("let dashSession = self.dashSessions[String(components[1])]", "dashSession != nil")

with open(file_path, "w") as f:
    f.writelines(lines)
