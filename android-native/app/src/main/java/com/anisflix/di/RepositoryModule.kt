package com.anisflix.di

import com.anisflix.data.repository.TMDBRepositoryImpl
import com.anisflix.domain.repository.TMDBRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun bindTMDBRepository(
        tmdbRepositoryImpl: TMDBRepositoryImpl
    ): TMDBRepository

    @Binds
    @Singleton
    abstract fun bindTVRepository(
        tvRepositoryImpl: com.anisflix.data.repository.TVRepositoryImpl
    ): com.anisflix.domain.repository.TVRepository

    @Binds
    @Singleton
    abstract fun bindStreamingRepository(
        streamingRepositoryImpl: com.anisflix.data.repository.StreamingRepositoryImpl
    ): com.anisflix.domain.repository.StreamingRepository

    @Binds
    @Singleton
    abstract fun bindWatchProgressRepository(
        watchProgressRepositoryImpl: com.anisflix.data.repository.WatchProgressRepositoryImpl
    ): com.anisflix.domain.repository.WatchProgressRepository

    @Binds
    @Singleton
    abstract fun bindSettingsRepository(
        settingsRepositoryImpl: com.anisflix.data.repository.SettingsRepositoryImpl
    ): com.anisflix.domain.repository.SettingsRepository
}
