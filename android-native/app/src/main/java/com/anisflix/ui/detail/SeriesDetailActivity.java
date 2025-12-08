package com.anisflix.ui.detail;

import android.content.Intent;
import android.os.Bundle;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Button;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.bumptech.glide.Glide;
import com.anisflix.R;
import com.anisflix.models.Series;
import com.anisflix.ui.player.VideoPlayerActivity;

/**
 * Series Detail Activity - Shows series details, seasons, episodes
 */
public class SeriesDetailActivity extends AppCompatActivity {
    
    public static final String EXTRA_SERIES_ID = "series_id";
    
    private SeriesDetailViewModel viewModel;
    private ImageView backdropImage;
    private TextView titleText;
    private TextView yearText;
    private TextView ratingText;
    private TextView overviewText;
    private RecyclerView seasonsRecyclerView;
    private RecyclerView episodesRecyclerView;
    private Button playButton;
    private Button castButton;
    private Button favoriteButton;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_series_detail);
        
        initViews();
        setupViewModel();
        loadSeriesDetails();
    }
    
    private void initViews() {
        backdropImage = findViewById(R.id.backdrop_image);
        titleText = findViewById(R.id.title_text);
        yearText = findViewById(R.id.year_text);
        ratingText = findViewById(R.id.rating_text);
        overviewText = findViewById(R.id.overview_text);
        seasonsRecyclerView = findViewById(R.id.seasons_recycler);
        episodesRecyclerView = findViewById(R.id.episodes_recycler);
        playButton = findViewById(R.id.play_button);
        castButton = findViewById(R.id.cast_button);
        favoriteButton = findViewById(R.id.favorite_button);
        
        seasonsRecyclerView.setLayoutManager(new LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false));
        episodesRecyclerView.setLayoutManager(new LinearLayoutManager(this));
        
        playButton.setOnClickListener(v -> playSelectedEpisode());
        favoriteButton.setOnClickListener(v -> viewModel.toggleFavorite());
    }
    
    private void setupViewModel() {
        viewModel = new ViewModelProvider(this).get(SeriesDetailViewModel.class);
        
        viewModel.getSeries().observe(this, this::displaySeriesDetails);
        viewModel.getEpisodes().observe(this, episodes -> {
            // TODO: Setup episodes adapter
        });
    }
    
    private void loadSeriesDetails() {
        int seriesId = getIntent().getIntExtra(EXTRA_SERIES_ID, -1);
        if (seriesId != -1) {
            viewModel.loadSeries(seriesId);
        }
    }
    
    private void displaySeriesDetails(Series series) {
        if (series == null) return;
        
        titleText.setText(series.getName());
        yearText.setText(series.getYear());
        ratingText.setText(String.format("⭐ %.1f", series.getRating()));
        overviewText.setText(series.getOverview());
        
        Glide.with(this)
                .load(series.getFullBackdropUrl())
                .into(backdropImage);
    }
    
    private void playSelectedEpisode() {
        // TODO: Get selected episode
        Intent intent = new Intent(this, VideoPlayerActivity.class);
        intent.putExtra(VideoPlayerActivity.EXTRA_SERIES_ID, viewModel.getSeries().getValue().getId());
        startActivity(intent);
    }
}
