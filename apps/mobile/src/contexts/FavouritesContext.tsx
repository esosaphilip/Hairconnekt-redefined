import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getFavouriteIds, addFavourite, removeFavourite } from '../utils/favourites';
import { debugLog } from '../utils/logger';

interface FavouritesContextType {
  favouriteIds: string[];
  isLoading: boolean;
  isFavourite: (id: string) => boolean;
  toggleFavourite: (id: string) => Promise<void>;
  refreshFavourites: () => Promise<void>;
}

const FavouritesContext = createContext<FavouritesContextType>({
  favouriteIds: [],
  isLoading: false,
  isFavourite: () => false,
  toggleFavourite: async () => {},
  refreshFavourites: async () => {},
});

export function FavouritesProvider({ children }: { children: React.ReactNode }) {
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshFavourites = useCallback(async () => {
    try {
      setIsLoading(true);
      const ids = await getFavouriteIds();
      setFavouriteIds(ids);
    } catch (error) {
      debugLog('Failed to refresh favourites:', error);
      setFavouriteIds([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFavourites();
  }, []);

  const isFavourite = useCallback((id: string) => favouriteIds.includes(id), [favouriteIds]);

  const toggleFavourite = useCallback(
    async (providerId: string) => {
      const wasAlreadyFav = favouriteIds.includes(providerId);

      setFavouriteIds((prev) =>
        wasAlreadyFav ? prev.filter((id) => id !== providerId) : [...prev, providerId],
      );

      const success = wasAlreadyFav ? await removeFavourite(providerId) : await addFavourite(providerId);

      if (!success) {
        setFavouriteIds((prev) =>
          wasAlreadyFav ? [...prev, providerId] : prev.filter((id) => id !== providerId),
        );
      }
    },
    [favouriteIds],
  );

  return (
    <FavouritesContext.Provider value={{ favouriteIds, isLoading, isFavourite, toggleFavourite, refreshFavourites }}>
      {children}
    </FavouritesContext.Provider>
  );
}

export const useFavourites = () => useContext(FavouritesContext);
