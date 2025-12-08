package com.anisflix.ui.detail;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Button;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.bumptech.glide.Glide;
import com.anisflix.R;
import com.anisflix.models.Movie;
import com.anisflix.ui.player.VideoPlayerActivity;

/**
 * Movie Detail Activity - Shows movie details, streaming sources, cast button
 */
public class MovieDetailActivity extends AppCompatActivity {
    
    public static final String EXTRA_MOVIE_ID = "movie_id";
    
    private MovieDetailViewModel viewModel;
    private ImageView backdropImage;
    private ImageView posterImage;
    private TextView titleText;
    private TextView yearText;
    private TextView ratingText;
    private TextView overviewText;
    private Button playButton;
    private Button castButton;
    private Button favoriteButton;
    private RecyclerView sourcesRecyclerView;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_movie_detail);
        
        initViews();
        setupViewModel();
        loadMovieDetails();
    }
    
    private void initViews() {
        backdropImage = findViewById(R.id.backdrop_image);
        posterImage = findViewById(R.id.poster_image);
        titleText = findViewById(R.id.title_text);
        yearText = findViewById(R.id.year_text);
        ratingText = findViewById(R.id.rating_text);
        overviewText = findViewById(R.id.overview_text);
        playButton = findViewById(R.id.play_button);
        castButton = findViewById(R.id.cast_button);
        favoriteButton = findViewById(R.id.favorite_button);
        sourcesRecyclerView = findViewById(R.id.sources_recycler);
        
        sourcesRecyclerView.setLayoutManager(new LinearLayoutManager(this));
        
        playButton.setOnClickListener(v -> playMovie());
        castButton.setOnClickListener(v -> showCastDialog());
        favoriteButton.setOnClickListener(v -> toggleFavorite());
    }
    
    private void setupViewModel() {
        viewModel = new ViewModelProvider(this).get(MovieDetailViewModel.class);
        
        viewModel.getMovie().observe(this, this::displayMovieDetails);
        viewModel.getStreamingSources().observe(this, sources -> {
            // TODO: Setup sources adapter
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
        ratingText.setText(String.format("⭐ %.1f", movie.getRating()));
        overviewText.setText(movie.getOverview());
        
        Glide.with(this)
                .load(movie.getFullBackdropUrl())
                .into(backdropImage);
        
        Glide.with(this)
                .load(movie.getFullPosterUrl())
                .into(posterImage);
    }
    
    private void playMovie() {
        Intent intent = new Intent(this, VideoPlayerActivity.class);
        intent.putExtra(VideoPlayerActivity.EXTRA_MOVIE_ID, viewModel.getMovie().getValue().getId());
        intent.putExtra(VideoPlayerActivity.EXTRA_TITLE, viewModel.getMovie().getValue().getTitle());
        startActivity(intent);
    }
    
    private void showCastDialog() {
        // TODO: Implement Chromecast dialog
    }
    
    private void toggleFavorite() {
        viewModel.toggleFavorite();
    }
}
