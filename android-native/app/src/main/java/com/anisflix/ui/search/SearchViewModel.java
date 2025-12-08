package com.anisflix.ui.search;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;
import com.anisflix.api.RetrofitClient;
import com.anisflix.api.TMDBService;
import com.anisflix.models.Movie;
import com.anisflix.models.TMDBResponse;
import com.anisflix.utils.Constants;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import java.util.ArrayList;
import java.util.List;

/**
 * Search ViewModel with TMDB search API
 */
public class SearchViewModel extends ViewModel {
    
    private final MutableLiveData<List<Movie>> searchResults = new MutableLiveData<>();
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    
    private final TMDBService tmdbService;
    
    public SearchViewModel() {
        tmdbService = RetrofitClient.getInstance().getTMDBService();
    }
    
    public void search(String query) {
        isLoading.setValue(true);
        
        tmdbService.searchMulti(Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, query, 1)
                .enqueue(new Callback<TMDBResponse<com.anisflix.models.MultiSearchItem>>() {
                    @Override
                    public void onResponse(Call<TMDBResponse<com.anisflix.models.MultiSearchItem>> call, Response<TMDBResponse<com.anisflix.models.MultiSearchItem>> response) {
                        isLoading.setValue(false);
                        if (response.isSuccessful() && response.body() != null) {
                            List<com.anisflix.models.MultiSearchItem> items = response.body().getResults();
                            List<Movie> movies = new ArrayList<>();
                            if (items != null) {
                                for (com.anisflix.models.MultiSearchItem item : items) {
                                    if ("movie".equals(item.mediaType)) {
                                        Movie movie = new Movie();
                                        movie.setId(item.id);
                                        movie.setTitle(item.title);
                                        movie.setPosterPath(item.posterPath);
                                        movie.setBackdropPath(item.backdropPath);
                                        movie.setOverview(item.overview);
                                        movie.setReleaseDate(item.releaseDate);
                                        movie.setRating(item.voteAverage);
                                        movies.add(movie);
                                    }
                                }
                            }
                            searchResults.setValue(movies);
                        }
                    }
                    
                    @Override
                    public void onFailure(Call<TMDBResponse<com.anisflix.models.MultiSearchItem>> call, Throwable t) {
                        isLoading.setValue(false);
                        searchResults.setValue(new ArrayList<>());
                    }
                });
    }
    
    public void clearResults() {
        searchResults.setValue(new ArrayList<>());
    }
    
    public LiveData<List<Movie>> getSearchResults() {
        return searchResults;
    }
    
    public LiveData<Boolean> getIsLoading() {
        return isLoading;
    }
}
