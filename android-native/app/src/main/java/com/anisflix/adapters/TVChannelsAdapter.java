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
import com.anisflix.models.TVChannel;
import java.util.ArrayList;
import java.util.List;

public class TVChannelsAdapter extends RecyclerView.Adapter<TVChannelsAdapter.ViewHolder> {

    private final Context context;
    private List<TVChannel> channels = new ArrayList<>();
    private OnChannelClickListener listener;

    public interface OnChannelClickListener {
        void onChannelClick(TVChannel channel);
    }

    public TVChannelsAdapter(Context context) {
        this.context = context;
    }

    public void setChannels(List<TVChannel> channels) {
        this.channels = channels;
        notifyDataSetChanged();
    }

    public void setOnChannelClickListener(OnChannelClickListener listener) {
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_tv_channel, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        holder.bind(channels.get(position));
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

            itemView.setOnClickListener(v -> {
                if (listener != null) {
                    listener.onChannelClick(channel);
                }
            });
        }
    }
}
