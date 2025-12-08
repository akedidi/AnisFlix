package com.anisflix.ui.favorites;

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
 * Favorites Fragment - Shows favorited movies/series
 */
public class FavoritesFragment extends Fragment {
    
    private FavoritesViewModel viewModel;
    private RecyclerView recyclerView;
    private MediaGridAdapter adapter;
    
    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        viewModel = new ViewModelProvider(this).get(FavoritesViewModel.class);
    }
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_favorites, container, false);
        initViews(view);
        observeData();
        return view;
    }
    
    private void initViews(View view) {
        recyclerView = view.findViewById(R.id.recycler_view);
        
        GridLayoutManager layoutManager = new GridLayoutManager(getContext(), 2);
        recyclerView.setLayoutManager(layoutManager);
        
        adapter = new MediaGridAdapter(getContext());
        recyclerView.setAdapter(adapter);
    }
    
    private void observeData() {
        viewModel.getFavoriteMovies().observe(getViewLifecycleOwner(), movies -> {
            if (movies != null) {
                adapter.setMovies(movies);
            }
        });
    }
}
