package com.anisflix.ui.detail;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import android.app.Application;
import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
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

public class MovieDetailViewModel extends AndroidViewModel {
    
    private final MutableLiveData<Movie> movie = new MutableLiveData<>();
    private final MutableLiveData<List<StreamingSource>> streamingSources = new MutableLiveData<>();
    private final MutableLiveData<Boolean> isFavorite = new MutableLiveData<>(false);
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private final MutableLiveData<List<Movie>> similarMovies = new MutableLiveData<>();
    private final MutableLiveData<com.anisflix.models.Video> trailer = new MutableLiveData<>();
    
    private final TMDBService tmdbService;
    private final FavoritesRepository favoritesRepository;
    
    public MovieDetailViewModel(@NonNull Application application) {
        super(application);
        tmdbService = RetrofitClient.getInstance().getTMDBService();
        favoritesRepository = FavoritesRepository.getInstance(application.getApplicationContext());
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
                            loadSimilarMovies(movieId);
                            loadTrailer(movieId);
                        }
                    }
                    
                    @Override
                    public void onFailure(Call<Movie> call, Throwable t) {
                        isLoading.setValue(false);
                    }
                });
    }

    private void loadTrailer(int movieId) {
        tmdbService.getMovieVideos(movieId, Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH)
                .enqueue(new Callback<com.anisflix.models.TMDBResponse<com.anisflix.models.Video>>() {
                    @Override
                    public void onResponse(Call<com.anisflix.models.TMDBResponse<com.anisflix.models.Video>> call, Response<com.anisflix.models.TMDBResponse<com.anisflix.models.Video>> response) {
                         if (response.isSuccessful() && response.body() != null && response.body().getResults() != null) {
                             for (com.anisflix.models.Video video : response.body().getResults()) {
                                 if ("Trailer".equals(video.getType()) && "YouTube".equals(video.getSite())) {
                                     trailer.setValue(video);
                                     break; 
                                 }
                             }
                         }
                    }

                    @Override
                    public void onFailure(Call<com.anisflix.models.TMDBResponse<com.anisflix.models.Video>> call, Throwable t) {
                        // Ignore errors
                    }
                });
    }
    
    // ...
    
    public LiveData<com.anisflix.models.Video> getTrailer() { return trailer; }
    
    public LiveData<List<Movie>> getSimilarMovies() {
        return similarMovies;
    }
    private void checkFavoriteStatus(int movieId) {
        // Check if in favorites (Must be done on background thread)
        new Thread(() -> {
            boolean isFav = favoritesRepository.isFavoriteSync(movieId);
            isFavorite.postValue(isFav);
        }).start();
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

    private void loadSimilarMovies(int movieId) {
        tmdbService.getSimilarMovies(movieId, Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, 1)
            .enqueue(new Callback<com.anisflix.models.TMDBResponse<Movie>>() {
                @Override
                public void onResponse(Call<com.anisflix.models.TMDBResponse<Movie>> call, Response<com.anisflix.models.TMDBResponse<Movie>> response) {
                    if (response.isSuccessful() && response.body() != null) {
                        similarMovies.setValue(response.body().getResults());
                    }
                }

                @Override
                public void onFailure(Call<com.anisflix.models.TMDBResponse<Movie>> call, Throwable t) {
                    similarMovies.setValue(new ArrayList<>());
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
