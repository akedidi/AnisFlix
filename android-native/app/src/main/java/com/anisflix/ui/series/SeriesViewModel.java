package com.anisflix.ui.series;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;
import com.anisflix.models.Series;
import java.util.List;

public class SeriesViewModel extends androidx.lifecycle.AndroidViewModel {
    
    private final MutableLiveData<List<Series>> series = new MutableLiveData<>();
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private int currentPage = 1;
    
    public SeriesViewModel(@androidx.annotation.NonNull android.app.Application application) {
        super(application);
        loadSeries();
    }
    
    private void loadSeries() {
        isLoading.setValue(true);
        com.anisflix.repository.MediaRepository.getInstance(getApplication()).getPopularSeries(currentPage, new retrofit2.Callback<com.anisflix.models.TMDBResponse<Series>>() {
            @Override
            public void onResponse(retrofit2.Call<com.anisflix.models.TMDBResponse<Series>> call, retrofit2.Response<com.anisflix.models.TMDBResponse<Series>> response) {
                isLoading.setValue(false);
                if (response.isSuccessful() && response.body() != null) {
                    List<Series> currentList = series.getValue();
                    List<Series> newSeries = response.body().getResults();
                    if (currentPage > 1 && currentList != null) {
                        currentList.addAll(newSeries);
                        series.setValue(currentList);
                    } else {
                        series.setValue(newSeries);
                    }
                }
            }

            @Override
            public void onFailure(retrofit2.Call<com.anisflix.models.TMDBResponse<Series>> call, Throwable t) {
                isLoading.setValue(false);
            }
        });
    }
    
    public LiveData<List<Series>> getSeries() {
        return series;
    }
    
    public LiveData<Boolean> getIsLoading() {
        return isLoading;
    }
}
