import type { PlayerWithStats, StatCategory } from "@/types/player";
import {
  getStatValue,
  isHigherBetter,
  formatStatDiff,
  isPitcher,
  getRelevantCategories,
} from "@/lib/stat-mapping";

interface PositionStrength {
  position: string;
  player: PlayerWithStats;
  score: number; // aggregate stat quality score
  stats: Record<string, string>;
}

export interface TeamProfile {
  teamKey: string;
  teamName: string;
  rank?: number;
  roster: PlayerWithStats[];
  strengths: PositionStrength[];
  weaknesses: PositionStrength[];
}

export interface TradeSuggestion {
  you_give: {
    player_key: string;
    name: string;
    position: string;
    team: string;
    stats: Record<string, string>;
  };
  you_get: {
    player_key: string;
    name: string;
    position: string;
    team: string;
    stats: Record<string, string>;
  };
  your_net_impact: Record<string, string>;
  their_net_impact: Record<string, string>;
  categories_you_improve: number;
  categories_they_improve: number;
  mutually_beneficial: boolean;
  reason: string;
}

export interface TradeImpact {
  categories_improved: string[];
  categories_declined: string[];
  categories_neutral: string[];
  net_score: number;
  verdict: "favorable" | "neutral" | "unfavorable";
  details: Record<string, { diff: string; isUpgrade: boolean; isEqual: boolean }>;
}

// Score a player's stat quality at their position (higher = better)
function scorePlayer(
  player: PlayerWithStats,
  categories: StatCategory[],
  statMap: Map<string, StatCategory>
): number {
  let score = 0;
  for (const cat of categories) {
    const val = parseFloat(getStatValue(player.stats, cat.stat_id));
    if (isNaN(val)) continue;
    const higher = isHigherBetter(cat.stat_id, statMap);
    // Normalize: for "lower is better" stats, invert so higher score = better player
    score += higher ? val : -val;
  }
  return score;
}

// Build a player's stats object for display
function buildPlayerStats(
  player: PlayerWithStats,
  categories: StatCategory[]
): Record<string, string> {
  const stats: Record<string, string> = {};
  for (const cat of categories) {
    stats[cat.display_name] = getStatValue(player.stats, cat.stat_id);
  }
  return stats;
}

// Identify strengths and weaknesses for a team
export function profileTeam(
  teamKey: string,
  teamName: string,
  roster: PlayerWithStats[],
  battingCats: StatCategory[],
  pitchingCats: StatCategory[],
  statMap: Map<string, StatCategory>,
  rank?: number
): TeamProfile {
  const positions: PositionStrength[] = [];

  // Score each starting player
  for (const player of roster) {
    const rosterPos = player.roster_position || player.position.split(",")[0];
    if (rosterPos === "BN" || rosterPos === "IL" || rosterPos === "DL" || rosterPos === "NA") continue;

    const cats = isPitcher(player.position) ? pitchingCats : battingCats;
    const score = scorePlayer(player, cats, statMap);
    const stats = buildPlayerStats(player, cats);

    positions.push({ position: rosterPos, player, score, stats });
  }

  // Sort by score — weakest first
  const sorted = [...positions].sort((a, b) => a.score - b.score);
  const weaknesses = sorted.slice(0, 3);
  const strengths = sorted.slice(-3).reverse();

  return { teamKey, teamName, rank, roster, strengths, weaknesses };
}

// Find mutually beneficial trade matches between two teams
export function findTradeMatches(
  myProfile: TeamProfile,
  theirProfile: TeamProfile,
  battingCats: StatCategory[],
  pitchingCats: StatCategory[],
  statMap: Map<string, StatCategory>
): TradeSuggestion[] {
  const suggestions: TradeSuggestion[] = [];

  // For each of my weak positions, see if they have a strong player there
  // and for each of their weak positions, see if I have a strong player there
  for (const myWeak of myProfile.weaknesses) {
    for (const theirStrong of theirProfile.strengths) {
      // Position compatibility: they have someone good at a position I need
      if (!positionCompatible(myWeak.position, theirStrong.player)) continue;

      // Now find something I can offer them
      for (const theirWeak of theirProfile.weaknesses) {
        for (const myStrong of myProfile.strengths) {
          if (!positionCompatible(theirWeak.position, myStrong.player)) continue;
          // Don't trade the same player
          if (myStrong.player.player_key === myWeak.player.player_key) continue;
          if (theirStrong.player.player_key === theirWeak.player.player_key) continue;

          const cats = isPitcher(myWeak.player.position) ? pitchingCats : battingCats;
          const theirCats = isPitcher(myStrong.player.position) ? pitchingCats : battingCats;

          // Calculate impact on my team: I lose myStrong, gain theirStrong
          const myImpact = calculateImpact(myStrong.player, theirStrong.player, cats, statMap);
          // Calculate impact on their team: they lose theirStrong, gain myStrong
          const theirImpact = calculateImpact(theirStrong.player, myStrong.player, theirCats, statMap);

          const myImproveCount = Object.values(myImpact).filter((v) => v.isUpgrade).length;
          const theirImproveCount = Object.values(theirImpact).filter((v) => v.isUpgrade).length;

          // Both should benefit
          if (myImproveCount === 0 || theirImproveCount === 0) continue;

          const myStats = buildPlayerStats(myStrong.player, theirCats);
          const theirStats = buildPlayerStats(theirStrong.player, cats);

          const yourNetImpact: Record<string, string> = {};
          for (const [k, v] of Object.entries(myImpact)) {
            yourNetImpact[k] = v.diff;
          }
          const theirNetImpact: Record<string, string> = {};
          for (const [k, v] of Object.entries(theirImpact)) {
            theirNetImpact[k] = v.diff;
          }

          suggestions.push({
            you_give: {
              player_key: myStrong.player.player_key,
              name: myStrong.player.name,
              position: myStrong.player.position,
              team: myStrong.player.team,
              stats: myStats,
            },
            you_get: {
              player_key: theirStrong.player.player_key,
              name: theirStrong.player.name,
              position: theirStrong.player.position,
              team: theirStrong.player.team,
              stats: theirStats,
            },
            your_net_impact: yourNetImpact,
            their_net_impact: theirNetImpact,
            categories_you_improve: myImproveCount,
            categories_they_improve: theirImproveCount,
            mutually_beneficial: myImproveCount > 0 && theirImproveCount > 0,
            reason: buildTradeReason(
              myStrong.player.name,
              theirStrong.player.name,
              myImpact,
              theirImpact
            ),
          });
        }
      }
    }
  }

  // Deduplicate and sort by combined benefit
  const seen = new Set<string>();
  return suggestions
    .filter((s) => {
      const key = `${s.you_give.player_key}-${s.you_get.player_key}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        b.categories_you_improve + b.categories_they_improve -
        (a.categories_you_improve + a.categories_they_improve)
    )
    .slice(0, 3);
}

// Evaluate a specific trade: what happens if I swap givePlayer for getPlayer
export function evaluateTradeImpact(
  givePlayer: PlayerWithStats,
  getPlayer: PlayerWithStats,
  categories: StatCategory[],
  statMap: Map<string, StatCategory>
): TradeImpact {
  const details: Record<string, { diff: string; isUpgrade: boolean; isEqual: boolean }> = {};
  const improved: string[] = [];
  const declined: string[] = [];
  const neutral: string[] = [];

  for (const cat of categories) {
    const giveVal = getStatValue(givePlayer.stats, cat.stat_id);
    const getVal = getStatValue(getPlayer.stats, cat.stat_id);
    const higher = isHigherBetter(cat.stat_id, statMap);
    const diff = formatStatDiff(giveVal, getVal, higher);
    details[cat.display_name] = diff;

    if (diff.isEqual) {
      neutral.push(cat.display_name);
    } else if (diff.isUpgrade) {
      improved.push(cat.display_name);
    } else {
      declined.push(cat.display_name);
    }
  }

  const netScore = improved.length - declined.length;
  const verdict =
    netScore > 0 ? "favorable" : netScore < 0 ? "unfavorable" : "neutral";

  return { categories_improved: improved, categories_declined: declined, categories_neutral: neutral, net_score: netScore, verdict, details };
}

// Check if a player can fill a position
function positionCompatible(targetPos: string, player: PlayerWithStats): boolean {
  const eligible = player.position.split(",").map((p) => p.trim());
  if (eligible.includes(targetPos)) return true;
  // OF is compatible with LF, CF, RF
  if (targetPos === "OF" && eligible.some((p) => ["LF", "CF", "RF", "OF"].includes(p))) return true;
  // P is compatible with SP, RP
  if (targetPos === "P" && eligible.some((p) => ["SP", "RP", "P"].includes(p))) return true;
  if (targetPos === "Util") return !isPitcher(player.position);
  return false;
}

function calculateImpact(
  losePlayer: PlayerWithStats,
  gainPlayer: PlayerWithStats,
  categories: StatCategory[],
  statMap: Map<string, StatCategory>
): Record<string, { diff: string; isUpgrade: boolean; isEqual: boolean }> {
  const impact: Record<string, { diff: string; isUpgrade: boolean; isEqual: boolean }> = {};
  for (const cat of categories) {
    const loseVal = getStatValue(losePlayer.stats, cat.stat_id);
    const gainVal = getStatValue(gainPlayer.stats, cat.stat_id);
    const higher = isHigherBetter(cat.stat_id, statMap);
    impact[cat.display_name] = formatStatDiff(loseVal, gainVal, higher);
  }
  return impact;
}

function buildTradeReason(
  giveName: string,
  getName: string,
  myImpact: Record<string, { diff: string; isUpgrade: boolean; isEqual: boolean }>,
  theirImpact: Record<string, { diff: string; isUpgrade: boolean; isEqual: boolean }>
): string {
  const myUpgrades = Object.entries(myImpact)
    .filter(([, v]) => v.isUpgrade)
    .map(([k, v]) => `${k} (${v.diff})`)
    .slice(0, 3);
  const theirUpgrades = Object.entries(theirImpact)
    .filter(([, v]) => v.isUpgrade)
    .map(([k]) => k)
    .slice(0, 3);

  const parts: string[] = [];
  if (myUpgrades.length) {
    parts.push(`You gain ${getName}: ${myUpgrades.join(", ")}`);
  }
  if (theirUpgrades.length) {
    parts.push(`they improve ${theirUpgrades.join(", ")} with ${giveName}`);
  }
  return parts.join("; ") || `Swap ${giveName} for ${getName}`;
}
