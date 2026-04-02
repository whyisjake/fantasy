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
              if ("percent_owned" in obj) {
                const po = obj.percent_owned as Array<Record<string, unknown>> | Record<string, unknown>;
                // Yahoo returns percent_owned as nested structure
                if (Array.isArray(po)) {
                  const owned = po.find((p) => "value" in p);
                  if (owned) playerInfo.percent_owned = Number(owned.value) || 0;
                } else if (typeof po === "object") {
                  playerInfo.percent_owned = Number((po as Record<string, unknown>).value) || 0;
                }
              }
              if ("ownership" in obj) {
                const ow = obj.ownership as Record<string, unknown>;
                if (ow?.percent_owned !== undefined) {
                  playerInfo.percent_owned = Number(ow.percent_owned) || 0;
                }
                // ownership_change = adds - drops (positive means trending up)
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
    console.error("Error parsing players:", e);
    return [];
  }
}
