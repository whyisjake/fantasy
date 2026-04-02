"use client";

import { useState } from "react";

interface FreeAgent {
  player_key: string;
  name: string;
  team: string;
  position: string;
  headshot?: string;
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
    headshot?: string;
    stats: Record<string, string>;
  };
  top_free_agents: FreeAgent[];
  upgrade_available: boolean;
}

interface StatInfo {
  name: string;
  is_display_only?: boolean;
}

interface PositionComparisonProps {
  slot: PositionSlot;
  statNames: string[];
  statInfo?: StatInfo[];
}

export default function PositionComparison({ slot, statNames, statInfo }: PositionComparisonProps) {
  const [expanded, setExpanded] = useState(slot.upgrade_available);

  return (
    <div className="rounded-lg border border-default bg-surface overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-accent w-8">
            {slot.roster_position}
          </span>
          {slot.player.headshot ? (
            <img src={slot.player.headshot} alt="" className="h-7 w-7 rounded-full" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-surface-secondary flex items-center justify-center text-xs text-muted">
              {slot.player.name?.charAt(0)}
            </div>
          )}
          <span className="font-medium text-primary">{slot.player.name}</span>
          <span className="text-xs text-muted">
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
          <span className="text-muted text-sm">{expanded ? "\u25B2" : "\u25BC"}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-default overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted uppercase tracking-wider">
                <th className="px-4 py-2 text-left w-48">Player</th>
                {statNames.map((name, idx) => {
                  const isDisplayOnly = statInfo?.[idx]?.is_display_only;
                  return (
                    <th
                      key={name}
                      className={`px-2 py-2 text-right w-16 ${isDisplayOnly ? "text-muted" : ""}`}
                      title={isDisplayOnly ? `${name} (informational, not scored)` : name}
                    >
                      {name}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {/* Current player row */}
              <tr className="bg-surface-alt/50">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Current</span>
                    {slot.player.headshot ? (
                      <img src={slot.player.headshot} alt="" className="h-5 w-5 rounded-full" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-surface-secondary flex items-center justify-center text-[9px] text-muted">
                        {slot.player.name?.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium text-primary">{slot.player.name}</span>
                  </div>
                </td>
                {statNames.map((name) => (
                  <td key={name} className="px-2 py-2 text-right text-secondary tabular-nums">
                    {slot.player.stats[name] ?? "-"}
                  </td>
                ))}
              </tr>

              {/* Free agent rows */}
              {slot.top_free_agents.map((fa, i) => (
                <tr key={fa.player_key} className="hover:bg-surface-hover transition">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">#{i + 1}</span>
                      {fa.headshot ? (
                        <img src={fa.headshot} alt="" className="h-5 w-5 rounded-full" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-surface-secondary flex items-center justify-center text-[9px] text-muted">
                          {fa.name?.charAt(0)}
                        </div>
                      )}
                      <span className="text-secondary">{fa.name}</span>
                      <span className="text-xs text-muted">{fa.team}</span>
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
                            ? "text-tertiary"
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
