package com.anisflix.data.remote.api

import com.anisflix.data.remote.dto.TVChannelsResponse
import retrofit2.http.GET

interface TvChannelsApi {
    @GET("channels")
    suspend fun getChannels(): TVChannelsResponse
}
