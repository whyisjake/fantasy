"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLeague } from "@/lib/league-context";
import LeagueSelector from "@/components/layout/league-selector";
import TransactionList from "@/components/transactions/transaction-list";

const TX_TYPES = [
  { value: "", label: "All" },
  { value: "add", label: "Adds" },
  { value: "drop", label: "Drops" },
  { value: "add/drop", label: "Add/Drop" },
  { value: "trade", label: "Trades" },
];

export default function TransactionsPage() {
  const { data: session } = useSession();
  const { leagueKey, setLeagueKey } = useLeague();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [txType, setTxType] = useState("");

  useEffect(() => {
    if (!leagueKey) return;

    setLoading(true);
    let url = `/api/yahoo/transactions?leagueKey=${leagueKey}`;
    if (txType) url += `&type=${txType}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setTransactions(data.transactions || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [leagueKey, txType]);

  if (!session) {
    return (
      <p className="text-center text-muted py-16">
        Sign in to view transactions.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Transactions</h1>
        <LeagueSelector onSelect={setLeagueKey} selected={leagueKey || undefined} />
      </div>

      {!leagueKey ? (
        <p className="text-tertiary text-center py-8">Select a league first.</p>
      ) : (
        <>
          <div className="flex gap-2">
            {TX_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setTxType(type.value)}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  txType === type.value
                    ? "bg-purple-600 text-white"
                    : "border border-secondary bg-surface-secondary text-secondary hover:bg-surface-secondary"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <TransactionList transactions={transactions} loading={loading} />
        </>
      )}
    </div>
  );
}
