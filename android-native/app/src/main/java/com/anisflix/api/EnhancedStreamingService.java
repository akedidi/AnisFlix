package com.anisflix.api;

import com.anisflix.models.*;
import retrofit2.Call;
import retrofit2.http.*;

/**
 * Enhanced Streaming Service with all 3 endpoints
 */
public interface EnhancedStreamingService {
    String BASE_URL = "https://anisflix.vercel.app/";
    
    // ========== MOVIX ENDPOINTS ==========
    
    // Movies - TMDB
    @GET("api/movix-proxy")
    Call<MovixTmdbResponse> getMovixTmdbMovie(
            @Query("path") String path  // "tmdb/movie/{id}"
    );
    
    // Series - TMDB
    @GET("api/movix-proxy")
    Call<MovixTmdbResponse> getMovixTmdbSeries(
            @Query("path") String path  // "tmdb/tv/{id}&season={s}&episode={e}"
    );
    
    // Movies - FStream
    @GET("api/movix-proxy")
    Call<FStreamResponse> getMovixFStreamMovie(
            @Query("path") String path  // "fstream/movie/{id}"
    );
    
    // Series - FStream (nested episodes structure)
    @GET("api/movix-proxy")
    Call<FStreamResponse> getMovixFStreamSeries(
            @Query("path") String path  // "fstream/tv/{id}/season/{s}"
    );
    
    // ========== VIXSRC ENDPOINT ==========
    
    @GET("api/vixsrc")
    Call<VixsrcResponse> getVixsrcSources(
            @Query("tmdbId") int tmdbId,
            @Query("type") String type,  // "movie" or "tv"
            @Query("season") Integer season,
            @Query("episode") Integer episode
    );
    
    // ========== EXTRACTION ENDPOINTS ==========
    
    // VidMoly Extraction
    @POST("api/vidmoly")
    @Headers("Content-Type: application/json")
    Call<VidMolyExtractionResponse> extractVidMoly(
            @Body VidMolyExtractionRequest request
    );
    
    // Vidzy Extraction
    @POST("api/vidzy")
    @Headers("Content-Type: application/json")
    Call<VidzyExtractionResponse> extractVidzy(
            @Body VidzyExtractionRequest request
    );
    
    // ========== PROXY ENDPOINTS ==========
    
    // VidMoly Proxy (for playback)
    @GET("api/vidmoly")
    String getVidMolyProxyUrl(
            @Query("url") String url,
            @Query("referer") String referer
    );
    
    // Vixsrc Proxy (already in URL)
    // Built manually: /api/vixsrc-proxy?url={encodedUrl}
}
