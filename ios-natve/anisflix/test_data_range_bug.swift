import Foundation

var buffer = Data([1, 2, 3, 4, 5])
buffer.removeFirst(2)
print("count: \(buffer.count), startIndex: \(buffer.startIndex)")

let bytesToRead = min(buffer.count, 2)
// let chunk = buffer.prefix(upTo: bytesToRead) // THIS WOULD CRASH
let chunk = buffer.prefix(bytesToRead)
buffer.removeFirst(bytesToRead)

print("chunk: \(chunk.map{$0}), new count: \(buffer.count), new start: \(buffer.startIndex)")
