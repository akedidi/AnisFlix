package com.anisflix.ui.section;

import android.os.Bundle;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.anisflix.R;
import com.anisflix.adapters.HorizontalMediaAdapter;
import com.anisflix.adapters.HorizontalSeriesAdapter;
import com.anisflix.models.Movie;
import com.anisflix.models.Series;
import com.anisflix.repository.MediaRepository;
import com.anisflix.models.TMDBResponse;

import java.util.ArrayList;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class SectionContentActivity extends AppCompatActivity {

    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_TYPE = "type"; // "movie" or "series"
    public static final String EXTRA_CATEGORY = "category"; // Enum name or ID
    public static final String EXTRA_PROVIDER_ID = "provider_id";
    public static final String EXTRA_GENRE_ID = "genre_id";

    private HorizontalMediaAdapter movieAdapter;
    private HorizontalSeriesAdapter seriesAdapter; // Reusing adapters but in grid mode - wait, these use a horizontal item layout. 
    // They are fine for grid too if layout params are match_parent width? No, grid needs specific layout.
    // However, for speed, reusing horizontal item layout (poster card) in a GridLayoutManager works fine.

    private String type;
    private String category;
    private int providerId;
    private int genreId;
    
    private int currentPage = 1;
    private boolean isLoading = false;
    private boolean isLastPage = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_section_content);

        String title = getIntent().getStringExtra(EXTRA_TITLE);
        type = getIntent().getStringExtra(EXTRA_TYPE);
        category = getIntent().getStringExtra(EXTRA_CATEGORY);
        providerId = getIntent().getIntExtra(EXTRA_PROVIDER_ID, -1);
        genreId = getIntent().getIntExtra(EXTRA_GENRE_ID, -1);

        TextView titleView = findViewById(R.id.section_title);
        titleView.setText(title);
        
        findViewById(R.id.back_button).setOnClickListener(v -> finish());

        RecyclerView recycler = findViewById(R.id.section_recycler);
        GridLayoutManager layoutManager = new GridLayoutManager(this, 3); // 3 columns
        recycler.setLayoutManager(layoutManager);

        if ("movie".equals(type)) {
            movieAdapter = new HorizontalMediaAdapter(this);
            movieAdapter.setMovies(new ArrayList<>()); // Init empty
            movieAdapter.setOnItemClickListener(m -> {
                 android.content.Intent intent = new android.content.Intent(this, com.anisflix.ui.detail.MovieDetailActivity.class);
                 intent.putExtra("movie_id", ((Movie)m).getId());
                 startActivity(intent);
            });
            recycler.setAdapter(movieAdapter);
        } else {
            seriesAdapter = new HorizontalSeriesAdapter(this);
            seriesAdapter.setSeries(new ArrayList<>());
            seriesAdapter.setOnItemClickListener(s -> {
                 android.content.Intent intent = new android.content.Intent(this, com.anisflix.ui.detail.SeriesDetailActivity.class);
                 intent.putExtra("series_id", ((Series)s).getId());
                 startActivity(intent);
            });
            recycler.setAdapter(seriesAdapter);
        }

        recycler.addOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override
            public void onScrolled(@NonNull RecyclerView recyclerView, int dx, int dy) {
                super.onScrolled(recyclerView, dx, dy);
                int visibleItemCount = layoutManager.getChildCount();
                int totalItemCount = layoutManager.getItemCount();
                int firstVisibleItemPosition = layoutManager.findFirstVisibleItemPosition();

                if (!isLoading && !isLastPage) {
                    if ((visibleItemCount + firstVisibleItemPosition) >= totalItemCount
                            && firstVisibleItemPosition >= 0) {
                        loadData();
                    }
                }
            }
        });

        loadData();
    }

    private void loadData() {
        isLoading = true;
        // findViewById(R.id.loading_indicator).setVisibility(android.view.View.VISIBLE); // Optional: show bottom loader

        MediaRepository repo = MediaRepository.getInstance(this);

        if ("movie".equals(type)) {
            Callback<TMDBResponse<Movie>> callback = new Callback<TMDBResponse<Movie>>() {
                @Override
                public void onResponse(Call<TMDBResponse<Movie>> call, Response<TMDBResponse<Movie>> response) {
                    isLoading = false;
                    if (response.isSuccessful() && response.body() != null) {
                        List<Movie> results = response.body().getResults();
                        if (results.isEmpty()) isLastPage = true;
                        else {
                            movieAdapter.appendMovies(results); // Need to add append method to adapter
                            if (results.size() < 20) isLastPage = true; // Primitive check or use total_pages
                            currentPage++;
                        }
                    }
                }
                @Override
                public void onFailure(Call<TMDBResponse<Movie>> call, Throwable t) {
                    isLoading = false;
                }
            };

            // Dispatch
            if ("POPULAR".equals(category)) repo.getPopularMovies(currentPage, callback);
            else if ("LATEST".equals(category)) repo.getLatestMovies(currentPage, callback);
            else if ("GENRE".equals(category)) repo.getMoviesByGenre(genreId, currentPage, callback);
            else if ("PROVIDER".equals(category)) repo.getMoviesByProvider(providerId, currentPage, callback);

        } else {
            Callback<TMDBResponse<Series>> callback = new Callback<TMDBResponse<Series>>() {
                @Override
                public void onResponse(Call<TMDBResponse<Series>> call, Response<TMDBResponse<Series>> response) {
                    isLoading = false;
                    if (response.isSuccessful() && response.body() != null) {
                        List<Series> results = response.body().getResults();
                        if (results.isEmpty()) isLastPage = true;
                        else {
                            seriesAdapter.appendSeries(results); // Need to add append
                            if (results.size() < 20) isLastPage = true;
                            currentPage++;
                        }
                    }
                }
                @Override
                public void onFailure(Call<TMDBResponse<Series>> call, Throwable t) {
                    isLoading = false;
                }
            };
            
            if ("POPULAR".equals(category)) repo.getPopularSeries(currentPage, callback);
            else if ("LATEST".equals(category)) repo.getLatestSeries(currentPage, callback);
            else if ("GENRE".equals(category)) repo.getSeriesByGenre(genreId, currentPage, callback);
            else if ("PROVIDER".equals(category)) repo.getSeriesByProvider(providerId, currentPage, callback);
        }
    }
}
