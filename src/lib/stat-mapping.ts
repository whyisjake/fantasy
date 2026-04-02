import type { StatCategory, PlayerWithStats } from "@/types/player";

// Fallback stat ID mapping for MLB when league settings aren't available
export const KNOWN_STAT_IDS: Record<
  string,
  { name: string; abbr: string; isBatting: boolean; higherIsBetter: boolean }
> = {
  "0": { name: "Games Played", abbr: "GP", isBatting: true, higherIsBetter: true },
  "3": { name: "Batting Average", abbr: "AVG", isBatting: true, higherIsBetter: true },
  "6": { name: "At Bats", abbr: "AB", isBatting: true, higherIsBetter: true },
  "7": { name: "Runs", abbr: "R", isBatting: true, higherIsBetter: true },
  "8": { name: "Hits", abbr: "H", isBatting: true, higherIsBetter: true },
  "9": { name: "Singles", abbr: "1B", isBatting: true, higherIsBetter: true },
  "10": { name: "Doubles", abbr: "2B", isBatting: true, higherIsBetter: true },
  "11": { name: "Triples", abbr: "3B", isBatting: true, higherIsBetter: true },
  "12": { name: "Home Runs", abbr: "HR", isBatting: true, higherIsBetter: true },
  "13": { name: "Runs Batted In", abbr: "RBI", isBatting: true, higherIsBetter: true },
  "16": { name: "Stolen Bases", abbr: "SB", isBatting: true, higherIsBetter: true },
  "18": { name: "Walks", abbr: "BB", isBatting: true, higherIsBetter: true },
  "21": { name: "Strikeouts", abbr: "K", isBatting: true, higherIsBetter: false },
  "23": { name: "On-Base Percentage", abbr: "OBP", isBatting: true, higherIsBetter: true },
  "24": { name: "Slugging Percentage", abbr: "SLG", isBatting: true, higherIsBetter: true },
  "25": { name: "Innings Pitched", abbr: "IP", isBatting: false, higherIsBetter: true },
  "26": { name: "Earned Run Average", abbr: "ERA", isBatting: false, higherIsBetter: false },
  "27": { name: "WHIP", abbr: "WHIP", isBatting: false, higherIsBetter: false },
  "28": { name: "Wins", abbr: "W", isBatting: false, higherIsBetter: true },
  "29": { name: "Losses", abbr: "L", isBatting: false, higherIsBetter: false },
  "32": { name: "Saves", abbr: "SV", isBatting: false, higherIsBetter: true },
  "34": { name: "Holds", abbr: "HLD", isBatting: false, higherIsBetter: true },
  "37": { name: "Earned Runs", abbr: "ER", isBatting: false, higherIsBetter: false },
  "39": { name: "Walks Allowed", abbr: "BB", isBatting: false, higherIsBetter: false },
  "42": { name: "Strikeouts", abbr: "K", isBatting: false, higherIsBetter: true },
  "48": { name: "Quality Starts", abbr: "QS", isBatting: false, higherIsBetter: true },
  "50": { name: "Innings Pitched", abbr: "IP", isBatting: false, higherIsBetter: true },
};

// Parse league settings response to extract stat categories
export function parseLeagueSettings(data: Record<string, unknown>): {
  statCategories: StatCategory[];
  rosterPositions: Array<{ position: string; count: number; type: string }>;
} {
  const statCategories: StatCategory[] = [];
  const rosterPositions: Array<{ position: string; count: number; type: string }> = [];

  try {
    const fc = data?.fantasy_content as Record<string, unknown>;
    const league = fc?.league as Array<unknown>;
    const settingsData = league?.[1] as Record<string, unknown>;
    const settings = settingsData?.settings as Array<unknown>;
    const settingsObj = settings?.[0] as Record<string, unknown>;

    // Parse stat categories
    const statCats = settingsObj?.stat_categories as Record<string, unknown>;
    const stats = statCats?.stats as Array<unknown>;

    if (Array.isArray(stats)) {
      for (const item of stats) {
        const statObj = item as Record<string, unknown>;
        const stat = statObj?.stat as Record<string, unknown>;
        if (stat?.stat_id !== undefined) {
          // Determine position type from multiple possible sources:
          // 1. group field: "batting" → B, "pitching" → P (most reliable)
          // 2. position_type field: "B" or "P"
          // 3. stat_position_types nested array
          let posTypes: string[] = [];
          const group = stat.group as string | undefined;
          if (group === "batting") {
            posTypes = ["B"];
          } else if (group === "pitching") {
            posTypes = ["P"];
          } else {
            const posType = stat.position_type as string | undefined;
            if (posType) posTypes = [posType];
          }

          const isDisplayOnly = stat.is_only_display_stat === "1";

          statCategories.push({
            stat_id: String(stat.stat_id),
            name: (stat.name as string) || "",
            display_name: (stat.display_name as string) || (stat.abbr as string) || "",
            sort_order: (stat.sort_order as "0" | "1") || "1",
            position_types: posTypes,
            is_display_only: isDisplayOnly,
          });
        }
      }
    }

    // Parse roster positions
    const rosterPosData = settingsObj?.roster_positions as Array<unknown>;
    if (Array.isArray(rosterPosData)) {
      for (const item of rosterPosData) {
        const rpObj = item as Record<string, unknown>;
        const rp = rpObj?.roster_position as Record<string, unknown>;
        if (rp?.position) {
          rosterPositions.push({
            position: rp.position as string,
            count: Number(rp.count) || 1,
            type: (rp.position_type as string) || "",
          });
        }
      }
    }
  } catch (e) {
    console.error("Error parsing league settings:", e);
  }

  return { statCategories, rosterPositions };
}

// Build a stat_id → StatCategory lookup map
export function buildStatMap(categories: StatCategory[]): Map<string, StatCategory> {
  const map = new Map<string, StatCategory>();
  for (const cat of categories) {
    map.set(cat.stat_id, cat);
  }
  return map;
}

// Resolve raw Yahoo stats into readable batting/pitching objects
export function resolvePlayerStats(
  rawStats: Array<{ stat: { stat_id: string; value: string } }> | undefined,
  statMap: Map<string, StatCategory>
): { batting: Record<string, string>; pitching: Record<string, string> } {
  const batting: Record<string, string> = {};
  const pitching: Record<string, string> = {};

  if (!rawStats) return { batting, pitching };

  for (const item of rawStats) {
    const { stat_id, value } = item.stat;
    const cat = statMap.get(stat_id);
    if (cat) {
      const key = cat.display_name || cat.name;
      if (cat.position_types.includes("B")) {
        batting[key] = value;
      }
      if (cat.position_types.includes("P")) {
        pitching[key] = value;
      }
    } else {
      // Fallback to known IDs
      const known = KNOWN_STAT_IDS[stat_id];
      if (known) {
        if (known.isBatting) {
          batting[known.abbr] = value;
        } else {
          pitching[known.abbr] = value;
        }
      }
    }
  }

  return { batting, pitching };
}

// Get stat value from raw stats by stat_id
export function getStatValue(
  rawStats: Array<{ stat: { stat_id: string; value: string } }> | undefined,
  statId: string
): string {
  if (!rawStats) return "-";
  const found = rawStats.find((s) => s.stat.stat_id === statId);
  return found?.stat.value ?? "-";
}

// Determine if higher values are better for a stat
export function isHigherBetter(statId: string, statMap: Map<string, StatCategory>): boolean {
  const cat = statMap.get(statId);
  if (cat) return cat.sort_order === "1";
  const known = KNOWN_STAT_IDS[statId];
  if (known) return known.higherIsBetter;
  return true;
}

// Compare two stat values and return diff info
export function formatStatDiff(
  currentVal: string,
  compareVal: string,
  higherIsBetter: boolean
): { diff: string; isUpgrade: boolean; isEqual: boolean } {
  const current = parseFloat(currentVal);
  const compare = parseFloat(compareVal);

  if (isNaN(current) || isNaN(compare)) {
    return { diff: "-", isUpgrade: false, isEqual: true };
  }

  const rawDiff = compare - current;

  if (Math.abs(rawDiff) < 0.001) {
    return { diff: "0", isUpgrade: false, isEqual: true };
  }

  // Format diff to match the precision of the values
  const isRate = currentVal.includes(".") || compareVal.includes(".");
  const diffStr = rawDiff > 0 ? `+${isRate ? rawDiff.toFixed(3) : rawDiff}` : `${isRate ? rawDiff.toFixed(3) : rawDiff}`;

  const isUpgrade = higherIsBetter ? rawDiff > 0 : rawDiff < 0;

  return { diff: diffStr, isUpgrade, isEqual: false };
}

// Check if a player is a pitcher based on position
export function isPitcher(position: string): boolean {
  const pitchingPositions = ["SP", "RP", "P"];
  return position.split(",").some((p) => pitchingPositions.includes(p.trim()));
}

// Get the relevant stat categories for a player type
export function getRelevantCategories(
  categories: StatCategory[],
  type: "batting" | "pitching",
  excludeDisplayOnly = false
): StatCategory[] {
  const posType = type === "batting" ? "B" : "P";
  return categories.filter(
    (c) => c.position_types.includes(posType) && (!excludeDisplayOnly || !c.is_display_only)
  );
}
