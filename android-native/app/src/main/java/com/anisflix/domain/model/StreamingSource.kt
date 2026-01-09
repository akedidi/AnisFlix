package com.anisflix.domain.model

data class StreamingSource(
    val id: String,
    val url: String,
    val quality: String,
    val language: String, // VF, VO, VOSTFR
    val provider: String, // vidmoly, vidzy, etc.
    val type: String,     // hls, mp4
    val origin: String?,  // fstream, tmdb, etc.
    val tracks: List<Subtitle>? = null,
    val headers: Map<String, String>? = null
)

data class Subtitle(
    val url: String,
    val label: String,
    val code: String,
    val flag: String
)
