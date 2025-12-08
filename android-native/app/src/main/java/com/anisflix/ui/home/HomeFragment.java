package com.anisflix.ui.home;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.anisflix.R;
import com.anisflix.adapters.HorizontalMediaAdapter;
import com.anisflix.adapters.PlatformAdapter;
import java.util.ArrayList;
import java.util.List;

/**
 * Home Fragment - Shows continue watching, latest movies/series, popular content
 */
public class HomeFragment extends Fragment {
    
    private HomeViewModel viewModel;
    private com.anisflix.adapters.HorizontalMediaAdapter continueWatchingAdapter;
    private com.anisflix.adapters.HorizontalMediaAdapter latestMoviesAdapter;
    
    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        viewModel = new ViewModelProvider(this).get(HomeViewModel.class);
    }
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_home, container, false);
        initViews(view);
        observeData();
        return view;
    }
    
    private void initViews(View view) {
        // Initialize adapters
        com.anisflix.adapters.HorizontalMediaAdapter continueWatchingAdapter = new com.anisflix.adapters.HorizontalMediaAdapter(getContext());
        RecyclerView continueWatchingRecycler = view.findViewById(R.id.continue_watching_recycler);
        continueWatchingRecycler.setLayoutManager(new LinearLayoutManager(getContext(), LinearLayoutManager.HORIZONTAL, false));
        continueWatchingRecycler.setAdapter(continueWatchingAdapter);
        
        // Setup Platforms
        RecyclerView platformsRecycler = view.findViewById(R.id.platforms_recycler);
        platformsRecycler.setLayoutManager(new LinearLayoutManager(getContext(), LinearLayoutManager.HORIZONTAL, false));
        List<com.anisflix.adapters.PlatformAdapter.Platform> platforms = new ArrayList<>();
        platforms.add(new com.anisflix.adapters.PlatformAdapter.Platform("Netflix", 0));
        platforms.add(new com.anisflix.adapters.PlatformAdapter.Platform("Amazon Prime", 0));
        platforms.add(new com.anisflix.adapters.PlatformAdapter.Platform("Apple TV+", 0));
        platforms.add(new com.anisflix.adapters.PlatformAdapter.Platform("Paramount+", 0));
        platformsRecycler.setAdapter(new com.anisflix.adapters.PlatformAdapter(getContext(), platforms));
        
        // Setup Latest Movies
        com.anisflix.adapters.HorizontalMediaAdapter latestMoviesAdapter = new com.anisflix.adapters.HorizontalMediaAdapter(getContext());
        RecyclerView latestMoviesRecycler = view.findViewById(R.id.latest_movies_recycler);
        latestMoviesRecycler.setLayoutManager(new LinearLayoutManager(getContext(), LinearLayoutManager.HORIZONTAL, false));
        latestMoviesRecycler.setAdapter(latestMoviesAdapter);
        
        // Click Listeners
        continueWatchingAdapter.setOnItemClickListener(movie -> {
             Intent intent = new Intent(getContext(), com.anisflix.ui.detail.MovieDetailActivity.class);
             intent.putExtra("movie_id", movie.getId());
             startActivity(intent);
        });
        
        latestMoviesAdapter.setOnItemClickListener(movie -> {
             Intent intent = new Intent(getContext(), com.anisflix.ui.detail.MovieDetailActivity.class);
             intent.putExtra("movie_id", movie.getId());
             startActivity(intent);
        });
        
        this.continueWatchingAdapter = continueWatchingAdapter;
        this.latestMoviesAdapter = latestMoviesAdapter;
    }
    
    private void observeData() {
        viewModel.getPopularMovies().observe(getViewLifecycleOwner(), movies -> {
            if (movies != null) {
                // Populate both for now since we don't have real "Continue Watching" data
                if (continueWatchingAdapter != null) continueWatchingAdapter.setMovies(movies);
                if (latestMoviesAdapter != null) latestMoviesAdapter.setMovies(movies);
                
                View loading = getView().findViewById(R.id.loading_indicator);
                if (loading != null) loading.setVisibility(View.GONE);
            }
        });
    }
}
