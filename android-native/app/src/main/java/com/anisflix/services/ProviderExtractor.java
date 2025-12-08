package com.anisflix.services;

import android.util.Log;
import com.anisflix.api.EnhancedStreamingService;
import com.anisflix.api.RetrofitClient;
import com.anisflix.models.*;
import retrofit2.Response;
import java.io.IOException;

/**
 * Provider Extractor - Matches iOS extraction logic
 * Handles VidMoly, Vidzy extraction and proxy wrapping
 */
public class ProviderExtractor {
    
    private static final String TAG = "ProviderExtractor";
    private static final String BASE_URL = "https://anisflix.vercel.app";
    
    private static ProviderExtractor instance;
    private final EnhancedStreamingService apiService;
    
    private ProviderExtractor() {
        apiService = RetrofitClient.getInstance().create(EnhancedStreamingService.class);
    }
    
    public static synchronized ProviderExtractor getInstance() {
        if (instance == null) {
            instance = new ProviderExtractor();
        }
        return instance;
    }
    
    /**
     * Extract VidMoly URL (iOS pattern)
     * 1. Check if already m3u8 (pre-extracted)
     * 2. Call extraction API
     * 3. If extracted_real → wrap in proxy
     */
    public String extractVidMoly(String url) throws IOException {
        Log.d(TAG, "Extracting VidMoly: " + url);
        
        // 1. Check if already m3u8 (pre-extracted)
        if (url.contains(".m3u8") || url.contains("unified-streaming.com") || url.contains("vmeas.cloud")) {
            Log.d(TAG, "VidMoly URL is pre-extracted m3u8");
            return getVidMolyProxyUrl(url, "https://vidmoly.net/");
        }
        
        // 2. Call extraction API
        VidMolyExtractionRequest request = new VidMolyExtractionRequest(url, "auto");
        Response<VidMolyExtractionResponse> response = apiService.extractVidMoly(request).execute();
        
        if (!response.isSuccessful() || response.body() == null) {
            Log.e(TAG, "VidMoly extraction failed: HTTP " + response.code());
            throw new IOException("VidMoly extraction failed");
        }
        
        VidMolyExtractionResponse result = response.body();
        
        if (!result.isSuccess() || result.getM3u8Url() == null) {
            Log.e(TAG, "VidMoly extraction failed: no m3u8 URL");
            throw new IOException("VidMoly extraction failed: no m3u8");
        }
        
        String m3u8Url = result.getM3u8Url();
        String method = result.getMethod();
        
        Log.d(TAG, "VidMoly extracted: " + m3u8Url + " (method: " + method + ")");
        
        // Clean URL (iOS pattern)
        String cleanedUrl = m3u8Url;
        if (cleanedUrl.contains(",") && cleanedUrl.contains(".urlset")) {
            cleanedUrl = cleanedUrl.replace(",", "");
        }
        
        // 3. Check if proxy is needed (Real VidMoly links)
        boolean isRealVidMoly = "extracted_real".equals(method) ||
                                "direct_master_m3u8".equals(method) ||
                                (method != null && method.startsWith("direct_pattern_")) ||
                                cleanedUrl.contains("vmwesa.online") ||
                                cleanedUrl.contains("vmeas.cloud");
        
        if (isRealVidMoly) {
            Log.d(TAG, "VidMoly using proxy");
            return getVidMolyProxyUrl(cleanedUrl, url);
        } else {
            return cleanedUrl;
        }
    }
    
    /**
     * Extract Vidzy URL (iOS pattern)
     * Direct extraction, no proxy needed
     */
    public String extractVidzy(String url) throws IOException {
        Log.d(TAG, "Extracting Vidzy: " + url);
        
        VidzyExtractionRequest request = new VidzyExtractionRequest(url);
        Response<VidzyExtractionResponse> response = apiService.extractVidzy(request).execute();
        
        if (!response.isSuccessful() || response.body() == null) {
            Log.e(TAG, "Vidzy extraction failed: HTTP " + response.code());
            throw new IOException("Vidzy extraction failed");
        }
        
        VidzyExtractionResponse result = response.body();
        
        if (result.getM3u8Url() != null) {
            Log.d(TAG, "Vidzy extracted: " + result.getM3u8Url());
            return result.getM3u8Url();
        } else if (result.getError() != null) {
            Log.e(TAG, "Vidzy error: " + result.getError());
            throw new IOException("Vidzy error: " + result.getError());
        }
        
        throw new IOException("Vidzy extraction failed: no m3u8");
    }
    
    /**
     * Get VidMoly proxy URL (iOS pattern)
     */
    private String getVidMolyProxyUrl(String url, String referer) {
        return BASE_URL + "/api/vidmoly?url=" + android.net.Uri.encode(url) + 
               "&referer=" + android.net.Uri.encode(referer);
    }
    
    /**
     * Extract based on provider
     */
    public String extractByProvider(String url, String provider) throws IOException {
        if ("vidmoly".equals(provider)) {
            return extractVidMoly(url);
        } else if ("vidzy".equals(provider)) {
            return extractVidzy(url);
        } else if ("vixsrc".equals(provider)) {
            // Vixsrc URLs are already wrapped in proxy by StreamingServiceManager
            return url;
        } else {
            // Unknown provider, return as-is
            return url;
        }
    }
}
