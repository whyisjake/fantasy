import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getUserTeams, getTeamRoster, type StatCoverage } from "@/lib/yahoo-api";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leagueKey = searchParams.get("leagueKey");
  const teamKey = searchParams.get("teamKey");
  const coverage = (searchParams.get("coverage") || "season") as StatCoverage;

  if (!leagueKey && !teamKey) {
    return NextResponse.json(
      { error: "leagueKey or teamKey required" },
      { status: 400 }
    );
  }

  try {
    // If teamKey is provided, get the roster directly
    if (teamKey) {
      const data = await getTeamRoster(session.accessToken, teamKey, coverage);
      const roster = parseRoster(data);
      return NextResponse.json({ roster });
    }

    // Otherwise, find the user's team in the league
    const data = await getUserTeams(session.accessToken, leagueKey!);
    const teamInfo = parseUserTeam(data);
    return NextResponse.json(teamInfo);
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team data" },
      { status: 500 }
    );
  }
}

function parseUserTeam(data: Record<string, unknown>) {
  try {
    const fc = data?.fantasy_content as Record<string, unknown>;
    const league = fc?.league as Array<unknown>;
    const teams = league?.[1] as Record<string, unknown>;
    const teamsObj = teams?.teams as Record<string, unknown>;
    const team = teamsObj?.["0"] as Record<string, unknown>;
    const teamData = team?.team as Array<unknown>;
    const info = teamData?.[0] as Array<unknown>;

    // Extract team info from the nested array
    let teamKey = "";
    let teamName = "";

    for (const item of info || []) {
      if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        if ("team_key" in obj) teamKey = obj.team_key as string;
        if ("name" in obj) teamName = obj.name as string;
      }
    }

    return { teamKey, teamName };
  } catch {
    return { teamKey: null, teamName: null };
  }
}

function parseRoster(data: Record<string, unknown>) {
  try {
    const fc = data?.fantasy_content as Record<string, unknown>;
    const team = fc?.team as Array<unknown>;
    const rosterData = team?.[1] as Record<string, unknown>;
    const roster = rosterData?.roster as Record<string, unknown>;
    const rosterInner = roster?.["0"] as Record<string, unknown> | undefined;
    const players = (rosterInner?.players ?? rosterData?.players) as Record<string, unknown>;

    const playerList: Array<Record<string, unknown>> = [];
    let idx = 0;

    const playersObj = players || {};
    while (playersObj[String(idx)]) {
      const player = playersObj[String(idx)] as Record<string, unknown>;
      const playerData = player?.player as Array<unknown>;

      const playerInfo: Record<string, unknown> = {};

      // Scan all elements — Yahoo puts info, stats, etc. at varying indices
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
              if ("selected_position" in obj) {
                const sp = obj.selected_position as Array<Record<string, unknown>>;
                playerInfo.roster_position = sp?.[0]?.position;
              }
              if ("status" in obj) playerInfo.status = obj.status;
              if ("status_full" in obj) playerInfo.status_full = obj.status_full;
              if ("headshot" in obj) playerInfo.headshot = (obj.headshot as Record<string, unknown>)?.url;
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
    console.error("Error parsing roster:", e);
    return [];
  }
}
