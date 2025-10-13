import { useState, useEffect } from 'react';

export interface FavoriteItem {
  id: number;
  title: string;
  posterPath: string;
  rating: number;
  year: string;
  mediaType: 'movie' | 'series';
  addedAt: string;
}

const FAVORITES_KEY = 'anisflix-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  // Charger les favoris depuis localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem(FAVORITES_KEY);
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (error) {
        console.error('Erreur lors du chargement des favoris:', error);
        setFavorites([]);
      }
    }
  }, []);

  // Sauvegarder les favoris dans localStorage
  const saveFavorites = (newFavorites: FavoriteItem[]) => {
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
  };

  // Ajouter un favori
  const addToFavorites = (item: Omit<FavoriteItem, 'addedAt'>) => {
    const isAlreadyFavorite = favorites.some(
      fav => fav.id === item.id && fav.mediaType === item.mediaType
    );
    
    if (!isAlreadyFavorite) {
      const newFavorite: FavoriteItem = {
        ...item,
        addedAt: new Date().toISOString()
      };
      saveFavorites([...favorites, newFavorite]);
      return true;
    }
    return false;
  };

  // Supprimer un favori
  const removeFromFavorites = (id: number, mediaType: 'movie' | 'series') => {
    const newFavorites = favorites.filter(
      fav => !(fav.id === id && fav.mediaType === mediaType)
    );
    saveFavorites(newFavorites);
  };

  // Vérifier si un item est en favori
  const isFavorite = (id: number, mediaType: 'movie' | 'series') => {
    return favorites.some(fav => fav.id === id && fav.mediaType === mediaType);
  };

  // Toggle favori (ajouter ou supprimer)
  const toggleFavorite = (item: Omit<FavoriteItem, 'addedAt'>) => {
    if (isFavorite(item.id, item.mediaType)) {
      removeFromFavorites(item.id, item.mediaType);
      return false;
    } else {
      addToFavorites(item);
      return true;
    }
  };

  // Obtenir les favoris par type
  const getFavoritesByType = (mediaType: 'movie' | 'series') => {
    return favorites.filter(fav => fav.mediaType === mediaType);
  };

  // Obtenir le nombre de favoris par type
  const getFavoritesCount = (mediaType?: 'movie' | 'series') => {
    if (mediaType) {
      return favorites.filter(fav => fav.mediaType === mediaType).length;
    }
    return favorites.length;
  };

  return {
    favorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    toggleFavorite,
    getFavoritesByType,
    getFavoritesCount,
  };
}
