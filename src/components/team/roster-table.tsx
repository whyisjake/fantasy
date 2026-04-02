"use client";

interface Player {
  player_key: string;
  name: string;
  team: string;
  position: string;
  roster_position: string;
  status?: string;
  status_full?: string;
  stats?: Array<{ stat: { stat_id: string; value: string } }>;
}

interface RosterTableProps {
  players: Player[];
  loading?: boolean;
}

const POSITION_ORDER = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "Util", "BN", "SP", "RP", "DL", "IL"];

export default function RosterTable({ players, loading }: RosterTableProps) {
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
    return (
      <p className="text-center text-gray-500 py-8">No roster data available.</p>
    );
  }

  const sorted = [...players].sort((a, b) => {
    const aIdx = POSITION_ORDER.indexOf(a.roster_position || "");
    const bIdx = POSITION_ORDER.indexOf(b.roster_position || "");
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-3 py-2 w-12">Pos</th>
            <th className="px-3 py-2">Player</th>
            <th className="px-3 py-2 w-16">Team</th>
            <th className="px-3 py-2 w-20">Elig</th>
            <th className="px-3 py-2 w-20">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {sorted.map((player) => (
            <tr key={player.player_key} className="hover:bg-gray-800/30 transition">
              <td className="px-3 py-2 font-medium text-purple-400">
                {player.roster_position}
              </td>
              <td className="px-3 py-2 font-medium text-white">
                {player.name}
              </td>
              <td className="px-3 py-2 text-gray-400">{player.team}</td>
              <td className="px-3 py-2 text-gray-400">{player.position}</td>
              <td className="px-3 py-2">
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
