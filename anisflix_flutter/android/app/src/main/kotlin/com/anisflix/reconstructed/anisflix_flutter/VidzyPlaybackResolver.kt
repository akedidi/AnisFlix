package com.anisflix.reconstructed.anisflix_flutter

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Bitmap
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.view.ViewGroup
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import io.flutter.plugin.common.MethodChannel
import org.json.JSONObject
import java.io.ByteArrayInputStream

/** The same device must obtain the gate key and play the signed HLS URL. */
class VidzyPlaybackResolver(private val activity: Activity) {
    private val pending = mutableSetOf<() -> Unit>()

    @SuppressLint("SetJavaScriptEnabled")
    fun resolve(embed: String, media: String, gateHosts: List<String>, result: MethodChannel.Result) {
        val page = Uri.parse(embed)
        val fallback = Uri.parse(media)
        fun providerHost(host: String?) = host != null &&
            listOf("vidzy.cc", "vidzy.org", "vidzy.live", "vidzy.net").any { host == it || host.endsWith(".$it") }
        if (page.scheme != "https" || !providerHost(page.host) || fallback.scheme != "https" || fallback.host.isNullOrEmpty()) {
            result.error("vidzy_url", "Adresse Vidzy invalide", null)
            return
        }
        val allowed = (listOfNotNull(page.host, fallback.host) + gateHosts.filter { providerHost(it) }).toSet()
        val handler = Handler(Looper.getMainLooper())
        val view = WebView(activity)
        val agent = view.settings.userAgentString
        view.settings.javaScriptEnabled = true
        view.settings.allowFileAccess = false
        view.settings.allowContentAccess = false
        view.settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        view.settings.mediaPlaybackRequiresUserGesture = true
        view.settings.javaScriptCanOpenWindowsAutomatically = false
        view.settings.setSupportMultipleWindows(true)
        view.alpha = 0f
        view.isClickable = false
        view.isFocusable = false
        view.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
        // Attaching the transparent view allows the browser's canvas/WebGL
        // calibration to use the device renderer, including on Android TV.
        val root = activity.window.decorView as ViewGroup
        root.addView(view, ViewGroup.LayoutParams(960, 540))
        var completed = false
        lateinit var cancel: () -> Unit
        fun finish(url: String? = null) {
            if (completed) return
            completed = true
            handler.removeCallbacksAndMessages(null)
            pending.remove(cancel)
            view.stopLoading()
            root.removeView(view)
            view.destroy()
            if (url == null) result.error("vidzy_session", "Impossible d’autoriser la lecture Vidzy", null)
            else {
                val origin = "https://${page.host}"
                val headers = mutableMapOf("Referer" to "$origin/", "Origin" to origin, "User-Agent" to agent)
                CookieManager.getInstance().getCookie(url)?.takeIf { it.isNotBlank() }?.let { headers["Cookie"] = it }
                result.success(mapOf("url" to url, "headers" to headers))
            }
        }
        cancel = { finish() }
        pending.add(cancel)
        fun poll() {
            if (completed) return
            view.evaluateJavascript("""(function(){var p=window.player;return {ready:document.readyState,key:window.__vzgk||'',url:p&&p.currentSrc?p.currentSrc():''};})()""") { value ->
                if (completed) return@evaluateJavascript
                val state = try { JSONObject(value) } catch (_: Exception) { JSONObject() }
                val key = state.optString("key")
                if (state.optString("ready") == "complete" && key.isNotEmpty()) {
                    val current = Uri.parse(state.optString("url"))
                    val candidate = if (current.scheme == "https" && current.path?.endsWith(".m3u8") == true && current.path?.contains("/troll/") == false) current else fallback
                    val builder = candidate.buildUpon().clearQuery()
                    for (name in candidate.queryParameterNames.filter { it != "gk" }) {
                        for (item in candidate.getQueryParameters(name)) builder.appendQueryParameter(name, item)
                    }
                    finish(builder.appendQueryParameter("gk", key).build().toString())
                } else handler.postDelayed({ poll() }, 200)
            }
        }
        view.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(webView: WebView, request: WebResourceRequest): WebResourceResponse? {
                val uri = request.url
                return if (uri.scheme == "https" && uri.host in allowed && uri.path != "/js/pop.js") null
                else WebResourceResponse("text/plain", "UTF-8", ByteArrayInputStream(ByteArray(0)))
            }
            override fun shouldOverrideUrlLoading(webView: WebView, request: WebResourceRequest): Boolean =
                request.isForMainFrame && (request.url.scheme != "https" || request.url.host != page.host)
            override fun onPageStarted(webView: WebView, url: String, favicon: Bitmap?) {
                if (Uri.parse(url).host != page.host) finish()
            }
        }
        handler.postDelayed({ finish() }, 30_000)
        view.loadUrl(embed)
        handler.postDelayed({ poll() }, 200)
    }

    fun close() { pending.toList().forEach { it() } }
}
