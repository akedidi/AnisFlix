package com.anisflix.models;

import com.google.gson.annotations.SerializedName;

/**
 * Request/Response for Vidzy extraction
 */
public class VidzyExtractionResponse {
    @SerializedName("m3u8Url")
    private String m3u8Url;
    
    @SerializedName("error")
    private String error;
    
    public String getM3u8Url() { return m3u8Url; }
    public String getError() { return error; }
}


