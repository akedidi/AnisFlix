package com.anisflix.ui.detail;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;
import com.anisflix.api.RetrofitClient;
import com.anisflix.api.TMDBService;
import com.anisflix.models.Series;
import com.anisflix.models.Episode;
import com.anisflix.models.StreamingSource;
import com.anisflix.services.StreamingServiceManager;
import com.anisflix.utils.Constants;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import java.util.List;
import java.util.ArrayList;

public class SeriesDetailViewModel extends ViewModel {
    
    private final MutableLiveData<Series> series = new MutableLiveData<>();
    private final MutableLiveData<List<Episode>> episodes = new MutableLiveData<>();
    private final MutableLiveData<List<StreamingSource>> streamingSources = new MutableLiveData<>();
    private final MutableLiveData<Integer> selectedSeason = new MutableLiveData<>(1);
    private final MutableLiveData<Integer> selectedEpisode = new MutableLiveData<>(1);
    private final MutableLiveData<Boolean> isFavorite = new MutableLiveData<>(false);
    
    private final TMDBService tmdbService;
    
    public SeriesDetailViewModel() {
        tmdbService = RetrofitClient.getInstance().getTMDBService();
    }
    
    public void loadSeries(int seriesId) {
        tmdbService.getSeriesDetails(seriesId, Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH)
                .enqueue(new Callback<Series>() {
                    @Override
                    public void onResponse(Call<Series> call, Response<Series> response) {
                        if (response.isSuccessful() && response.body() != null) {
                            series.setValue(response.body());
                            loadEpisodes(seriesId, 1, 1);
                        }
                    }
                    
                    @Override
                    public void onFailure(Call<Series> call, Throwable t) {
                        // Handle error
                    }
                });
    }
    
    public void loadEpisodes(int seriesId, int seasonNumber, int episodeNumber) {
        selectedSeason.setValue(seasonNumber);
        selectedEpisode.setValue(episodeNumber);
        
        // Load streaming sources for this episode
        StreamingServiceManager.getInstance().fetchSeriesSources(seriesId, seasonNumber, episodeNumber,
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
        isFavorite.setValue(!Boolean.TRUE.equals(isFavorite.getValue()));
    }
    
    public LiveData<Series> getSeries() {
        return series;
    }
    
    public LiveData<List<Episode>> getEpisodes() {
        return episodes;
    }
    
    public LiveData<Integer> getSelectedSeason() {
        return selectedSeason;
    }
    
    public LiveData<Boolean> getIsFavorite() {
        return isFavorite;
    }
}
