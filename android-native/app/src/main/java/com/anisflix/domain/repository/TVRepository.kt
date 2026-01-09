package com.anisflix.domain.repository

import com.anisflix.domain.model.TVChannel

interface TVRepository {
    suspend fun getChannels(): Result<List<TVChannel>>
    suspend fun searchChannels(query: String): Result<List<TVChannel>>
    
    // Logic for proxying URLs
    fun getProxyUrl(originalUrl: String, type: String): String
}
