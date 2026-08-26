import sys

file_path = "ios-natve/anisflix/anisflix/Services/LocalStreamingServer.swift"
with open(file_path, "r") as f:
    content = f.read()

old_guard = """            guard components.count >= 3,
                  let dashSession = self.dashSessions[String(components[1])] else {"""

new_guard = """            guard components.count >= 3 else { return GCDWebServerDataResponse(statusCode: 404) }
            self.dashSessionsLock.lock()
            let dashSessionOpt = self.dashSessions[String(components[1])]
            self.dashSessionsLock.unlock()
            
            guard let dashSession = dashSessionOpt else {"""

content = content.replace(old_guard, new_guard)

with open(file_path, "w") as f:
    f.write(content)
