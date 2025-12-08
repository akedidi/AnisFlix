package com.anisflix.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.anisflix.R;
import java.util.List;

public class PlatformAdapter extends RecyclerView.Adapter<PlatformAdapter.ViewHolder> {

    private final Context context;
    private final List<Platform> platforms;

    public static class Platform {
        String name;
        int iconRes;
        
        public Platform(String name, int iconRes) {
            this.name = name;
            this.iconRes = iconRes;
        }
    }

    public PlatformAdapter(Context context, List<Platform> platforms) {
        this.context = context;
        this.platforms = platforms;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_platform, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        holder.bind(platforms.get(position));
    }

    @Override
    public int getItemCount() {
        return platforms.size();
    }

    class ViewHolder extends RecyclerView.ViewHolder {
        private final ImageView iconImage;
        private final TextView nameText;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            iconImage = itemView.findViewById(R.id.platform_icon);
            nameText = itemView.findViewById(R.id.platform_name);
        }

        void bind(Platform platform) {
            nameText.setText(platform.name);
            // In a real app we'd load images, but for now using a placeholder or drawable
             iconImage.setBackgroundResource(R.drawable.bg_platform_icon);
        }
    }
}
