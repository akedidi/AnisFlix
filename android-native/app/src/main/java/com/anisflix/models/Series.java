package com.anisflix.models;

import com.google.gson.annotations.SerializedName;

public class Series {
    @SerializedName("id")
    private int id;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("overview")
    private String overview;
    
    @SerializedName("poster_path")
    private String posterPath;
    
    @SerializedName("backdrop_path")
    private String backdropPath;
    
    @SerializedName("vote_average")
    private double rating;
    
    @SerializedName("first_air_date")
    private String firstAirDate;
    
    @SerializedName("genre_ids")
    private int[] genreIds;
    
    @SerializedName("popularity")
    private double popularity;
    
    @SerializedName("original_language")
    private String originalLanguage;
    
    @SerializedName("number_of_seasons")
    private int numberOfSeasons;
    
    @SerializedName("number_of_episodes")
    private int numberOfEpisodes;
    
    @SerializedName("genres")
    private java.util.List<Genre> genres;
    
    // Constructors
    public Series() {}
    
    // Getters
    public int getId() { return id; }
    public String getName() { return name; }
    public String getOverview() { return overview; }
    public String getPosterPath() { return posterPath; }
    public String getBackdropPath() { return backdropPath; }
    public double getRating() { return rating; }
    public String getFirstAirDate() { return firstAirDate; }
    public int[] getGenreIds() { return genreIds; }
    public double getPopularity() { return popularity; }
    public String getOriginalLanguage() { return originalLanguage; }
    public int getNumberOfSeasons() { return numberOfSeasons; }
    public int getNumberOfEpisodes() { return numberOfEpisodes; }
    public java.util.List<Genre> getGenres() { return genres; }
    
    // Setters
    public void setId(int id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setOverview(String overview) { this.overview = overview; }
    public void setPosterPath(String posterPath) { this.posterPath = posterPath; }
    public void setBackdropPath(String backdropPath) { this.backdropPath = backdropPath; }
    public void setRating(double rating) { this.rating = rating; }
    public void setFirstAirDate(String firstAirDate) { this.firstAirDate = firstAirDate; }
    public void setGenreIds(int[] genreIds) { this.genreIds = genreIds; }
    public void setPopularity(double popularity) { this.popularity = popularity; }
    public void setOriginalLanguage(String originalLanguage) { this.originalLanguage = originalLanguage; }
    public void setNumberOfSeasons(int numberOfSeasons) { this.numberOfSeasons = numberOfSeasons; }
    public void setNumberOfEpisodes(int numberOfEpisodes) { this.numberOfEpisodes = numberOfEpisodes; }
    public void setGenres(java.util.List<Genre> genres) { this.genres = genres; }
    
    // Helper methods
    public String getFullPosterUrl() {
        return posterPath != null ? "https://image.tmdb.org/t/p/w500" + posterPath : null;
    }
    
    public String getFullBackdropUrl() {
        return backdropPath != null ? "https://image.tmdb.org/t/p/original" + backdropPath : null;
    }
    
    public String getYear() {
        if (firstAirDate != null && firstAirDate.length() >= 4) {
            return firstAirDate.substring(0, 4);
        }
        return "";
    }
}
