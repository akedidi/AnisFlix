package com.anisflix.ui.series;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;
import com.anisflix.models.Series;
import com.anisflix.models.TMDBResponse;
import com.anisflix.repository.MediaRepository;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class SeriesViewModel extends androidx.lifecycle.AndroidViewModel {
    
    private final MutableLiveData<List<Series>> airingTodaySeries = new MutableLiveData<>();
    private final MutableLiveData<List<Series>> trendingSeries = new MutableLiveData<>();
    private final MutableLiveData<List<Series>> topRatedSeries = new MutableLiveData<>();
    private final MutableLiveData<List<Series>> popularSeries = new MutableLiveData<>();
    
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private final MutableLiveData<String> error = new MutableLiveData<>();
    
    public SeriesViewModel(@androidx.annotation.NonNull android.app.Application application) {
        super(application);
        loadAllData();
    }
    
    private void loadAllData() {
        isLoading.setValue(true);
        MediaRepository repo = MediaRepository.getInstance(getApplication());
        
        // 1. Airing Today
        repo.getAiringTodaySeries(1, new Callback<TMDBResponse<Series>>() {
            @Override public void onResponse(Call<TMDBResponse<Series>> call, Response<TMDBResponse<Series>> response) {
                if (response.isSuccessful() && response.body() != null) airingTodaySeries.setValue(response.body().getResults());
            }
            @Override public void onFailure(Call<TMDBResponse<Series>> call, Throwable t) {}
        });

        // 2. Trending
        repo.getTrendingSeries(1, new Callback<TMDBResponse<Series>>() {
            @Override public void onResponse(Call<TMDBResponse<Series>> call, Response<TMDBResponse<Series>> response) {
                if (response.isSuccessful() && response.body() != null) trendingSeries.setValue(response.body().getResults());
            }
            @Override public void onFailure(Call<TMDBResponse<Series>> call, Throwable t) {}
        });

        // 3. Top Rated
        repo.getTopRatedSeries(1, new Callback<TMDBResponse<Series>>() {
            @Override public void onResponse(Call<TMDBResponse<Series>> call, Response<TMDBResponse<Series>> response) {
                if (response.isSuccessful() && response.body() != null) topRatedSeries.setValue(response.body().getResults());
            }
            @Override public void onFailure(Call<TMDBResponse<Series>> call, Throwable t) {}
        });

        // 4. Popular
        repo.getPopularSeries(1, new Callback<TMDBResponse<Series>>() {
            @Override public void onResponse(Call<TMDBResponse<Series>> call, Response<TMDBResponse<Series>> response) {
                if (response.isSuccessful() && response.body() != null) popularSeries.setValue(response.body().getResults());
                isLoading.setValue(false);
            }
            @Override public void onFailure(Call<TMDBResponse<Series>> call, Throwable t) { isLoading.setValue(false); }
        });
    }
    
    public LiveData<List<Series>> getAiringTodaySeries() { return airingTodaySeries; }
    public LiveData<List<Series>> getTrendingSeries() { return trendingSeries; }
    public LiveData<List<Series>> getTopRatedSeries() { return topRatedSeries; }
    public LiveData<List<Series>> getPopularSeries() { return popularSeries; }
    
    public LiveData<Boolean> getIsLoading() { return isLoading; }
    public LiveData<String> getError() { return error; }
}
