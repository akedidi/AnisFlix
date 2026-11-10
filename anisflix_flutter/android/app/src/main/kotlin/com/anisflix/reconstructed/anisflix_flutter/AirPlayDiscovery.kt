package com.anisflix.reconstructed.anisflix_flutter

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Handler
import android.os.Looper

/** Android's system mDNS discovery; no hard-coded receiver names or addresses. */
@Suppress("DEPRECATION")
class AirPlayDiscovery(context: Context, private val changed: (List<Map<String, Any>>) -> Unit) {
    private val manager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    private val handler = Handler(Looper.getMainLooper())
    private val devices = linkedMapOf<String, Map<String, Any>>()
    private var listener: NsdManager.DiscoveryListener? = null
    private val pending = java.util.ArrayDeque<NsdServiceInfo>()
    private var resolving = false
    private var generation = 0

    fun start() {
        stop()
        val run = generation
        val callback = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(type: String) {}
            override fun onDiscoveryStopped(type: String) {}
            override fun onStartDiscoveryFailed(type: String, code: Int) { stop() }
            override fun onStopDiscoveryFailed(type: String, code: Int) {}
            override fun onServiceFound(info: NsdServiceInfo) { handler.post {
                if (run == generation) { pending.add(info); resolveNext(run) }
            } }
            override fun onServiceLost(info: NsdServiceInfo) { handler.post {
                if (run == generation) { devices.remove(info.serviceName); changed(devices.values.toList()) }
            } }
        }
        listener = callback
        manager.discoverServices("_airplay._tcp.", NsdManager.PROTOCOL_DNS_SD, callback)
    }

    private fun resolveNext(run: Int) {
        if (resolving || pending.isEmpty() || run != generation) return
        resolving = true
        manager.resolveService(pending.remove(), object : NsdManager.ResolveListener {
            override fun onResolveFailed(info: NsdServiceInfo, code: Int) { handler.post {
                if (run == generation) { resolving = false; resolveNext(run) }
            } }
            override fun onServiceResolved(info: NsdServiceInfo) { handler.post {
                if (run != generation) return@post
                val host = info.host?.hostAddress
                if (host != null) {
                    devices[info.serviceName] = mapOf("name" to info.serviceName, "host" to host, "port" to info.port)
                    changed(devices.values.toList())
                }
                resolving = false
                resolveNext(run)
            } }
        })
    }

    fun stop() {
        generation++
        listener?.let { try { manager.stopServiceDiscovery(it) } catch (_: Exception) {} }
        listener = null
        pending.clear()
        resolving = false
        devices.clear()
        changed(emptyList())
    }
}
