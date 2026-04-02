"use client";

import { useState } from "react";

interface FreeAgent {
  player_key: string;
  name: string;
  team: string;
  position: string;
  stats: Record<string, string>;
  comparison: Record<string, { diff: string; isUpgrade: boolean; isEqual: boolean }>;
}

interface PositionSlot {
  roster_position: string;
  player: {
    player_key: string;
    name: string;
    team: string;
    position: string;
    status: string | null;
    stats: Record<string, string>;
  };
  top_free_agents: FreeAgent[];
  upgrade_available: boolean;
}

interface PositionComparisonProps {
  slot: PositionSlot;
  statNames: string[];
}

export default function PositionComparison({ slot, statNames }: PositionComparisonProps) {
  const [expanded, setExpanded] = useState(slot.upgrade_available);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/30 transition text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-purple-400 w-8">
            {slot.roster_position}
          </span>
          <span className="font-medium text-white">{slot.player.name}</span>
          <span className="text-xs text-gray-500">
            {slot.player.team} - {slot.player.position}
          </span>
          {slot.player.status && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/30 text-red-400">
              {slot.player.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {slot.upgrade_available && (
            <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-400">
              Upgrade available
            </span>
          )}
          <span className="text-gray-500 text-sm">{expanded ? "\u25B2" : "\u25BC"}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2 text-left w-48">Player</th>
                {statNames.map((name) => (
                  <th key={name} className="px-2 py-2 text-right w-16">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {/* Current player row */}
              <tr className="bg-gray-900/50">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Current</span>
                    <span className="font-medium text-white">{slot.player.name}</span>
                  </div>
                </td>
                {statNames.map((name) => (
                  <td key={name} className="px-2 py-2 text-right text-gray-300 tabular-nums">
                    {slot.player.stats[name] ?? "-"}
                  </td>
                ))}
              </tr>

              {/* Free agent rows */}
              {slot.top_free_agents.map((fa, i) => (
                <tr key={fa.player_key} className="hover:bg-gray-800/30 transition">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">#{i + 1}</span>
                      <span className="text-gray-200">{fa.name}</span>
                      <span className="text-xs text-gray-500">{fa.team}</span>
                    </div>
                  </td>
                  {statNames.map((name) => {
                    const comp = fa.comparison[name];
                    return (
                      <td
                        key={name}
                        className={`px-2 py-2 text-right tabular-nums ${
                          comp?.isUpgrade
                            ? "text-green-400"
                            : comp?.isEqual
                            ? "text-gray-400"
                            : "text-red-400"
                        }`}
                      >
                        <div>{fa.stats[name] ?? "-"}</div>
                        {comp && !comp.isEqual && (
                          <div className="text-[10px]">{comp.diff}</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
