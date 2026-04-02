"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLeague } from "@/lib/league-context";
import LeagueSelector from "@/components/layout/league-selector";
import PositionComparison from "@/components/evaluate/position-comparison";
import RecommendationCard from "@/components/evaluate/recommendation-card";

interface EvalResponse {
  league: {
    scoring_categories: {
      batting: Array<{ name: string; higher_is_better: boolean; is_display_only?: boolean }>;
      pitching: Array<{ name: string; higher_is_better: boolean; is_display_only?: boolean }>;
    };
  };
  roster: {
    batting: Array<Record<string, unknown>>;
    pitching: Array<Record<string, unknown>>;
  };
  summary: {
    weakest_positions: string[];
    strongest_positions: string[];
    injured_players: Array<{ name: string; position: string; status: string }>;
    recommended_moves: Array<Record<string, unknown>>;
  };
}

const DEEP_SCAN_KEY = "fantasy-deep-scan";

export default function EvaluatePage() {
  const { data: session } = useSession();
  const { leagueKey, setLeagueKey } = useLeague();
  const [evalData, setEvalData] = useState<EvalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deepScan, setDeepScan] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DEEP_SCAN_KEY) === "true";
  });

  const toggleDeepScan = () => {
    const next = !deepScan;
    setDeepScan(next);
    localStorage.setItem(DEEP_SCAN_KEY, String(next));
  };

  useEffect(() => {
    if (!leagueKey) return;

    setLoading(true);
    setError("");
    const params = new URLSearchParams({ leagueKey });
    if (deepScan) params.set("deepScan", "true");

    fetch(`/api/yahoo/evaluate?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to evaluate");
        return r.json();
      })
      .then(setEvalData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [leagueKey, deepScan]);

  if (!session) {
    return (
      <p className="text-center text-gray-500 py-16">
        Sign in to evaluate your roster.
      </p>
    );
  }

  const battingCats = evalData?.league.scoring_categories.batting || [];
  const pitchingCats = evalData?.league.scoring_categories.pitching || [];
  const battingStatNames = battingCats.map((c) => c.name);
  const pitchingStatNames = pitchingCats.map((c) => c.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Evaluate Roster</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleDeepScan}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              deepScan
                ? "bg-purple-600/20 text-purple-300 border border-purple-600/50"
                : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
            }`}
            title="Fetch 25 free agents per position and re-rank by your league's scoring categories"
          >
            <span className={`inline-block w-2 h-2 rounded-full ${deepScan ? "bg-purple-400" : "bg-gray-600"}`} />
            Deep Scan
          </button>
          <LeagueSelector onSelect={setLeagueKey} selected={leagueKey || undefined} />
        </div>
      </div>

      {!leagueKey && (
        <p className="text-gray-400 text-center py-8">Select a league first.</p>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 text-center">
            <div className="h-6 w-6 mx-auto mb-3 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <p className="text-sm text-gray-400">
              Analyzing your roster against available free agents...
            </p>
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-800" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {evalData && !loading && (
        <>
          {/* Summary Banner */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
                Recommended Moves
              </p>
              <p className="text-2xl font-bold text-white">
                {evalData.summary.recommended_moves.length}
              </p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
                Weakest Positions
              </p>
              <p className="text-lg font-semibold text-yellow-400">
                {evalData.summary.weakest_positions.join(", ") || "None"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
                Injured Players
              </p>
              <p className="text-lg font-semibold text-red-400">
                {evalData.summary.injured_players.length > 0
                  ? evalData.summary.injured_players.map((p) => p.name).join(", ")
                  : "None"}
              </p>
            </div>
          </div>

          {/* Recommended Moves */}
          {evalData.summary.recommended_moves.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">
                Recommended Moves
              </h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {evalData.summary.recommended_moves.map((move, i) => (
                  <RecommendationCard
                    key={i}
                    move={move as unknown as Parameters<typeof RecommendationCard>[0]["move"]}
                    index={i}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Batting Position Breakdown */}
          {evalData.roster.batting.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">
                Batting Positions
              </h2>
              <div className="space-y-2">
                {evalData.roster.batting.map((slot, i) => (
                  <PositionComparison
                    key={i}
                    slot={slot as unknown as Parameters<typeof PositionComparison>[0]["slot"]}
                    statNames={battingStatNames}
                    statInfo={battingCats}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pitching Position Breakdown */}
          {evalData.roster.pitching.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">
                Pitching Positions
              </h2>
              <div className="space-y-2">
                {evalData.roster.pitching.map((slot, i) => (
                  <PositionComparison
                    key={i}
                    slot={slot as unknown as Parameters<typeof PositionComparison>[0]["slot"]}
                    statNames={pitchingStatNames}
                    statInfo={pitchingCats}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
