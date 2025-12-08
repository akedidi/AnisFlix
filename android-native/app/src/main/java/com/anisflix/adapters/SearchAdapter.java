package com.anisflix.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Filter;
import android.widget.ImageView;
import android.widget.TextView;
import com.bumptech.glide.Glide;
import com.anisflix.R;
import com.anisflix.models.Movie;
import com.anisflix.models.Series;
import java.util.ArrayList;
import java.util.List;

public class SearchAdapter extends ArrayAdapter<SearchAdapter.SearchResult> {
    
    private final List<SearchResult> allItems;
    private final List<SearchResult> suggestions;
    
    public SearchAdapter(Context context, List<SearchResult> items) {
        super(context, R.layout.item_search_suggestion, items);
        this.allItems = new ArrayList<>(items);
        this.suggestions = new ArrayList<>();
    }
    
    @Override
    public int getCount() {
        return suggestions.size();
    }
    
    @Override
    public SearchResult getItem(int position) {
        return suggestions.get(position);
    }
    
    @Override
    public View getView(int position, View convertView, ViewGroup parent) {
        if (convertView == null) {
            convertView = LayoutInflater.from(getContext()).inflate(R.layout.item_search_suggestion, parent, false);
        }
        
        SearchResult item = getItem(position);
        
        ImageView poster = convertView.findViewById(R.id.suggestion_poster);
        TextView title = convertView.findViewById(R.id.suggestion_title);
        TextView meta = convertView.findViewById(R.id.suggestion_meta);
        
        title.setText(item.title);
        
        String type = item.isMovie ? "Film" : "Série";
        String metaText = String.format("%s • %s • ★ %.1f", item.year, type, item.rating);
        meta.setText(metaText);
        
        Glide.with(getContext())
             .load("https://image.tmdb.org/t/p/w92" + item.posterPath)
             .placeholder(R.drawable.placeholder_poster)
             .into(poster);
             
        return convertView;
    }
    
    public void updateData(List<SearchResult> newItems) {
        this.allItems.clear();
        this.allItems.addAll(newItems);
        // If ApiMode, we want to reflect this immediately.
        // However, AutoCompleteTextView relies on Filter to populate 'suggestions'.
        // So we might need to re-trigger filter or just update suggestions directly if we notify.
        if (isApiMode) {
            this.suggestions.clear();
            this.suggestions.addAll(newItems);
            notifyDataSetChanged();
        }
    }

    private boolean isApiMode = false;
    public void setApiMode(boolean apiMode) {
        this.isApiMode = apiMode;
    }

    @Override
    public Filter getFilter() {
        return new Filter() {
            @Override
            protected FilterResults performFiltering(CharSequence constraint) {
                FilterResults results = new FilterResults();
                
                if (isApiMode) {
                    // In API mode, we trust what's in allItems is what should be shown
                    // (populated via updateData)
                    List<SearchResult> list = new ArrayList<>(allItems);
                    results.values = list;
                    results.count = list.size();
                } else {
                    List<SearchResult> filteredList = new ArrayList<>();
                    if (constraint == null || constraint.length() == 0) {
                        filteredList.addAll(allItems);
                    } else {
                        String filterPattern = constraint.toString().toLowerCase().trim();
                        for (SearchResult item : allItems) {
                            if (item.title.toLowerCase().contains(filterPattern)) {
                                filteredList.add(item);
                            }
                        }
                    }
                    results.values = filteredList;
                    results.count = filteredList.size();
                }
                return results;
            }
            
            @Override
            protected void publishResults(CharSequence constraint, FilterResults results) {
                suggestions.clear();
                if (results != null && results.values != null) {
                    suggestions.addAll((List<SearchResult>) results.values);
                }
                if (results != null && results.count > 0) {
                    notifyDataSetChanged();
                } else {
                    notifyDataSetInvalidated();
                }
            }
        };
    }
    
    // Unified model for search
    public static class SearchResult {
        public int id;
        public String title;
        public String posterPath;
        public String year;
        public double rating;
        public boolean isMovie;
        
        public SearchResult(Movie movie) {
            this.id = movie.getId();
            this.title = movie.getTitle();
            this.posterPath = movie.getPosterPath();
            this.year = movie.getReleaseDate() != null && movie.getReleaseDate().length() >= 4 
                       ? movie.getReleaseDate().substring(0, 4) : "";
            this.rating = movie.getRating();
            this.isMovie = true;
        }
        
        public SearchResult(Series series) {
            this.id = series.getId();
            this.title = series.getName();
            this.posterPath = series.getPosterPath();
            this.year = series.getFirstAirDate() != null && series.getFirstAirDate().length() >= 4
                       ? series.getFirstAirDate().substring(0, 4) : "";
            this.rating = series.getRating(); // Corrected getter
            this.isMovie = false;
        }

        public SearchResult(com.anisflix.models.MultiSearchItem item) {
            this.id = item.id;
            this.title = item.getTitleOrName();
            this.posterPath = item.posterPath;
            this.year = item.getDate() != null && item.getDate().length() >= 4 
                    ? item.getDate().substring(0, 4) : "";
            this.isMovie = "movie".equals(item.mediaType);
            this.rating = item.voteAverage;
        }
        
        @Override
        public String toString() {
            return title; // For AutoCompleteTextView default behavior
        }
    }
}
