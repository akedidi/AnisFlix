package com.anisflix.database;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Delete;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import java.util.List;

/**
 * DAO for favorites database operations
 */
@Dao
public interface FavoriteDao {
    
    @Query("SELECT * FROM favorites ORDER BY addedAt DESC")
    LiveData<List<FavoriteEntity>> getAllFavorites();
    
    @Query("SELECT * FROM favorites WHERE mediaType = :type ORDER BY addedAt DESC")
    LiveData<List<FavoriteEntity>> getFavoritesByType(String type);
    
    @Query("SELECT * FROM favorites WHERE mediaId = :id")
    FavoriteEntity getFavoriteByIdSync(int id);
    
    @Query("SELECT EXISTS(SELECT 1 FROM favorites WHERE mediaId = :id)")
    LiveData<Boolean> isFavorite(int id);
    
    @Query("SELECT EXISTS(SELECT 1 FROM favorites WHERE mediaId = :id)")
    boolean isFavoriteSync(int id);

    @Query("SELECT * FROM favorites ORDER BY addedAt DESC")
    List<FavoriteEntity> getAllFavoritesSync();
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insert(FavoriteEntity favorite);
    
    @Delete
    void delete(FavoriteEntity favorite);
    
    @Query("DELETE FROM favorites WHERE mediaId = :id")
    void deleteByMediaId(int id);

    @Query("DELETE FROM favorites WHERE mediaId = :id")
    void deleteById(int id);
    
    @Query("DELETE FROM favorites")
    void deleteAll();
}
