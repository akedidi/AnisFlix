import { z } from "zod";

// TMDB Media Types
export const mediaTypeSchema = z.enum(["movie", "tv", "anime", "documentary"]);
export type MediaType = z.infer<typeof mediaTypeSchema>;

// Watch Progress
export interface WatchProgress {
  id: string;
  mediaId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  progress: number; // percentage 0-100
  currentTime: number; // in seconds
  duration: number; // in seconds
  lastWatched: string; // ISO date
}

// Favorites
export interface Favorite {
  id: string;
  mediaId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  addedAt: string; // ISO date
}

// Download
export interface Download {
  id: string;
  mediaId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  quality: string; // e.g., "1080p", "720p"
  source: string;
  progress: number; // percentage 0-100
  status: "downloading" | "completed" | "paused" | "error";
  size: string; // e.g., "1.2 GB"
  downloadedAt: string; // ISO date
}

// Settings
export interface AppSettings {
  streamHosts: {
    primary: string;
    secondary: string;
    backup: string;
  };
  traktApiKey?: string;
  theme: "light" | "dark";
}

// TMDB API Response Types
export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
}

export interface TMDBTVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  genre_ids: number[];
}

export interface TMDBSearchResult {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
}
