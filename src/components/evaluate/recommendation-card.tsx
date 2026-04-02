"use client";

interface RecommendedMove {
  action: string;
  add_player_key: string;
  add_name: string;
  add_position: string;
  drop_player_key: string;
  drop_name: string;
  drop_position: string;
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
    <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600/20 text-xs font-medium text-purple-400">
            {index + 1}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            {move.drop_position}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <p className="text-xs text-red-400 mb-0.5">Drop</p>
          <p className="font-medium text-gray-300">{move.drop_name}</p>
        </div>
        <span className="text-gray-600">&rarr;</span>
        <div className="flex-1">
          <p className="text-xs text-green-400 mb-0.5">Add</p>
          <p className="font-medium text-white">{move.add_name}</p>
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

      <p className="text-xs text-gray-400">{move.reason}</p>
    </div>
  );
}
