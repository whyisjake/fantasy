import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { searchPlayers, getFreeAgents } from "@/lib/yahoo-api";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leagueKey = searchParams.get("leagueKey");
  const query = searchParams.get("q");
  const position = searchParams.get("position") || undefined;
  const freeAgents = searchParams.get("freeAgents") === "true";
  const start = parseInt(searchParams.get("start") || "0");

  if (!leagueKey) {
    return NextResponse.json({ error: "leagueKey required" }, { status: 400 });
  }

  try {
    let data;
    if (freeAgents) {
      data = await getFreeAgents(session.accessToken, leagueKey, position, start);
    } else if (query) {
      data = await searchPlayers(session.accessToken, leagueKey, query, position);
    } else {
      return NextResponse.json({ error: "q or freeAgents param required" }, { status: 400 });
    }

    const players = parsePlayers(data);
    return NextResponse.json({ players });
  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}

function parsePlayers(data: Record<string, unknown>) {
  try {
    const fc = data?.fantasy_content as Record<string, unknown>;
    const league = fc?.league as Array<unknown>;
    const playersData = league?.[1] as Record<string, unknown>;
    const players = playersData?.players as Record<string, unknown>;

    const playerList: Array<Record<string, unknown>> = [];
    let idx = 0;

    while (players?.[String(idx)]) {
      const player = players[String(idx)] as Record<string, unknown>;
      const playerData = player?.player as Array<unknown>;
      const info = playerData?.[0] as Array<unknown>;
      const statsData = playerData?.[1] as Record<string, unknown>;

      let playerInfo: Record<string, unknown> = {};

      for (const item of info || []) {
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          if ("player_key" in obj) playerInfo.player_key = obj.player_key;
          if ("name" in obj) playerInfo.name = (obj.name as Record<string, unknown>)?.full;
          if ("editorial_team_abbr" in obj) playerInfo.team = obj.editorial_team_abbr;
          if ("display_position" in obj) playerInfo.position = obj.display_position;
          if ("status" in obj) playerInfo.status = obj.status;
          if ("status_full" in obj) playerInfo.status_full = obj.status_full;
          if ("headshot" in obj) {
            playerInfo.headshot = (obj.headshot as Record<string, unknown>)?.url;
          }
          if ("ownership" in obj) playerInfo.ownership = obj.ownership;
        }
      }

      if (statsData?.player_stats) {
        const ps = statsData.player_stats as Record<string, unknown>;
        playerInfo.stats = ps?.stats;
      }

      playerList.push(playerInfo);
      idx++;
    }

    return playerList;
  } catch (e) {
    console.error("Error parsing players:", e);
    return [];
  }
}
