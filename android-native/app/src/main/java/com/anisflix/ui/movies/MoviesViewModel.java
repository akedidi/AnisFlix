package com.anisflix.ui.movies;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;
import com.anisflix.models.Movie;
import java.util.List;

public class MoviesViewModel extends androidx.lifecycle.AndroidViewModel {
    
    private final MutableLiveData<List<Movie>> movies = new MutableLiveData<>();
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private final MutableLiveData<String> error = new MutableLiveData<>();
    private int currentPage = 1;
    
    public MoviesViewModel(@androidx.annotation.NonNull android.app.Application application) {
        super(application);
        loadMovies();
    }
    
    private void loadMovies() {
        isLoading.setValue(true);
        com.anisflix.repository.MediaRepository.getInstance(getApplication()).getPopularMovies(currentPage, new retrofit2.Callback<com.anisflix.models.TMDBResponse<Movie>>() {
            @Override
            public void onResponse(retrofit2.Call<com.anisflix.models.TMDBResponse<Movie>> call, retrofit2.Response<com.anisflix.models.TMDBResponse<Movie>> response) {
                isLoading.setValue(false);
                if (response.isSuccessful() && response.body() != null) {
                    List<Movie> currentList = movies.getValue();
                    List<Movie> newMovies = response.body().getResults();
                    if (currentPage > 1 && currentList != null) {
                        currentList.addAll(newMovies);
                        movies.setValue(currentList);
                    } else {
                        movies.setValue(newMovies);
                    }
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
    
    public void loadMore() {
        currentPage++;
        loadMovies();
    }
    
    public LiveData<List<Movie>> getMovies() {
        return movies;
    }
    
    public LiveData<Boolean> getIsLoading() {
        return isLoading;
    }
    
    public LiveData<String> getError() {
        return error;
    }
}
