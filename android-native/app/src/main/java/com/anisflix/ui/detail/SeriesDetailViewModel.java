package com.anisflix.ui.detail;

import android.app.Application;
import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import com.anisflix.api.RetrofitClient;
import com.anisflix.api.TMDBService;
import com.anisflix.models.Series;
import com.anisflix.models.Episode;
import com.anisflix.models.TMDBResponse;
import com.anisflix.models.StreamingSource;
import com.anisflix.services.StreamingServiceManager;
import com.anisflix.repository.FavoritesRepository;
import com.anisflix.utils.Constants;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import java.util.List;
import java.util.ArrayList;

public class SeriesDetailViewModel extends AndroidViewModel {
    
    private final   MutableLiveData<Series> series = new MutableLiveData<>();
    private final MutableLiveData<List<Episode>> episodes = new MutableLiveData<>();
    private final MutableLiveData<List<Series>> similarSeries = new MutableLiveData<>();
    private final MutableLiveData<List<StreamingSource>> streamingSources = new MutableLiveData<>();
    private final MutableLiveData<Integer> selectedSeason = new MutableLiveData<>(1);
    private final MutableLiveData<Integer> selectedEpisode = new MutableLiveData<>(1);
    private final MutableLiveData<Boolean> isFavorite = new MutableLiveData<>(false);
    
    private final TMDBService tmdbService;
    private final FavoritesRepository favoritesRepository;
    
    public SeriesDetailViewModel(@NonNull Application application) {
        super(application);
        tmdbService = RetrofitClient.getInstance().getTMDBService();
        favoritesRepository = FavoritesRepository.getInstance(application.getApplicationContext());
    }
    
    private int currentSeriesId = -1;

    public void loadSeries(int seriesId) {
        this.currentSeriesId = seriesId;
        checkFavoriteStatus(seriesId);
        loadSimilarSeries(seriesId);
        
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
    
    private void checkFavoriteStatus(int seriesId) {
        new Thread(() -> {
            boolean isFav = favoritesRepository.isFavoriteSync(seriesId);
            isFavorite.postValue(isFav);
        }).start();
    }
    
    private void loadSimilarSeries(int seriesId) {
        tmdbService.getSimilarSeries(seriesId, Constants.TMDB_API_KEY, Constants.LANGUAGE_FRENCH, 1)
            .enqueue(new Callback<TMDBResponse<Series>>() {
                @Override
                public void onResponse(Call<TMDBResponse<Series>> call, Response<TMDBResponse<Series>> response) {
                    if (response.isSuccessful() && response.body() != null) {
                        similarSeries.setValue(response.body().getResults());
                    }
                }
                
                @Override
                public void onFailure(Call<TMDBResponse<Series>> call, Throwable t) {
                   similarSeries.setValue(new ArrayList<>());
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
                         // TMDB season response usually returns episodes list in 'episodes' for season details
                         // But if using generic TMDBResponse wrapper, it might map it to results or we need to check wrapper specific logic
                         // Standard TMDBResponse uses 'results'. 
                         // If TMDBResponse maps 'episodes' to 'results' field via @SerializedName alternate, then getResults() is correct.
                         if (response.body().getResults() != null) {
                             episodes.setValue(response.body().getResults());
                         } else {
                             episodes.setValue(new ArrayList<>());
                         }
                     }
                }
                @Override
                public void onFailure(Call<TMDBResponse<Episode>> call, Throwable t) {
                    episodes.setValue(new ArrayList<>());
                }
            });
    }
    
    public void loadStreamingSources(int seriesId, int seasonNumber, int episodeNumber) {
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
        Series currentSeries = series.getValue();
        if (currentSeries != null) {
             favoritesRepository.toggleFavorite(
                currentSeries.getId(),
                "series", 
                currentSeries.getName(),
                currentSeries.getPosterPath()
            );
            
            // Toggle UI state immediately
            Boolean current = isFavorite.getValue();
            isFavorite.setValue(current != null && !current);
        }
    }
    
    public LiveData<Series> getSeries() {
        return series;
    }
    
    public LiveData<List<Episode>> getEpisodes() {
        return episodes;
    }
    
    public LiveData<List<Series>> getSimilarSeries() {
        return similarSeries;
    }
    
    public LiveData<Integer> getSelectedSeason() {
        return selectedSeason;
    }
    
    public LiveData<Boolean> getIsFavorite() {
        return isFavorite;
    }
}
