package com.anisflix.ui.home;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.LiveData;
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
        return inflater.inflate(R.layout.fragment_home, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        initViews(view);
        observeData();
    }
    
    private android.widget.AutoCompleteTextView searchInput;
    private android.widget.LinearLayout contentContainer;
    private com.anisflix.adapters.SearchAdapter searchAdapter;
    private final List<com.anisflix.adapters.SearchAdapter.SearchResult> allSearchItems = new ArrayList<>();

    private void initViews(View view) {
        searchInput = view.findViewById(R.id.search_input);
        contentContainer = view.findViewById(R.id.content_container);

        // Settings Buttons
        View themeBtn = view.findViewById(R.id.theme_button);
        View langBtn = view.findViewById(R.id.language_button);

        themeBtn.setOnClickListener(v -> {
            int currentMode = androidx.appcompat.app.AppCompatDelegate.getDefaultNightMode();
            int newMode = (currentMode == androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_YES) ? 
                androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_NO : androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_YES;
            androidx.appcompat.app.AppCompatDelegate.setDefaultNightMode(newMode);
        });

        langBtn.setOnClickListener(v -> {
            String[] languages = {"Français", "English", "Espagnol", "Arabe", "Italien", "Allemand"};
            new android.app.AlertDialog.Builder(getContext())
                .setTitle("Choisir la langue")
                .setItems(languages, (dialog, which) -> {
                     // In a real app, update LocaleManager and restart
                     // For now just show we handled it
                })
                .show();
        });

       setupSearchInput();

        // Setup Platforms
        RecyclerView platformsRecycler = view.findViewById(R.id.platforms_recycler);
        platformsRecycler.setLayoutManager(new LinearLayoutManager(getContext(), LinearLayoutManager.HORIZONTAL, false));
        List<com.anisflix.adapters.PlatformAdapter.Platform> platforms = new ArrayList<>();
        platforms.add(new com.anisflix.adapters.PlatformAdapter.Platform("Netflix", "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg", 8));
        platforms.add(new com.anisflix.adapters.PlatformAdapter.Platform("Prime Video", "/pvske1MyAoymrs5bguRfVqYiM9a.jpg", 9));
        platforms.add(new com.anisflix.adapters.PlatformAdapter.Platform("Apple TV+", "/6uhKBfmtzFqOcLousHwZuzcrScK.jpg", 350));
        platforms.add(new com.anisflix.adapters.PlatformAdapter.Platform("Disney+", "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg", 337));
        platforms.add(new com.anisflix.adapters.PlatformAdapter.Platform("Paramount+", "/h5DcR0J2EESLitnhR8xLG1QymTE.jpg", 531));
        platforms.add(new com.anisflix.adapters.PlatformAdapter.Platform("HBO Max", "/jbe4gVSfRlbPTdESXhEKpornsfu.jpg", 384));
        platformsRecycler.setAdapter(new com.anisflix.adapters.PlatformAdapter(getContext(), platforms));
        
        setupSection(view.findViewById(R.id.continue_watching_recycler), null); 
    }
    
    private void setupSection(RecyclerView recycler, List<?> data) {
         recycler.setLayoutManager(new LinearLayoutManager(getContext(), LinearLayoutManager.HORIZONTAL, false));
    }

    private void observeData() {
        // Initialize adapters for static sections
        // Now top sections are Latest Movies and Latest Series
        bindSection(R.id.latest_movies_recycler, viewModel.getLatestMovies(), true);
        bindSection(R.id.latest_series_recycler, viewModel.getLatestSeries(), false);
        bindSection(R.id.continue_watching_recycler, viewModel.getPopularMovies(), true); // Placeholder if continue watching logic is separate or reusing popular
        
        // Static Headers "See All" Wiring 
        // We really should use IDs in XML for headers to make "Voir tout" clickable
        // For now, assuming static is just display
        
        // Dynamic Sections
        // Popular Moved here
        addSection("Films Populaires", viewModel.getPopularMovies(), true, "POPULAR", -1, -1);
        addSection("Séries Populaires", viewModel.getPopularSeries(), false, "POPULAR", -1, -1);
        
        addSection("Anime - Films", viewModel.getAnimeMovies(), true, "GENRE", -1, 16);
        addSection("Anime - Séries", viewModel.getAnimeSeries(), false, "GENRE", -1, 16);
        
        addSection("Netflix - Films", viewModel.getNetflixMovies(), true, "PROVIDER", 8, -1);
        addSection("Netflix - Séries", viewModel.getNetflixSeries(), false, "PROVIDER", 8, -1);
        
        addSection("Prime Video - Films", viewModel.getPrimeMovies(), true, "PROVIDER", 9, -1);
        addSection("Prime Video - Séries", viewModel.getPrimeSeries(), false, "PROVIDER", 9, -1);
        
        addSection("Apple TV+ - Films", viewModel.getAppleMovies(), true, "PROVIDER", 350, -1);
        addSection("Apple TV+ - Séries", viewModel.getAppleSeries(), false, "PROVIDER", 350, -1);
        
        addSection("Disney+ - Films", viewModel.getDisneyMovies(), true, "PROVIDER", 337, -1);
        addSection("Disney+ - Séries", viewModel.getDisneySeries(), false, "PROVIDER", 337, -1);
        
        addSection("HBO Max - Films", viewModel.getHboMovies(), true, "PROVIDER", 384, -1);
        addSection("HBO Max - Séries", viewModel.getHboSeries(), false, "PROVIDER", 384, -1);

        // Loading
        viewModel.getIsLoading().observe(getViewLifecycleOwner(), isLoading -> {
             View loading = getView().findViewById(R.id.loading_indicator);
             if (loading != null) loading.setVisibility(isLoading ? View.VISIBLE : View.GONE);
        });
        
        // Populate Search Suggestions (Aggregate)
        // viewModel.getPopularMovies().observe(getViewLifecycleOwner(), movies -> updateSearchSuggestions(movies, null));
        // viewModel.getPopularSeries().observe(getViewLifecycleOwner(), series -> updateSearchSuggestions(null, series));
    }

    private void setupSearchInput() {
        android.widget.AutoCompleteTextView searchInput = getView().findViewById(R.id.search_input);
        
        // Initialize adapter once with empty list and API mode
        searchAdapter = new com.anisflix.adapters.SearchAdapter(getContext(), new ArrayList<>());
        searchAdapter.setApiMode(true);
        searchInput.setAdapter(searchAdapter);
        searchInput.setThreshold(1);
        
        searchInput.setDropDownBackgroundResource(R.drawable.bg_search_popup); 

        searchInput.setOnItemClickListener((parent, view1, position, id) -> {
            com.anisflix.adapters.SearchAdapter.SearchResult item = searchAdapter.getItem(position);
            if (item != null) {
                 if (item.isMovie)  openMovieDetail(item.id);
                 else openSeriesDetail(item.id);
            }
        });
        
        // REAL TIME SEARCH
        searchInput.addTextChangedListener(new android.text.TextWatcher() {
            private android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
            private Runnable searchRunnable;

            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {}

            @Override
            public void afterTextChanged(android.text.Editable s) {
                if (searchRunnable != null) handler.removeCallbacks(searchRunnable);
                
                String query = s.toString().trim();
                // When text is empty, clear adapter
                if (query.length() == 0) {
                    searchAdapter.updateData(new ArrayList<>());
                    return;
                }
                
                if (query.length() > 0) {
                    searchRunnable = () -> performSearch(query);
                    handler.postDelayed(searchRunnable, 500); // 500ms debounce
                }
            }
        });
    }

    private void performSearch(String query) {
        android.widget.AutoCompleteTextView searchInput = getView().findViewById(R.id.search_input);
        
        com.anisflix.repository.MediaRepository.getInstance(getContext()).searchMulti(query, 1, new retrofit2.Callback<com.anisflix.models.TMDBResponse<com.anisflix.models.MultiSearchItem>>() {
            @Override
            public void onResponse(retrofit2.Call<com.anisflix.models.TMDBResponse<com.anisflix.models.MultiSearchItem>> call, retrofit2.Response<com.anisflix.models.TMDBResponse<com.anisflix.models.MultiSearchItem>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    List<com.anisflix.models.MultiSearchItem> results = response.body().getResults();
                    List<com.anisflix.adapters.SearchAdapter.SearchResult> searchResults = new ArrayList<>();
                    if (results != null) {
                        for (com.anisflix.models.MultiSearchItem item : results) {
                            if ("person".equals(item.mediaType)) continue; // Skip people
                            searchResults.add(new com.anisflix.adapters.SearchAdapter.SearchResult(item));
                        }
                    }
                    
                    // Update persistent adapter
                    searchAdapter.updateData(searchResults);
                    
                    // Force dropdown to show if we have text
                     if (searchInput.getText().length() > 0 && !searchResults.isEmpty()) {
                         searchInput.showDropDown();
                    }
                }
            }

            @Override
            public void onFailure(retrofit2.Call<com.anisflix.models.TMDBResponse<com.anisflix.models.MultiSearchItem>> call, Throwable t) {
                // Log error
            }
        });
    }

    private void updateSearchSuggestions(List<com.anisflix.models.Movie> movies, List<com.anisflix.models.Series> series) {
        // Simple aggregation - expensive if called often but okay for this scope
        // Note: In strict implementation we should clear and rebuild or use a Set to avoid duplicates
        // Here we just append for demonstration of the UI
        allSearchItems.clear(); // Fix: Clear previous items to avoid infinite duplicating
        if (movies != null) {
            for (com.anisflix.models.Movie m : movies) {
                allSearchItems.add(new com.anisflix.adapters.SearchAdapter.SearchResult(m));
            }
        }
        if (series != null) {
            for (com.anisflix.models.Series s : series) {
                allSearchItems.add(new com.anisflix.adapters.SearchAdapter.SearchResult(s));
            }
        }
        // Force refresh
        if (searchAdapter != null) {
            searchAdapter = new com.anisflix.adapters.SearchAdapter(getContext(), allSearchItems);
            searchInput.setAdapter(searchAdapter);
            searchInput.setThreshold(1); // Ensure threshold is set
        }
    }

    private <T> void bindSection(int recyclerId, LiveData<List<T>> data, boolean isMovie) {
        RecyclerView recycler = getView().findViewById(recyclerId);
        if (recycler == null) return;
        
        recycler.setLayoutManager(new LinearLayoutManager(getContext(), LinearLayoutManager.HORIZONTAL, false));
        
        if (isMovie) {
            com.anisflix.adapters.HorizontalMediaAdapter adapter = new com.anisflix.adapters.HorizontalMediaAdapter(getContext());
            recycler.setAdapter(adapter);
            adapter.setOnItemClickListener(m -> openMovieDetail(((com.anisflix.models.Movie)m).getId()));
            data.observe(getViewLifecycleOwner(), list -> {
                if (list != null) adapter.setMovies((List<com.anisflix.models.Movie>) list);
            });
        } else {
            com.anisflix.adapters.HorizontalSeriesAdapter adapter = new com.anisflix.adapters.HorizontalSeriesAdapter(getContext());
            recycler.setAdapter(adapter);
            adapter.setOnItemClickListener(s -> openSeriesDetail(((com.anisflix.models.Series)s).getId()));
            data.observe(getViewLifecycleOwner(), list -> {
                if (list != null) adapter.setSeries((List<com.anisflix.models.Series>) list);
            });
        }
    }

    private <T> void addSection(String title, LiveData<List<T>> data, boolean isMovie, 
                               String category, int providerId, int genreId) {
        // Create Section Layout (Title + Header + Recycler)
        android.widget.RelativeLayout headerLayout = new android.widget.RelativeLayout(getContext());
        android.widget.LinearLayout.LayoutParams headerParams = new android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        headerParams.setMargins(0, 48, 0, 24); // mt-24 mb-12
        headerLayout.setLayoutParams(headerParams);
        headerLayout.setPadding(32, 0, 32, 0); // padding 16dp
        
        android.widget.TextView titleView = new android.widget.TextView(getContext());
        titleView.setText(title);
        titleView.setTextColor(android.graphics.Color.WHITE);
        titleView.setTextSize(20);
        titleView.setTypeface(null, android.graphics.Typeface.BOLD);
        android.widget.RelativeLayout.LayoutParams titleParams = new android.widget.RelativeLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleParams.addRule(android.widget.RelativeLayout.ALIGN_PARENT_START);
        headerLayout.addView(titleView, titleParams);
        
        android.widget.TextView seemoreView = new android.widget.TextView(getContext());
        seemoreView.setText("Voir tout >");
        seemoreView.setTextColor(android.graphics.Color.parseColor("#E50914"));
        seemoreView.setTextSize(14);
        android.widget.RelativeLayout.LayoutParams seemoreParams = new android.widget.RelativeLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        seemoreParams.addRule(android.widget.RelativeLayout.ALIGN_PARENT_END);
        seemoreParams.addRule(android.widget.RelativeLayout.CENTER_VERTICAL);
        headerLayout.addView(seemoreView, seemoreParams);
        
        // WIRE CLICK LISTENER for See All
        seemoreView.setOnClickListener(v -> openSectionContent(title, isMovie, category, providerId, genreId));
        
        RecyclerView recycler = new RecyclerView(getContext());
        android.widget.LinearLayout.LayoutParams recyclerParams = new android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        recycler.setLayoutParams(recyclerParams);
        recycler.setPadding(32, 0, 0, 0); // paddingStart 16dp
        recycler.setClipToPadding(false);
        recycler.setLayoutManager(new LinearLayoutManager(getContext(), LinearLayoutManager.HORIZONTAL, false));
        
        // Add to main container
        contentContainer.addView(headerLayout);
        contentContainer.addView(recycler);
        
        // Setup Adapter
        if (isMovie) {
            com.anisflix.adapters.HorizontalMediaAdapter adapter = new com.anisflix.adapters.HorizontalMediaAdapter(getContext());
            recycler.setAdapter(adapter);
            adapter.setOnItemClickListener(m -> openMovieDetail(((com.anisflix.models.Movie)m).getId()));
            data.observe(getViewLifecycleOwner(), list -> {
                if (list != null && !list.isEmpty()) {
                     adapter.setMovies((List<com.anisflix.models.Movie>) list);
                }
            });
        } else {
            com.anisflix.adapters.HorizontalSeriesAdapter adapter = new com.anisflix.adapters.HorizontalSeriesAdapter(getContext());
            recycler.setAdapter(adapter);
            adapter.setOnItemClickListener(s -> openSeriesDetail(((com.anisflix.models.Series)s).getId()));
             data.observe(getViewLifecycleOwner(), list -> {
                if (list != null && !list.isEmpty()) {
                     adapter.setSeries((List<com.anisflix.models.Series>) list);
                }
            });
        }
    }
    
    private void openSectionContent(String title, boolean isMovie, String category, int providerId, int genreId) {
        Intent intent = new Intent(getContext(), com.anisflix.ui.section.SectionContentActivity.class);
        intent.putExtra(com.anisflix.ui.section.SectionContentActivity.EXTRA_TITLE, title);
        intent.putExtra(com.anisflix.ui.section.SectionContentActivity.EXTRA_TYPE, isMovie ? "movie" : "series");
        intent.putExtra(com.anisflix.ui.section.SectionContentActivity.EXTRA_CATEGORY, category);
        if (providerId != -1) intent.putExtra(com.anisflix.ui.section.SectionContentActivity.EXTRA_PROVIDER_ID, providerId);
        if (genreId != -1) intent.putExtra(com.anisflix.ui.section.SectionContentActivity.EXTRA_GENRE_ID, genreId);
        startActivity(intent);
    }
    private void openMovieDetail(int id) {
        Intent intent = new Intent(getContext(), com.anisflix.ui.detail.MovieDetailActivity.class);
        intent.putExtra("movie_id", id);
        startActivity(intent);
    }
    
    private void openSeriesDetail(int id) {
         Intent intent = new Intent(getContext(), com.anisflix.ui.detail.SeriesDetailActivity.class);
         intent.putExtra("series_id", id);
         startActivity(intent);
    }
}
