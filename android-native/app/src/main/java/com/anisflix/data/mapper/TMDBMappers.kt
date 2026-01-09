package com.anisflix.data.mapper

import com.anisflix.data.remote.dto.TMDBMovieDTO
import com.anisflix.data.remote.dto.TMDBMovieDetailDTO
import com.anisflix.data.remote.dto.TMDBSeriesDTO
import com.anisflix.data.remote.dto.TMDBSeriesDetailDTO
import com.anisflix.domain.model.Media
import com.anisflix.domain.model.MediaType

fun TMDBMovieDTO.toMedia(): Media {
    return Media(
        id = id,
        title = title,
        overview = overview,
        posterPath = posterPath,
        backdropPath = backdropPath,
        rating = voteAverage,
        year = releaseDate?.take(4) ?: "",
        mediaType = MediaType.MOVIE,
        voteCount = voteCount,
        originalLanguage = null, // Can add if needed
        releaseDate = releaseDate,
        genres = genreIds ?: emptyList()
    )
}

fun TMDBSeriesDTO.toMedia(): Media {
    return Media(
        id = id,
        title = name,
        overview = overview,
        posterPath = posterPath,
        backdropPath = backdropPath,
        rating = voteAverage,
        year = firstAirDate?.take(4) ?: "",
        mediaType = MediaType.SERIES,
        voteCount = voteCount,
        originalLanguage = null,
        releaseDate = firstAirDate,
        genres = genreIds ?: emptyList()
    )
}

fun TMDBMovieDetailDTO.toMedia(): Media {
    return Media(
        id = id,
        title = title,
        overview = overview,
        posterPath = posterPath,
        backdropPath = backdropPath,
        rating = voteAverage,
        year = releaseDate?.take(4) ?: "",
        mediaType = MediaType.MOVIE,
        voteCount = voteCount,
        originalLanguage = null,
        releaseDate = releaseDate,
        genres = emptyList() // Detail DTO has Genre objects, need to map if required
    )
}

fun TMDBSeriesDetailDTO.toMedia(): Media {
    return Media(
        id = id,
        title = name,
        overview = overview,
        posterPath = posterPath,
        backdropPath = backdropPath,
        rating = voteAverage,
        year = firstAirDate?.take(4) ?: "",
        mediaType = MediaType.SERIES,
        voteCount = voteCount,
        originalLanguage = null,
        releaseDate = firstAirDate,
        genres = emptyList() // Detail DTO has Genre objects
    )
}
