package com.anisflix.di

import com.anisflix.utils.Constants
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        return OkHttpClient.Builder()
            .addInterceptor(logging)
            .build()
    }
    
    @Provides
    @Singleton
    fun provideGson(): com.google.gson.Gson {
        return com.google.gson.Gson()
    }

    @Provides
    @Singleton
    @Named("TMDB")
    fun provideTmdbRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(Constants.TMDB_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    @Named("Movix")
    fun provideMovixRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(Constants.DEFAULT_PROXY_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    @Named("Anisflix")
    fun provideAnisflixRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(Constants.ANISFLIX_API_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideTMDBApi(@Named("TMDB") retrofit: Retrofit): com.anisflix.data.remote.api.TMDBApi {
        return retrofit.create(com.anisflix.data.remote.api.TMDBApi::class.java)
    }

    @Provides
    @Singleton
    fun provideMovixProxyApi(@Named("Movix") retrofit: Retrofit): com.anisflix.data.remote.api.MovixProxyApi {
        return retrofit.create(com.anisflix.data.remote.api.MovixProxyApi::class.java)
    }

    @Provides
    @Singleton
    fun provideTvChannelsApi(@Named("Anisflix") retrofit: Retrofit): com.anisflix.data.remote.api.TvChannelsApi {
        return retrofit.create(com.anisflix.data.remote.api.TvChannelsApi::class.java)
    }
}
