package com.anisflix.ui.movies;

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
import com.anisflix.adapters.MediaGridAdapter;

/**
 * Movies Fragment - Shows movies with genre filtering
 */
public class MoviesFragment extends Fragment {
    
    private MoviesViewModel viewModel;
    private RecyclerView recyclerView;
    private MediaGridAdapter adapter;
    
    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        viewModel = new ViewModelProvider(this).get(MoviesViewModel.class);
    }
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_movies, container, false);
        initViews(view);
        observeData();
        return view;
    }
    
    private void initViews(View view) {
        recyclerView = view.findViewById(R.id.recycler_view);
        
        // Grid layout with 2 columns (poster view)
        GridLayoutManager layoutManager = new GridLayoutManager(getContext(), 2);
        recyclerView.setLayoutManager(layoutManager);
        
        adapter = new MediaGridAdapter(getContext());
        recyclerView.setAdapter(adapter);
    }
    
    private void observeData() {
        viewModel.getMovies().observe(getViewLifecycleOwner(), movies -> {
            if (movies != null) {
                adapter.setMovies(movies);
            }
        });
        
        viewModel.getIsLoading().observe(getViewLifecycleOwner(), isLoading -> {
            // Show/hide loading indicator
        });
    }
}
