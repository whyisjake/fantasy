"use client";

interface TradeSuggestionProps {
  trade: {
    you_give: { name: string; position: string; team: string; stats: Record<string, string> };
    you_get: { name: string; position: string; team: string; stats: Record<string, string> };
    your_net_impact: Record<string, string>;
    categories_you_improve: number;
    categories_they_improve: number;
    mutually_beneficial: boolean;
    reason: string;
  };
}

export default function TradeSuggestion({ trade }: TradeSuggestionProps) {
  return (
    <div className="rounded-lg border border-default bg-surface p-4">
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1">
          <p className="text-xs text-red-400 mb-0.5">You give</p>
          <p className="font-medium text-secondary">{trade.you_give.name}</p>
          <p className="text-xs text-muted">
            {trade.you_give.team} - {trade.you_give.position}
          </p>
        </div>
        <div className="text-2xl text-muted">&harr;</div>
        <div className="flex-1">
          <p className="text-xs text-green-400 mb-0.5">You get</p>
          <p className="font-medium text-primary">{trade.you_get.name}</p>
          <p className="text-xs text-muted">
            {trade.you_get.team} - {trade.you_get.position}
          </p>
        </div>
      </div>

      {/* Impact badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(trade.your_net_impact).map(([cat, diff]) => {
          const isPositive = diff.startsWith("+");
          const isZero = diff === "0" || diff === "-";
          return (
            <span
              key={cat}
              className={`text-xs px-1.5 py-0.5 rounded ${
                isZero
                  ? "bg-surface-secondary text-muted"
                  : isPositive
                  ? "bg-green-900/30 text-green-400"
                  : "bg-red-900/20 text-red-400"
              }`}
            >
              {cat} {diff}
            </span>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mb-2">
        {trade.mutually_beneficial && (
          <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-accent">
            Win-win
          </span>
        )}
        <span className="text-xs text-muted">
          You improve {trade.categories_you_improve} cats, they improve{" "}
          {trade.categories_they_improve}
        </span>
      </div>

      <p className="text-xs text-tertiary">{trade.reason}</p>
    </div>
  );
}
