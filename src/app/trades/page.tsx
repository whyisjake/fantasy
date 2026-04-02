"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useLeague } from "@/lib/league-context";
import LeagueSelector from "@/components/layout/league-selector";
import TradeSuggestion from "@/components/trades/trade-suggestion";
import TradeImpact from "@/components/trades/trade-impact";

type Tab = "find" | "evaluate";

interface ScanResponse {
  your_team: {
    key: string;
    name: string;
    strengths: string[];
    weaknesses: string[];
  };
  trade_targets: Array<{
    team: { key: string; name: string; rank: number };
    suggested_trades: Array<Record<string, unknown>>;
  }>;
}

interface EvalResponse {
  you_give: { name: string; position: string; team: string; stats: Record<string, string> };
  you_get: { name: string; position: string; team: string; stats: Record<string, string> };
  impact: {
    categories_improved: string[];
    categories_declined: string[];
    categories_neutral: string[];
    net_score: number;
    verdict: "favorable" | "neutral" | "unfavorable";
    details: Record<string, { diff: string; isUpgrade: boolean; isEqual: boolean }>;
  };
}

export default function TradesPage() {
  const { data: session } = useSession();
  const { leagueKey, setLeagueKey } = useLeague();
  const [tab, setTab] = useState<Tab>("find");

  if (!session) {
    return (
      <p className="text-center text-muted py-16">
        Sign in to analyze trades.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Trade Analyzer</h1>
        <LeagueSelector onSelect={setLeagueKey} selected={leagueKey || undefined} />
      </div>

      {!leagueKey ? (
        <p className="text-tertiary text-center py-8">Select a league first.</p>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTab("find")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === "find"
                  ? "bg-purple-600 text-white"
                  : "border border-secondary bg-surface-secondary text-secondary hover:bg-surface-secondary"
              }`}
            >
              Find Trades
            </button>
            <button
              onClick={() => setTab("evaluate")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === "evaluate"
                  ? "bg-purple-600 text-white"
                  : "border border-secondary bg-surface-secondary text-secondary hover:bg-surface-secondary"
              }`}
            >
              Evaluate Trade
            </button>
          </div>

          {tab === "find" && <FindTradesTab leagueKey={leagueKey} />}
          {tab === "evaluate" && <EvaluateTradeTab leagueKey={leagueKey} />}
        </>
      )}
    </div>
  );
}

function FindTradesTab({ leagueKey }: { leagueKey: string }) {
  const [data, setData] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/yahoo/trades?leagueKey=${leagueKey}&mode=scan`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to scan trades");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [leagueKey]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-default bg-surface p-6 text-center">
          <div className="h-6 w-6 mx-auto mb-3 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <p className="text-sm text-tertiary">
            Scanning all team rosters for trade opportunities...
          </p>
          <p className="text-xs text-muted mt-1">
            This may take a moment (fetching all league rosters)
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/30 p-4">
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Your team summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-default bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted mb-1">
            Your Strengths
          </p>
          <p className="text-lg font-semibold text-green-400">
            {data.your_team.strengths.join(", ") || "None identified"}
          </p>
        </div>
        <div className="rounded-lg border border-default bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted mb-1">
            Your Weaknesses
          </p>
          <p className="text-lg font-semibold text-yellow-400">
            {data.your_team.weaknesses.join(", ") || "None identified"}
          </p>
        </div>
      </div>

      {/* Trade targets */}
      {data.trade_targets.length === 0 ? (
        <div className="rounded-lg border border-default bg-surface p-8 text-center">
          <p className="text-tertiary">
            No mutually beneficial trades found with other teams.
          </p>
          <p className="text-xs text-muted mt-1">
            This can happen early in the season when stats haven&apos;t accumulated.
          </p>
        </div>
      ) : (
        data.trade_targets.map((target) => (
          <div key={target.team.key} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-primary">
                {target.team.name}
              </h3>
              <span className="text-xs text-muted">
                Rank #{target.team.rank}
              </span>
            </div>
            {target.suggested_trades.map((trade, i) => (
              <TradeSuggestion
                key={i}
                trade={
                  trade as unknown as Parameters<typeof TradeSuggestion>[0]["trade"]
                }
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function EvaluateTradeTab({ leagueKey }: { leagueKey: string }) {
  const [giveKey, setGiveKey] = useState("");
  const [getKey, setGetKey] = useState("");
  const [result, setResult] = useState<EvalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEvaluate = useCallback(() => {
    if (!giveKey || !getKey) return;
    setLoading(true);
    setError("");
    setResult(null);

    fetch(
      `/api/yahoo/trades?leagueKey=${leagueKey}&mode=evaluate&give=${giveKey}&get=${getKey}`
    )
      .then((r) => {
        if (!r.ok) throw new Error("Failed to evaluate trade");
        return r.json();
      })
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [leagueKey, giveKey, getKey]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-default bg-surface p-4">
        <p className="text-sm text-tertiary mb-4">
          Enter player keys to evaluate a specific trade scenario. You can find
          player keys in the Evaluate page or API responses.
        </p>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted mb-1 block">
              You give (player key)
            </label>
            <input
              type="text"
              value={giveKey}
              onChange={(e) => setGiveKey(e.target.value)}
              placeholder="e.g. 422.p.10642"
              className="w-full rounded border border-secondary bg-surface-secondary px-3 py-2 text-sm text-secondary placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted mb-1 block">
              You get (player key)
            </label>
            <input
              type="text"
              value={getKey}
              onChange={(e) => setGetKey(e.target.value)}
              placeholder="e.g. 422.p.9116"
              className="w-full rounded border border-secondary bg-surface-secondary px-3 py-2 text-sm text-secondary placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleEvaluate}
              disabled={!giveKey || !getKey || loading}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50 transition"
            >
              {loading ? "Evaluating..." : "Evaluate"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-default bg-surface p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <p className="text-xs text-red-400">You give</p>
              <p className="font-medium text-secondary">{result.you_give.name}</p>
              <p className="text-xs text-muted">
                {result.you_give.team} - {result.you_give.position}
              </p>
            </div>
            <div className="text-2xl text-muted">&harr;</div>
            <div className="flex-1">
              <p className="text-xs text-green-400">You get</p>
              <p className="font-medium text-primary">{result.you_get.name}</p>
              <p className="text-xs text-muted">
                {result.you_get.team} - {result.you_get.position}
              </p>
            </div>
          </div>
          <TradeImpact
            impact={result.impact}
            givePlayer={result.you_give}
            getPlayer={result.you_get}
          />
        </div>
      )}
    </div>
  );
}
