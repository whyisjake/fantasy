"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useLeague } from "@/lib/league-context";
import LeagueSelector from "@/components/layout/league-selector";
import PlayerSearch from "@/components/players/player-search";
import PlayerCard from "@/components/players/player-card";

interface Player {
  player_key: string;
  name: string;
  team: string;
  position: string;
  status?: string;
  status_full?: string;
  headshot?: string;
}

export default function PlayersPage() {
  const { data: session } = useSession();
  const { leagueKey, setLeagueKey } = useLeague();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSearch = useCallback(
    (query: string, position?: string) => {
      if (!leagueKey) return;
      setLoading(true);
      setMessage("");

      let url = `/api/yahoo/players?leagueKey=${leagueKey}&q=${encodeURIComponent(query)}`;
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
    [leagueKey]
  );

  const handleFreeAgents = useCallback(
    (position?: string) => {
      if (!leagueKey) return;
      setLoading(true);
      setMessage("");

      let url = `/api/yahoo/players?leagueKey=${leagueKey}&freeAgents=true`;
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
    [leagueKey]
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
    [leagueKey, players]
  );

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
        <LeagueSelector onSelect={setLeagueKey} selected={leagueKey || undefined} />
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

          {message && (
            <p className="text-sm text-gray-400">{message}</p>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-800" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {players.map((player) => (
                <PlayerCard
                  key={player.player_key}
                  player={player}
                  onAdd={handleAdd}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
