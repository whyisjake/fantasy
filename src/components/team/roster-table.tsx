"use client";

import type { PlayerWithStats, StatCategory } from "@/types/player";
import { getStatValue, isPitcher, getRelevantCategories } from "@/lib/stat-mapping";
import StatHeader from "@/components/ui/stat-header";

interface RosterTableProps {
  players: PlayerWithStats[];
  statCategories?: StatCategory[] | null;
  loading?: boolean;
}

const POSITION_ORDER = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "OF", "Util", "BN", "SP", "RP", "DL", "IL"];

export default function RosterTable({ players, statCategories, loading }: RosterTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-gray-800" />
        ))}
      </div>
    );
  }

  if (players.length === 0) {
    return <p className="text-center text-gray-500 py-8">No roster data available.</p>;
  }

  const sorted = [...players].sort((a, b) => {
    const aIdx = POSITION_ORDER.indexOf(a.roster_position || "");
    const bIdx = POSITION_ORDER.indexOf(b.roster_position || "");
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

  // Split into batters and pitchers
  const batters = sorted.filter((p) => !isPitcher(p.position));
  const pitchers = sorted.filter((p) => isPitcher(p.position));

  const battingCats = statCategories ? getRelevantCategories(statCategories, "batting", true) : [];
  const pitchingCats = statCategories ? getRelevantCategories(statCategories, "pitching", true) : [];

  return (
    <div className="space-y-6">
      {batters.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">
            Batters
          </h3>
          <RosterSection players={batters} categories={battingCats} />
        </div>
      )}
      {pitchers.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">
            Pitchers
          </h3>
          <RosterSection players={pitchers} categories={pitchingCats} />
        </div>
      )}
    </div>
  );
}

function RosterSection({
  players,
  categories,
}: {
  players: PlayerWithStats[];
  categories: StatCategory[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-3 py-2 w-12">Pos</th>
            <th className="px-3 py-2 sticky left-0 bg-gray-950 z-10">Player</th>
            <th className="px-2 py-2 w-12">Team</th>
            <th className="px-2 py-2 w-16">Elig</th>
            <th className="px-2 py-2 w-16">Status</th>
            {categories.map((cat) => (
              <StatHeader key={cat.stat_id} category={cat} />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {players.map((player) => (
            <tr key={player.player_key} className="hover:bg-gray-800/30 transition">
              <td className="px-3 py-2 font-medium text-purple-400">
                {player.roster_position}
              </td>
              <td className="px-3 py-2 font-medium text-white sticky left-0 bg-gray-950/95 z-10">
                <div className="flex items-center gap-2">
                  {player.headshot ? (
                    <img src={player.headshot} alt="" className="h-6 w-6 rounded-full" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] text-gray-500">
                      {player.name?.charAt(0)}
                    </div>
                  )}
                  <span>{player.name}</span>
                </div>
              </td>
              <td className="px-2 py-2 text-gray-400">{player.team}</td>
              <td className="px-2 py-2 text-gray-400">{player.position}</td>
              <td className="px-2 py-2">
                {player.status && (
                  <span
                    className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${
                      player.status === "IL"
                        ? "bg-red-900/30 text-red-400"
                        : player.status === "DTD"
                        ? "bg-yellow-900/30 text-yellow-400"
                        : "bg-gray-800 text-gray-400"
                    }`}
                    title={player.status_full}
                  >
                    {player.status}
                  </span>
                )}
              </td>
              {categories.map((cat) => (
                <td
                  key={cat.stat_id}
                  className="px-2 py-2 text-right text-gray-300 tabular-nums"
                >
                  {getStatValue(player.stats, cat.stat_id)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
