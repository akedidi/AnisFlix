package com.anisflix.models;

import com.google.gson.annotations.SerializedName;

public class VidzyExtractionRequest {
    @SerializedName("url")
    private String url;

    public VidzyExtractionRequest(String url) {
        this.url = url;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
}
