package com.anisflix.ui.search;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.anisflix.R;
import com.anisflix.adapters.MediaGridAdapter;
import com.anisflix.utils.Constants;

/**
 * Search Fragment with autocomplete
 */
public class SearchFragment extends Fragment {
    
    private SearchViewModel viewModel;
    private EditText searchInput;
    private RecyclerView resultsRecycler;
    private MediaGridAdapter adapter;
    private Handler searchHandler;
    private Runnable searchRunnable;
    
    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        viewModel = new ViewModelProvider(this).get(SearchViewModel.class);
        searchHandler = new Handler(Looper.getMainLooper());
    }
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_search, container, false);
        initViews(view);
        setupSearch();
        observeData();
        return view;
    }
    
    private void initViews(View view) {
        searchInput = view.findViewById(R.id.search_input);
        resultsRecycler = view.findViewById(R.id.results_recycler);
        
        GridLayoutManager layoutManager = new GridLayoutManager(getContext(), Constants.GRID_COLUMNS_PORTRAIT);
        resultsRecycler.setLayoutManager(layoutManager);
        
        adapter = new MediaGridAdapter(getContext());
        resultsRecycler.setAdapter(adapter);
    }
    
    private void setupSearch() {
        searchInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                // Cancel previous search
                if (searchRunnable != null) {
                    searchHandler.removeCallbacks(searchRunnable);
                }
                
                // Schedule new search with debounce
                searchRunnable = () -> {
                    String query = s.toString().trim();
                    if (query.length() >= Constants.AUTOCOMPLETE_MIN_CHARS) {
                        viewModel.search(query);
                    } else {
                        viewModel.clearResults();
                    }
                };
                
                searchHandler.postDelayed(searchRunnable, Constants.SEARCH_DEBOUNCE_MS);
            }
            
            @Override
            public void afterTextChanged(Editable s) {}
        });
    }
    
    private void observeData() {
        viewModel.getSearchResults().observe(getViewLifecycleOwner(), results -> {
            if (results != null && !results.isEmpty()) {
                adapter.setMovies(results);  // Mixed movies/series
            }
        });
    }
    
    @Override
    public void onDestroyView() {
        super.onDestroyView();
        if (searchHandler != null && searchRunnable != null) {
            searchHandler.removeCallbacks(searchRunnable);
        }
    }
}
