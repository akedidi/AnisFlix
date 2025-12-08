package com.anisflix.models;

import com.google.gson.annotations.SerializedName;

public class VidMolyExtractionRequest {
    @SerializedName("url")
    private String url;
    
    @SerializedName("method")
    private String method;

    public VidMolyExtractionRequest(String url, String method) {
        this.url = url;
        this.method = method;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
    
    public String getMethod() {
        return method;
    }
    
    public void setMethod(String method) {
        this.method = method;
    }
}
