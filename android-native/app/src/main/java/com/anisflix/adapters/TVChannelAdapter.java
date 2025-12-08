package com.anisflix.adapters;

import android.content.Context;
import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.bumptech.glide.Glide;
import com.anisflix.R;
import com.anisflix.models.TVChannel;
import com.anisflix.ui.player.VideoPlayerActivity;
import java.util.ArrayList;
import java.util.List;

/**
 * Adapter for TV Channels grid
 */
public class TVChannelAdapter extends RecyclerView.Adapter<TVChannelAdapter.ViewHolder> {
    
    private final Context context;
    private List<TVChannel> channels = new ArrayList<>();
    
    public TVChannelAdapter(Context context) {
        this.context = context;
    }
    
    public void setChannels(List<TVChannel> channels) {
        this.channels = channels;
        notifyDataSetChanged();
    }
    
    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_tv_channel, parent, false);
        return new ViewHolder(view);
    }
    
    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        TVChannel channel = channels.get(position);
        holder.bind(channel);
    }
    
    @Override
    public int getItemCount() {
        return channels.size();
    }
    
    class ViewHolder extends RecyclerView.ViewHolder {
        private final ImageView logoImage;
        private final TextView nameText;
        
        ViewHolder(@NonNull View itemView) {
            super(itemView);
            logoImage = itemView.findViewById(R.id.channel_logo);
            nameText = itemView.findViewById(R.id.channel_name);
        }
        
        void bind(TVChannel channel) {
            nameText.setText(channel.getName());
            
            Glide.with(context)
                    .load(channel.getLogo())
                    .placeholder(R.drawable.placeholder_channel)
                    .into(logoImage);
            
            itemView.setOnClickListener(v -> playChannel(channel));
        }
        
        private void playChannel(TVChannel channel) {
            // Get first HLS link
            String streamUrl = null;
            if (channel.getLinks() != null && !channel.getLinks().isEmpty()) {
                for (TVChannel.TVChannelLink link : channel.getLinks()) {
                    if ("hls_direct".equals(link.getType()) || "hls".equals(link.getType())) {
                        streamUrl = link.getUrl();
                        break;
                    }
                }
            }
            
            if (streamUrl != null) {
                Intent intent = new Intent(context, VideoPlayerActivity.class);
                intent.putExtra(VideoPlayerActivity.EXTRA_STREAM_URL, streamUrl);
                intent.putExtra(VideoPlayerActivity.EXTRA_TITLE, channel.getName());
                context.startActivity(intent);
            }
        }
    }
}
