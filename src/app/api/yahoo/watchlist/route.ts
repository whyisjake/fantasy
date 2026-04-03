import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getPlayersByKeys, type StatCoverage } from "@/lib/yahoo-api";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leagueKey = searchParams.get("leagueKey");
  const playerKeys = searchParams.get("playerKeys");
  const coverage = (searchParams.get("coverage") || "season") as StatCoverage;

  if (!leagueKey || !playerKeys) {
    return NextResponse.json(
      { error: "leagueKey and playerKeys required" },
      { status: 400 }
    );
  }

  const keys = playerKeys.split(",").filter(Boolean);
  if (keys.length === 0) {
    return NextResponse.json({ players: [] });
  }

  try {
    const data = await getPlayersByKeys(session.accessToken, leagueKey, keys, coverage);
    const players = parsePlayers(data);
    return NextResponse.json({ players });
  } catch (error) {
    console.error("Error fetching watchlist players:", error);
    return NextResponse.json(
      { error: "Failed to fetch player data" },
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

      const playerInfo: Record<string, unknown> = {};

      for (let i = 0; i < (playerData?.length || 0); i++) {
        const element = playerData[i];

        if (Array.isArray(element)) {
          for (const item of element) {
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
              if ("ownership" in obj) {
                const ow = obj.ownership as Record<string, unknown>;
                if (ow?.percent_owned !== undefined) {
                  playerInfo.percent_owned = Number(ow.percent_owned) || 0;
                }
                const adds = Number(ow?.adds) || 0;
                const drops = Number(ow?.drops) || 0;
                if (adds || drops) {
                  playerInfo.ownership_change = adds - drops;
                }
              }
            }
          }
        } else if (typeof element === "object" && element !== null) {
          const obj = element as Record<string, unknown>;
          if (obj.player_stats) {
            const ps = obj.player_stats as Record<string, unknown>;
            playerInfo.stats = ps?.stats;
          }
        }
      }

      playerList.push(playerInfo);
      idx++;
    }

    return playerList;
  } catch (e) {
    console.error("Error parsing watchlist players:", e);
    return [];
  }
}
