package com.anisflix.models;

import com.google.gson.annotations.SerializedName;

public class Episode {
    @SerializedName("id")
    private int id;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("overview")
    private String overview;
    
    @SerializedName("still_path")
    private String stillPath;
    
    @SerializedName("episode_number")
    private int episodeNumber;
    
    @SerializedName("season_number")
    private int seasonNumber;
    
    @SerializedName("air_date")
    private String airDate;
    
    @SerializedName("vote_average")
    private double rating;
    
    @SerializedName("runtime")
    private int runtime;
    
    // Constructors
    public Episode() {}
    
    // Getters
    public int getId() { return id; }
    public String getName() { return name; }
    public String getOverview() { return overview; }
    public String getStillPath() { return stillPath; }
    public int getEpisodeNumber() { return episodeNumber; }
    public int getSeasonNumber() { return seasonNumber; }
    public String getAirDate() { return airDate; }
    public double getRating() { return rating; }
    public int getRuntime() { return runtime; }
    
    // Setters
    public void setId(int id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setOverview(String overview) { this.overview = overview; }
    public void setStillPath(String stillPath) { this.stillPath = stillPath; }
    public void setEpisodeNumber(int episodeNumber) { this.episodeNumber = episodeNumber; }
    public void setSeasonNumber(int seasonNumber) { this.seasonNumber = seasonNumber; }
    public void setAirDate(String airDate) { this.airDate = airDate; }
    public void setRating(double rating) { this.rating = rating; }
    public void setRuntime(int runtime) { this.runtime = runtime; }
    
    // Helper methods
    public String getFullStillUrl() {
        return stillPath != null ? "https://image.tmdb.org/t/p/w500" + stillPath : null;
    }
    
    public String getEpisodeLabel() {
        return "S" + seasonNumber + "E" + episodeNumber;
    }
}
