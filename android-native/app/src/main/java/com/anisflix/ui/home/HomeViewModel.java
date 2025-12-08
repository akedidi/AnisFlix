package com.anisflix.ui.home;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;
import com.anisflix.models.Movie;
import com.anisflix.models.Series;
import java.util.List;

/**
 * ViewModel for HomeFragment
 */
public class HomeViewModel extends androidx.lifecycle.AndroidViewModel {
    
    private final MutableLiveData<List<Movie>> popularMovies = new MutableLiveData<>();
    private final MutableLiveData<List<Series>> popularSeries = new MutableLiveData<>();
    private final MutableLiveData<List<Movie>> latestMovies = new MutableLiveData<>();
    private final MutableLiveData<List<Series>> latestSeries = new MutableLiveData<>();
    
    // Anime
    private final MutableLiveData<List<Movie>> animeMovies = new MutableLiveData<>();
    private final MutableLiveData<List<Series>> animeSeries = new MutableLiveData<>();
    
    // Providers
    private final MutableLiveData<List<Movie>> netflixMovies = new MutableLiveData<>();
    private final MutableLiveData<List<Series>> netflixSeries = new MutableLiveData<>();
    private final MutableLiveData<List<Movie>> primeMovies = new MutableLiveData<>();
    private final MutableLiveData<List<Series>> primeSeries = new MutableLiveData<>();
    private final MutableLiveData<List<Movie>> appleMovies = new MutableLiveData<>();
    private final MutableLiveData<List<Series>> appleSeries = new MutableLiveData<>();
    private final MutableLiveData<List<Movie>> disneyMovies = new MutableLiveData<>();
    private final MutableLiveData<List<Series>> disneySeries = new MutableLiveData<>();
    private final MutableLiveData<List<Movie>> hboMovies = new MutableLiveData<>();
    private final MutableLiveData<List<Series>> hboSeries = new MutableLiveData<>();
    
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private final MutableLiveData<String> error = new MutableLiveData<>();
    
    public HomeViewModel(@androidx.annotation.NonNull android.app.Application application) {
        super(application);
        loadData();
    }
    
    private void loadData() {
        isLoading.setValue(true);
        com.anisflix.repository.MediaRepository repo = com.anisflix.repository.MediaRepository.getInstance(getApplication());
        
        // Helper to handle responses
        retrofit2.Callback<com.anisflix.models.TMDBResponse<Movie>> movieCallback = new retrofit2.Callback<com.anisflix.models.TMDBResponse<Movie>>() {
            @Override
            public void onResponse(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, retrofit2.Response<com.anisflix.models.TMDBResponse<Movie>> response) {
                // Handled in specific callbacks
            }
            @Override public void onFailure(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, Throwable t) { error.setValue(t.getMessage()); }
        };

        // 1. Popular & Latest
        repo.getPopularMovies(1, createMovieCallback(popularMovies));
        repo.getPopularSeries(1, createSeriesCallback(popularSeries));
        repo.getLatestMovies(1, createMovieCallback(latestMovies));
        repo.getLatestSeries(1, createSeriesCallback(latestSeries));
        
        // 2. Anime (Genre 16)
        repo.getMoviesByGenre(16, 1, createMovieCallback(animeMovies));
        repo.getSeriesByGenre(16, 1, createSeriesCallback(animeSeries));
        
        // 3. Providers
        // Netflix (8)
        repo.getMoviesByProvider(8, 1, createMovieCallback(netflixMovies));
        repo.getSeriesByProvider(8, 1, createSeriesCallback(netflixSeries));
        // Prime (9)
        repo.getMoviesByProvider(9, 1, createMovieCallback(primeMovies));
        repo.getSeriesByProvider(9, 1, createSeriesCallback(primeSeries));
        // Apple (350)
        repo.getMoviesByProvider(350, 1, createMovieCallback(appleMovies));
        repo.getSeriesByProvider(350, 1, createSeriesCallback(appleSeries));
        // Disney (337)
        repo.getMoviesByProvider(337, 1, createMovieCallback(disneyMovies));
        repo.getSeriesByProvider(337, 1, createSeriesCallback(disneySeries));
        // HBO Max (384)
        repo.getMoviesByProvider(384, 1, createMovieCallback(hboMovies));
        repo.getSeriesByProvider(384, 1, createSeriesCallback(hboSeries));
        
        isLoading.setValue(false);
    }
    
    private retrofit2.Callback<com.anisflix.models.TMDBResponse<Movie>> createMovieCallback(MutableLiveData<List<Movie>> target) {
        return new retrofit2.Callback<com.anisflix.models.TMDBResponse<Movie>>() {
            @Override
            public void onResponse(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, retrofit2.Response<com.anisflix.models.TMDBResponse<Movie>> response) {
                if (response.isSuccessful() && response.body() != null) target.postValue(response.body().getResults());
            }
            @Override public void onFailure(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, Throwable t) { error.postValue(t.getMessage()); }
        };
    }

    private retrofit2.Callback<com.anisflix.models.TMDBResponse<Series>> createSeriesCallback(MutableLiveData<List<Series>> target) {
        return new retrofit2.Callback<com.anisflix.models.TMDBResponse<Series>>() {
            @Override
            public void onResponse(retrofit2.Call<com.anisflix.models.TMDBResponse<Series>> call, retrofit2.Response<com.anisflix.models.TMDBResponse<Series>> response) {
                if (response.isSuccessful() && response.body() != null) target.postValue(response.body().getResults());
            }
            @Override public void onFailure(retrofit2.Call<com.anisflix.models.TMDBResponse<Series>> call, Throwable t) { error.postValue(t.getMessage()); }
        };
    }
    
    // Getters
    public LiveData<List<Movie>> getPopularMovies() { return popularMovies; }
    public LiveData<List<Series>> getPopularSeries() { return popularSeries; }
    public LiveData<List<Movie>> getLatestMovies() { return latestMovies; }
    public LiveData<List<Series>> getLatestSeries() { return latestSeries; }
    public LiveData<List<Movie>> getAnimeMovies() { return animeMovies; }
    public LiveData<List<Series>> getAnimeSeries() { return animeSeries; }
    public LiveData<List<Movie>> getNetflixMovies() { return netflixMovies; }
    public LiveData<List<Series>> getNetflixSeries() { return netflixSeries; }
    public LiveData<List<Movie>> getPrimeMovies() { return primeMovies; }
    public LiveData<List<Series>> getPrimeSeries() { return primeSeries; }
    public LiveData<List<Movie>> getAppleMovies() { return appleMovies; }
    public LiveData<List<Series>> getAppleSeries() { return appleSeries; }
    public LiveData<List<Movie>> getDisneyMovies() { return disneyMovies; }
    public LiveData<List<Series>> getDisneySeries() { return disneySeries; }
    public LiveData<List<Movie>> getHboMovies() { return hboMovies; }
    public LiveData<List<Series>> getHboSeries() { return hboSeries; }
    
    public LiveData<Boolean> getIsLoading() { return isLoading; }
    public LiveData<String> getError() { return error; }
}
