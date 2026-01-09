package com.anisflix.domain.model

data class Episode(
    val id: Int,
    val name: String,
    val overview: String,
    val stillPath: String?,
    val voteAverage: Double,
    val episodeNumber: Int,
    val seasonNumber: Int,
    val airDate: String?,
    val runtime: Int?
) {
    fun getStillUrl(): String {
        return "https://image.tmdb.org/t/p/w500$stillPath"
    }
}
