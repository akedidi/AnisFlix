package com.anisflix.api;

import com.anisflix.models.Movie;
import com.anisflix.models.Series;
import com.anisflix.models.Episode;
import com.anisflix.models.TMDBResponse;
import com.anisflix.models.MultiSearchItem;

import retrofit2.Call;
import retrofit2.http.GET;
import retrofit2.http.Path;
import retrofit2.http.Query;

/**
 * Complete TMDB Service matching iOS TMDBService.swift
 */
public interface TMDBService {
    String BASE_URL = "https://api.themoviedb.org/3/";
    
    // ========== POPULAR & LATEST ==========
    
    @GET("movie/popular")
    Call<TMDBResponse<Movie>> getPopularMovies(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page
    );

    @GET("movie/top_rated")
    Call<TMDBResponse<Movie>> getTopRatedMovies(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page
    );

    @GET("movie/upcoming")
    Call<TMDBResponse<Movie>> getUpcomingMovies(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page
    );

    @GET("trending/movie/week")
    Call<TMDBResponse<Movie>> getTrendingMovies(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page
    );
    
    @GET("movie/now_playing")
    Call<TMDBResponse<Movie>> getLatestMovies(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page
    );
    
    @GET("tv/popular")
    Call<TMDBResponse<Series>> getPopularSeries(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page
    );

    @GET("tv/top_rated")
    Call<TMDBResponse<Series>> getTopRatedSeries(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page
    );

    @GET("tv/airing_today")
    Call<TMDBResponse<Series>> getAiringTodaySeries(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page
    );

    @GET("trending/tv/week")
    Call<TMDBResponse<Series>> getTrendingSeries(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page
    );
    
    // Latest Series with major providers
    @GET("discover/tv")
    Call<TMDBResponse<Series>> getLatestSeries(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page,
            @Query("sort_by") String sortBy,  // "first_air_date.desc"
            @Query("first_air_date.lte") String airDateLte,  // today
            @Query("with_watch_providers") String providers,  // "8|119|337|381|283|350|1899"
            @Query("watch_region") String region,  // "FR"
            @Query("with_watch_monetization_types") String monetization  // "flatrate"
    );
    
    // ========== BY PROVIDER ==========
    
    @GET("discover/movie")
    Call<TMDBResponse<Movie>> getMoviesByProvider(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page,
            @Query("with_watch_providers") String providerId,
            @Query("watch_region") String region,
            @Query("sort_by") String sortBy,  // "primary_release_date.desc"
            @Query("with_watch_monetization_types") String monetization
    );
    
    @GET("discover/tv")
    Call<TMDBResponse<Series>> getSeriesByProvider(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page,
            @Query("with_watch_providers") String providerId,
            @Query("watch_region") String region,
            @Query("sort_by") String sortBy,  // "first_air_date.desc"
            @Query("first_air_date.lte") String airDateLte,
            @Query("with_watch_monetization_types") String monetization
    );
    
    // ========== BY GENRE ==========
    
    @GET("discover/movie")
    Call<TMDBResponse<Movie>> getMoviesByGenre(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page,
            @Query("with_genres") int genreId,
            @Query("sort_by") String sortBy,
            @Query("primary_release_date.lte") String releaseDateLte,
            @Query("with_watch_monetization_types") String monetization,
            @Query("watch_region") String region
    );
    
    @GET("discover/tv")
    Call<TMDBResponse<Series>> getSeriesByGenre(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page,
            @Query("with_genres") int genreId,
            @Query("sort_by") String sortBy,
            @Query("first_air_date.lte") String airDateLte,
            @Query("with_watch_monetization_types") String monetization,
            @Query("watch_region") String region
    );
    
    @GET("discover/tv")
    Call<TMDBResponse<Series>> getSeriesByNetwork(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page,
            @Query("with_networks") String networkId,
            @Query("sort_by") String sortBy,
            @Query("first_air_date.lte") String airDateLte,
            @Query("include_null_first_air_dates") boolean includeNullDates,
            @Query("include_adult") boolean includeAdult
    );
    
    // ========== BY PROVIDER AND GENRE ==========
    
    @GET("discover/movie")
    Call<TMDBResponse<Movie>> getMoviesByProviderAndGenre(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page,
            @Query("with_watch_providers") String providerId,
            @Query("with_genres") int genreId,
            @Query("watch_region") String region,
            @Query("sort_by") String sortBy,
            @Query("with_watch_monetization_types") String monetization
    );
    
    @GET("discover/tv")
    Call<TMDBResponse<Series>> getSeriesByProviderAndGenre(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page,
            @Query("with_watch_providers") String providerId,
            @Query("with_genres") int genreId,
            @Query("watch_region") String region,
            @Query("sort_by") String sortBy,
            @Query("first_air_date.lte") String airDateLte,
            @Query("with_watch_monetization_types") String monetization
    );
    
    // ========== DETAILS ==========
    
    @GET("movie/{movie_id}")
    Call<Movie> getMovieDetails(
            @Path("movie_id") int movieId,
            @Query("api_key") String apiKey,
            @Query("language") String language
    );
    
    @GET("tv/{tv_id}")
    Call<Series> getSeriesDetails(
            @Path("tv_id") int seriesId,
            @Query("api_key") String apiKey,
            @Query("language") String language
    );
    
    @GET("tv/{tv_id}/season/{season_number}")
    Call<TMDBResponse<Episode>> getSeasonEpisodes(
            @Path("tv_id") int seriesId,
            @Path("season_number") int seasonNumber,
            @Query("api_key") String apiKey,
            @Query("language") String language
    );
    
    // ========== SIMILAR CONTENT ==========
    
    @GET("movie/{movie_id}/similar")
    Call<TMDBResponse<Movie>> getSimilarMovies(
            @Path("movie_id") int movieId,
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page
    );
    
    @GET("tv/{tv_id}/similar")
    Call<TMDBResponse<Series>> getSimilarSeries(
            @Path("tv_id") int seriesId,
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("page") int page
    );
    
    // ========== SEARCH ==========
    
    @GET("search/movie")
    Call<TMDBResponse<Movie>> searchMovies(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("query") String query,
            @Query("page") int page
    );
    
    @GET("search/tv")
    Call<TMDBResponse<Series>> searchSeries(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("query") String query,
            @Query("page") int page
    );
    
    @GET("search/multi")
    Call<TMDBResponse<MultiSearchItem>> searchMulti(
            @Query("api_key") String apiKey,
            @Query("language") String language,
            @Query("query") String query,
            @Query("page") int page
    );
}
