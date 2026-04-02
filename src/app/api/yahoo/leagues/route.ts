import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getUserLeagues } from "@/lib/yahoo-api";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const data = await getUserLeagues(session.accessToken);

    // Parse the Yahoo API response to extract league info
    const leagues = parseLeagues(data);
    return NextResponse.json({ leagues });
  } catch (error) {
    console.error("Error fetching leagues:", error);
    return NextResponse.json(
      { error: "Failed to fetch leagues" },
      { status: 500 }
    );
  }
}

function parseLeagues(data: Record<string, unknown>): Array<Record<string, unknown>> {
  try {
    const fantasyContent = data?.fantasy_content as Record<string, unknown>;
    const users = fantasyContent?.users as Record<string, unknown>;
    const user = (users as Record<string, unknown>)?.["0"] as Record<string, unknown>;
    const userObj = user?.user as Array<unknown>;
    const games = userObj?.[1] as Record<string, unknown>;
    const gamesObj = games?.games as Record<string, unknown>;

    const leagues: Array<Record<string, unknown>> = [];

    // Iterate through games to find leagues
    let gameIdx = 0;
    while (gamesObj?.[String(gameIdx)]) {
      const game = gamesObj[String(gameIdx)] as Record<string, unknown>;
      const gameData = game?.game as Array<unknown>;
      const leaguesInGame = gameData?.[1] as Record<string, unknown>;
      const leaguesObj = leaguesInGame?.leagues as Record<string, unknown>;

      let leagueIdx = 0;
      while (leaguesObj?.[String(leagueIdx)]) {
        const league = leaguesObj[String(leagueIdx)] as Record<string, unknown>;
        const leagueData = league?.league as Array<unknown>;
        const leagueInfo = leagueData?.[0] as Record<string, unknown>;

        if (leagueInfo?.league_key) {
          leagues.push({
            league_key: leagueInfo.league_key,
            name: leagueInfo.name,
            season: leagueInfo.season,
            num_teams: leagueInfo.num_teams,
            scoring_type: leagueInfo.scoring_type,
          });
        }
        leagueIdx++;
      }
      gameIdx++;
    }

    return leagues;
  } catch {
    console.error("Error parsing leagues response");
    return [];
  }
}
