package com.anisflix.api;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

import java.util.concurrent.TimeUnit;

/**
 * Singleton Retrofit client manager
 */
public class RetrofitClient {
    private static RetrofitClient instance;
    private final Retrofit tmdbRetrofit;
    private final Retrofit anisflixRetrofit;
    
    private RetrofitClient() {
        // Create OkHttp client with logging
        OkHttpClient.Builder httpClient = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS);
        
        // Add logging interceptor for debugging
        HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
        logging.setLevel(HttpLoggingInterceptor.Level.BODY);
        httpClient.addInterceptor(logging);
        
        OkHttpClient client = httpClient.build();
        
        // Create Gson instance
        Gson gson = new GsonBuilder()
                .setLenient()
                .create();
        
        // TMDB Retrofit instance
        tmdbRetrofit = new Retrofit.Builder()
                .baseUrl(TMDBService.BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create(gson))
                .build();
        
        // AnisFlix API Retrofit instance
        anisflixRetrofit = new Retrofit.Builder()
                .baseUrl(StreamingService.BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create(gson))
                .build();
    }
    
    public static synchronized RetrofitClient getInstance() {
        if (instance == null) {
            instance = new RetrofitClient();
        }
        return instance;
    }
    
    public TMDBService getTMDBService() {
        return tmdbRetrofit.create(TMDBService.class);
    }
    
    public StreamingService getStreamingService() {
        return anisflixRetrofit.create(StreamingService.class);
    }
    
    public TVService getTVService() {
        return anisflixRetrofit.create(TVService.class);
    }

    public <T> T create(Class<T> serviceClass) {
        return anisflixRetrofit.create(serviceClass);
    }
}
