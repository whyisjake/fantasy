"use client";

interface Player {
  player_key: string;
  name: string;
  team: string;
  position: string;
  status?: string;
  status_full?: string;
  headshot?: string;
  ownership?: Record<string, unknown>;
}

interface PlayerCardProps {
  player: Player;
  onAdd?: (playerKey: string) => void;
}

export default function PlayerCard({ player, onAdd }: PlayerCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 p-4 hover:border-gray-700 transition">
      <div className="flex items-center gap-3">
        {player.headshot ? (
          <img
            src={player.headshot}
            alt={player.name}
            className="h-10 w-10 rounded-full bg-gray-800"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-sm text-gray-500">
            {player.name?.charAt(0)}
          </div>
        )}
        <div>
          <p className="font-medium text-white">{player.name}</p>
          <p className="text-xs text-gray-400">
            {player.team} - {player.position}
            {player.status && (
              <span
                className={`ml-2 inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${
                  player.status === "IL"
                    ? "bg-red-900/30 text-red-400"
                    : "bg-yellow-900/30 text-yellow-400"
                }`}
              >
                {player.status}
              </span>
            )}
          </p>
        </div>
      </div>
      {onAdd && (
        <button
          onClick={() => onAdd(player.player_key)}
          className="rounded bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 transition"
        >
          + Add
        </button>
      )}
    </div>
  );
}
