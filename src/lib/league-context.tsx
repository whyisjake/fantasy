"use client";

import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from "react";
import type { StatCategory } from "@/types/player";
import { buildStatMap } from "@/lib/stat-mapping";

const STORAGE_KEY = "fantasy-selected-league";

interface LeagueContextType {
  leagueKey: string | null;
  teamKey: string | null;
  statCategories: StatCategory[] | null;
  statMap: Map<string, StatCategory>;
  setLeagueKey: (key: string) => void;
  setTeamKey: (key: string) => void;
}

const LeagueContext = createContext<LeagueContextType>({
  leagueKey: null,
  teamKey: null,
  statCategories: null,
  statMap: new Map(),
  setLeagueKey: () => {},
  setTeamKey: () => {},
});

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [leagueKey, setLeagueKeyState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });
  const [teamKey, setTeamKey] = useState<string | null>(null);
  const [statCategories, setStatCategories] = useState<StatCategory[] | null>(null);

  const statMap = useMemo(
    () => (statCategories ? buildStatMap(statCategories) : new Map<string, StatCategory>()),
    [statCategories]
  );

  const setLeagueKey = useCallback((key: string) => {
    setLeagueKeyState(key);
    localStorage.setItem(STORAGE_KEY, key);

    // Fetch user's team and league settings in parallel
    fetch(`/api/yahoo/team?leagueKey=${key}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.teamKey) setTeamKey(data.teamKey);
      })
      .catch(console.error);

    fetch(`/api/yahoo/settings?leagueKey=${key}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.statCategories) setStatCategories(data.statCategories);
      })
      .catch(console.error);
  }, []);

  // On mount, if we have a saved league key, fetch its data
  useEffect(() => {
    if (leagueKey) {
      setLeagueKey(leagueKey);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LeagueContext.Provider
      value={{ leagueKey, teamKey, statCategories, statMap, setLeagueKey, setTeamKey }}
    >
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  return useContext(LeagueContext);
}

export function getSavedLeagueKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}
