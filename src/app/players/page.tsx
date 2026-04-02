"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useLeague } from "@/lib/league-context";
import LeagueSelector from "@/components/layout/league-selector";
import PlayerSearch from "@/components/players/player-search";
import PlayerStatsTable from "@/components/players/player-stats-table";
import CoverageSelector, { type StatCoverageOption } from "@/components/ui/coverage-selector";
import type { PlayerWithStats } from "@/types/player";

export default function PlayersPage() {
  const { data: session } = useSession();
  const { leagueKey, setLeagueKey, statCategories } = useLeague();
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [coverage, setCoverage] = useState<StatCoverageOption>("season");
  const [message, setMessage] = useState("");
  const [currentPosition, setCurrentPosition] = useState<string | undefined>();

  const handleSearch = useCallback(
    (query: string, position?: string) => {
      if (!leagueKey) return;
      setLoading(true);
      setMessage("");
      setCurrentPosition(position);

      let url = `/api/yahoo/players?leagueKey=${leagueKey}&q=${encodeURIComponent(query)}&coverage=${coverage}`;
      if (position) url += `&position=${position}`;

      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          setPlayers(data.players || []);
          if (data.players?.length === 0) setMessage("No players found.");
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    },
    [leagueKey, coverage]
  );

  const handleFreeAgents = useCallback(
    (position?: string) => {
      if (!leagueKey) return;
      setLoading(true);
      setMessage("");
      setCurrentPosition(position);

      let url = `/api/yahoo/players?leagueKey=${leagueKey}&freeAgents=true&coverage=${coverage}`;
      if (position) url += `&position=${position}`;

      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          setPlayers(data.players || []);
          if (data.players?.length === 0) setMessage("No free agents found.");
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    },
    [leagueKey, coverage]
  );

  const handleAdd = useCallback(
    async (playerKey: string) => {
      if (!leagueKey) return;
      const player = players.find((p) => p.player_key === playerKey);
      if (!confirm(`Add ${player?.name || "this player"}?`)) return;

      try {
        const res = await fetch("/api/yahoo/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leagueKey, addPlayerKey: playerKey }),
        });

        if (res.ok) {
          setMessage(`${player?.name} added successfully!`);
        } else {
          const data = await res.json();
          setMessage(`Error: ${data.error}`);
        }
      } catch {
        setMessage("Failed to add player.");
      }
    },
    [leagueKey, players, coverage]
  );

  // Determine player type from position filter
  const playerType =
    currentPosition === "SP" || currentPosition === "RP"
      ? "pitching" as const
      : currentPosition && currentPosition !== "All"
      ? "batting" as const
      : "all" as const;

  if (!session) {
    return (
      <p className="text-center text-gray-500 py-16">
        Sign in to search players.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Players</h1>
        <div className="flex items-center gap-3">
          <CoverageSelector value={coverage} onChange={setCoverage} />
          <LeagueSelector onSelect={setLeagueKey} selected={leagueKey || undefined} />
        </div>
      </div>

      {!leagueKey ? (
        <p className="text-gray-400 text-center py-8">Select a league first.</p>
      ) : (
        <>
          <PlayerSearch
            onSearch={handleSearch}
            onFreeAgents={handleFreeAgents}
            loading={loading}
          />

          {message && <p className="text-sm text-gray-400">{message}</p>}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-gray-800" />
              ))}
            </div>
          ) : players.length > 0 && statCategories ? (
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <PlayerStatsTable
                players={players}
                statCategories={statCategories}
                playerType={playerType}
                onAdd={handleAdd}
              />
            </div>
          ) : players.length > 0 ? (
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <p className="text-sm text-gray-500 mb-4">Loading stat categories...</p>
              <PlayerStatsTable
                players={players}
                statCategories={[]}
                playerType={playerType}
                onAdd={handleAdd}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
