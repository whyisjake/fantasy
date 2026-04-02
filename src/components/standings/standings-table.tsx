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
          <div key={i} className="h-10 animate-pulse rounded bg-gray-800" />
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">No standings available.</p>
    );
  }

  const sorted = [...teams].sort((a, b) => (a.rank || 0) - (b.rank || 0));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
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
        <tbody className="divide-y divide-gray-800/50">
          {sorted.map((team, i) => (
            <tr
              key={team.team_key}
              className={`hover:bg-gray-800/30 transition ${
                i < 4 ? "border-l-2 border-l-green-600/50" : ""
              }`}
            >
              <td className="px-3 py-2 text-gray-500">{team.rank}</td>
              <td className="px-3 py-2 font-medium text-white flex items-center gap-2">
                {team.logo && (
                  <img src={team.logo} alt="" className="h-5 w-5 rounded" />
                )}
                {team.name}
              </td>
              <td className="px-3 py-2 text-right text-gray-300">{team.wins}</td>
              <td className="px-3 py-2 text-right text-gray-300">{team.losses}</td>
              <td className="px-3 py-2 text-right text-gray-300">{team.ties}</td>
              <td className="px-3 py-2 text-right text-gray-300">{team.percentage}</td>
              {team.points_for && (
                <>
                  <td className="px-3 py-2 text-right text-gray-300">{team.points_for}</td>
                  <td className="px-3 py-2 text-right text-gray-300">{team.points_against}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
