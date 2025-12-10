package com.anisflix.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class TVCategory {
    @SerializedName("id")
    private String id;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("channels")
    private List<TVChannel> channels;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public List<TVChannel> getChannels() { return channels; }
    public void setChannels(List<TVChannel> channels) { this.channels = channels; }
}
