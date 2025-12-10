package com.anisflix.repository;

import android.content.Context;
import com.anisflix.api.RetrofitClient;
import com.anisflix.api.TMDBService;
import com.anisflix.api.StreamingService;
import com.anisflix.api.TVService;
import com.anisflix.database.AppDatabase;
import com.anisflix.database.FavoriteDao;
import com.anisflix.database.FavoriteEntity;
import com.anisflix.models.*;
import com.anisflix.models.TVChannel;
import com.anisflix.models.TVResponse;
import com.anisflix.utils.Constants;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import java.util.List;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import com.anisflix.models.MultiSearchItem;

/**
 * Repository pattern - Single source of truth for data
 */
public class MediaRepository {
    
    private static MediaRepository instance;
    private final TMDBService tmdbService;
    private final StreamingService streamingService;
    private final TVService tvService;
    private final FavoriteDao favoriteDao;
    private final Executor executor;
    
    private MediaRepository(Context context) {
        tmdbService = RetrofitClient.getInstance().getTMDBService();
        streamingService = RetrofitClient.getInstance().getStreamingService();
        tvService = RetrofitClient.getInstance().getTVService();
        favoriteDao = AppDatabase.getInstance(context).favoriteDao();
        executor = Executors.newSingleThreadExecutor();
    }
    
    public static synchronized MediaRepository getInstance(Context context) {
        if (instance == null) {
            instance = new MediaRepository(context.getApplicationContext());
        }
        return instance;
    }
    
    // Movies
    public void getPopularMovies(int page, Callback<TMDBResponse<Movie>> callback) {
        tmdbService.getPopularMovies(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, page)
                .enqueue(callback);
    }
    
    public void getMovieDetails(int movieId, Callback<Movie> callback) {
        tmdbService.getMovieDetails(movieId, Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH)
                .enqueue(callback);
    }
    
    // Series
    public void getPopularSeries(int page, Callback<TMDBResponse<Series>> callback) {
        tmdbService.getPopularSeries(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, page)
                .enqueue(callback);
    }
    
    public void getSeriesDetails(int seriesId, Callback<Series> callback) {
        tmdbService.getSeriesDetails(seriesId, Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH)
                .enqueue(callback);
    }

    // New methods for Movies Tabs
    public void getTopRatedMovies(int page, Callback<TMDBResponse<Movie>> callback) {
        tmdbService.getTopRatedMovies(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, page).enqueue(callback);
    }

    public void getUpcomingMovies(int page, Callback<TMDBResponse<Movie>> callback) {
        tmdbService.getUpcomingMovies(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, page).enqueue(callback);
    }

    public void getTrendingMovies(int page, Callback<TMDBResponse<Movie>> callback) {
        tmdbService.getTrendingMovies(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, page).enqueue(callback);
    }

    // New methods for Series Tabs
    public void getTopRatedSeries(int page, Callback<TMDBResponse<Series>> callback) {
        tmdbService.getTopRatedSeries(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, page).enqueue(callback);
    }

    public void getAiringTodaySeries(int page, Callback<TMDBResponse<Series>> callback) {
        tmdbService.getAiringTodaySeries(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, page).enqueue(callback);
    }

    public void getTrendingSeries(int page, Callback<TMDBResponse<Series>> callback) {
        tmdbService.getTrendingSeries(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, page).enqueue(callback);
    }

    // New methods for Home Page parity
    public void getLatestMovies(int page, Callback<TMDBResponse<Movie>> callback) {
        tmdbService.getLatestMovies(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, page).enqueue(callback);
    }
    
    public void getLatestSeries(int page, Callback<TMDBResponse<Series>> callback) {
        // Using discover for latest series with filters as seen in TMDBService
        tmdbService.getLatestSeries(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, page, 
            "first_air_date.desc", java.time.LocalDate.now().toString(), 
            "8|119|337|381|283|350|1899", "FR", "flatrate").enqueue(callback);
    }

    public void getMoviesByProvider(int providerId, int page, Callback<TMDBResponse<Movie>> callback) {
        String providerStr = String.valueOf(providerId);
        String region = "FR";
        if (providerId == 384) {
            providerStr = "384|1899";
            region = "US";
        } else if (providerId == 9) {
            region = "US"; // Amazon Prime needs US region for better catalog parity
        }
        tmdbService.getMoviesByProvider(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, page, providerStr, region, "primary_release_date.desc", "flatrate").enqueue(callback);
    }

    public void getSeriesByProvider(int providerId, int page, Callback<TMDBResponse<Series>> callback) {
        if (providerId == 9) {
            // Amazon Prime (9) uses Network filter (Amazon Studios = 1024) instead of provider filter for Series
            tmdbService.getSeriesByNetwork(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, page, "1024", "first_air_date.desc", java.time.LocalDate.now().toString(), false, false).enqueue(callback);
            return;
        }
        
        String providerStr = String.valueOf(providerId);
        String region = "FR";
        if (providerId == 384) {
            providerStr = "384|1899";
            region = "US";
        }
        tmdbService.getSeriesByProvider(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, page, providerStr, region, "first_air_date.desc", java.time.LocalDate.now().toString(), "flatrate").enqueue(callback);
    }

    public void getMoviesByGenre(int genreId, int page, Callback<TMDBResponse<Movie>> callback) {
        tmdbService.getMoviesByGenre(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, page, genreId, "popularity.desc", java.time.LocalDate.now().toString(), "flatrate", "FR").enqueue(callback);
    }

    public void getSeriesByGenre(int genreId, int page, Callback<TMDBResponse<Series>> callback) {
        tmdbService.getSeriesByGenre(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, page, genreId, "popularity.desc", java.time.LocalDate.now().toString(), "flatrate", "FR").enqueue(callback);
    }
    
    // Search
    public void searchMulti(String query, int page, Callback<TMDBResponse<MultiSearchItem>> callback) {
        tmdbService.searchMulti(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, query, page)
                .enqueue(callback);
    }
    
    // Streaming sources
    public void getMovieStreamingSources(int tmdbId, String language, Callback<StreamingSource[]> callback) {
        streamingService.getMovieSources(tmdbId, "movie", language).enqueue(callback);
    }
    
    public void getEpisodeStreamingSources(int tmdbId, int season, int episode, String language, 
                                          Callback<StreamingSource[]> callback) {
        streamingService.getEpisodeSources(tmdbId, "series", season, episode, language)
                .enqueue(callback);
    }
    
    // TV Channels
    public void getTVChannels(Callback<TVResponse> callback) {
        tvService.getTVChannels().enqueue(callback);
    }
    
    // Favorites (Room DB)
    public void addFavorite(FavoriteEntity favorite, OnCompleteListener listener) {
        executor.execute(() -> {
            favoriteDao.insert(favorite);
            if (listener != null) listener.onComplete();
        });
    }
    
    public void removeFavorite(int id, OnCompleteListener listener) {
        executor.execute(() -> {
            favoriteDao.deleteById(id);
            if (listener != null) listener.onComplete();
        });
    }
    
    public void isFavorite(int id, OnFavoriteCheckListener listener) {
        executor.execute(() -> {
            boolean isFav = favoriteDao.isFavoriteSync(id);
            if (listener != null) listener.onResult(isFav);
        });
    }
    
    public void getAllFavorites(OnFavoritesLoadedListener listener) {
        executor.execute(() -> {
            List<FavoriteEntity> favorites = favoriteDao.getAllFavoritesSync();
            if (listener != null) listener.onLoaded(favorites);
        });
    }
    
    // Interfaces for callbacks
    public interface OnCompleteListener {
        void onComplete();
    }
    
    public interface OnFavoriteCheckListener {
        void onResult(boolean isFavorite);
    }
    
    public interface OnFavoritesLoadedListener {
        void onLoaded(List<FavoriteEntity> favorites);
    }
}
