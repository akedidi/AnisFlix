package com.anisflix.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.anisflix.data.local.dao.WatchProgressDao
import com.anisflix.data.local.entity.WatchProgressEntity

@Database(entities = [WatchProgressEntity::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun watchProgressDao(): WatchProgressDao
}
