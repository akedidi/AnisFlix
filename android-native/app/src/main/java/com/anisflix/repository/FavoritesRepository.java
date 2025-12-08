package com.anisflix.repository;

import android.content.Context;
import androidx.lifecycle.LiveData;
import com.anisflix.database.AppDatabase;
import com.anisflix.database.FavoriteDao;
import com.anisflix.database.FavoriteEntity;
import com.anisflix.models.Movie;
import com.anisflix.models.Series;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

/**
 * Favorites Repository - Manages favorites persistence
 */
public class FavoritesRepository {
    
    private static FavoritesRepository instance;
    private final FavoriteDao favoriteDao;
    private final Executor executor;
    
    private FavoritesRepository(Context context) {
        AppDatabase database = AppDatabase.getInstance(context);
        favoriteDao = database.favoriteDao();
        executor = Executors.newSingleThreadExecutor();
    }
    
    public static synchronized FavoritesRepository getInstance(Context context) {
        if (instance == null) {
            instance = new FavoritesRepository(context.getApplicationContext());
        }
        return instance;
    }
    
    // ========== ADD/REMOVE FAVORITES ==========
    
    public void addFavorite(int mediaId, String mediaType, String title, String posterPath) {
        executor.execute(() -> {
            FavoriteEntity favorite = new FavoriteEntity();
            favorite.mediaId = mediaId;
            favorite.mediaType = mediaType;  // "movie" or "series"
            favorite.title = title;
            favorite.posterPath = posterPath;
            favorite.addedAt = System.currentTimeMillis();
            favoriteDao.insert(favorite);
        });
    }
    
    public void removeFavorite(int mediaId) {
        executor.execute(() -> {
            favoriteDao.deleteByMediaId(mediaId);
        });
    }
    
    public void toggleFavorite(int mediaId, String mediaType, String title, String posterPath) {
        executor.execute(() -> {
            FavoriteEntity existing = favoriteDao.getFavoriteByIdSync(mediaId);
            if (existing != null) {
                favoriteDao.delete(existing);
            } else {
                addFavorite(mediaId, mediaType, title, posterPath);
            }
        });
    }
    
    // ========== CHECK FAVORITE ==========
    
    public LiveData<Boolean> isFavorite(int mediaId) {
        return favoriteDao.isFavorite(mediaId);
    }
    
    public boolean isFavoriteSync(int mediaId) {
        return favoriteDao.getFavoriteByIdSync(mediaId) != null;
    }
    
    // ========== GET FAVORITES ==========
    
    public LiveData<List<FavoriteEntity>> getAllFavorites() {
        return favoriteDao.getAllFavorites();
    }
    
    public LiveData<List<FavoriteEntity>> getFavoritesByType(String mediaType) {
        return favoriteDao.getFavoritesByType(mediaType);
    }
    
    // ========== CONVERT TO MODELS ==========
    
    public List<Movie> convertToMovies(List<FavoriteEntity> favorites) {
        List<Movie> movies = new ArrayList<>();
        for (FavoriteEntity fav : favorites) {
            if ("movie".equals(fav.mediaType)) {
                Movie movie = new Movie();
                movie.setId(fav.mediaId);
                movie.setTitle(fav.title);
                movie.setPosterPath(fav.posterPath);
                movies.add(movie);
            }
        }
        return movies;
    }
    
    public List<Series> convertToSeries(List<FavoriteEntity> favorites) {
        List<Series> series = new ArrayList<>();
        for (FavoriteEntity fav : favorites) {
            if ("series".equals(fav.mediaType)) {
                Series s = new Series();
                s.setId(fav.mediaId);
                s.setName(fav.title);
                s.setPosterPath(fav.posterPath);
                series.add(s);
            }
        }
        return series;
    }
}
