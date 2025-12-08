package com.anisflix.models;

import com.google.gson.annotations.SerializedName;

/**
 * Request/Response for VidMoly extraction
 */
public class VidMolyExtractionResponse {
    @SerializedName("success")
    private boolean success;
    
    @SerializedName("m3u8Url")
    private String m3u8Url;
    
    @SerializedName("method")
    private String method;
    
    public boolean isSuccess() { return success; }
    public String getM3u8Url() { return m3u8Url; }
    public String getMethod() { return method; }
}


