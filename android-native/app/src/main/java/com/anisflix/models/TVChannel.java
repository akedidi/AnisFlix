package com.anisflix.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class TVChannel {
    @SerializedName("id")
    private String id;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("logo")
    private String logo;
    
    @SerializedName("streamUrl")
    private String streamUrl;
    
    @SerializedName("links")
    private List<TVChannelLink> links;
    
    // Constructors
    public TVChannel() {}
    
    public TVChannel(String id, String name, String logo) {
        this.id = id;
        this.name = name;
        this.logo = logo;
    }
    
    // Getters
    public String getId() { return id; }
    public String getName() { return name; }
    public String getLogo() { return logo; }
    public String getStreamUrl() { return streamUrl; }
    public List<TVChannelLink> getLinks() { return links; }
    
    // Setters
    public void setId(String id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setLogo(String logo) { this.logo = logo; }
    public void setStreamUrl(String streamUrl) { this.streamUrl = streamUrl; }
    public void setLinks(List<TVChannelLink> links) { this.links = links; }
    
    // Inner class for channel links
    public static class TVChannelLink {
        @SerializedName("type")
        private String type;
        
        @SerializedName("url")
        private String url;
        
        public TVChannelLink() {}
        
        public String getType() { return type; }
        public String getUrl() { return url; }
        public void setType(String type) { this.type = type; }
        public void setUrl(String url) { this.url = url; }
    }
}
