// Image optimization utilities to reduce Fast Origin usage

export const getOptimizedImageUrl = (
  posterPath: string | null,
  size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342'
): string => {
  if (!posterPath) {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='342' height='513'%3E%3Crect fill='%23334155' width='342' height='513'/%3E%3C/svg%3E";
  }

  // If it's already a full URL (TV channel logos), return it directly
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
    return posterPath;
  }

  // Use smaller sizes for better performance (TMDB images)
  const optimizedSize = size === 'original' ? 'w500' : size;
  return `https://image.tmdb.org/t/p/${optimizedSize}${posterPath}`;
};

export const getOptimizedBackdropUrl = (
  backdropPath: string | null | undefined,
  size: 'w300' | 'w780' | 'w1280' | 'original' = 'w780'
): string => {
  if (!backdropPath) {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'%3E%3Crect fill='%23334155' width='1280' height='720'/%3E%3C/svg%3E";
  }

  // Use smaller sizes for better performance
  const optimizedSize = size === 'original' ? 'w1280' : size;
  return `https://image.tmdb.org/t/p/${optimizedSize}${backdropPath}`;
};

// Cache for processed images
const imageCache = new Map<string, string>();

export const getCachedImageUrl = (url: string): string => {
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  // Store in cache
  imageCache.set(url, url);
  return url;
};
