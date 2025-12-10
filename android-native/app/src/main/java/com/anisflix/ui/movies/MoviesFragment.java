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
    private android.widget.LinearLayout container;
    
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
        this.container = view.findViewById(R.id.movies_container);
        
        setupSection("À l'affiche", viewModel.getNowPlayingMovies(), "LATEST");
        setupSection("Tendances", viewModel.getTrendingMovies(), "TRENDING"); // Wait, check SectionContentActivity constants?
        setupSection("Les Mieux Notés", viewModel.getTopRatedMovies(), "TOP_RATED"); // Can use GENRE or Specific implementation in SectionContentActivity
        setupSection("Prochainement", viewModel.getUpcomingMovies(), "UPCOMING");
        setupSection("Populaires", viewModel.getPopularMovies(), "POPULAR");
        
        return view;
    }
    
    private void setupSection(String title, androidx.lifecycle.LiveData<java.util.List<com.anisflix.models.Movie>> liveData, String categoryKey) {
        View sectionView = getLayoutInflater().inflate(R.layout.item_section_layout, container, false);
        
        android.widget.TextView titleView = sectionView.findViewById(R.id.section_title);
        titleView.setText(title);
        
        android.widget.TextView         seeAllBtn = sectionView.findViewById(R.id.see_all_button);
        seeAllBtn.setOnClickListener(v -> {
            android.content.Intent intent = new android.content.Intent(getContext(), com.anisflix.ui.section.SectionContentActivity.class);
            intent.putExtra(com.anisflix.ui.section.SectionContentActivity.EXTRA_TITLE, title);
            intent.putExtra(com.anisflix.ui.section.SectionContentActivity.EXTRA_TYPE, "movie");
            intent.putExtra(com.anisflix.ui.section.SectionContentActivity.EXTRA_CATEGORY, categoryKey);
            startActivity(intent);
        });
        
        RecyclerView recycler = sectionView.findViewById(R.id.section_recycler);
        recycler.setLayoutManager(new androidx.recyclerview.widget.LinearLayoutManager(getContext(), RecyclerView.HORIZONTAL, false));
        
        com.anisflix.adapters.HorizontalMediaAdapter adapter = new com.anisflix.adapters.HorizontalMediaAdapter(getContext());
        adapter.setOnItemClickListener(movie -> {
             android.content.Intent intent = new android.content.Intent(getContext(), com.anisflix.ui.detail.MovieDetailActivity.class);
             intent.putExtra("movie_id", movie.getId());
             startActivity(intent);
        });
        recycler.setAdapter(adapter);
        
        View loading = sectionView.findViewById(R.id.section_loading);
        loading.setVisibility(View.VISIBLE);
        
        liveData.observe(getViewLifecycleOwner(), movies -> {
            loading.setVisibility(View.GONE);
            if (movies != null && !movies.isEmpty()) {
                adapter.setMovies(movies);
                container.addView(sectionView);
            }
        });
    }
}
