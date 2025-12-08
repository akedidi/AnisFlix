package com.anisflix.models;

import com.google.gson.annotations.SerializedName;

public class MultiSearchItem {
    // Common
    @SerializedName("id")
    public int id;
    
    @SerializedName("media_type")
    public String mediaType; // "movie", "tv", "person"
    
    @SerializedName("poster_path")
    public String posterPath;
    
    @SerializedName("backdrop_path")
    public String backdropPath;
    
    @SerializedName("popularity")
    public double popularity;
    
    @SerializedName("vote_average")
    public double voteAverage;
    
    @SerializedName("overview")
    public String overview;
    
    // Movie specific
    @SerializedName("title")
    public String title;
    
    @SerializedName("release_date")
    public String releaseDate;
    
    // TV specific
    @SerializedName("name")
    public String name;
    
    @SerializedName("first_air_date")
    public String firstAirDate;
    
    // Helper accessors
    public String getTitleOrName() {
        return mediaType.equals("movie") ? title : name;
    }
    
    public String getDate() {
        return mediaType.equals("movie") ? releaseDate : firstAirDate;
    }
}
