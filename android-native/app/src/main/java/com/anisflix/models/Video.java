package com.anisflix.models;

import com.google.gson.annotations.SerializedName;

public class Video {
    @SerializedName("id")
    private String id;
    
    @SerializedName("iso_639_1")
    private String iso6391;
    
    @SerializedName("iso_3166_1")
    private String iso31661;
    
    @SerializedName("key")
    private String key;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("site")
    private String site; // "YouTube"
    
    @SerializedName("size")
    private int size;
    
    @SerializedName("type")
    private String type; // "Trailer", "Teaser", "Featurette"
    
    public Video() {}
    
    public String getId() { return id; }
    public String getKey() { return key; }
    public String getName() { return name; }
    public String getSite() { return site; }
    public String getType() { return type; }
    
    public void setId(String id) { this.id = id; }
    public void setKey(String key) { this.key = key; }
    public void setName(String name) { this.name = name; }
    public void setSite(String site) { this.site = site; }
    public void setType(String type) { this.type = type; }
}
