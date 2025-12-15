package com.anisflix.services;

import android.net.Uri;
import android.util.Log;
import com.anisflix.api.EnhancedStreamingService;
import com.anisflix.api.RetrofitClient;
import com.anisflix.models.*;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Streaming Service Manager - Matches iOS StreamingService.swift
 * Handles 3 endpoints: Movix TMDB, Movix FStream, Vixsrc
 * Provider-specific extraction: VidMoly, Vidzy, Vixsrc
 */
public class StreamingServiceManager {
    
    private static final String TAG = "StreamingServiceManager";
    private static final String BASE_URL = "https://anisflix.vercel.app";
    
    private static StreamingServiceManager instance;
    private final EnhancedStreamingService apiService;
    
    private StreamingServiceManager() {
        apiService = RetrofitClient.getInstance().create(EnhancedStreamingService.class);
    }
    
    public static synchronized StreamingServiceManager getInstance() {
        if (instance == null) {
            instance = new StreamingServiceManager();
        }
        return instance;
    }
    
    /**
     * Fetch movie sources from all 3 endpoints (iOS pattern)
     */
    public void fetchMovieSources(int tmdbId, OnSourcesLoadedListener listener) {
        final List<StreamingSource> allSources = new ArrayList<>();
        final CountDownLatch latch = new CountDownLatch(3);
        
        // 1. Movix TMDB
        fetchMovixTmdbSources(tmdbId, new OnSourcesLoadedListener() {
            @Override
            public void onSourcesLoaded(List<StreamingSource> sources) {
                synchronized (allSources) {
                    allSources.addAll(sources);
                }
                latch.countDown();
            }
            
            @Override
            public void onError(String error) {
                Log.w(TAG, "Movix TMDB error: " + error);
                latch.countDown();
            }
        });
        
        // 2. Movix FStream
        fetchMovixFStreamSources(tmdbId, new OnSourcesLoadedListener() {
            @Override
            public void onSourcesLoaded(List<StreamingSource> sources) {
                synchronized (allSources) {
                    allSources.addAll(sources);
                }
                latch.countDown();
            }
            
            @Override
            public void onError(String error) {
                Log.w(TAG, "Movix FStream error: " + error);
                latch.countDown();
            }
        });
        
        // 3. Vixsrc
        fetchVixsrcSources(tmdbId, "movie", null, null, new OnSourcesLoadedListener() {
            @Override
            public void onSourcesLoaded(List<StreamingSource> sources) {
                synchronized (allSources) {
                    allSources.addAll(sources);
                }
                latch.countDown();
            }
            
            @Override
            public void onError(String error) {
                Log.w(TAG, "Vixsrc error: " + error);
                latch.countDown();
            }
        });
        
        // Wait for all 3 in background thread
        new Thread(() -> {
            try {
                latch.await(10, TimeUnit.SECONDS);
                
                // Filter for valid providers (iOS pattern)
                List<StreamingSource> filtered = filterValidProviders(allSources);
                
                if (listener != null) {
                    listener.onSourcesLoaded(filtered);
                }
            } catch (InterruptedException e) {
                if (listener != null) {
                    listener.onError("Timeout fetching sources");
                }
            }
        }).start();
    }
    
    /**
     * Fetch series sources from all 3 endpoints
     */
    public void fetchSeriesSources(int tmdbId, int season, int episode, OnSourcesLoadedListener listener) {
        final List<StreamingSource> allSources = new ArrayList<>();
        final CountDownLatch latch = new CountDownLatch(3);
        
        // 1. Movix TMDB Series
        fetchMovixTmdbSeriesSources(tmdbId, season, episode, new OnSourcesLoadedListener() {
            @Override
            public void onSourcesLoaded(List<StreamingSource> sources) {
                synchronized (allSources) {
                    allSources.addAll(sources);
                }
                latch.countDown();
            }
            
            @Override
            public void onError(String error) {
                Log.w(TAG, "Movix TMDB Series error: " + error);
   latch.countDown();
            }
        });
        
        // 2. Movix FStream Series
        fetchMovixFStreamSeriesSources(tmdbId, season, episode, new OnSourcesLoadedListener() {
            @Override
            public void onSourcesLoaded(List<StreamingSource> sources) {
                synchronized (allSources) {
                    allSources.addAll(sources);
                }
                latch.countDown();
            }
            
            @Override
            public void onError(String error) {
                Log.w(TAG, "Movix FStream Series error: " + error);
                latch.countDown();
            }
        });
        
        // 3. Vixsrc Series
        fetchVixsrcSources(tmdbId, "tv", season, episode, new OnSourcesLoadedListener() {
            @Override
            public void onSourcesLoaded(List<StreamingSource> sources) {
                synchronized (allSources) {
                    allSources.addAll(sources);
                }
                latch.countDown();
            }
            
            @Override
            public void onError(String error) {
                Log.w(TAG, "Vixsrc Series error: " + error);
                latch.countDown();
            }
        });
        
        // Wait for all 3
        new Thread(() -> {
            try {
                latch.await(10, TimeUnit.SECONDS);
                List<StreamingSource> filtered = filterValidProviders(allSources);
                
                if (listener != null) {
                    listener.onSourcesLoaded(filtered);
                }
            } catch (InterruptedException e) {
                if (listener != null) {
                    listener.onError("Timeout fetching sources");
                }
            }
        }).start();
    }
    
    // ========== PRIVATE ENDPOINT METHODS ==========
    
    private void fetchMovixTmdbSources(int movieId, OnSourcesLoadedListener listener) {
        String path = "tmdb/movie/" + movieId;
        apiService.getMovixTmdbMovie(path).enqueue(new Callback<MovixTmdbResponse>() {
            @Override
            public void onResponse(Call<MovixTmdbResponse> call, Response<MovixTmdbResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    StreamingSource[] links = response.body().getPlayerLinks();
                    List<StreamingSource> sources = new ArrayList<>();
                    if (links != null) {
                        for (StreamingSource source : links) {
                            sources.add(source);
                        }
                    }
                    listener.onSourcesLoaded(sources);
                } else {
                    listener.onError("HTTP " + response.code());
                }
            }
            
            @Override
            public void onFailure(Call<MovixTmdbResponse> call, Throwable t) {
                listener.onError(t.getMessage());
            }
        });
    }
    
    private void fetchMovixTmdbSeriesSources(int seriesId, int season, int episode, OnSourcesLoadedListener listener) {
        String path = "tmdb/tv/" + seriesId + "&season=" + season + "&episode=" + episode;
        apiService.getMovixTmdbSeries(path).enqueue(new Callback<MovixTmdbResponse>() {
            @Override
            public void onResponse(Call<MovixTmdbResponse> call, Response<MovixTmdbResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    StreamingSource[] links = response.body().getPlayerLinks();
                    List<StreamingSource> sources = new ArrayList<>();
                    if (links != null) {
                        for (StreamingSource source : links) {
                            sources.add(source);
                        }
                    }
                    listener.onSourcesLoaded(sources);
                } else {
                    listener.onError("HTTP " + response.code());
                }
            }
            
            @Override
            public void onFailure(Call<MovixTmdbResponse> call, Throwable t) {
                listener.onError(t.getMessage());
            }
        });
    }
    
    private void fetchMovixFStreamSources(int movieId, OnSourcesLoadedListener listener) {
        String path = "fstream/movie/" + movieId;
        apiService.getMovixFStreamMovie(path).enqueue(new Callback<FStreamResponse>() {
            @Override
            public void onResponse(Call<FStreamResponse> call, Response<FStreamResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    List<StreamingSource> sources = parseFStreamResponse(response.body().getPlayers());
                    listener.onSourcesLoaded(sources);
                } else {
                    listener.onError("HTTP " + response.code());
                }
            }
            
            @Override
            public void onFailure(Call<FStreamResponse> call, Throwable t) {
                listener.onError(t.getMessage());
            }
        });
    }
    
    private void fetchMovixFStreamSeriesSources(int seriesId, int season, int episode, OnSourcesLoadedListener listener) {
        String path = "fstream/tv/" + seriesId + "/season/" + season;
        apiService.getMovixFStreamSeries(path).enqueue(new Callback<FStreamResponse>() {
            @Override
            public void onResponse(Call<FStreamResponse> call, Response<FStreamResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    // FStream TV has nested episodes structure
                    // TODO: Parse nested structure for specific episode
                    List<StreamingSource> sources = parseFStreamResponse(response.body().getPlayers());
                    listener.onSourcesLoaded(sources);
                } else {
                    listener.onError("HTTP " + response.code());
                }
            }
            
            @Override
            public void onFailure(Call<FStreamResponse> call, Throwable t) {
                listener.onError(t.getMessage());
            }
        });
    }
    
    private void fetchVixsrcSources(int tmdbId, String type, Integer season, Integer episode, OnSourcesLoadedListener listener) {
        apiService.getVixsrcSources(tmdbId, type, season, episode).enqueue(new Callback<VixsrcResponse>() {
            @Override
            public void onResponse(Call<VixsrcResponse> call, Response<VixsrcResponse> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    List<StreamingSource> sources = parseVixsrcResponse(response.body().getStreams());
                    listener.onSourcesLoaded(sources);
                } else {
                    listener.onError("HTTP " + response.code());
                }
            }
            
            @Override
            public void onFailure(Call<VixsrcResponse> call, Throwable t) {
                listener.onError(t.getMessage());
            }
        });
    }
    
    // ========== PARSING HELPERS ==========
    
    private List<StreamingSource> parseFStreamResponse(Map<String, FStreamResponse.FStreamPlayer[]> players) {
        List<StreamingSource> sources = new ArrayList<>();
        
        if (players == null) return sources;
        
        for (Map.Entry<String, FStreamResponse.FStreamPlayer[]> entry : players.entrySet()) {
            String key = entry.getKey();
            String language = mapFStreamLanguage(key);
            
            for (FStreamResponse.FStreamPlayer player : entry.getValue()) {
                String provider = normalizeProvider(player.getPlayer());
                
                StreamingSource source = new StreamingSource();
                source.setUrl(player.getUrl());
                source.setQuality(player.getQuality());
                source.setType(player.getType());
                source.setProvider(provider);
                source.setLanguage(language);
                
                // Set Display Name
                String displayName = provider.substring(0, 1).toUpperCase() + provider.substring(1);
                if (player.getQuality() != null && !player.getQuality().isEmpty()) {
                    displayName += " - " + player.getQuality();
                }
                source.setName(displayName);
                
                sources.add(source);
            }
        }
        
        return sources;
    }
    
    private List<StreamingSource> parseVixsrcResponse(VixsrcResponse.VixsrcStream[] streams) {
        List<StreamingSource> sources = new ArrayList<>();
        
        if (streams == null) return sources;
        
        for (VixsrcResponse.VixsrcStream stream : streams) {
            // Wrap in proxy (iOS pattern)
            String proxyUrl = wrapVixsrcProxy(stream.getUrl());
            
            StreamingSource source = new StreamingSource();
            source.setUrl(proxyUrl);
            source.setQuality(stream.getQuality());
            source.setType(stream.getType());
            source.setProvider("vixsrc");
            source.setLanguage("VO");
            
            String displayName = "Vixsrc";
            if (stream.getQuality() != null && !stream.getQuality().isEmpty()) {
                displayName += " - " + stream.getQuality();
            }
            source.setName(displayName);
            
            sources.add(source);
        }
        
        return sources;
    }
    
    private String mapFStreamLanguage(String key) {
        if ("VOSTFR".equals(key)) return "VOSTFR";
        if ("Default".equals(key) || "VFQ".equals(key) || "VF".equals(key)) return "VF";
        if ("VO".equals(key) || "ENG".equals(key) || "English".equals(key)) return "VO";
        return "VF"; // Default fallback
    }
    
    private String normalizeProvider(String playerName) {
        String lower = playerName.toLowerCase();
        if (lower.contains("vidmoly")) return "vidmoly";
        if (lower.contains("vidzy")) return "vidzy";
        return playerName;
    }
    
    private List<StreamingSource> filterValidProviders(List<StreamingSource> sources) {
        List<StreamingSource> filtered = new ArrayList<>();
        for (StreamingSource source : sources) {
            String provider = source.getProvider();
            if ("vidmoly".equals(provider) || "vidzy".equals(provider) || "vixsrc".equals(provider)) {
                filtered.add(source);
            }
        }
        return filtered;
    }
    
    private String wrapVixsrcProxy(String originalUrl) {
        try {
            String encoded = URLEncoder.encode(originalUrl, "UTF-8");
            return BASE_URL + "/api/vixsrc-proxy?url=" + encoded;
        } catch (UnsupportedEncodingException e) {
            return originalUrl;
        }
    }
    
    // ========== CALLBACK INTERFACE ==========
    
    public interface OnSourcesLoadedListener {
        void onSourcesLoaded(List<StreamingSource> sources);
        void onError(String error);
    }
}
