import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getLeagueSettings } from "@/lib/yahoo-api";
import { parseLeagueSettings } from "@/lib/stat-mapping";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leagueKey = searchParams.get("leagueKey");

  if (!leagueKey) {
    return NextResponse.json({ error: "leagueKey required" }, { status: 400 });
  }

  const debug = searchParams.get("debug") === "true";

  try {
    const data = await getLeagueSettings(session.accessToken, leagueKey);

    if (debug) {
      // Return raw Yahoo response for debugging
      return NextResponse.json({ raw: data });
    }

    const { statCategories, rosterPositions } = parseLeagueSettings(data);

    console.log("[settings] Parsed stat categories:", statCategories.length, "roster positions:", rosterPositions.length);

    return NextResponse.json(
      { statCategories, rosterPositions },
      {
        headers: { "Cache-Control": "private, max-age=3600" },
      }
    );
  } catch (error) {
    console.error("Error fetching league settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch league settings" },
      { status: 500 }
    );
  }
}
