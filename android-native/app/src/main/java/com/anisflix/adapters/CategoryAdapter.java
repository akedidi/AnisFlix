package com.anisflix.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.anisflix.R;
import com.anisflix.models.TVCategory;
import java.util.ArrayList;
import java.util.List;

public class CategoryAdapter extends RecyclerView.Adapter<CategoryAdapter.ViewHolder> {

    private final Context context;
    private List<TVCategory> categories = new ArrayList<>();
    private int selectedPosition = 0;
    private OnCategoryClickListener listener;

    public interface OnCategoryClickListener {
        void onCategoryClick(TVCategory category);
    }

    public CategoryAdapter(Context context) {
        this.context = context;
    }

    public void setCategories(List<TVCategory> categories) {
        this.categories = new ArrayList<>(categories);
        this.selectedPosition = 0; // Reset selection on new list
        notifyDataSetChanged();
        
        // Auto-select first if available
        if (!this.categories.isEmpty() && listener != null) {
            listener.onCategoryClick(this.categories.get(0));
        }
    }
    
    public void setSelectedPosition(int position) {
        int previous = selectedPosition;
        selectedPosition = position;
        notifyItemChanged(previous);
        notifyItemChanged(selectedPosition);
    }

    public void setOnCategoryClickListener(OnCategoryClickListener listener) {
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_category_chip, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        holder.bind(categories.get(position), position == selectedPosition);
    }

    @Override
    public int getItemCount() {
        return categories.size();
    }

    class ViewHolder extends RecyclerView.ViewHolder {
        private final TextView chipText;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            chipText = itemView.findViewById(R.id.chip_text);
        }

        void bind(TVCategory category, boolean isSelected) {
            chipText.setText(category.getName());
            chipText.setSelected(isSelected); // Triggers selector state

            itemView.setOnClickListener(v -> {
                int position = getAdapterPosition();
                if (position != RecyclerView.NO_POSITION) {
                    setSelectedPosition(position);
                    if (listener != null) {
                        listener.onCategoryClick(category);
                    }
                }
            });
        }
    }
}
