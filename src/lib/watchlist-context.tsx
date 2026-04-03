"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const STORAGE_KEY = "fantasy-watchlist";

export interface WatchedPlayer {
  player_key: string;
  name: string;
  team: string;
  position: string;
  headshot?: string;
  status?: string;
  addedAt: number;
}

interface WatchlistContextType {
  watchlist: WatchedPlayer[];
  addToWatchlist: (player: Omit<WatchedPlayer, "addedAt">) => void;
  removeFromWatchlist: (playerKey: string) => void;
  isWatched: (playerKey: string) => boolean;
}

const WatchlistContext = createContext<WatchlistContextType>({
  watchlist: [],
  addToWatchlist: () => {},
  removeFromWatchlist: () => {},
  isWatched: () => false,
});

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<WatchedPlayer[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const addToWatchlist = useCallback((player: Omit<WatchedPlayer, "addedAt">) => {
    setWatchlist((prev) => {
      if (prev.some((p) => p.player_key === player.player_key)) return prev;
      return [...prev, { ...player, addedAt: Date.now() }];
    });
  }, []);

  const removeFromWatchlist = useCallback((playerKey: string) => {
    setWatchlist((prev) => prev.filter((p) => p.player_key !== playerKey));
  }, []);

  const isWatched = useCallback(
    (playerKey: string) => watchlist.some((p) => p.player_key === playerKey),
    [watchlist]
  );

  return (
    <WatchlistContext.Provider value={{ watchlist, addToWatchlist, removeFromWatchlist, isWatched }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}
