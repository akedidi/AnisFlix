// Shared types for TV Channels API
export interface TVChannelLink {
    type: 'mpd' | 'hls_direct' | 'hls_segments';
    url: string;
}

export interface TVChannel {
    id: string;
    name: string;
    logo?: string;
    links: TVChannelLink[];
}

export interface TVCategory {
    id: string;
    name: string;
    channels: TVChannel[];
}

export interface TVSection {
    id: string;
    name: string;
    categories: TVCategory[];
}

export interface TVChannelsResponse {
    sections: TVSection[];
}
