package com.anisflix.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

/**
 * Wrapper class for TMDB API paginated responses
 */
public class TMDBResponse<T> {
    @SerializedName("page")
    private int page;
    
    @SerializedName("total_pages")
    private int totalPages;
    
    @SerializedName("total_results")
    private int totalResults;
    
    @SerializedName(value = "results", alternate = {"episodes", "cast"})
    private List<T> results;
    
    // Constructors
    public TMDBResponse() {}
    
    // Getters
    public int getPage() { return page; }
    public int getTotalPages() { return totalPages; }
    public int getTotalResults() { return totalResults; }
    public List<T> getResults() { return results; }
    
    // Setters
    public void setPage(int page) { this.page = page; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }
    public void setTotalResults(int totalResults) { this.totalResults = totalResults; }
    public void setResults(List<T> results) { this.results = results; }
}
