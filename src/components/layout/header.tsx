"use client";

import LoginButton from "@/components/auth/login-button";
import ThemeToggle from "@/components/ui/theme-toggle";

interface HeaderProps {
  leagueName?: string;
}

export default function Header({ leagueName }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-default bg-surface px-6">
      <div>
        {leagueName && (
          <span className="text-sm font-medium text-secondary">
            {leagueName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LoginButton />
      </div>
    </header>
  );
}
