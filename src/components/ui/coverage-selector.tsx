"use client";

export type StatCoverageOption = "season" | "lastmonth" | "lastweek";

const OPTIONS: { value: StatCoverageOption; label: string }[] = [
  { value: "season", label: "Season" },
  { value: "lastmonth", label: "Last 30 Days" },
  { value: "lastweek", label: "Last 7 Days" },
];

interface CoverageSelectorProps {
  value: StatCoverageOption;
  onChange: (value: StatCoverageOption) => void;
}

export default function CoverageSelector({ value, onChange }: CoverageSelectorProps) {
  return (
    <div className="flex gap-1 rounded-lg border border-gray-700 bg-gray-800 p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded px-2.5 py-1 text-xs font-medium transition ${
            value === opt.value
              ? "bg-purple-600 text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
