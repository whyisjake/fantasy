"use client";

interface Team {
  team_key: string;
  name: string;
  logo?: string;
  rank: number;
  wins: number;
  losses: number;
  ties: number;
  percentage: string;
  points_for?: string;
  points_against?: string;
}

interface StandingsTableProps {
  teams: Team[];
  loading?: boolean;
}

export default function StandingsTable({ teams, loading }: StandingsTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-surface-secondary" />
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <p className="text-center text-muted py-8">No standings available.</p>
    );
  }

  const sorted = [...teams].sort((a, b) => (a.rank || 0) - (b.rank || 0));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-default text-left text-xs font-medium uppercase tracking-wider text-muted">
            <th className="px-3 py-2 w-10">#</th>
            <th className="px-3 py-2">Team</th>
            <th className="px-3 py-2 w-12 text-right">W</th>
            <th className="px-3 py-2 w-12 text-right">L</th>
            <th className="px-3 py-2 w-12 text-right">T</th>
            <th className="px-3 py-2 w-16 text-right">PCT</th>
            {sorted[0]?.points_for && (
              <>
                <th className="px-3 py-2 w-16 text-right">PF</th>
                <th className="px-3 py-2 w-16 text-right">PA</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {sorted.map((team, i) => (
            <tr
              key={team.team_key}
              className={`hover:bg-surface-hover transition ${
                i < 4 ? "border-l-2 border-l-green-600/50" : ""
              }`}
            >
              <td className="px-3 py-2 text-muted">{team.rank}</td>
              <td className="px-3 py-2 font-medium text-primary flex items-center gap-2">
                {team.logo && (
                  <img src={team.logo} alt="" className="h-5 w-5 rounded" />
                )}
                {team.name}
              </td>
              <td className="px-3 py-2 text-right text-secondary">{team.wins}</td>
              <td className="px-3 py-2 text-right text-secondary">{team.losses}</td>
              <td className="px-3 py-2 text-right text-secondary">{team.ties}</td>
              <td className="px-3 py-2 text-right text-secondary">{team.percentage}</td>
              {team.points_for && (
                <>
                  <td className="px-3 py-2 text-right text-secondary">{team.points_for}</td>
                  <td className="px-3 py-2 text-right text-secondary">{team.points_against}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
