"use client";

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { StatCategory } from "@/types/player";
import { buildStatMap } from "@/lib/stat-mapping";

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
  const [leagueKey, setLeagueKeyState] = useState<string | null>(null);
  const [teamKey, setTeamKey] = useState<string | null>(null);
  const [statCategories, setStatCategories] = useState<StatCategory[] | null>(null);

  const statMap = useMemo(
    () => (statCategories ? buildStatMap(statCategories) : new Map<string, StatCategory>()),
    [statCategories]
  );

  const setLeagueKey = useCallback((key: string) => {
    setLeagueKeyState(key);

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
