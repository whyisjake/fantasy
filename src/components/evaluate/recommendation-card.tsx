"use client";

import { useWatchlist } from "@/lib/watchlist-context";

interface RecommendedMove {
  action: string;
  add_player_key: string;
  add_name: string;
  add_position: string;
  add_headshot?: string;
  drop_player_key: string;
  drop_name: string;
  drop_position: string;
  drop_headshot?: string;
  improved_categories: string[];
  declined_categories: string[];
  reason: string;
}

interface RecommendationCardProps {
  move: RecommendedMove;
  index: number;
}

export default function RecommendationCard({ move, index }: RecommendationCardProps) {
  const { addToWatchlist, removeFromWatchlist, isWatched } = useWatchlist();
  const addWatched = isWatched(move.add_player_key);

  return (
    <div className="rounded-lg border border-default bg-surface p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600/20 text-xs font-medium text-accent">
            {index + 1}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            {move.drop_position}
          </span>
        </div>
        <button
          onClick={() =>
            addWatched
              ? removeFromWatchlist(move.add_player_key)
              : addToWatchlist({
                  player_key: move.add_player_key,
                  name: move.add_name,
                  team: "",
                  position: move.add_position,
                  headshot: move.add_headshot,
                })
          }
          className={`rounded px-1.5 py-1 text-xs transition ${
            addWatched
              ? "bg-purple-600/20 text-accent hover:bg-purple-600/30"
              : "bg-surface-secondary text-muted hover:text-secondary hover:bg-surface-hover"
          }`}
          title={addWatched ? "Remove from watchlist" : "Watch this player"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 flex items-center gap-2">
          <div>
            {move.drop_headshot ? (
              <img src={move.drop_headshot} alt="" className="h-8 w-8 rounded-full" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-surface-secondary flex items-center justify-center text-xs text-muted">
                {move.drop_name?.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-red-400 mb-0.5">Drop</p>
            <p className="font-medium text-secondary">{move.drop_name}</p>
          </div>
        </div>
        <span className="text-muted">&rarr;</span>
        <div className="flex-1 flex items-center gap-2">
          <div>
            {move.add_headshot ? (
              <img src={move.add_headshot} alt="" className="h-8 w-8 rounded-full" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-surface-secondary flex items-center justify-center text-xs text-muted">
                {move.add_name?.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-green-400 mb-0.5">Add</p>
            <p className="font-medium text-primary">{move.add_name}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {move.improved_categories.map((cat) => (
          <span
            key={cat}
            className="text-xs px-1.5 py-0.5 rounded bg-green-900/30 text-green-400"
          >
            +{cat}
          </span>
        ))}
        {move.declined_categories.map((cat) => (
          <span
            key={cat}
            className="text-xs px-1.5 py-0.5 rounded bg-red-900/20 text-red-400"
          >
            -{cat}
          </span>
        ))}
      </div>

      <p className="text-xs text-tertiary">{move.reason}</p>
    </div>
  );
}
