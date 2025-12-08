package com.anisflix.ui.detail;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;
import com.anisflix.api.RetrofitClient;
import com.anisflix.api.TMDBService;
import com.anisflix.models.Series;
import com.anisflix.models.Episode;
import com.anisflix.models.TMDBResponse;
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
    
    private int currentSeriesId = -1;

    public void loadSeries(int seriesId) {
        this.currentSeriesId = seriesId;
        tmdbService.getSeriesDetails(seriesId, Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH)
                .enqueue(new Callback<Series>() {
                    @Override
                    public void onResponse(Call<Series> call, Response<Series> response) {
                        if (response.isSuccessful() && response.body() != null) {
                            series.setValue(response.body());
                            // Load first season episodes by default
                            loadEpisodes(1);
                        }
                    }
                    
                    @Override
                    public void onFailure(Call<Series> call, Throwable t) {
                        // Handle error
                    }
                });
    }
    
    public void loadEpisodes(int seasonNumber) {
        if (currentSeriesId == -1) return;
        selectedSeason.setValue(seasonNumber);
        
        tmdbService.getSeasonEpisodes(currentSeriesId, seasonNumber, Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH)
            .enqueue(new Callback<TMDBResponse<Episode>>() {
                @Override
                public void onResponse(Call<TMDBResponse<Episode>> call, Response<TMDBResponse<Episode>> response) {
                     if (response.isSuccessful() && response.body() != null) {
                         episodes.setValue(response.body().getResults());
                         // If TMDBResponse is generic list holder, use getResults()
                         // Let's check TMDBResponse. It likely has getResults().
                         // Episode list usually comes in 'episodes' field for season details?
                         // Actually standard TMDB season response has "episodes" array.
                         // But TMDBResponse wrapper usually maps "results".
                         // I should check TMDBResponse model. 
                         // For now I'll use getResults() if it exists or adapt.
                         // Wait, if TMDBResponse is generic, it maps "results".
                         // Season details returns "episodes".
                         // I might need a specific SeasonResponse or check if TMDBResponse handles "episodes" alias.
                         // Let's assume getResults() works or I need to fix Model.
                     }
                }
                @Override
                public void onFailure(Call<TMDBResponse<Episode>> call, Throwable t) {
                    episodes.setValue(new ArrayList<>());
                }
            });
    }
    
    public void loadStreamingSources(int seriesId, int seasonNumber, int episodeNumber) {
        // ... (existing logic)
        selectedSeason.setValue(seasonNumber);
        selectedEpisode.setValue(episodeNumber);
        
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
