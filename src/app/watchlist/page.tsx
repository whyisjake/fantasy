"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useLeague } from "@/lib/league-context";
import { useWatchlist, type WatchedPlayer } from "@/lib/watchlist-context";
import LeagueSelector from "@/components/layout/league-selector";
import CoverageSelector, { type StatCoverageOption } from "@/components/ui/coverage-selector";
import { getStatValue, isPitcher, getRelevantCategories } from "@/lib/stat-mapping";
import StatHeader from "@/components/ui/stat-header";
import type { PlayerWithStats, StatCategory } from "@/types/player";

export default function WatchlistPage() {
  const { data: session } = useSession();
  const { leagueKey, setLeagueKey, statCategories } = useLeague();
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const [liveData, setLiveData] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [coverage, setCoverage] = useState<StatCoverageOption>("season");

  const fetchLiveData = useCallback(() => {
    if (!leagueKey || watchlist.length === 0) {
      setLiveData([]);
      return;
    }

    setLoading(true);
    const keys = watchlist.map((p) => p.player_key).join(",");
    fetch(
      `/api/yahoo/watchlist?leagueKey=${leagueKey}&playerKeys=${keys}&coverage=${coverage}`
    )
      .then((r) => r.json())
      .then((data) => setLiveData(data.players || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [leagueKey, watchlist, coverage]);

  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  if (!session) {
    return (
      <p className="text-center text-muted py-16">
        Sign in to manage your watchlist.
      </p>
    );
  }

  // Merge live data with watchlist metadata
  const mergedPlayers = watchlist.map((wp) => {
    const live = liveData.find((p) => p.player_key === wp.player_key);
    return {
      ...wp,
      ...live,
      player_key: wp.player_key,
      name: live?.name || wp.name,
      team: live?.team || wp.team,
      position: live?.position || wp.position,
      headshot: live?.headshot || wp.headshot,
      status: live?.status || wp.status,
    } as PlayerWithStats & { addedAt: number };
  });

  const batters = mergedPlayers.filter((p) => !isPitcher(p.position));
  const pitchers = mergedPlayers.filter((p) => isPitcher(p.position));

  const battingCats = statCategories
    ? getRelevantCategories(statCategories, "batting", true)
    : [];
  const pitchingCats = statCategories
    ? getRelevantCategories(statCategories, "pitching", true)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Watchlist</h1>
        <div className="flex items-center gap-3">
          <CoverageSelector value={coverage} onChange={setCoverage} />
          <LeagueSelector
            onSelect={setLeagueKey}
            selected={leagueKey || undefined}
          />
        </div>
      </div>

      {!leagueKey && (
        <p className="text-tertiary text-center py-8">
          Select a league first.
        </p>
      )}

      {leagueKey && watchlist.length === 0 && (
        <div className="rounded-lg border border-default bg-surface p-8 text-center">
          <p className="text-tertiary mb-2">Your watchlist is empty.</p>
          <p className="text-sm text-muted">
            Add players from the Players or Evaluate pages to keep an eye on
            them.
          </p>
        </div>
      )}

      {loading && watchlist.length > 0 && (
        <div className="space-y-2">
          {Array.from({ length: watchlist.length }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded bg-surface-secondary"
            />
          ))}
        </div>
      )}

      {!loading && batters.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-tertiary mb-2 uppercase tracking-wider">
            Batters ({batters.length})
          </h2>
          <div className="rounded-lg border border-default bg-surface p-4">
            <WatchlistTable
              players={batters}
              categories={battingCats}
              onRemove={removeFromWatchlist}
            />
          </div>
        </div>
      )}

      {!loading && pitchers.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-tertiary mb-2 uppercase tracking-wider">
            Pitchers ({pitchers.length})
          </h2>
          <div className="rounded-lg border border-default bg-surface p-4">
            <WatchlistTable
              players={pitchers}
              categories={pitchingCats}
              onRemove={removeFromWatchlist}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function WatchlistTable({
  players,
  categories,
  onRemove,
}: {
  players: (PlayerWithStats & { addedAt: number })[];
  categories: StatCategory[];
  onRemove: (playerKey: string) => void;
}) {
  const [sortStatId, setSortStatId] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (statId: string, defaultAsc: boolean) => {
    if (sortStatId === statId) {
      setSortAsc(!sortAsc);
    } else {
      setSortStatId(statId);
      setSortAsc(defaultAsc);
    }
  };

  const sorted = sortStatId
    ? [...players].sort((a, b) => {
        const aVal = parseFloat(getStatValue(a.stats, sortStatId));
        const bVal = parseFloat(getStatValue(b.stats, sortStatId));
        if (isNaN(aVal) && isNaN(bVal)) return 0;
        if (isNaN(aVal)) return 1;
        if (isNaN(bVal)) return -1;
        return sortAsc ? aVal - bVal : bVal - aVal;
      })
    : players;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-default text-left text-xs font-medium uppercase tracking-wider text-muted">
            <th className="px-3 py-2 sticky left-0 bg-surface z-10">Player</th>
            <th className="px-2 py-2 w-12">Team</th>
            <th className="px-2 py-2 w-14">Pos</th>
            <th className="px-2 py-2 w-14 text-right" title="Percent Owned">
              %Own
            </th>
            {categories.map((cat) => (
              <StatHeader
                key={cat.stat_id}
                category={cat}
                sortStatId={sortStatId}
                sortAsc={sortAsc}
                onSort={handleSort}
              />
            ))}
            <th className="px-2 py-2 w-12" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {sorted.map((player) => (
            <tr
              key={player.player_key}
              className="hover:bg-surface-hover transition"
            >
              <td className="px-3 py-2 sticky left-0 bg-surface/95 z-10">
                <div className="flex items-center gap-2">
                  {player.headshot ? (
                    <img
                      src={player.headshot}
                      alt=""
                      className="h-6 w-6 rounded-full"
                    />
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
                    {player.ownership_change !== undefined &&
                      player.ownership_change !== 0 && (
                        <span
                          className={`text-[10px] ${
                            player.ownership_change > 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {player.ownership_change > 0
                            ? `+${player.ownership_change}`
                            : player.ownership_change}
                        </span>
                      )}
                  </div>
                ) : (
                  "-"
                )}
              </td>
              {categories.map((cat) => (
                <td
                  key={cat.stat_id}
                  className="px-2 py-2 text-right text-secondary tabular-nums"
                >
                  {getStatValue(player.stats, cat.stat_id)}
                </td>
              ))}
              <td className="px-2 py-2">
                <button
                  onClick={() => onRemove(player.player_key)}
                  className="rounded bg-red-900/30 px-2 py-1 text-xs text-red-400 hover:bg-red-900/50 transition"
                  title="Remove from watchlist"
                >
                  &times;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
