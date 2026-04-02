"use client";

import { useState } from "react";

interface PlayerSearchProps {
  onSearch: (query: string, position?: string) => void;
  onFreeAgents: (position?: string) => void;
  loading?: boolean;
}

const POSITIONS = ["All", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "OF", "Util", "SP", "RP"];

export default function PlayerSearch({ onSearch, onFreeAgents, loading }: PlayerSearchProps) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("All");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), position === "All" ? undefined : position);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players..."
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none"
        />
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-purple-500 focus:outline-none"
        >
          {POSITIONS.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50 transition"
        >
          Search
        </button>
      </form>
      <button
        onClick={() => onFreeAgents(position === "All" ? undefined : position)}
        disabled={loading}
        className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition"
      >
        Browse Free Agents
      </button>
    </div>
  );
}
