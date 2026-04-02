"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/team", label: "My Team", icon: "⚾" },
  { href: "/standings", label: "Standings", icon: "🏆" },
  { href: "/players", label: "Players", icon: "👤" },
  { href: "/evaluate", label: "Evaluate", icon: "📊" },
  { href: "/transactions", label: "Transactions", icon: "🔄" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-gray-800 bg-gray-950 px-3 py-6">
      <div className="mb-8 px-3">
        <h1 className="text-lg font-bold text-white">Fantasy Manager</h1>
        <p className="text-xs text-gray-500">MLB 2026</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-purple-600/20 text-purple-300 font-medium"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
