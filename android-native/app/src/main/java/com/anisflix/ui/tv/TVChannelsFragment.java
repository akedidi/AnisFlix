package com.anisflix.ui.tv;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.anisflix.R;

/**
 * TV Channels Fragment
 */
public class TVChannelsFragment extends Fragment {
    
    private TVChannelsViewModel viewModel;
    private RecyclerView recyclerView;
    
    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        viewModel = new ViewModelProvider(this).get(TVChannelsViewModel.class);
    }
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_tv_channels, container, false);
        initViews(view);
        observeData();
        return view;
    }
    
    private com.google.android.material.tabs.TabLayout tabs;
    private androidx.recyclerview.widget.RecyclerView categoriesRecycler;
    private com.anisflix.adapters.CategoryAdapter categoryAdapter;

    private com.google.android.exoplayer2.ExoPlayer player;
    private com.google.android.exoplayer2.ui.StyledPlayerView playerView;
    private View playerContainer;
    private View playerCloseBtn;

    private void initViews(View view) {
        android.widget.EditText searchInput = view.findViewById(R.id.search_input);
        tabs = view.findViewById(R.id.sections_tabs);
        categoriesRecycler = view.findViewById(R.id.categories_recycler);
        recyclerView = view.findViewById(R.id.recycler_view);
        
        // Player Init
        playerContainer = view.findViewById(R.id.player_container);
        playerView = view.findViewById(R.id.player_view);
        playerCloseBtn = view.findViewById(R.id.player_close_btn);
        
        player = new com.google.android.exoplayer2.ExoPlayer.Builder(getContext()).build();
        playerView.setPlayer(player);
        
        playerCloseBtn.setOnClickListener(v -> {
            player.stop();
            playerContainer.setVisibility(View.GONE);
        });
        
        // Setup Grid for Channels
        GridLayoutManager layoutManager = new GridLayoutManager(getContext(), 3);
        recyclerView.setLayoutManager(layoutManager);
        
        com.anisflix.adapters.TVChannelsAdapter adapter = new com.anisflix.adapters.TVChannelsAdapter(getContext());
        adapter.setOnChannelClickListener(channel -> {
             if (channel.getLinks() != null && !channel.getLinks().isEmpty()) {
                  String streamUrl = channel.getLinks().get(0).getUrl();
                 playChannel(streamUrl);
             }
        });
        recyclerView.setAdapter(adapter);
        
        // Setup Categories Chips
        categoryAdapter = new com.anisflix.adapters.CategoryAdapter(getContext());
        categoriesRecycler.setAdapter(categoryAdapter);
        categoryAdapter.setOnCategoryClickListener(category -> {
            viewModel.selectCategory(category);
        });
        
        // Setup Tabs Listener
        tabs.addOnTabSelectedListener(new com.google.android.material.tabs.TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(com.google.android.material.tabs.TabLayout.Tab tab) {
                if (tab.getTag() instanceof com.anisflix.models.TVSection) {
                    viewModel.selectSection((com.anisflix.models.TVSection) tab.getTag());
                }
            }
            @Override public void onTabUnselected(com.google.android.material.tabs.TabLayout.Tab tab) {}
            @Override public void onTabReselected(com.google.android.material.tabs.TabLayout.Tab tab) {}
        });
        
        // Search Logic
        searchInput.addTextChangedListener(new android.text.TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {}
            
            @Override
            public void afterTextChanged(android.text.Editable s) {
                viewModel.search(s.toString());
            }
        });
    }
    
    private void playChannel(String url) {
        if (url == null || url.isEmpty()) return;
        
        playerContainer.setVisibility(View.VISIBLE);
        com.google.android.exoplayer2.MediaItem mediaItem = com.google.android.exoplayer2.MediaItem.fromUri(url);
        player.setMediaItem(mediaItem);
        player.prepare();
        player.play();
    }
    
    @Override
    public void onPause() {
        super.onPause();
        if (player != null) {
            player.pause();
        }
    }
    
    @Override
    public void onDestroyView() {
        super.onDestroyView();
        if (player != null) {
            player.release();
            player = null;
        }
    }
    
    private void observeData() {
        // Sections -> Tabs
        viewModel.getSections().observe(getViewLifecycleOwner(), sections -> {
            tabs.removeAllTabs();
            if (sections != null) {
                for (com.anisflix.models.TVSection section : sections) {
                    com.google.android.material.tabs.TabLayout.Tab tab = tabs.newTab();
                    tab.setText(section.getName());
                    tab.setTag(section);
                    tabs.addTab(tab);
                }
            }
        });
        
        // Categories -> Chips
        viewModel.getCategories().observe(getViewLifecycleOwner(), categories -> {
            categoryAdapter.setCategories(categories);
            if (categories != null && !categories.isEmpty()) {
                viewModel.selectCategory(categories.get(0));
            }
        });
        
        // Channels -> Grid
        viewModel.getChannels().observe(getViewLifecycleOwner(), channels -> {
            ((com.anisflix.adapters.TVChannelsAdapter) recyclerView.getAdapter()).setChannels(channels);
            
            // Show/Hide Empty/Error stuff if needed, but error handled separately
        });
        
        viewModel.getIsLoading().observe(getViewLifecycleOwner(), isLoading -> {
            View loadingIndicator = getView().findViewById(R.id.loading_indicator);
            if (loadingIndicator != null) {
                loadingIndicator.setVisibility(isLoading ? View.VISIBLE : View.GONE);
            }
        });
        
        viewModel.getError().observe(getViewLifecycleOwner(), errorMsg -> {
             android.widget.TextView errorText = getView().findViewById(R.id.error_text);
             if (errorText != null) {
                 if (errorMsg != null) {
                     errorText.setText(errorMsg);
                     errorText.setVisibility(View.VISIBLE);
                     recyclerView.setVisibility(View.GONE);
                 } else {
                     errorText.setVisibility(View.GONE);
                     recyclerView.setVisibility(View.VISIBLE);
                 }
             }
        });
    }
}
