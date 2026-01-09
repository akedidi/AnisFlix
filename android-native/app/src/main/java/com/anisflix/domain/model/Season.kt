package com.anisflix.domain.model

data class Season(
    val id: Int,
    val name: String,
    val overview: String,
    val posterPath: String?,
    val seasonNumber: Int,
    val episodeCount: Int,
    val airDate: String?
)
