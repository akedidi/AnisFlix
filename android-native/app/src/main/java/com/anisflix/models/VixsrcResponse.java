package com.anisflix.models;

import com.google.gson.annotations.SerializedName;

/**
 * Response from Vixsrc API
 */
public class VixsrcResponse {
    @SerializedName("success")
    private boolean success;
    
    @SerializedName("streams")
    private VixsrcStream[] streams;
    
    public boolean isSuccess() { return success; }
    public VixsrcStream[] getStreams() { return streams; }
    
    public static class VixsrcStream {
        @SerializedName("name")
        private String name;
        
        @SerializedName("url")
        private String url;
        
        @SerializedName("quality")
        private String quality;
        
        @SerializedName("type")
        private String type;
        
        public String getName() { return name; }
        public String getUrl() { return url; }
        public String getQuality() { return quality; }
        public String getType() { return type; }
    }
}
