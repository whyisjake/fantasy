"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
      <h1 className="text-2xl font-bold text-red-400">Authentication Error</h1>
      <div className="rounded-lg border border-red-800 bg-red-950/30 p-6 max-w-lg">
        <p className="text-sm font-mono text-red-300">Error: {error}</p>
        <p className="mt-4 text-sm text-tertiary">
          {error === "Callback" &&
            "The OAuth callback failed. This usually means the token exchange with Yahoo failed."}
          {error === "OAuthSignin" &&
            "Could not start the OAuth sign-in flow."}
          {error === "OAuthCallback" &&
            "Error in the OAuth callback handler."}
          {error === "OAuthCreateAccount" &&
            "Could not create a user account from the OAuth profile."}
        </p>
      </div>
      <div className="flex gap-3">
        <a
          href="/api/auth/signout"
          className="rounded bg-red-700 px-4 py-2 text-sm text-secondary hover:bg-red-600 transition"
        >
          Sign Out & Retry
        </a>
        <a
          href="/"
          className="rounded bg-surface-secondary px-4 py-2 text-sm text-secondary hover:bg-surface-secondary transition"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[70vh]">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
