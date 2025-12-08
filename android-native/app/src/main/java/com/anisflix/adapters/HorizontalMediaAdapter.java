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
import java.util.ArrayList;
import java.util.List;

public class HorizontalMediaAdapter extends RecyclerView.Adapter<HorizontalMediaAdapter.ViewHolder> {

    private final Context context;
    private List<Movie> movies = new ArrayList<>();
    private OnItemClickListener listener;

    public interface OnItemClickListener {
        void onItemClick(Movie movie);
    }

    public HorizontalMediaAdapter(Context context) {
        this.context = context;
    }

    public void setMovies(List<Movie> movies) {
        this.movies = movies;
        notifyDataSetChanged();
    }

    public void setOnItemClickListener(OnItemClickListener listener) {
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_media_horizontal, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        holder.bind(movies.get(position));
    }

    @Override
    public int getItemCount() {
        return movies.size();
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
            ratingText.setText(String.format("⭐ %.1f", movie.getRating()));

            Glide.with(context)
                    .load(movie.getFullPosterUrl())
                    .placeholder(R.drawable.placeholder_poster)
                    .into(posterImage);

            itemView.setOnClickListener(v -> {
                if (listener != null) {
                    listener.onItemClick(movie);
                }
            });
        }
    }
}
