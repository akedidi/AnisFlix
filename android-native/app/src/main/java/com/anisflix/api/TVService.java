package com.anisflix.api;

import com.anisflix.models.TVChannel;
import com.anisflix.models.TVResponse;

import retrofit2.Call;
import retrofit2.http.GET;
import retrofit2.http.Query;

/**
 * Service for fetching TV channels
 */
public interface TVService {
    String BASE_URL = "https://anisflix.vercel.app/";
    
    @GET("api/tv-channels")
    Call<TVResponse> getTVChannels();
    
    @GET("api/tv-channels/search")
    Call<TVResponse> searchChannels( // API might still return list for search, but let's assume structure or handle search manually
            @Query("query") String query
    );
}
