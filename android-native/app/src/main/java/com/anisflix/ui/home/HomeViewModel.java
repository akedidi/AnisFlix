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
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private final MutableLiveData<String> error = new MutableLiveData<>();
    
    public HomeViewModel(@androidx.annotation.NonNull android.app.Application application) {
        super(application);
        loadData();
    }
    
    private void loadData() {
        isLoading.setValue(true);
        com.anisflix.repository.MediaRepository.getInstance(getApplication()).getPopularMovies(1, new retrofit2.Callback<com.anisflix.models.TMDBResponse<Movie>>() {
            @Override
            public void onResponse(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, retrofit2.Response<com.anisflix.models.TMDBResponse<Movie>> response) {
                isLoading.setValue(false);
                if (response.isSuccessful() && response.body() != null) {
                    popularMovies.setValue(response.body().getResults());
                } else {
                    error.setValue("Error: " + response.code());
                }
            }

            @Override
            public void onFailure(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, Throwable t) {
                isLoading.setValue(false);
                error.setValue(t.getMessage());
            }
        });
    }
    
    // Getters
    public LiveData<List<Movie>> getPopularMovies() {
        return popularMovies;
    }
    
    public LiveData<List<Series>> getPopularSeries() {
        return popularSeries;
    }
    
    public LiveData<Boolean> getIsLoading() {
        return isLoading;
    }
    
    public LiveData<String> getError() {
        return error;
    }
}
