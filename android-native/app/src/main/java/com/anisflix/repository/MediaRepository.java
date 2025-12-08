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
import com.anisflix.utils.Constants;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import java.util.List;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

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
    public void getTVChannels(Callback<TVChannel[]> callback) {
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
