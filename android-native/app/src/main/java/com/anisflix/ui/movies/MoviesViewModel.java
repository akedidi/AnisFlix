package com.anisflix.ui.movies;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;
import com.anisflix.models.Movie;
import java.util.List;

public class MoviesViewModel extends androidx.lifecycle.AndroidViewModel {
    
    private final MutableLiveData<List<Movie>> popularMovies = new MutableLiveData<>();
    private final MutableLiveData<List<Movie>> nowPlayingMovies = new MutableLiveData<>();
    private final MutableLiveData<List<Movie>> topRatedMovies = new MutableLiveData<>();
    private final MutableLiveData<List<Movie>> upcomingMovies = new MutableLiveData<>();
    private final MutableLiveData<List<Movie>> trendingMovies = new MutableLiveData<>();
    
    // Loading states for each section could be separate, but for simplicity using one global or just checking nulls.
    // Let's use a general loading state for initial load.
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private final MutableLiveData<String> error = new MutableLiveData<>();
    
    public MoviesViewModel(@androidx.annotation.NonNull android.app.Application application) {
        super(application);
        loadAllData();
    }
    
    private void loadAllData() {
        isLoading.setValue(true);
        com.anisflix.repository.MediaRepository repo = com.anisflix.repository.MediaRepository.getInstance(getApplication());
        
        // 1. Popular
        repo.getPopularMovies(1, new retrofit2.Callback<com.anisflix.models.TMDBResponse<Movie>>() {
            @Override public void onResponse(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, retrofit2.Response<com.anisflix.models.TMDBResponse<Movie>> response) {
                if (response.isSuccessful() && response.body() != null) popularMovies.setValue(response.body().getResults());
            }
            @Override public void onFailure(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, Throwable t) { error.setValue(t.getMessage()); }
        });
        
        // 2. Now Playing
        repo.getLatestMovies(1, new retrofit2.Callback<com.anisflix.models.TMDBResponse<Movie>>() {
            @Override public void onResponse(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, retrofit2.Response<com.anisflix.models.TMDBResponse<Movie>> response) {
                if (response.isSuccessful() && response.body() != null) nowPlayingMovies.setValue(response.body().getResults());
            }
            @Override public void onFailure(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, Throwable t) {}
        });
        
        // 3. Top Rated
        repo.getTopRatedMovies(1, new retrofit2.Callback<com.anisflix.models.TMDBResponse<Movie>>() {
            @Override public void onResponse(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, retrofit2.Response<com.anisflix.models.TMDBResponse<Movie>> response) {
                if (response.isSuccessful() && response.body() != null) topRatedMovies.setValue(response.body().getResults());
            }
            @Override public void onFailure(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, Throwable t) {}
        });

        // 4. Upcoming
        repo.getUpcomingMovies(1, new retrofit2.Callback<com.anisflix.models.TMDBResponse<Movie>>() {
            @Override public void onResponse(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, retrofit2.Response<com.anisflix.models.TMDBResponse<Movie>> response) {
                if (response.isSuccessful() && response.body() != null) upcomingMovies.setValue(response.body().getResults());
            }
            @Override public void onFailure(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, Throwable t) {}
        });

        // 5. Trending
        repo.getTrendingMovies(1, new retrofit2.Callback<com.anisflix.models.TMDBResponse<Movie>>() {
            @Override public void onResponse(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, retrofit2.Response<com.anisflix.models.TMDBResponse<Movie>> response) {
                if (response.isSuccessful() && response.body() != null) trendingMovies.setValue(response.body().getResults());
                isLoading.setValue(false); // Assume last one finishes loading state roughly
            }
            @Override public void onFailure(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, Throwable t) { isLoading.setValue(false); }
        });
    }
    
    public LiveData<List<Movie>> getPopularMovies() { return popularMovies; }
    public LiveData<List<Movie>> getNowPlayingMovies() { return nowPlayingMovies; }
    public LiveData<List<Movie>> getTopRatedMovies() { return topRatedMovies; }
    public LiveData<List<Movie>> getUpcomingMovies() { return upcomingMovies; }
    public LiveData<List<Movie>> getTrendingMovies() { return trendingMovies; }
    
    public LiveData<Boolean> getIsLoading() { return isLoading; }
    public LiveData<String> getError() { return error; }
}
