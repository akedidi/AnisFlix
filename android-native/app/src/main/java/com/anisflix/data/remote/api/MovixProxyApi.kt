package com.anisflix.data.remote.api

import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query
import retrofit2.http.Url

interface MovixProxyApi {
    @GET("movix-proxy")
    suspend fun getProxyResponse(
        @Query("path") path: String,
        @Query("url") url: String? = null,
        @Query("q") query: String? = null
    ): Response<ResponseBody>
    
    // Direct URL fetch (proxying) through the service if needed
    @GET
    suspend fun fetchRaw(@Url url: String): Response<ResponseBody>
}
