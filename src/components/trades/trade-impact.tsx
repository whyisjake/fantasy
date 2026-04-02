"use client";

interface TradeImpactProps {
  impact: {
    categories_improved: string[];
    categories_declined: string[];
    categories_neutral: string[];
    net_score: number;
    verdict: "favorable" | "neutral" | "unfavorable";
    details: Record<string, { diff: string; isUpgrade: boolean; isEqual: boolean }>;
  };
  givePlayer: { name: string; stats: Record<string, string> };
  getPlayer: { name: string; stats: Record<string, string> };
}

export default function TradeImpact({ impact, givePlayer, getPlayer }: TradeImpactProps) {
  const verdictColors = {
    favorable: "bg-green-900/30 text-green-400 border-green-800",
    neutral: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
    unfavorable: "bg-red-900/30 text-red-400 border-red-800",
  };

  return (
    <div className="space-y-4">
      {/* Verdict */}
      <div
        className={`rounded-lg border p-4 text-center ${verdictColors[impact.verdict]}`}
      >
        <p className="text-lg font-bold capitalize">{impact.verdict}</p>
        <p className="text-sm mt-1">
          Net: {impact.net_score > 0 ? "+" : ""}
          {impact.net_score} categories ({impact.categories_improved.length} improved,{" "}
          {impact.categories_declined.length} declined)
        </p>
      </div>

      {/* Category breakdown */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-default text-xs font-medium uppercase tracking-wider text-muted">
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-right">{givePlayer.name}</th>
              <th className="px-3 py-2 text-right">{getPlayer.name}</th>
              <th className="px-3 py-2 text-right">Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {Object.entries(impact.details).map(([cat, detail]) => (
              <tr key={cat} className="hover:bg-surface-hover transition">
                <td className="px-3 py-2 text-secondary">{cat}</td>
                <td className="px-3 py-2 text-right text-tertiary tabular-nums">
                  {givePlayer.stats[cat] ?? "-"}
                </td>
                <td className="px-3 py-2 text-right text-secondary tabular-nums">
                  {getPlayer.stats[cat] ?? "-"}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums font-medium ${
                    detail.isEqual
                      ? "text-muted"
                      : detail.isUpgrade
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {detail.diff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
