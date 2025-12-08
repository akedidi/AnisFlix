package com.anisflix.api;

import com.anisflix.models.TVChannel;

import retrofit2.Call;
import retrofit2.http.GET;
import retrofit2.http.Query;

/**
 * Service for fetching TV channels
 */
public interface TVService {
    String BASE_URL = "https://anisflix.vercel.app/";
    
    @GET("api/tv-channels")
    Call<TVChannel[]> getTVChannels();
    
    @GET("api/tv-channels/search")
    Call<TVChannel[]> searchChannels(
            @Query("query") String query
    );
}
