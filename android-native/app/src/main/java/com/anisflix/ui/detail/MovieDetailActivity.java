package com.anisflix.ui.detail;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.graphics.Color;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.bumptech.glide.Glide;
import com.anisflix.R;
import com.anisflix.models.Movie;
import com.anisflix.models.StreamingSource;
import com.anisflix.ui.player.VideoPlayerActivity;
import java.util.ArrayList;
import java.util.List;

public class MovieDetailActivity extends AppCompatActivity {
    
    public static final String EXTRA_MOVIE_ID = "movie_id";
    
    private MovieDetailViewModel viewModel;
    private ImageView backdropImage;
    private ImageButton backButton;
    private TextView titleText;
    private TextView yearText;
    private TextView ratingText;
    private TextView durationText;
    private TextView overviewText;
    private ImageButton favoriteButton;
    private LinearLayout genresContainer;
    
    // Tabs
    private TextView tabVf;
    private TextView tabVostfr;
    private TextView tabVo;
    private View tabIndicator;
    private String currentConfig = "VF"; // Default
    
    private RecyclerView sourcesRecyclerView;
    private SourcesAdapter sourcesAdapter;
    
    // Similar
    private RecyclerView similarRecyclerView;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_movie_detail);
        
        // Transparent Status Bar
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
        
        initViews();
        setupViewModel();
        setupTabs(); // Called after ViewModel init to avoid NPE
        loadMovieDetails();
    }
    
    private void initViews() {
        backdropImage = findViewById(R.id.backdrop_image);
        backButton = findViewById(R.id.back_button);
        titleText = findViewById(R.id.title_text);
        yearText = findViewById(R.id.year_text);
        ratingText = findViewById(R.id.rating_text);
        durationText = findViewById(R.id.duration_text);
        overviewText = findViewById(R.id.overview_text);
        favoriteButton = findViewById(R.id.favorite_button);
        genresContainer = findViewById(R.id.genres_container);
        
        tabVf = findViewById(R.id.tab_vf);
        tabVostfr = findViewById(R.id.tab_vostfr);
        tabVo = findViewById(R.id.tab_vo);
        tabIndicator = findViewById(R.id.tab_indicator);
        
        sourcesRecyclerView = findViewById(R.id.sources_recycler);
        sourcesRecyclerView.setLayoutManager(new LinearLayoutManager(this));
        sourcesAdapter = new SourcesAdapter();
        sourcesRecyclerView.setAdapter(sourcesAdapter);
        
        similarRecyclerView = findViewById(R.id.similar_recycler);
        // similar setup later
        
        backButton.setOnClickListener(v -> finish());
        favoriteButton.setOnClickListener(v -> viewModel.toggleFavorite());
    }
    
    private void setupTabs() {
        View.OnClickListener tabListener = v -> {
            if (v == tabVf) selectTab("VF");
            else if (v == tabVostfr) selectTab("VOSTFR");
            else if (v == tabVo) selectTab("VO");
        };
        
        tabVf.setOnClickListener(tabListener);
        tabVostfr.setOnClickListener(tabListener);
        tabVo.setOnClickListener(tabListener);
        
        selectTab("VF"); // Default
    }
    
    private void selectTab(String config) {
        this.currentConfig = config;
        
        // Reset colors
        tabVf.setTextColor(Color.DKGRAY);
        tabVostfr.setTextColor(Color.DKGRAY);
        tabVo.setTextColor(Color.DKGRAY);
        
        // Highlight selected
        TextView selected = "VF".equals(config) ? tabVf : ("VOSTFR".equals(config) ? tabVostfr : tabVo);
        selected.setTextColor(Color.parseColor("#E50914"));
        
        // Animate Indicator (Simple translation)
        float targetX = 0;
        if ("VOSTFR".equals(config)) targetX = tabVostfr.getX();
        else if ("VO".equals(config)) targetX = tabVo.getX();
        
        // Wait for layout passes if X is 0 initially? 
        // For simplicity we just rely on filtering logic update here
        updateSourcesList();
    }
    
    private void setupViewModel() {
        viewModel = new ViewModelProvider(this).get(MovieDetailViewModel.class);
        
        viewModel.getMovie().observe(this, this::displayMovieDetails);
        viewModel.getStreamingSources().observe(this, sources -> {
            updateSourcesList();
        });
    }
    
    private void loadMovieDetails() {
        int movieId = getIntent().getIntExtra(EXTRA_MOVIE_ID, -1);
        if (movieId != -1) {
            viewModel.loadMovie(movieId);
        }
    }
    
    private void displayMovieDetails(Movie movie) {
        if (movie == null) return;
        
        titleText.setText(movie.getTitle());
        yearText.setText(movie.getYear());
        ratingText.setText(String.format("%.1f", movie.getRating()));
        overviewText.setText(movie.getOverview());
        durationText.setText("1h 30"); // Placeholder, need runtime from API
        
        Glide.with(this).load(movie.getFullBackdropUrl()).into(backdropImage);
        
        // Genres
        genresContainer.removeAllViews();
        // Mock genres if not fully loaded or parse IDs
        // For now simple pill
        addGenrePill("Action");
        addGenrePill("Drame");
    }
    
    private void addGenrePill(String name) {
        TextView pill = new TextView(this);
        pill.setText(name);
        pill.setTextColor(Color.LTGRAY);
        pill.setTextSize(12);
        pill.setBackgroundResource(R.drawable.bg_genre_pill);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, 0, 16, 0);
        pill.setLayoutParams(params);
        genresContainer.addView(pill);
    }
    
    private void updateSourcesList() {
        List<StreamingSource> allSources = viewModel.getStreamingSources().getValue();
        if (allSources == null) return;
        
        List<StreamingSource> filtered = new ArrayList<>();
        for (StreamingSource s : allSources) {
             // Basic filtering logic - assuming API returns language field or we filter by property
             // If API doesn't have strict 'VF'/'VOSTFR' fields yet, we might show all
             // But assuming new StreamingSource model has 'language'
             if (s.getLanguage() != null && s.getLanguage().equalsIgnoreCase(currentConfig)) {
                 filtered.add(s);
             } else if (s.getLanguage() == null && "VO".equals(currentConfig)) {
                 // Fallback
                 filtered.add(s);
             }
        }
        sourcesAdapter.setItems(filtered);
    }
    
    // Adapter Class
    private class SourcesAdapter extends RecyclerView.Adapter<SourcesAdapter.ViewHolder> {
        private List<StreamingSource> items = new ArrayList<>();
        
        public void setItems(List<StreamingSource> newItems) {
            this.items = newItems;
            notifyDataSetChanged();
        }

        @Override
        public ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
            View v = getLayoutInflater().inflate(R.layout.item_source_row, parent, false);
            return new ViewHolder(v);
        }

        @Override
        public void onBindViewHolder(ViewHolder holder, int position) {
            StreamingSource source = items.get(position);
            holder.name.setText(source.getSource() + " - " + source.getQuality());
            holder.itemView.setOnClickListener(v -> {
                 Intent intent = new Intent(MovieDetailActivity.this, VideoPlayerActivity.class);
                 // Pass source URL
                 intent.putExtra("video_url", source.getUrl());
                 intent.putExtra(VideoPlayerActivity.EXTRA_TITLE, titleText.getText().toString());
                 startActivity(intent);
            });
        }

        @Override
        public int getItemCount() { return items.size(); }

        class ViewHolder extends RecyclerView.ViewHolder {
            TextView name;
            public ViewHolder(View itemView) {
                super(itemView);
                name = itemView.findViewById(R.id.source_name);
            }
        }
    }
}
