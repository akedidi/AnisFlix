package com.anisflix.api;

import com.anisflix.models.StreamingSource;

import retrofit2.Call;
import retrofit2.http.GET;
import retrofit2.http.Query;

/**
 * Service for fetching streaming sources (Vidzy, Vidsrc, etc.)
 */
public interface StreamingService {
    String BASE_URL = "https://anisflix.vercel.app/";
    
    @GET("api/streaming-sources")
    Call<StreamingSource[]> getMovieSources(
            @Query("tmdbId") int tmdbId,
            @Query("type") String type, // "movie"
            @Query("language") String language // "vf", "vostfr", "vo"
    );
    
    @GET("api/streaming-sources")
    Call<StreamingSource[]> getEpisodeSources(
            @Query("tmdbId") int tmdbId,
            @Query("type") String type, // "series"
            @Query("season") int season,
            @Query("episode") int episode,
            @Query("language") String language // "vf", "vostfr", "vo"
    );
}
