package com.anisflix.ui.tv;

import com.anisflix.models.TVChannel;

public class TVAdapterItem {
    public static final int TYPE_SECTION = 0;
    public static final int TYPE_CATEGORY = 1;
    public static final int TYPE_CHANNEL = 2;

    private int type;
    private String title;
    private TVChannel channel;

    // Constructor for Headers
    public TVAdapterItem(int type, String title) {
        this.type = type;
        this.title = title;
    }

    // Constructor for Channel
    public TVAdapterItem(TVChannel channel) {
        this.type = TYPE_CHANNEL;
        this.channel = channel;
    }

    public int getType() { return type; }
    public String getTitle() { return title; }
    public TVChannel getChannel() { return channel; }
}
