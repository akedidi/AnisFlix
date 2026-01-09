package com.anisflix.di

import android.content.Context
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.DatabaseProvider
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.cache.Cache
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.DisplaySizeCalculated
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.exoplayer.offline.DownloadManager
import com.anisflix.utils.DownloadUtil
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import java.io.File
import java.util.concurrent.Executor
import java.util.concurrent.Executors
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DownloadModule {

    @Provides
    @Singleton
    @OptIn(UnstableApi::class)
    fun provideDatabaseProvider(@ApplicationContext context: Context): DatabaseProvider {
        return StandaloneDatabaseProvider(context)
    }

    @Provides
    @Singleton
    @OptIn(UnstableApi::class)
    fun provideDownloadCache(
        @ApplicationContext context: Context,
        databaseProvider: DatabaseProvider
    ): Cache {
        val downloadContentDirectory = File(context.getExternalFilesDir(null), "downloads")
        val cacheEvictor = LeastRecentlyUsedCacheEvictor(Long.MAX_VALUE) // Do not auto-evict downloads
        return SimpleCache(downloadContentDirectory, cacheEvictor, databaseProvider)
    }

    @Provides
    @Singleton
    @OptIn(UnstableApi::class)
    fun provideDataSourceFactory(
        @ApplicationContext context: Context,
        cache: Cache
    ): DataSource.Factory {
        // Upstream factory for reading from network
        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
        val upstreamFactory = DefaultDataSource.Factory(context, httpDataSourceFactory)

        // Cache factory
        return CacheDataSource.Factory()
            .setCache(cache)
            .setUpstreamDataSourceFactory(upstreamFactory)
            .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
    }

    @Provides
    @Singleton
    @OptIn(UnstableApi::class)
    fun provideDownloadManager(
        @ApplicationContext context: Context,
        databaseProvider: DatabaseProvider,
        cache: Cache,
        dataSourceFactory: DataSource.Factory
    ): DownloadManager {
        val downloadExecutor: Executor = Executors.newFixedThreadPool(6)
        return DownloadManager(
            context,
            databaseProvider,
            cache,
            dataSourceFactory,
            downloadExecutor
        ).apply {
            maxParallelDownloads = 2
        }
    }
}
