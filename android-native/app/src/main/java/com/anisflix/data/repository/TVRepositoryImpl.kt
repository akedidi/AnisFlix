package com.anisflix.data.repository

import com.anisflix.data.mapper.toDomain
import com.anisflix.data.remote.api.TvChannelsApi
import com.anisflix.domain.model.TVChannel
import com.anisflix.domain.repository.TVRepository
import java.net.URLEncoder
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TVRepositoryImpl @Inject constructor(
    private val api: TvChannelsApi
) : TVRepository {

    private var cachedChannels: List<TVChannel> = emptyList()

    override suspend fun getChannels(): Result<List<TVChannel>> {
        return try {
            if (cachedChannels.isNotEmpty()) {
                return Result.success(cachedChannels)
            }
            val response = api.getChannels()
            // toDomain() is called on TVSectionDTO list in the response from Mappers?
            // Mappers was fun TVSectionDTO.toDomain(): List<TVChannel>
            // Response has sections: List<TVSectionDTO>
            val channels = response.sections.flatMap { it.toDomain() }
            cachedChannels = channels
            Result.success(channels)
        } catch (e: Exception) {
            e.printStackTrace()
            Result.failure(e)
        }
    }

    override suspend fun searchChannels(query: String): Result<List<TVChannel>> {
        if (query.isEmpty()) return Result.success(emptyList())
        // Ensure cache is loaded or fetch if needed
        if (cachedChannels.isEmpty()) {
            val result = getChannels()
            if (result.isFailure) return result
        }
        
        val filtered = cachedChannels.filter { 
            it.name.contains(query, ignoreCase = true) 
        }
        return Result.success(filtered)
    }

    override fun getProxyUrl(originalUrl: String, type: String): String {
        // Logic from TVService.swift
        val baseUrl = "https://anisflix.vercel.app"
        
        if (type == "hls_segments") {
            // Regex: /live/[^/]+/(\d+)\.m3u8/
            val regex = "/live/[^/]+/(\\d+)\\.m3u8".toRegex()
            val match = regex.find(originalUrl)
            if (match != null) {
                val channelId = match.groupValues[1]
                return "$baseUrl/api/media-proxy?channelId=$channelId"
            }
        }
        
        val encodedUrl = URLEncoder.encode(originalUrl, "UTF-8")
        return "$baseUrl/api/media-proxy?url=$encodedUrl"
    }
}
