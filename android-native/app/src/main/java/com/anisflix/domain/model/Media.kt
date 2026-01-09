package com.anisflix.domain.model

enum class MediaType(val value: String) {
    MOVIE("movie"),
    SERIES("tv")
}

data class Media(
    val id: Int,
    val title: String,
    val overview: String,
    val posterPath: String?,
    val backdropPath: String?,
    val rating: Double,
    val year: String,
    val mediaType: MediaType,
    val voteCount: Int = 0,
    val originalLanguage: String? = null,
    val releaseDate: String? = null,
    val genres: List<Int> = emptyList(),
    val seriesId: Int? = null // Added for Episode navigation context
) {
    fun getPosterUrl(): String {
        return "https://image.tmdb.org/t/p/w500$posterPath"
    }

    fun getBackdropUrl(): String {
        return "https://image.tmdb.org/t/p/original$backdropPath"
    }
}
