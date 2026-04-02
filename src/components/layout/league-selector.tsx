"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getSavedLeagueKey } from "@/lib/league-context";

interface League {
  league_key: string;
  name: string;
  season: string;
  num_teams: number;
}

interface LeagueSelectorProps {
  onSelect: (leagueKey: string) => void;
  selected?: string;
}

export default function LeagueSelector({
  onSelect,
  selected,
}: LeagueSelectorProps) {
  const { data: session } = useSession();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.accessToken) return;

    fetch("/api/yahoo/leagues")
      .then((res) => res.json())
      .then((data) => {
        const leagueList = (data.leagues || []) as League[];

        // Sort by season descending (newest first)
        leagueList.sort((a, b) => Number(b.season) - Number(a.season));
        setLeagues(leagueList);

        if (leagueList.length > 0 && !selected) {
          // Prefer saved league, then default to most recent
          const saved = getSavedLeagueKey();
          const match = saved && leagueList.find((l) => l.league_key === saved);
          onSelect(match ? match.league_key : leagueList[0].league_key);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.accessToken, onSelect, selected]);

  if (loading) {
    return (
      <div className="h-9 w-48 animate-pulse rounded bg-surface-secondary" />
    );
  }

  if (leagues.length === 0) {
    return (
      <p className="text-sm text-muted">No MLB leagues found</p>
    );
  }

  return (
    <select
      value={selected || ""}
      onChange={(e) => onSelect(e.target.value)}
      className="rounded border border-secondary bg-surface-secondary px-3 py-1.5 text-sm text-secondary focus:border-purple-500 focus:outline-none"
    >
      {leagues.map((league) => (
        <option key={league.league_key} value={league.league_key}>
          {league.name} ({league.season})
        </option>
      ))}
    </select>
  );
}
