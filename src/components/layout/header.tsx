"use client";

import LoginButton from "@/components/auth/login-button";

interface HeaderProps {
  leagueName?: string;
}

export default function Header({ leagueName }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-950 px-6">
      <div>
        {leagueName && (
          <span className="text-sm font-medium text-gray-300">
            {leagueName}
          </span>
        )}
      </div>
      <LoginButton />
    </header>
  );
}
