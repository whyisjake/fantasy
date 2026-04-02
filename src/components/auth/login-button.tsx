"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function LoginButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-8 w-24 animate-pulse rounded bg-surface-secondary" />;
  }

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-secondary">
          {session.user?.name}
        </span>
        <button
          onClick={() => signOut()}
          className="rounded bg-surface-secondary px-3 py-1.5 text-sm text-secondary hover:bg-surface-secondary transition"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("yahoo")}
      className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 transition"
    >
      Sign in with Yahoo
    </button>
  );
}
