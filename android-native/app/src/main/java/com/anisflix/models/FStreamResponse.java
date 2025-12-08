package com.anisflix.models;

import com.google.gson.annotations.SerializedName;
import java.util.Map;

/**
 * Response from FStream API
 */
public class FStreamResponse {
    @SerializedName("players")
    private Map<String, FStreamPlayer[]> players;
    
    public Map<String, FStreamPlayer[]> getPlayers() {
        return players;
    }
    
    public void setPlayers(Map<String, FStreamPlayer[]> players) {
        this.players = players;
    }
    
    public static class FStreamPlayer {
        @SerializedName("url")
        private String url;
        
        @SerializedName("type")
        private String type;
        
        @SerializedName("quality")
        private String quality;
        
        @SerializedName("player")
        private String player;
        
        public String getUrl() { return url; }
        public String getType() { return type; }
        public String getQuality() { return quality; }
        public String getPlayer() { return player; }
    }
}
