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
import com.anisflix.models.Series;
import com.anisflix.models.Episode;
import com.anisflix.ui.player.VideoPlayerActivity;
import java.util.ArrayList;
import java.util.List;

public class SeriesDetailActivity extends AppCompatActivity {
    
    public static final String EXTRA_SERIES_ID = "series_id";
    
    private SeriesDetailViewModel viewModel;
    private ImageView backdropImage;
    private ImageButton backButton;
    private TextView titleText;
    private TextView yearText;
    private TextView ratingText;
    private TextView seasonsCountText;
    private TextView overviewText;
    private ImageButton favoriteButton;
    private LinearLayout genresContainer;
    
    private LinearLayout seasonsContainer; // Scrollable pills
    private RecyclerView episodesRecyclerView;
    private EpisodesAdapter episodesAdapter;
    
    private int currentSeason = 1;
    private List<TextView> seasonPills = new ArrayList<>();
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_series_detail);
        
        // Transparent Status Bar
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
        
        initViews();
        setupViewModel();
        loadSeriesDetails();
    }
    
    private void initViews() {
        backdropImage = findViewById(R.id.backdrop_image);
        backButton = findViewById(R.id.back_button);
        titleText = findViewById(R.id.title_text);
        yearText = findViewById(R.id.year_text);
        ratingText = findViewById(R.id.rating_text);
        seasonsCountText = findViewById(R.id.seasons_count_text);
        overviewText = findViewById(R.id.overview_text);
        favoriteButton = findViewById(R.id.favorite_button);
        genresContainer = findViewById(R.id.genres_container);
        
        seasonsContainer = findViewById(R.id.seasons_container);
        episodesRecyclerView = findViewById(R.id.episodes_recycler);
        
        episodesRecyclerView.setLayoutManager(new LinearLayoutManager(this));
        episodesAdapter = new EpisodesAdapter();
        episodesRecyclerView.setAdapter(episodesAdapter);
        
        backButton.setOnClickListener(v -> finish());
        favoriteButton.setOnClickListener(v -> viewModel.toggleFavorite());
    }
    
    private void setupViewModel() {
        viewModel = new ViewModelProvider(this).get(SeriesDetailViewModel.class);
        
        viewModel.getSeries().observe(this, this::displaySeriesDetails);
        viewModel.getEpisodes().observe(this, episodes -> {
            episodesAdapter.setItems(episodes);
        });
        
        setupSeasons();
    }
    
    private int currentSeriesId = -1;

    // ...

    private void loadSeriesDetails() {
        currentSeriesId = getIntent().getIntExtra(EXTRA_SERIES_ID, -1);
        if (currentSeriesId != -1) {
            viewModel.loadSeries(currentSeriesId);
        }
    }
    
    // ...

    private void selectSeason(int season) {
        currentSeason = season;
        // Update pills usage
        // setupSeasons(); // Do NOT re-call setupSeasons here as it adds observers/views again!
        // Instead, just update visual state of existing pills
        
        for (int i = 0; i < seasonsContainer.getChildCount(); i++) {
            TextView pill = (TextView) seasonsContainer.getChildAt(i);
            int seasonNum = i + 1;
             pill.setTextColor(seasonNum == currentSeason ? 
                android.graphics.Color.WHITE : android.graphics.Color.parseColor("#80FFFFFF"));
             pill.setBackgroundResource(seasonNum == currentSeason ?
                R.drawable.bg_season_selected : R.drawable.bg_season_unselected);
        }

        // Load episodes
        viewModel.loadEpisodes(currentSeason);
    }

    private void displaySeriesDetails(Series series) {
        if (series == null) return;
        
        titleText.setText(series.getName());
        yearText.setText(series.getFirstAirDate() != null && series.getFirstAirDate().length() >= 4 
                ? series.getFirstAirDate().substring(0, 4) : "");
        ratingText.setText(String.format("%.1f", series.getRating()));
        overviewText.setText(series.getOverview());
        // Seasons count handled by observer in setupSeasons
        
        Glide.with(this).load(series.getFullBackdropUrl()).into(backdropImage);
        
        // Mock mocked genres
        genresContainer.removeAllViews();
        addGenrePill("Drame");
        addGenrePill("Western");
        
        // Ensure seasons are set up (observer handles logic)
        // setupSeasons() is called in setupViewModel/onCreate
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
    
    private void setupSeasons() {
        // Mock season count if unknown or fetched
        // Ideally logic should update this after fetching series details details
        // For now, let's assume we get season count from Series object
        
        viewModel.getSeries().observe(this, series -> {
            if (series != null) {
                // Populate seasons
                int count = series.getNumberOfSeasons();
                seasonsCountText.setText(count + " Saisons");
                
                seasonsContainer.removeAllViews();
                
                for (int i = 1; i <= count; i++) {
                    final int seasonNum = i;
                    TextView seasonPill = new TextView(this);
                    seasonPill.setText("Saison " + i);
                    seasonPill.setPadding(32, 16, 32, 16);
                    seasonPill.setTextSize(14);
                    seasonPill.setTextColor(i == currentSeason ? 
                        android.graphics.Color.WHITE : android.graphics.Color.parseColor("#80FFFFFF"));
                    seasonPill.setBackgroundResource(i == currentSeason ?
                        R.drawable.bg_season_selected : R.drawable.bg_season_unselected);
                        
                    android.widget.LinearLayout.LayoutParams params = new android.widget.LinearLayout.LayoutParams(
                        android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
                        android.view.ViewGroup.LayoutParams.WRAP_CONTENT
                    );
                    params.setMargins(0, 0, 16, 0);
                    seasonPill.setLayoutParams(params);
                    
                    seasonPill.setOnClickListener(v -> selectSeason(seasonNum));
                    seasonsContainer.addView(seasonPill);
                }
            }
        });
    }
    

    
    // Adapter
    private class EpisodesAdapter extends RecyclerView.Adapter<EpisodesAdapter.ViewHolder> {
        private List<Episode> items = new ArrayList<>();
        
        public void setItems(List<Episode> newItems) {
            this.items = newItems;
            notifyDataSetChanged();
        }

        @Override
        public ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
            View v = getLayoutInflater().inflate(R.layout.item_episode_row, parent, false);
            return new ViewHolder(v);
        }

        @Override
        public void onBindViewHolder(ViewHolder holder, int position) {
            Episode ep = items.get(position);
            holder.title.setText(ep.getEpisodeNumber() + ". " + ep.getName());
            holder.overview.setText(ep.getOverview());
            holder.duration.setText("1h " + (position + 5) + "m"); // Mock duration if not in model
            
            Glide.with(SeriesDetailActivity.this)
                 .load("https://image.tmdb.org/t/p/w300" + ep.getStillPath())
                 .placeholder(R.drawable.placeholder_poster) // ensure exists or remove
                 .error(android.R.drawable.ic_menu_gallery)
                 .into(holder.image);
                 
            holder.itemView.setOnClickListener(v -> {
                 Intent intent = new Intent(SeriesDetailActivity.this, com.anisflix.ui.player.VideoPlayerActivity.class);
                intent.putExtra(VideoPlayerActivity.EXTRA_TITLE, ep.getName());
                intent.putExtra(VideoPlayerActivity.EXTRA_STREAM_URL, ""); // Will be fetched in player
                // We need to pass provider, or handle auto-selection
                // Actually VideoPlayer handles EXTRA_MOVIE_ID/SERIES_ID and can fetch?
                // The current VideoPlayer expects EXTRA_STREAM_URL and EXTRA_PROVIDER
                // OR it has 'extractAndPlay'.
                // Ideally we pass SERIES_ID, SEASON, EPISODE and let Player fetch sources if not provided?
                // The Player currently *receives* streamUrl and provider.
                // So we need to select a source BEFORE launching player.
                // Creating a dialog or auto-selecting best source here?
                // For now, let's just pass metadata and IDs.
                intent.putExtra(VideoPlayerActivity.EXTRA_SERIES_ID, currentSeriesId);
                intent.putExtra(VideoPlayerActivity.EXTRA_SEASON, currentSeason);
                intent.putExtra(VideoPlayerActivity.EXTRA_EPISODE, ep.getEpisodeNumber());
                intent.putExtra(VideoPlayerActivity.EXTRA_EPISODE_ID, ep.getId());
                startActivity(intent);
            });
        }

        @Override
        public int getItemCount() { return items.size(); }

        class ViewHolder extends RecyclerView.ViewHolder {
            ImageView image;
            TextView title, overview, duration;
            public ViewHolder(View itemView) {
                super(itemView);
                image = itemView.findViewById(R.id.episode_image);
                title = itemView.findViewById(R.id.episode_title);
                overview = itemView.findViewById(R.id.episode_overview);
                duration = itemView.findViewById(R.id.episode_duration);
            }
        }
    }
}
