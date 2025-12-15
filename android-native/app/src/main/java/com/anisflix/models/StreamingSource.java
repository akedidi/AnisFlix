package com.anisflix.models;

import com.google.gson.annotations.SerializedName;

public class StreamingSource {
    @SerializedName("source")
    private String source;
    
    @SerializedName("url")
    private String url;
    
    @SerializedName("type")
    private String type; // "hls", "mp4", etc.
    
    @SerializedName("quality")
    private String quality; // "1080p", "720p", "auto"

    @SerializedName("provider")
    private String provider;

    @SerializedName("language")
    private String language; // "VO", "VF", "VOSTFR"
    
    @SerializedName("subtitles")
    private Subtitle[] subtitles;
    
    // Constructors
    public StreamingSource() {}
    
    public StreamingSource(String source, String url) {
        this.source = source;
        this.url = url;
    }
    
    // Getters
    public String getSource() { return source; }
    public String getUrl() { return url; }
    public String getType() { return type; }
    public String getQuality() { return quality; }
    public String getProvider() { return provider; }
    public String getLanguage() { return language; }
    public Subtitle[] getSubtitles() { return subtitles; }
    
    // Setters
    public void setSource(String source) { this.source = source; }
    public void setUrl(String url) { this.url = url; }
    public void setType(String type) { this.type = type; }
    public void setQuality(String quality) { this.quality = quality; }
    public void setProvider(String provider) { this.provider = provider; }
    public void setLanguage(String language) { this.language = language; }
    public void setSubtitles(Subtitle[] subtitles) { this.subtitles = subtitles; }
    
    @SerializedName("name")
    private String name;

    // ... existing fields ...

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    // Subtitle class
    public static class Subtitle {
        @SerializedName("lang")
        private String lang;
        
        @SerializedName("url")
        private String url;
        
        public Subtitle() {}
        
        public String getLang() { return lang; }
        public String getUrl() { return url; }
        public void setLang(String lang) { this.lang = lang; }
        public void setUrl(String url) { this.url = url; }
    }
}
