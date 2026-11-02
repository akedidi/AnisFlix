package com.anisflix.reconstructed.anisflix_flutter

import android.app.PictureInPictureParams
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.os.Build
import android.util.Rational
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var playbackActive = false
    private var notificationAsked = false
    companion object { var bridge: MethodChannel? = null }
    private fun isTv() = resources.configuration.uiMode and Configuration.UI_MODE_TYPE_MASK == Configuration.UI_MODE_TYPE_TELEVISION
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        bridge = MethodChannel(flutterEngine.dartExecutor.binaryMessenger,"com.anisflix.reconstructed/platform")
        bridge?.setMethodCallHandler { call, result ->
            when(call.method) {
                "isTv" -> result.success(isTv())
                "setPlaybackActive" -> { playbackActive = call.argument<Boolean>("active") == true; result.success(null) }
                "enterPictureInPicture" -> result.success(enterPip())
                "downloadForeground" -> {
                    val count = call.argument<Int>("count") ?: 0
                    try {
                        if (count <= 0) stopService(Intent(this, DownloadForegroundService::class.java))
                        else {
                            if (Build.VERSION.SDK_INT >= 33 && !notificationAsked && !isTv() && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                                notificationAsked = true
                                requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),2402)
                            }
                            val intent = Intent(this, DownloadForegroundService::class.java)
                                .putExtra("count",count).putExtra("progress",call.argument<Double>("progress") ?: -1.0)
                            if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent) else startService(intent)
                        }
                        result.success(true)
                    } catch (error: Exception) { result.error("foreground_unavailable","Téléchargement en arrière-plan indisponible",null) }
                }
                else -> result.notImplemented()
            }
        }
    }
    private fun enterPip(): Boolean {
        if (Build.VERSION.SDK_INT < 26 || isTv() || !packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)) return false
        return try { enterPictureInPictureMode(PictureInPictureParams.Builder().setAspectRatio(Rational(16,9)).build()) } catch (_: Exception) { false }
    }
    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (playbackActive) enterPip()
    }
    override fun onPictureInPictureModeChanged(inPictureInPictureMode: Boolean,newConfig: Configuration) {
        super.onPictureInPictureModeChanged(inPictureInPictureMode,newConfig)
        bridge?.invokeMethod("pictureInPictureChanged",inPictureInPictureMode)
    }
    override fun cleanUpFlutterEngine(flutterEngine: FlutterEngine) {
        stopService(Intent(this, DownloadForegroundService::class.java))
        bridge?.setMethodCallHandler(null); bridge = null
        super.cleanUpFlutterEngine(flutterEngine)
    }
}
