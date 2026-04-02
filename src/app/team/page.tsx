"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLeague } from "@/lib/league-context";
import LeagueSelector from "@/components/layout/league-selector";
import RosterTable from "@/components/team/roster-table";
import CoverageSelector, { type StatCoverageOption } from "@/components/ui/coverage-selector";

export default function TeamPage() {
  const { data: session } = useSession();
  const { leagueKey, teamKey, setLeagueKey, statCategories } = useLeague();
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [coverage, setCoverage] = useState<StatCoverageOption>("season");

  useEffect(() => {
    if (!teamKey) return;

    setLoading(true);
    fetch(`/api/yahoo/team?teamKey=${teamKey}&coverage=${coverage}`)
      .then((r) => r.json())
      .then((data) => {
        setRoster(data.roster || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [teamKey, coverage]);

  useEffect(() => {
    if (!leagueKey) return;

    fetch(`/api/yahoo/team?leagueKey=${leagueKey}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.teamName) setTeamName(data.teamName);
      })
      .catch(console.error);
  }, [leagueKey]);

  if (!session) {
    return (
      <p className="text-center text-muted py-16">
        Sign in to view your team.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Team</h1>
          {teamName && (
            <p className="text-sm text-tertiary">{teamName}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <CoverageSelector value={coverage} onChange={setCoverage} />
          <LeagueSelector onSelect={setLeagueKey} selected={leagueKey || undefined} />
        </div>
      </div>

      <div className="rounded-lg border border-default bg-surface p-4">
        <RosterTable players={roster} statCategories={statCategories} loading={loading} />
      </div>
    </div>
  );
}
