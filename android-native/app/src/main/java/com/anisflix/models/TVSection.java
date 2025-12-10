package com.anisflix.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class TVSection {
    @SerializedName("id")
    private String id;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("categories")
    private List<TVCategory> categories;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public List<TVCategory> getCategories() { return categories; }
    public void setCategories(List<TVCategory> categories) { this.categories = categories; }
}
