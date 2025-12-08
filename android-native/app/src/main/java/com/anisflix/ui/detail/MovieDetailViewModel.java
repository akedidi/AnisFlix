package com.anisflix.ui.detail;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;
import android.content.Context;
import com.anisflix.api.RetrofitClient;
import com.anisflix.api.TMDBService;
import com.anisflix.models.Movie;
import com.anisflix.models.StreamingSource;
import com.anisflix.services.StreamingServiceManager;
import com.anisflix.repository.FavoritesRepository;
import com.anisflix.utils.Constants;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import java.util.ArrayList;
import java.util.List;

public class MovieDetailViewModel extends ViewModel {
    
    private final MutableLiveData<Movie> movie = new MutableLiveData<>();
    private final MutableLiveData<List<StreamingSource>> streamingSources = new MutableLiveData<>();
    private final MutableLiveData<Boolean> isFavorite = new MutableLiveData<>(false);
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    
    private final TMDBService tmdbService;
    private final FavoritesRepository favoritesRepository;
    private final Context context;
    
    public MovieDetailViewModel(Context context) {
        this.context = context;
        tmdbService = RetrofitClient.getInstance().getTMDBService();
        favoritesRepository = FavoritesRepository.getInstance(context);
    }
    
    public void loadMovie(int movieId) {
        isLoading.setValue(true);
        
        // Load movie details
        tmdbService.getMovieDetails(movieId, Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH)
                .enqueue(new Callback<Movie>() {
                    @Override
                    public void onResponse(Call<Movie> call, Response<Movie> response) {
                        isLoading.setValue(false);
                        if (response.isSuccessful() && response.body() != null) {
                            movie.setValue(response.body());
                            loadStreamingSources(movieId);
                            checkFavoriteStatus(movieId);
                        }
                    }
                    
                    @Override
                    public void onFailure(Call<Movie> call, Throwable t) {
                        isLoading.setValue(false);
                    }
                });
    }
    
    private void checkFavoriteStatus(int movieId) {
        // Check if in favorites
        boolean isFav = favoritesRepository.isFavoriteSync(movieId);
        isFavorite.postValue(isFav);
    }
    
    private void loadStreamingSources(int movieId) {
        StreamingServiceManager.getInstance().fetchMovieSources(movieId, 
            new StreamingServiceManager.OnSourcesLoadedListener() {
                @Override
                public void onSourcesLoaded(List<StreamingSource> sources) {
                    streamingSources.postValue(sources);
                }
                
                @Override
                public void onError(String error) {
                    streamingSources.postValue(new ArrayList<>());
                }
            });
    }
    
    public void toggleFavorite() {
        Movie currentMovie = movie.getValue();
        if (currentMovie != null) {
            favoritesRepository.toggleFavorite(
                currentMovie.getId(),
                "movie",
                currentMovie.getTitle(),
                currentMovie.getPosterPath()
            );
            // Toggle UI state immediately
            Boolean current = isFavorite.getValue();
            isFavorite.setValue(current != null && !current);
        }
    }
    
    public LiveData<Movie> getMovie() {
        return movie;
    }
    
    public LiveData<List<StreamingSource>> getStreamingSources() {
        return streamingSources;
    }
    
    public LiveData<Boolean> getIsFavorite() {
        return isFavorite;
    }
    
    public LiveData<Boolean> getIsLoading() {
        return isLoading;
    }
}
