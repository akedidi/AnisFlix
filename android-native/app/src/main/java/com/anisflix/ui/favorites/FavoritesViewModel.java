package com.anisflix.ui.favorites;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.Transformations;
import androidx.lifecycle.ViewModel;
import android.content.Context;
import com.anisflix.database.FavoriteEntity;
import com.anisflix.models.Movie;
import com.anisflix.models.Series;
import com.anisflix.repository.FavoritesRepository;
import java.util.List;

/**
 * Favorites ViewModel with Room integration
 */
public class FavoritesViewModel extends ViewModel {
    
    private final FavoritesRepository repository;
    private final LiveData<List<FavoriteEntity>> allFavorites;
    private final LiveData<List<Movie>> favoriteMovies;
    private final LiveData<List<Series>> favoriteSeries;
    
    public FavoritesViewModel(Context context) {
        repository = FavoritesRepository.getInstance(context);
        allFavorites = repository.getAllFavorites();
        
        // Transform favorites to movies/series
        favoriteMovies = Transformations.map(allFavorites, favorites -> {
            return repository.convertToMovies(favorites);
        });
        
        favoriteSeries = Transformations.map(allFavorites, favorites -> {
            return repository.convertToSeries(favorites);
        });
    }
    
    public void toggleFavorite(int mediaId, String mediaType, String title, String posterPath) {
        repository.toggleFavorite(mediaId, mediaType, title, posterPath);
    }
    
    public LiveData<Boolean> isFavorite(int mediaId) {
        return repository.isFavorite(mediaId);
    }
    
    public LiveData<List<Movie>> getFavoriteMovies() {
        return favoriteMovies;
    }
    
    public LiveData<List<Series>> getFavoriteSeries() {
        return favoriteSeries;
    }
    
    public LiveData<List<FavoriteEntity>> getAllFavorites() {
        return allFavorites;
    }
}
