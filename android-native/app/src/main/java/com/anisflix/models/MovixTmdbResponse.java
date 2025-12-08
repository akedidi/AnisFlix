package com.anisflix.models;

import com.google.gson.annotations.SerializedName;

/**
 * Response from Movix TMDB endpoint
 */
public class MovixTmdbResponse {
    @SerializedName("player_links")
    private StreamingSource[] playerLinks;
    
    public StreamingSource[] getPlayerLinks() {
        return playerLinks;
    }
    
    public void setPlayerLinks(StreamingSource[] playerLinks) {
        this.playerLinks = playerLinks;
    }
}
