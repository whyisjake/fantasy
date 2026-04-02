import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getStandings, getScoreboard } from "@/lib/yahoo-api";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leagueKey = searchParams.get("leagueKey");
  const wantScoreboard = searchParams.get("scoreboard") === "true";
  const wantInfo = searchParams.get("info") === "true";

  if (!leagueKey) {
    return NextResponse.json({ error: "leagueKey required" }, { status: 400 });
  }

  try {
    if (wantScoreboard) {
      const data = await getScoreboard(session.accessToken, leagueKey);
      return NextResponse.json(data);
    }

    const data = await getStandings(session.accessToken, leagueKey);

    if (wantInfo) {
      const info = parseLeagueInfo(data);
      return NextResponse.json(info);
    }

    const standings = parseStandings(data);
    return NextResponse.json({ standings });
  } catch (error) {
    console.error("Error fetching standings:", error);
    return NextResponse.json(
      { error: "Failed to fetch standings" },
      { status: 500 }
    );
  }
}

function parseLeagueInfo(data: Record<string, unknown>) {
  try {
    const fc = data?.fantasy_content as Record<string, unknown>;
    const league = fc?.league as Array<unknown>;
    const info = league?.[0] as Record<string, unknown>;
    return {
      name: info?.name,
      season: info?.season,
      num_teams: info?.num_teams,
      scoring_type: info?.scoring_type,
      current_week: info?.current_week,
    };
  } catch {
    return null;
  }
}

function parseStandings(data: Record<string, unknown>) {
  try {
    const fc = data?.fantasy_content as Record<string, unknown>;
    const league = fc?.league as Array<unknown>;
    const standingsData = league?.[1] as Record<string, unknown>;
    const standings = standingsData?.standings as Array<unknown>;
    const teams = (standings?.[0] as Record<string, unknown>)?.teams as Record<string, unknown>;

    const teamList: Array<Record<string, unknown>> = [];
    let idx = 0;

    while (teams?.[String(idx)]) {
      const team = teams[String(idx)] as Record<string, unknown>;
      const teamData = team?.team as Array<unknown>;
      const info = teamData?.[0] as Array<unknown>;
      const standingInfo = teamData?.[2] as Record<string, unknown>;

      let teamInfo: Record<string, unknown> = {};

      for (const item of info || []) {
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          if ("team_key" in obj) teamInfo.team_key = obj.team_key;
          if ("name" in obj) teamInfo.name = obj.name;
          if ("team_logos" in obj) {
            const logos = obj.team_logos as Array<Record<string, unknown>>;
            teamInfo.logo = (logos?.[0]?.team_logo as Record<string, unknown>)?.url;
          }
        }
      }

      if (standingInfo?.team_standings) {
        const ts = standingInfo.team_standings as Record<string, unknown>;
        teamInfo.rank = ts.rank;
        const outcome = ts.outcome_totals as Record<string, unknown>;
        teamInfo.wins = outcome?.wins;
        teamInfo.losses = outcome?.losses;
        teamInfo.ties = outcome?.ties;
        teamInfo.percentage = outcome?.percentage;
        teamInfo.points_for = (ts as Record<string, unknown>).points_for;
        teamInfo.points_against = (ts as Record<string, unknown>).points_against;
      }

      teamList.push(teamInfo);
      idx++;
    }

    return teamList;
  } catch (e) {
    console.error("Error parsing standings:", e);
    return [];
  }
}
