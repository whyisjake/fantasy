"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface LeagueContextType {
  leagueKey: string | null;
  teamKey: string | null;
  setLeagueKey: (key: string) => void;
  setTeamKey: (key: string) => void;
}

const LeagueContext = createContext<LeagueContextType>({
  leagueKey: null,
  teamKey: null,
  setLeagueKey: () => {},
  setTeamKey: () => {},
});

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [leagueKey, setLeagueKeyState] = useState<string | null>(null);
  const [teamKey, setTeamKey] = useState<string | null>(null);

  const setLeagueKey = useCallback((key: string) => {
    setLeagueKeyState(key);
    // Fetch user's team for this league
    fetch(`/api/yahoo/team?leagueKey=${key}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.teamKey) setTeamKey(data.teamKey);
      })
      .catch(console.error);
  }, []);

  return (
    <LeagueContext.Provider value={{ leagueKey, teamKey, setLeagueKey, setTeamKey }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  return useContext(LeagueContext);
}
