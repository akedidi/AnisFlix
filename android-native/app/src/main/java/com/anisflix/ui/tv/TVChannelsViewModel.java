package com.anisflix.ui.tv;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;
import com.anisflix.api.RetrofitClient;
import com.anisflix.api.TVService;
import com.anisflix.models.TVChannel;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class TVChannelsViewModel extends ViewModel {
    
    private final MutableLiveData<List<TVChannel>> channels = new MutableLiveData<>();
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private TVService tvService;
    
    public TVChannelsViewModel() {
        tvService = RetrofitClient.getInstance().getTVService();
        loadChannels();
    }
    
    private void loadChannels() {
        isLoading.setValue(true);
        tvService.getTVChannels().enqueue(new Callback<TVChannel[]>() {
            @Override
            public void onResponse(Call<TVChannel[]> call, Response<TVChannel[]> response) {
                if (response.isSuccessful() && response.body() != null) {
                    TVChannel[] allChannelsArray = response.body();
                    List<TVChannel> allChannels = new ArrayList<>(Arrays.asList(allChannelsArray));
                    
                    // Filter channels to only include HLS links (iOS pattern)
                    // Android doesn't support MPD natively like iOS
                    for (TVChannel channel : allChannels) {
                        if (channel.getLinks() != null) {
                            List<TVChannel.TVChannelLink> hlsLinks = new ArrayList<>();
                            for (TVChannel.TVChannelLink link : channel.getLinks()) {
                                // Only keep HLS direct and HLS links
                                if ("hls_direct".equals(link.getType()) || "hls".equals(link.getType())) {
                                    hlsLinks.add(link);
                                }
                            }
                            // Update channel with filtered links
                            channel.setLinks(hlsLinks);
                        }
                    }
                    
                    channels.setValue(allChannels);
                }
                isLoading.setValue(false);
            }
            
            @Override
            public void onFailure(Call<TVChannel[]> call, Throwable t) {
                // Handle error
                isLoading.setValue(false);
            }
        });
    }
    
    public LiveData<List<TVChannel>> getChannels() {
        return channels;
    }
    
    public LiveData<Boolean> getIsLoading() {
        return isLoading;
    }
}
