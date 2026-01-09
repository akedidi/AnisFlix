package com.anisflix.data.remote.dto

import com.google.gson.annotations.SerializedName

// --- Common ---
data class StreamingSourceDTO(
    @SerializedName("decoded_url") val url: String,
    val quality: String?,
    val language: String?,
    val provider: String?,
    val type: String?,
    val tracks: List<SubtitleDTO>?,
    val headers: Map<String, String>?
)

data class SubtitleDTO(
    val url: String,
    val label: String,
    val code: String,
    val flag: String
)

// --- TMDB (Movix Proxy) ---
data class MovixTmdbResponse(
    val player_links: List<StreamingSourceDTO>?
)

data class MovixTmdbSeriesResponse(
    val current_episode: MovixCurrentEpisodeDTO?,
    val player_links: List<StreamingSourceDTO>?
)

data class MovixCurrentEpisodeDTO(
    val season_number: Int?,
    val episode_number: Int?,
    val title: String?,
    val player_links: List<StreamingSourceDTO>?
)

// --- FStream ---
data class FStreamResponse(
    val players: Map<String, List<FStreamPlayerDTO>>?
)

data class FStreamTVResponse(
    val episodes: Map<String, FStreamEpisodeDTO>?
)

data class FStreamEpisodeDTO(
    val languages: Map<String, List<FStreamPlayerDTO>>?
)

data class FStreamPlayerDTO(
    val url: String,
    val type: String,
    val quality: String,
    val player: String
)

// --- MovieBox ---
data class MovieBoxResponse(
    val streams: List<MovieBoxStreamDTO>?,
    val success: Boolean?
)

data class MovieBoxStreamDTO(
    val url: String,
    val directUrl: String?,
    val quality: String?,
    val type: String?,
    val headers: Map<String, String>?
)

// --- UniversalVO ---
data class UniversalVOResponse(
    val files: List<UniversalVOFileDTO>?
)

data class UniversalVOFileDTO(
    val file: String,
    val type: String,
    val lang: String?,
    val quality: String?,
    val extractor: String?,
    val provider: String?
)

// --- AfterDark ---
data class AfterDarkResponse(
    val sources: List<AfterDarkSourceDTO>?
)

data class AfterDarkSourceDTO(
    @SerializedName("file") val url: String,
    val quality: String?,
    val kind: String?,
    val server: String?,
    val name: String?,
    val proxied: Boolean?,
    val language: String?
)

// --- Movix Download ---
data class MovixDownloadResponse(
    val sources: List<MovixDownloadSourceDTO>?
)

data class MovixDownloadSourceDTO(
    val src: String?,
    val language: String?,
    val quality: String?,
    val m3u8: String?
)
