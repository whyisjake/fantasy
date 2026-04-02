"use client";

interface TransactionPlayer {
  player_key: string;
  name: string;
  team: string;
  position: string;
  transaction_type: string;
  destination_team?: string;
  source_team?: string;
}

interface Transaction {
  type: string;
  status: string;
  timestamp: string;
  players: TransactionPlayer[];
}

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
}

export default function TransactionList({ transactions, loading }: TransactionListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-800" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">No recent transactions.</p>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-800 bg-gray-950 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                tx.type === "add/drop"
                  ? "bg-blue-900/30 text-blue-400"
                  : tx.type === "add"
                  ? "bg-green-900/30 text-green-400"
                  : tx.type === "drop"
                  ? "bg-red-900/30 text-red-400"
                  : tx.type === "trade"
                  ? "bg-purple-900/30 text-purple-400"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              {tx.type}
            </span>
            <span className="text-xs text-gray-500">
              {tx.timestamp
                ? new Date(parseInt(tx.timestamp) * 1000).toLocaleDateString()
                : ""}
            </span>
          </div>
          <div className="space-y-1">
            {tx.players?.map((player, j) => (
              <div key={j} className="flex items-center gap-2 text-sm">
                <span
                  className={`w-12 text-xs font-medium ${
                    player.transaction_type === "add"
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {player.transaction_type === "add" ? "+ ADD" : "- DROP"}
                </span>
                <span className="text-white">{player.name}</span>
                <span className="text-gray-500">
                  {player.team} - {player.position}
                </span>
                {player.destination_team && (
                  <span className="text-xs text-gray-500">
                    &rarr; {player.destination_team}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
