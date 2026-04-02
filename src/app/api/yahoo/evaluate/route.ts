import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getLeagueSettings,
  getTeamRoster,
  getUserTeams,
  getFreeAgents,
} from "@/lib/yahoo-api";
import {
  parseLeagueSettings,
  buildStatMap,
  getStatValue,
  isHigherBetter,
  formatStatDiff,
  isPitcher,
  getRelevantCategories,
} from "@/lib/stat-mapping";
import type { StatCategory, PlayerWithStats } from "@/types/player";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leagueKey = searchParams.get("leagueKey");
  let teamKey = searchParams.get("teamKey");
  const deepScan = searchParams.get("deepScan") === "true";

  if (!leagueKey) {
    return NextResponse.json({ error: "leagueKey required" }, { status: 400 });
  }

  try {
    // If no teamKey, find user's team
    if (!teamKey) {
      const teamsData = await getUserTeams(session.accessToken, leagueKey);
      teamKey = parseTeamKey(teamsData);
      if (!teamKey) {
        return NextResponse.json({ error: "Could not find your team" }, { status: 404 });
      }
    }

    // Fetch league settings and roster in parallel
    const [settingsData, rosterData] = await Promise.all([
      getLeagueSettings(session.accessToken, leagueKey),
      getTeamRoster(session.accessToken, teamKey),
    ]);

    const { statCategories, rosterPositions } = parseLeagueSettings(settingsData);
    const statMap = buildStatMap(statCategories);
    const roster = parseRosterForEval(rosterData);

    const battingCats = getRelevantCategories(statCategories, "batting");
    const pitchingCats = getRelevantCategories(statCategories, "pitching");
    // For comparisons, exclude display-only stats
    const battingScoringCats = getRelevantCategories(statCategories, "batting", true);
    const pitchingScoringCats = getRelevantCategories(statCategories, "pitching", true);

    // Identify positions to fetch free agents for
    const battingPositions = ["C", "1B", "2B", "3B", "SS", "OF"];
    const pitchingPositions = ["SP", "RP"];

    // Fetch free agents per position in parallel
    // deepScan: fetch 25 and re-rank by league scoring; default: Yahoo's top 5
    const faCount = deepScan ? 25 : 5;
    const faPromises = [...battingPositions, ...pitchingPositions].map(async (pos) => {
      try {
        const data = await getFreeAgents(session.accessToken, leagueKey, pos, 0, faCount);
        let players = parseFreeAgents(data);

        if (deepScan && players.length > 0) {
          // Re-rank by league scoring categories
          const cats = battingPositions.includes(pos) ? battingScoringCats : pitchingScoringCats;
          players = rerankByLeagueScoring(players, cats, statMap);
        }

        return { position: pos, players: players.slice(0, 5) };
      } catch {
        return { position: pos, players: [] };
      }
    });

    const freeAgentsByPosition = await Promise.all(faPromises);
    const faMap = new Map<string, PlayerWithStats[]>();
    for (const { position, players } of freeAgentsByPosition) {
      faMap.set(position, players);
    }

    // Build evaluation per roster slot (use scoring cats for comparison, all cats for display)
    const battingEval = buildPositionEval(
      roster.filter((p) => !isPitcher(p.position)),
      faMap,
      battingScoringCats,
      statMap,
      battingPositions
    );

    const pitchingEval = buildPositionEval(
      roster.filter((p) => isPitcher(p.position)),
      faMap,
      pitchingScoringCats,
      statMap,
      pitchingPositions
    );

    // Build summary
    const allEvals = [...battingEval, ...pitchingEval];
    const injuredPlayers = roster.filter((p) => p.status === "IL" || p.status === "IL10" || p.status === "IL60");

    const upgradeSlots = allEvals
      .filter((e) => e.upgrade_available)
      .sort((a, b) => b.upgrade_score - a.upgrade_score);

    const weakestPositions = upgradeSlots.slice(0, 3).map((e) => e.roster_position);
    const strongestPositions = allEvals
      .filter((e) => !e.upgrade_available)
      .slice(0, 3)
      .map((e) => e.roster_position);

    // Build recommended moves (top 3 upgrades)
    const recommendedMoves = upgradeSlots.slice(0, 3).map((slot) => {
      const bestFA = slot.top_free_agents[0];
      if (!bestFA) return null;

      const improved = Object.entries(bestFA.comparison)
        .filter(([, v]) => (v as { isUpgrade: boolean }).isUpgrade)
        .map(([k]) => k);
      const declined = Object.entries(bestFA.comparison)
        .filter(([, v]) => !(v as { isUpgrade: boolean }).isUpgrade && !(v as { isEqual: boolean }).isEqual)
        .map(([k]) => k);

      return {
        action: "add_drop",
        add_player_key: bestFA.player_key,
        add_name: bestFA.name,
        add_position: bestFA.position,
        drop_player_key: slot.player.player_key,
        drop_name: slot.player.name,
        drop_position: slot.roster_position,
        improved_categories: improved,
        declined_categories: declined,
        reason: buildReason(slot.player.name, bestFA.name, improved, declined, bestFA.comparison),
      };
    }).filter(Boolean);

    const response = {
      deep_scan: deepScan,
      league: {
        key: leagueKey,
        scoring_categories: {
          batting: battingScoringCats.map((c) => ({
            stat_id: c.stat_id,
            name: c.display_name,
            display_name: c.name,
            higher_is_better: c.sort_order === "1",
          })),
          pitching: pitchingScoringCats.map((c) => ({
            stat_id: c.stat_id,
            name: c.display_name,
            display_name: c.name,
            higher_is_better: c.sort_order === "1",
          })),
        },
        roster_positions: rosterPositions,
      },
      roster: {
        batting: battingEval,
        pitching: pitchingEval,
      },
      summary: {
        weakest_positions: weakestPositions,
        strongest_positions: strongestPositions,
        injured_players: injuredPlayers.map((p) => ({
          name: p.name,
          position: p.position,
          status: p.status,
        })),
        recommended_moves: recommendedMoves,
      },
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    console.error("Error in evaluate endpoint:", error);
    return NextResponse.json(
      { error: "Failed to evaluate roster" },
      { status: 500 }
    );
  }
}

function parseTeamKey(data: Record<string, unknown>): string | null {
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

function parseRosterForEval(data: Record<string, unknown>): PlayerWithStats[] {
  try {
    const fc = data?.fantasy_content as Record<string, unknown>;
    const team = fc?.team as Array<unknown>;
    const rosterData = team?.[1] as Record<string, unknown>;
    const rosterInner = rosterData?.roster as Record<string, unknown>;
    const playersContainer = (rosterInner?.["0"] as Record<string, unknown>)?.players ?? rosterData?.players;
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

      // playerData is an array — first element is info array, rest may contain stats
      // Scan all elements to find info and stats
      for (let i = 0; i < (playerData?.length || 0); i++) {
        const element = playerData[i];

        if (Array.isArray(element)) {
          // This is the player info array (index 0 typically)
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
              if ("status_full" in obj) playerInfo.status_full = obj.status_full as string;
              if ("headshot" in obj) playerInfo.headshot = (obj.headshot as Record<string, unknown>)?.url as string;
            }
          }
        } else if (typeof element === "object" && element !== null) {
          // This might be a stats or other sub-resource object
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
  } catch (e) {
    console.error("Error parsing roster for eval:", e);
    return [];
  }
}

function parseFreeAgents(data: Record<string, unknown>): PlayerWithStats[] {
  try {
    const fc = data?.fantasy_content as Record<string, unknown>;
    const league = fc?.league as Array<unknown>;
    const playersData = league?.[1] as Record<string, unknown>;
    const players = playersData?.players as Record<string, unknown>;

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
              if ("headshot" in obj) playerInfo.headshot = (obj.headshot as Record<string, unknown>)?.url as string;
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

interface PositionEval {
  roster_position: string;
  player: {
    player_key: string;
    name: string;
    team: string;
    position: string;
    status: string | null;
    headshot?: string;
    stats: Record<string, string>;
  };
  top_free_agents: Array<{
    player_key: string;
    name: string;
    team: string;
    position: string;
    headshot?: string;
    stats: Record<string, string>;
    comparison: Record<string, { diff: string; isUpgrade: boolean; isEqual: boolean }>;
  }>;
  upgrade_available: boolean;
  upgrade_score: number;
}

function buildPositionEval(
  rosterPlayers: PlayerWithStats[],
  faMap: Map<string, PlayerWithStats[]>,
  categories: StatCategory[],
  statMap: Map<string, StatCategory>,
  positions: string[]
): PositionEval[] {
  const evals: PositionEval[] = [];

  for (const player of rosterPlayers) {
    const rosterPos = player.roster_position || player.position.split(",")[0];
    if (rosterPos === "BN" || rosterPos === "IL" || rosterPos === "DL") continue;

    // Find relevant free agents — match to position
    const matchPos = positions.find((p) =>
      player.position.includes(p) || rosterPos === p
    ) || rosterPos;

    const freeAgents = faMap.get(matchPos) || [];

    // Build player stats
    const playerStats: Record<string, string> = {};
    for (const cat of categories) {
      playerStats[cat.display_name] = getStatValue(player.stats, cat.stat_id);
    }

    // Build FA comparisons
    let bestUpgradeScore = 0;
    const topFAs = freeAgents.slice(0, 5).map((fa) => {
      const faStats: Record<string, string> = {};
      const comparison: Record<string, { diff: string; isUpgrade: boolean; isEqual: boolean }> = {};
      let upgradeCount = 0;
      let downgradeCount = 0;

      for (const cat of categories) {
        const faVal = getStatValue(fa.stats, cat.stat_id);
        const playerVal = getStatValue(player.stats, cat.stat_id);
        faStats[cat.display_name] = faVal;

        const higherBetter = isHigherBetter(cat.stat_id, statMap);
        const diff = formatStatDiff(playerVal, faVal, higherBetter);
        comparison[cat.display_name] = diff;

        if (diff.isUpgrade) upgradeCount++;
        else if (!diff.isEqual) downgradeCount++;
      }

      const score = upgradeCount - downgradeCount;
      if (score > bestUpgradeScore) bestUpgradeScore = score;

      return {
        player_key: fa.player_key,
        name: fa.name,
        team: fa.team,
        position: fa.position,
        headshot: fa.headshot,
        stats: faStats,
        comparison,
      };
    });

    // Sort FAs by upgrade score
    topFAs.sort((a, b) => {
      const aScore = Object.values(a.comparison).filter((v) => v.isUpgrade).length -
        Object.values(a.comparison).filter((v) => !v.isUpgrade && !v.isEqual).length;
      const bScore = Object.values(b.comparison).filter((v) => v.isUpgrade).length -
        Object.values(b.comparison).filter((v) => !v.isUpgrade && !v.isEqual).length;
      return bScore - aScore;
    });

    evals.push({
      roster_position: rosterPos,
      player: {
        player_key: player.player_key,
        name: player.name,
        team: player.team,
        position: player.position,
        status: player.status || null,
        headshot: player.headshot,
        stats: playerStats,
      },
      top_free_agents: topFAs,
      upgrade_available: bestUpgradeScore > 0,
      upgrade_score: bestUpgradeScore,
    });
  }

  return evals;
}

function buildReason(
  currentName: string,
  faName: string,
  improved: string[],
  declined: string[],
  comparison: Record<string, { diff: string; isUpgrade: boolean; isEqual: boolean }>
): string {
  const parts: string[] = [];

  if (improved.length > 0) {
    const improveParts = improved.slice(0, 3).map((cat) => {
      const c = comparison[cat];
      return `${cat} (${c?.diff || "+"})`;
    });
    parts.push(`${faName} improves ${improveParts.join(", ")} over ${currentName}`);
  }

  if (declined.length > 0) {
    parts.push(`with minor declines in ${declined.slice(0, 2).join(", ")}`);
  }

  return parts.join(" ") || `${faName} is a comparable option to ${currentName}`;
}

// Re-rank free agents by league scoring categories instead of Yahoo's default rank
function rerankByLeagueScoring(
  players: PlayerWithStats[],
  categories: StatCategory[],
  statMap: Map<string, StatCategory>
): PlayerWithStats[] {
  return [...players].sort((a, b) => {
    let aScore = 0;
    let bScore = 0;

    for (const cat of categories) {
      const aVal = parseFloat(getStatValue(a.stats, cat.stat_id));
      const bVal = parseFloat(getStatValue(b.stats, cat.stat_id));
      if (isNaN(aVal) && isNaN(bVal)) continue;

      const higher = isHigherBetter(cat.stat_id, statMap);

      // Normalize: for each category, compare relative to the group
      if (!isNaN(aVal)) aScore += higher ? aVal : -aVal;
      if (!isNaN(bVal)) bScore += higher ? bVal : -bVal;
    }

    return bScore - aScore; // highest score first
  });
}
