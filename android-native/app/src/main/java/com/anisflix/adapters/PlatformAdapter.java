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
import com.bumptech.glide.Glide;
import java.util.List;

public class PlatformAdapter extends RecyclerView.Adapter<PlatformAdapter.ViewHolder> {

    private final Context context;
    private final List<Platform> platforms;

    public static class Platform {
        String name;
        String logoUrl;
        int id;
        
        public Platform(String name, String logoPath, int id) {
            this.name = name;
            this.logoUrl = "https://image.tmdb.org/t/p/w300" + logoPath;
            this.id = id;
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
        ImageView iconImage;
        TextView nameText;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            iconImage = itemView.findViewById(R.id.platform_icon);
            nameText = itemView.findViewById(R.id.platform_name);
        }

        void bind(Platform platform) {
            nameText.setText(platform.name);
            
            Glide.with(context)
                .load(platform.logoUrl)
                .placeholder(R.drawable.bg_platform_icon)
                .error(R.drawable.bg_platform_icon)
                .into(iconImage);
                
            iconImage.setBackground(null);
            
            itemView.setOnClickListener(v -> {
                // TODO: Navigate to Provider results
            });
        }
    }
}
