"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import LeagueSelector from "@/components/layout/league-selector";
import { useLeague } from "@/lib/league-context";
import { useEffect, useState, Suspense } from "react";

interface LeagueInfo {
  name: string;
  season: string;
  num_teams: number;
  scoring_type: string;
  current_week: number;
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const { leagueKey, setLeagueKey } = useLeague();
  const [leagueInfo, setLeagueInfo] = useState<LeagueInfo | null>(null);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (!leagueKey) return;

    fetch(`/api/yahoo/standings?leagueKey=${leagueKey}&info=true`)
      .then((r) => r.json())
      .then(setLeagueInfo)
      .catch(console.error);
  }, [leagueKey]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-6">
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 max-w-md text-center">
            <p className="text-sm text-red-300">
              Sign-in failed ({error}). Please try again.
            </p>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="mt-2 text-xs text-red-400 underline hover:text-red-300"
            >
              Clear session & retry
            </button>
          </div>
        )}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            Fantasy Baseball Manager
          </h1>
          <p className="text-gray-400 max-w-md">
            Connect your Yahoo account to manage your fantasy baseball team,
            view standings, search players, and handle transactions.
          </p>
        </div>
        <button
          onClick={() => signIn("yahoo")}
          className="rounded-lg bg-purple-600 px-6 py-3 font-medium text-white hover:bg-purple-500 transition"
        >
          Sign in with Yahoo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <LeagueSelector onSelect={setLeagueKey} selected={leagueKey || undefined} />
      </div>

      {!leagueKey && (
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-8 text-center">
          <p className="text-gray-400">
            Select a league above to get started.
          </p>
        </div>
      )}

      {leagueInfo && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="League" value={leagueInfo.name} />
          <StatCard label="Season" value={leagueInfo.season} />
          <StatCard label="Teams" value={String(leagueInfo.num_teams)} />
          <StatCard label="Scoring" value={leagueInfo.scoring_type || "Head-to-Head"} />
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
