"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLeague } from "@/lib/league-context";
import LeagueSelector from "@/components/layout/league-selector";
import StandingsTable from "@/components/standings/standings-table";

export default function StandingsPage() {
  const { data: session } = useSession();
  const { leagueKey, setLeagueKey } = useLeague();
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leagueKey) return;

    setLoading(true);
    fetch(`/api/yahoo/standings?leagueKey=${leagueKey}`)
      .then((r) => r.json())
      .then((data) => {
        setStandings(data.standings || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [leagueKey]);

  if (!session) {
    return (
      <p className="text-center text-gray-500 py-16">
        Sign in to view standings.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Standings</h1>
        <LeagueSelector onSelect={setLeagueKey} selected={leagueKey || undefined} />
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
        <StandingsTable teams={standings} loading={loading} />
      </div>
    </div>
  );
}
