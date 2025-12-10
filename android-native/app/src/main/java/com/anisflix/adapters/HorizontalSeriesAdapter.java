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
import com.anisflix.models.Series;
import java.util.ArrayList;
import java.util.List;

public class HorizontalSeriesAdapter extends RecyclerView.Adapter<HorizontalSeriesAdapter.ViewHolder> {

    private final Context context;
    private List<Series> seriesList = new ArrayList<>();
    private OnItemClickListener listener;

    public interface OnItemClickListener {
        void onItemClick(Series series);
    }

    public HorizontalSeriesAdapter(Context context) {
        this.context = context;
    }

    public void setSeries(List<Series> series) {
        this.seriesList = series;
        notifyDataSetChanged();
    }
    
    public void appendSeries(List<Series> newSeries) {
        int startPos = this.seriesList.size();
        this.seriesList.addAll(newSeries);
        notifyItemRangeInserted(startPos, newSeries.size());
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
        holder.bind(seriesList.get(position));
    }

    @Override
    public int getItemCount() {
        return seriesList.size();
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

        void bind(Series series) {
            titleText.setText(series.getName());
            String year = series.getYear();
            if (year != null && !year.isEmpty()) {
                ratingText.setText(String.format("⭐ %.1f • %s", series.getRating(), year));
            } else {
                ratingText.setText(String.format("⭐ %.1f", series.getRating()));
            }

            Glide.with(context)
                    .load(series.getFullPosterUrl())
                    .placeholder(R.drawable.placeholder_poster)
                    .into(posterImage);

            itemView.setOnClickListener(v -> {
                if (listener != null) {
                    listener.onItemClick(series);
                }
            });
        }
    }
}
