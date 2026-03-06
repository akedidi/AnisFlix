import Foundation

// Create a semaphore to wait for the async request
let semaphore = DispatchSemaphore(value: 0)

// 1. You need a fresh valid URL from Vidlink API for a show. 
// Since we don't have an immediate one, we will call local python script to get a stream url.
