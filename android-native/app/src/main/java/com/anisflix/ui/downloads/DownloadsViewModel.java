package com.anisflix.ui.downloads;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;
import java.util.List;

public class DownloadsViewModel extends ViewModel {
    
    private final MutableLiveData<List<String>> downloads = new MutableLiveData<>();
    
    public DownloadsViewModel() {
        loadDownloads();
    }
    
    private void loadDownloads() {
        // TODO: Load from local storage
    }
    
    public LiveData<List<String>> getDownloads() {
        return downloads;
    }
}
