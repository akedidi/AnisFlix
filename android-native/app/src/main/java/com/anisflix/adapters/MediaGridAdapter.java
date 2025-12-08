package com.anisflix.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.bumptech.glide.Glide;
import com.anisflix.R;
import com.anisflix.models.Movie;
import com.anisflix.models.Series;
import java.util.ArrayList;
import java.util.List;

/**
 * RecyclerView Adapter for Movies/Series grid display
 */
public class MediaGridAdapter extends RecyclerView.Adapter<MediaGridAdapter.ViewHolder> {
    
    private final Context context;
    private List<Movie> movies = new ArrayList<>();
    private List<Series> series = new ArrayList<>();
    private OnItemClickListener listener;
    
    public interface OnItemClickListener {
        void onMovieClick(Movie movie);
        void onSeriesClick(Series series);
    }
    
    public MediaGridAdapter(Context context) {
        this.context = context;
    }
    
    public void setMovies(List<Movie> movies) {
        this.movies = movies;
        this.series.clear();
        notifyDataSetChanged();
    }
    
    public void setSeries(List<Series> series) {
        this.series = series;
        this.movies.clear();
        notifyDataSetChanged();
    }
    
    public void setOnItemClickListener(OnItemClickListener listener) {
        this.listener = listener;
    }
    
    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_media_grid, parent, false);
        return new ViewHolder(view);
    }
    
    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        if (!movies.isEmpty()) {
            Movie movie = movies.get(position);
            holder.bind(movie);
        } else if (!series.isEmpty()) {
            Series serie = series.get(position);
            holder.bind(serie);
        }
    }
    
    @Override
    public int getItemCount() {
        return !movies.isEmpty() ? movies.size() : series.size();
    }
    
    class ViewHolder extends RecyclerView.ViewHolder {
        private final ImageView posterImage;
        private final TextView titleText;
        private final TextView ratingText;
        
        ViewHolder(@NonNull View itemView) {
            super(itemView);
            posterImage = itemView.findViewById(R.id.poster_image);
            titleText = itemView.findViewById(R.id.title_text);
            ratingText = itemView.findViewById(R.id.rating_text);
        }
        
        void bind(Movie movie) {
            titleText.setText(movie.getTitle());
            ratingText.setText(String.format("%.1f", movie.getRating()));
            
            Glide.with(context)
                    .load(movie.getFullPosterUrl())
                    .placeholder(R.drawable.placeholder_poster)
                    .into(posterImage);
            
            itemView.setOnClickListener(v -> {
                if (listener != null) {
                    listener.onMovieClick(movie);
                }
            });
        }
        
        void bind(Series series) {
            titleText.setText(series.getName());
            ratingText.setText(String.format("%.1f", series.getRating()));
            
            Glide.with(context)
                    .load(series.getFullPosterUrl())
                    .placeholder(R.drawable.placeholder_poster)
                    .into(posterImage);
            
            itemView.setOnClickListener(v -> {
                if (listener != null) {
                    listener.onSeriesClick(series);
                }
            });
        }
    }
}
