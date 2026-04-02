"use client";

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
