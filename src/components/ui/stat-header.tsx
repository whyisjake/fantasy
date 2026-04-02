"use client";

import type { StatCategory } from "@/types/player";

interface StatHeaderProps {
  category: StatCategory;
  sortStatId?: string | null;
  sortAsc?: boolean;
  onSort?: (statId: string, defaultAsc: boolean) => void;
}

export default function StatHeader({ category, sortStatId, sortAsc, onSort }: StatHeaderProps) {
  const isSorted = sortStatId === category.stat_id;
  const higherBetter = category.sort_order === "1";

  return (
    <th
      className={`px-2 py-2 w-14 text-right select-none group relative ${
        onSort ? "cursor-pointer hover:text-purple-400 transition" : ""
      }`}
      onClick={onSort ? () => onSort(category.stat_id, !higherBetter) : undefined}
    >
      <span>{category.display_name}</span>
      {isSorted && (
        <span className="ml-0.5 text-purple-400">
          {sortAsc ? "\u25B2" : "\u25BC"}
        </span>
      )}
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
        <div className="rounded bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-gray-200 whitespace-nowrap shadow-lg font-normal normal-case tracking-normal">
          <p className="font-medium">{category.name}</p>
          <p className="text-gray-400 mt-0.5">
            {higherBetter ? "Higher is better" : "Lower is better"}
            {category.is_display_only && " (display only)"}
          </p>
        </div>
        <div className="w-2 h-2 bg-gray-800 border-b border-r border-gray-700 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
      </div>
    </th>
  );
}
