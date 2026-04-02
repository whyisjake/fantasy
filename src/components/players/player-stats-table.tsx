"use client";

import { useState, useMemo } from "react";
import type { PlayerWithStats, StatCategory } from "@/types/player";
import { getStatValue, isPitcher, getRelevantCategories } from "@/lib/stat-mapping";
import StatHeader from "@/components/ui/stat-header";

interface PlayerStatsTableProps {
  players: PlayerWithStats[];
  statCategories: StatCategory[];
  playerType: "batting" | "pitching" | "all";
  onAdd?: (playerKey: string) => void;
}

export default function PlayerStatsTable({
  players,
  statCategories,
  playerType,
  onAdd,
}: PlayerStatsTableProps) {
  const [sortStatId, setSortStatId] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  const battingCats = useMemo(
    () => getRelevantCategories(statCategories, "batting", true),
    [statCategories]
  );
  const pitchingCats = useMemo(
    () => getRelevantCategories(statCategories, "pitching", true),
    [statCategories]
  );

  // Split players into batting and pitching groups
  const { batters, pitchers } = useMemo(() => {
    const b: PlayerWithStats[] = [];
    const p: PlayerWithStats[] = [];
    for (const player of players) {
      if (isPitcher(player.position)) {
        p.push(player);
      } else {
        b.push(player);
      }
    }
    return { batters: b, pitchers: p };
  }, [players]);

  const handleSort = (statId: string, defaultAsc: boolean) => {
    if (sortStatId === statId) {
      setSortAsc(!sortAsc);
    } else {
      setSortStatId(statId);
      setSortAsc(defaultAsc);
    }
  };

  const sortPlayers = (list: PlayerWithStats[]) => {
    if (!sortStatId) return list;
    return [...list].sort((a, b) => {
      const aVal = parseFloat(getStatValue(a.stats, sortStatId));
      const bVal = parseFloat(getStatValue(b.stats, sortStatId));
      if (isNaN(aVal) && isNaN(bVal)) return 0;
      if (isNaN(aVal)) return 1;
      if (isNaN(bVal)) return -1;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  };

  if (players.length === 0) {
    return <p className="text-center text-muted py-8">No players found.</p>;
  }

  return (
    <div className="space-y-6">
      {(playerType === "batting" || playerType === "all") && batters.length > 0 && (
        <div>
          {playerType === "all" && (
            <h3 className="text-sm font-medium text-tertiary mb-2 uppercase tracking-wider">
              Batters ({batters.length})
            </h3>
          )}
          <StatsTable
            players={sortPlayers(batters)}
            categories={battingCats}
            sortStatId={sortStatId}
            sortAsc={sortAsc}
            onSort={handleSort}
            onAdd={onAdd}
          />
        </div>
      )}
      {(playerType === "pitching" || playerType === "all") && pitchers.length > 0 && (
        <div>
          {playerType === "all" && (
            <h3 className="text-sm font-medium text-tertiary mb-2 uppercase tracking-wider">
              Pitchers ({pitchers.length})
            </h3>
          )}
          <StatsTable
            players={sortPlayers(pitchers)}
            categories={pitchingCats}
            sortStatId={sortStatId}
            sortAsc={sortAsc}
            onSort={handleSort}
            onAdd={onAdd}
          />
        </div>
      )}
    </div>
  );
}

function StatsTable({
  players,
  categories,
  sortStatId,
  sortAsc,
  onSort,
  onAdd,
}: {
  players: PlayerWithStats[];
  categories: StatCategory[];
  sortStatId: string | null;
  sortAsc: boolean;
  onSort: (statId: string, defaultAsc: boolean) => void;
  onAdd?: (playerKey: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-default text-left text-xs font-medium uppercase tracking-wider text-muted">
            <th className="px-3 py-2 sticky left-0 bg-surface z-10">Player</th>
            <th className="px-2 py-2 w-12">Team</th>
            <th className="px-2 py-2 w-14">Pos</th>
            <th className="px-2 py-2 w-14 text-right" title="Percent Owned">%Own</th>
            {categories.map((cat) => (
              <StatHeader
                key={cat.stat_id}
                category={cat}
                sortStatId={sortStatId}
                sortAsc={sortAsc}
                onSort={onSort}
              />
            ))}
            {onAdd && <th className="px-2 py-2 w-12" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {players.map((player) => (
            <tr key={player.player_key} className="hover:bg-surface-hover transition">
              <td className="px-3 py-2 sticky left-0 bg-surface/95 z-10">
                <div className="flex items-center gap-2">
                  {player.headshot ? (
                    <img src={player.headshot} alt="" className="h-6 w-6 rounded-full" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-surface-secondary flex items-center justify-center text-[10px] text-muted">
                      {player.name?.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium text-primary whitespace-nowrap">
                    {player.name}
                  </span>
                  {player.status && (
                    <span
                      className={`text-[10px] px-1 rounded ${
                        player.status === "IL"
                          ? "bg-red-900/30 text-red-400"
                          : "bg-yellow-900/30 text-yellow-400"
                      }`}
                    >
                      {player.status}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-2 py-2 text-tertiary">{player.team}</td>
              <td className="px-2 py-2 text-accent">{player.position}</td>
              <td className="px-2 py-2 text-right text-tertiary tabular-nums">
                {player.percent_owned !== undefined ? (
                  <div className="flex items-center justify-end gap-1">
                    <span>{player.percent_owned}%</span>
                    {player.ownership_change !== undefined && player.ownership_change !== 0 && (
                      <span
                        className={`text-[10px] ${
                          player.ownership_change > 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {player.ownership_change > 0 ? `+${player.ownership_change}` : player.ownership_change}
                      </span>
                    )}
                  </div>
                ) : (
                  "-"
                )}
              </td>
              {categories.map((cat) => (
                <td key={cat.stat_id} className="px-2 py-2 text-right text-secondary tabular-nums">
                  {getStatValue(player.stats, cat.stat_id)}
                </td>
              ))}
              {onAdd && (
                <td className="px-2 py-2">
                  <button
                    onClick={() => onAdd(player.player_key)}
                    className="rounded bg-green-700 px-2 py-1 text-xs text-white hover:bg-green-600 transition"
                  >
                    +
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
