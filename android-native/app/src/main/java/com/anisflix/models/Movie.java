package com.anisflix.models;

import com.google.gson.annotations.SerializedName;

public class Movie {
    @SerializedName("id")
    private int id;
    
    @SerializedName("title")
    private String title;
    
    @SerializedName("overview")
    private String overview;
    
    @SerializedName("poster_path")
    private String posterPath;
    
    @SerializedName("backdrop_path")
    private String backdropPath;
    
    @SerializedName("vote_average")
    private double rating;
    
    @SerializedName("release_date")
    private String releaseDate;
    
    @SerializedName("genre_ids")
    private int[] genreIds;
    
    @SerializedName("popularity")
    private double popularity;
    
    @SerializedName("original_language")
    private String originalLanguage;
    
    // Constructors
    public Movie() {}
    
    // Getters
    public int getId() { return id; }
    public String getTitle() { return title; }
    public String getOverview() { return overview; }
    public String getPosterPath() { return posterPath; }
    public String getBackdropPath() { return backdropPath; }
    public double getRating() { return rating; }
    public String getReleaseDate() { return releaseDate; }
    public int[] getGenreIds() { return genreIds; }
    public double getPopularity() { return popularity; }
    public String getOriginalLanguage() { return originalLanguage; }
    
    // Setters
    public void setId(int id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setOverview(String overview) { this.overview = overview; }
    public void setPosterPath(String posterPath) { this.posterPath = posterPath; }
    public void setBackdropPath(String backdropPath) { this.backdropPath = backdropPath; }
    public void setRating(double rating) { this.rating = rating; }
    public void setReleaseDate(String releaseDate) { this.releaseDate = releaseDate; }
    public void setGenreIds(int[] genreIds) { this.genreIds = genreIds; }
    public void setPopularity(double popularity) { this.popularity = popularity; }
    public void setOriginalLanguage(String originalLanguage) { this.originalLanguage = originalLanguage; }
    
    // Helper methods
    public String getFullPosterUrl() {
        return posterPath != null ? "https://image.tmdb.org/t/p/w500" + posterPath : null;
    }
    
    public String getFullBackdropUrl() {
        return backdropPath != null ? "https://image.tmdb.org/t/p/original" + backdropPath : null;
    }
    
    public String getYear() {
        if (releaseDate != null && releaseDate.length() >= 4) {
            return releaseDate.substring(0, 4);
        }
        return "";
    }
}
