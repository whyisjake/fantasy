"use client";

import { useState, useRef, useEffect } from "react";
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
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const thRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (showTooltip && thRef.current) {
      const rect = thRef.current.getBoundingClientRect();
      setTooltipStyle({
        position: "fixed",
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
        transform: "translate(-50%, -100%)",
        zIndex: 9999,
      });
    }
  }, [showTooltip]);

  return (
    <th
      ref={thRef}
      className={`px-2 py-2 w-14 text-right select-none ${
        onSort ? "cursor-pointer hover:text-accent transition" : ""
      }`}
      onClick={onSort ? () => onSort(category.stat_id, !higherBetter) : undefined}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span>{category.display_name}</span>
      {isSorted && (
        <span className="ml-0.5 text-accent">
          {sortAsc ? "\u25B2" : "\u25BC"}
        </span>
      )}
      {showTooltip && (
        <div style={tooltipStyle} className="pointer-events-none">
          <div className="rounded bg-surface-secondary border border-secondary px-2.5 py-1.5 text-xs text-secondary whitespace-nowrap shadow-lg font-normal normal-case tracking-normal">
            <p className="font-medium text-left">{category.name}</p>
            <p className="text-tertiary mt-0.5 text-left">
              {higherBetter ? "Higher is better" : "Lower is better"}
              {category.is_display_only && " (display only)"}
            </p>
          </div>
        </div>
      )}
    </th>
  );
}
