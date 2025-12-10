package com.anisflix.ui.tv;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;
import com.anisflix.api.RetrofitClient;
import com.anisflix.api.TVService;
import com.anisflix.models.TVChannel;
import com.anisflix.models.TVResponse;
import com.anisflix.models.TVSection;
import com.anisflix.models.TVCategory;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import java.util.ArrayList;
import java.util.List;

public class TVChannelsViewModel extends ViewModel {
    
    private final MutableLiveData<List<TVSection>> sections = new MutableLiveData<>();
    private final MutableLiveData<List<TVCategory>> categories = new MutableLiveData<>();
    private final MutableLiveData<List<TVChannel>> channels = new MutableLiveData<>();
    
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private final MutableLiveData<String> error = new MutableLiveData<>();
    
    private TVService tvService;
    private TVResponse fullData;
    private TVSection currentSection;
    private TVCategory currentCategory;
    private String currentSearchQuery = "";
    
    public TVChannelsViewModel() {
        tvService = RetrofitClient.getInstance().getTVService();
        loadChannels();
    }
    
    private void loadChannels() {
        isLoading.setValue(true);
        error.setValue(null);
        tvService.getTVChannels().enqueue(new Callback<TVResponse>() {
            @Override
            public void onResponse(Call<TVResponse> call, Response<TVResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    fullData = response.body();
                    
                    if (fullData.getSections() != null && !fullData.getSections().isEmpty()) {
                        processAllLinks(fullData);
                        sections.setValue(fullData.getSections());
                        // Select first section by default
                        selectSection(fullData.getSections().get(0));
                    } else {
                        error.setValue("Aucune section trouvée");
                    }
                } else {
                    error.setValue("Erreur API: " + response.code());
                }
                isLoading.setValue(false);
            }
            
            @Override
            public void onFailure(Call<TVResponse> call, Throwable t) {
                error.setValue("Erreur réseau: " + t.getMessage());
                isLoading.setValue(false);
            }
        });
    }
    
    public void selectSection(TVSection section) {
        this.currentSection = section;
        if (section.getCategories() != null && !section.getCategories().isEmpty()) {
            categories.setValue(section.getCategories());
            // Select first category by default will be handled by UI or we can fire it here
            // But usually UI Adapter selects first. Let's expose method to force select
        } else {
            categories.setValue(new ArrayList<>());
            channels.setValue(new ArrayList<>());
        }
    }
    
    public void selectCategory(TVCategory category) {
        this.currentCategory = category;
        updateChannelList();
    }
    
    public void search(String query) {
        this.currentSearchQuery = query;
        updateChannelList();
    }
    
    private void updateChannelList() {
        if (currentSearchQuery != null && !currentSearchQuery.isEmpty()) {
            // Global search
             List<TVChannel> matches = new ArrayList<>();
             if (fullData != null && fullData.getSections() != null) {
                 for (TVSection s : fullData.getSections()) {
                     if (s.getCategories() != null) {
                         for (TVCategory c : s.getCategories()) {
                             if (c.getChannels() != null) {
                                 for (TVChannel ch : c.getChannels()) {
                                     if (ch.getName().toLowerCase().contains(currentSearchQuery.toLowerCase())) {
                                         matches.add(ch);
                                     }
                                 }
                             }
                         }
                     }
                 }
             }
             channels.setValue(matches);
        } else {
            // Show category channels
            if (currentCategory != null && currentCategory.getChannels() != null) {
                channels.setValue(currentCategory.getChannels());
            } else {
                channels.setValue(new ArrayList<>());
            }
        }
    }
    
    private void processAllLinks(TVResponse data) {
         if (data.getSections() != null) {
            for (TVSection s : data.getSections()) {
                if (s.getCategories() != null) {
                    for (TVCategory c : s.getCategories()) {
                        if (c.getChannels() != null) {
                            for (TVChannel ch : c.getChannels()) {
                                processChannelLinks(ch);
                            }
                        }
                    }
                }
            }
         }
    }
    
    private void processChannelLinks(TVChannel channel) {
        if (channel.getLinks() != null) {
            List<TVChannel.TVChannelLink> hlsLinks = new ArrayList<>();
            for (TVChannel.TVChannelLink link : channel.getLinks()) {
                if ("hls_direct".equals(link.getType()) || "hls".equals(link.getType())) {
                    hlsLinks.add(link);
                }
            }
            channel.setLinks(hlsLinks);
        }
    }
    
    public LiveData<List<TVSection>> getSections() { return sections; }
    public LiveData<List<TVCategory>> getCategories() { return categories; }
    public LiveData<List<TVChannel>> getChannels() { return channels; }
    public LiveData<Boolean> getIsLoading() { return isLoading; }
    public LiveData<String> getError() { return error; }
}
