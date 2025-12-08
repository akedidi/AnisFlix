package com.anisflix.database;

import androidx.room.Entity;
import androidx.room.PrimaryKey;

/**
 * Room entity for favorite movies/series
 */
@Entity(tableName = "favorites")
public class FavoriteEntity {
    
    @PrimaryKey
    public int mediaId;
    
    public String mediaType; // "movie" or "series"
    public String title;
    public String posterPath;
    public double rating;
    public long addedAt;
    
    // Constructors
    public FavoriteEntity() {}
    
    public FavoriteEntity(int mediaId, String mediaType, String title, String posterPath, double rating) {
        this.mediaId = mediaId;
        this.mediaType = mediaType;
        this.title = title;
        this.posterPath = posterPath;
        this.rating = rating;
        this.addedAt = System.currentTimeMillis();
    }
}
