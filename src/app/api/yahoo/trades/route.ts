import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getLeagueSettings,
  getTeamRoster,
  getUserTeams,
  getLeagueTeams,
} from "@/lib/yahoo-api";
import {
  parseLeagueSettings,
  buildStatMap,
  getRelevantCategories,
  getStatValue,
  isPitcher,
} from "@/lib/stat-mapping";
import {
  profileTeam,
  findTradeMatches,
  evaluateTradeImpact,
} from "@/lib/trade-analysis";
import type { PlayerWithStats } from "@/types/player";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leagueKey = searchParams.get("leagueKey");
  const mode = searchParams.get("mode") || "scan";

  if (!leagueKey) {
    return NextResponse.json({ error: "leagueKey required" }, { status: 400 });
  }

  try {
    if (mode === "evaluate") {
      return handleEvaluate(session.accessToken, leagueKey, searchParams);
    }
    return handleScan(session.accessToken, leagueKey);
  } catch (error) {
    console.error("Error in trades endpoint:", error);
    return NextResponse.json(
      { error: "Failed to analyze trades" },
      { status: 500 }
    );
  }
}

async function handleScan(accessToken: string, leagueKey: string) {
  // Fetch settings, standings (for all team keys), and user's team in parallel
  const [settingsData, standingsData, userTeamData] = await Promise.all([
    getLeagueSettings(accessToken, leagueKey),
    getLeagueTeams(accessToken, leagueKey),
    getUserTeams(accessToken, leagueKey),
  ]);

  const { statCategories } = parseLeagueSettings(settingsData);
  const statMap = buildStatMap(statCategories);
  const battingCats = getRelevantCategories(statCategories, "batting", true);
  const pitchingCats = getRelevantCategories(statCategories, "pitching", true);

  // Extract user's team key
  const myTeamKey = parseUserTeamKey(userTeamData);
  if (!myTeamKey) {
    return NextResponse.json({ error: "Could not find your team" }, { status: 404 });
  }

  // Extract all teams from standings
  const allTeams = parseAllTeams(standingsData);

  // Fetch all team rosters in parallel
  const rosterPromises = allTeams.map(async (team) => {
    try {
      const data = await getTeamRoster(accessToken, team.teamKey);
      return { ...team, roster: parseRoster(data) };
    } catch {
      return { ...team, roster: [] as PlayerWithStats[] };
    }
  });

  const teamsWithRosters = await Promise.all(rosterPromises);

  // Profile my team
  const myTeamData = teamsWithRosters.find((t) => t.teamKey === myTeamKey);
  if (!myTeamData || myTeamData.roster.length === 0) {
    return NextResponse.json({ error: "Could not load your roster" }, { status: 404 });
  }

  const myProfile = profileTeam(
    myTeamData.teamKey,
    myTeamData.teamName,
    myTeamData.roster,
    battingCats,
    pitchingCats,
    statMap,
    myTeamData.rank
  );

  // Analyze each opponent
  const tradeTargets = [];
  for (const team of teamsWithRosters) {
    if (team.teamKey === myTeamKey) continue;
    if (team.roster.length === 0) continue;

    const theirProfile = profileTeam(
      team.teamKey,
      team.teamName,
      team.roster,
      battingCats,
      pitchingCats,
      statMap,
      team.rank
    );

    const suggestions = findTradeMatches(
      myProfile,
      theirProfile,
      battingCats,
      pitchingCats,
      statMap
    );

    if (suggestions.length > 0) {
      tradeTargets.push({
        team: {
          key: team.teamKey,
          name: team.teamName,
          rank: team.rank,
        },
        their_surplus: theirProfile.strengths.map((s) => ({
          player: { name: s.player.name, position: s.player.position, team: s.player.team },
          stats: s.stats,
        })),
        your_surplus: myProfile.strengths.map((s) => ({
          player: { name: s.player.name, position: s.player.position, team: s.player.team },
          stats: s.stats,
        })),
        suggested_trades: suggestions,
      });
    }
  }

  // Sort by total trade quality
  tradeTargets.sort((a, b) => {
    const aScore = a.suggested_trades.reduce(
      (sum, t) => sum + t.categories_you_improve,
      0
    );
    const bScore = b.suggested_trades.reduce(
      (sum, t) => sum + t.categories_you_improve,
      0
    );
    return bScore - aScore;
  });

  const response = {
    your_team: {
      key: myTeamData.teamKey,
      name: myTeamData.teamName,
      strengths: myProfile.strengths.map((s) => s.position),
      weaknesses: myProfile.weaknesses.map((s) => s.position),
    },
    trade_targets: tradeTargets,
    scoring_categories: {
      batting: battingCats.map((c) => ({
        name: c.display_name,
        higher_is_better: c.sort_order === "1",
      })),
      pitching: pitchingCats.map((c) => ({
        name: c.display_name,
        higher_is_better: c.sort_order === "1",
      })),
    },
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}

async function handleEvaluate(
  accessToken: string,
  leagueKey: string,
  searchParams: URLSearchParams
) {
  const giveKey = searchParams.get("give");
  const getKey = searchParams.get("get");

  if (!giveKey || !getKey) {
    return NextResponse.json(
      { error: "give and get player keys required" },
      { status: 400 }
    );
  }

  // We need settings and both players' data
  // Players are on different teams, so we need to find them
  const [settingsData, userTeamData] = await Promise.all([
    getLeagueSettings(accessToken, leagueKey),
    getUserTeams(accessToken, leagueKey),
  ]);

  const { statCategories } = parseLeagueSettings(settingsData);
  const statMap = buildStatMap(statCategories);

  const myTeamKey = parseUserTeamKey(userTeamData);
  if (!myTeamKey) {
    return NextResponse.json({ error: "Could not find your team" }, { status: 404 });
  }

  // Fetch all teams to find both players
  const standingsData = await getLeagueTeams(accessToken, leagueKey);
  const allTeams = parseAllTeams(standingsData);

  const rosterPromises = allTeams.map(async (team) => {
    try {
      const data = await getTeamRoster(accessToken, team.teamKey);
      return { ...team, roster: parseRoster(data) };
    } catch {
      return { ...team, roster: [] as PlayerWithStats[] };
    }
  });

  const teamsWithRosters = await Promise.all(rosterPromises);

  // Find both players across all rosters
  let givePlayer: PlayerWithStats | null = null;
  let getPlayer: PlayerWithStats | null = null;

  for (const team of teamsWithRosters) {
    for (const player of team.roster) {
      if (player.player_key === giveKey) givePlayer = player;
      if (player.player_key === getKey) getPlayer = player;
    }
  }

  if (!givePlayer || !getPlayer) {
    return NextResponse.json({ error: "Could not find one or both players" }, { status: 404 });
  }

  const battingCats = getRelevantCategories(statCategories, "batting", true);
  const pitchingCats = getRelevantCategories(statCategories, "pitching", true);

  // Use the appropriate categories based on player type
  const cats = isPitcher(givePlayer.position) ? pitchingCats : battingCats;
  const impact = evaluateTradeImpact(givePlayer, getPlayer, cats, statMap);

  const giveStats: Record<string, string> = {};
  const getStats: Record<string, string> = {};
  for (const cat of cats) {
    giveStats[cat.display_name] = getStatValue(givePlayer.stats, cat.stat_id);
    getStats[cat.display_name] = getStatValue(getPlayer.stats, cat.stat_id);
  }

  return NextResponse.json({
    you_give: {
      player_key: givePlayer.player_key,
      name: givePlayer.name,
      position: givePlayer.position,
      team: givePlayer.team,
      stats: giveStats,
    },
    you_get: {
      player_key: getPlayer.player_key,
      name: getPlayer.name,
      position: getPlayer.position,
      team: getPlayer.team,
      stats: getStats,
    },
    impact,
  });
}

// --- Parsing helpers ---

function parseUserTeamKey(data: Record<string, unknown>): string | null {
  try {
    const fc = data?.fantasy_content as Record<string, unknown>;
    const league = fc?.league as Array<unknown>;
    const teams = league?.[1] as Record<string, unknown>;
    const teamsObj = teams?.teams as Record<string, unknown>;
    const team = teamsObj?.["0"] as Record<string, unknown>;
    const teamData = team?.team as Array<unknown>;
    const info = teamData?.[0] as Array<unknown>;

    for (const item of info || []) {
      if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        if ("team_key" in obj) return obj.team_key as string;
      }
    }
  } catch {}
  return null;
}

function parseAllTeams(
  data: Record<string, unknown>
): Array<{ teamKey: string; teamName: string; rank: number }> {
  const teams: Array<{ teamKey: string; teamName: string; rank: number }> = [];
  try {
    const fc = data?.fantasy_content as Record<string, unknown>;
    const league = fc?.league as Array<unknown>;
    const standingsData = league?.[1] as Record<string, unknown>;
    const standings = standingsData?.standings as Array<unknown>;
    const teamsObj = (standings?.[0] as Record<string, unknown>)?.teams as Record<string, unknown>;

    let idx = 0;
    while (teamsObj?.[String(idx)]) {
      const team = teamsObj[String(idx)] as Record<string, unknown>;
      const teamData = team?.team as Array<unknown>;
      const info = teamData?.[0] as Array<unknown>;
      const standingInfo = teamData?.[2] as Record<string, unknown>;

      let teamKey = "";
      let teamName = "";
      let rank = 0;

      for (const item of info || []) {
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          if ("team_key" in obj) teamKey = obj.team_key as string;
          if ("name" in obj) teamName = obj.name as string;
        }
      }

      if (standingInfo?.team_standings) {
        const ts = standingInfo.team_standings as Record<string, unknown>;
        rank = Number(ts.rank) || 0;
      }

      if (teamKey) teams.push({ teamKey, teamName, rank });
      idx++;
    }
  } catch (e) {
    console.error("Error parsing teams:", e);
  }
  return teams;
}

function parseRoster(data: Record<string, unknown>): PlayerWithStats[] {
  try {
    const fc = data?.fantasy_content as Record<string, unknown>;
    const team = fc?.team as Array<unknown>;
    const rosterData = team?.[1] as Record<string, unknown>;
    const rosterInner = rosterData?.roster as Record<string, unknown>;
    const playersContainer =
      (rosterInner?.["0"] as Record<string, unknown>)?.players ?? rosterData?.players;
    const players = playersContainer as Record<string, unknown>;

    const playerList: PlayerWithStats[] = [];
    let idx = 0;

    while (players?.[String(idx)]) {
      const player = players[String(idx)] as Record<string, unknown>;
      const playerData = player?.player as Array<unknown>;

      const playerInfo: PlayerWithStats = {
        player_key: "",
        name: "",
        team: "",
        position: "",
      };

      for (let i = 0; i < (playerData?.length || 0); i++) {
        const element = playerData[i];

        if (Array.isArray(element)) {
          for (const item of element) {
            if (typeof item === "object" && item !== null) {
              const obj = item as Record<string, unknown>;
              if ("player_key" in obj) playerInfo.player_key = obj.player_key as string;
              if ("name" in obj) playerInfo.name = (obj.name as Record<string, unknown>)?.full as string;
              if ("editorial_team_abbr" in obj) playerInfo.team = obj.editorial_team_abbr as string;
              if ("display_position" in obj) playerInfo.position = obj.display_position as string;
              if ("selected_position" in obj) {
                const sp = obj.selected_position as Array<Record<string, unknown>>;
                playerInfo.roster_position = sp?.[0]?.position as string;
              }
              if ("status" in obj) playerInfo.status = obj.status as string;
            }
          }
        } else if (typeof element === "object" && element !== null) {
          const obj = element as Record<string, unknown>;
          if (obj.player_stats) {
            const ps = obj.player_stats as Record<string, unknown>;
            playerInfo.stats = ps?.stats as PlayerWithStats["stats"];
          }
        }
      }

      playerList.push(playerInfo);
      idx++;
    }

    return playerList;
  } catch {
    return [];
  }
}
