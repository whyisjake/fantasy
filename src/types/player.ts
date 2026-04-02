export interface PlayerBase {
  player_key: string;
  name: string;
  team: string;
  position: string;
  status?: string;
  status_full?: string;
  headshot?: string;
}

export interface PlayerWithStats extends PlayerBase {
  stats?: Array<{ stat: { stat_id: string; value: string } }>;
  roster_position?: string;
  ownership?: Record<string, unknown>;
}

export interface StatCategory {
  stat_id: string;
  name: string;
  display_name: string;
  sort_order: "0" | "1"; // "1" = higher is better, "0" = lower is better
  position_types: string[]; // ["B"] for batting, ["P"] for pitching
}

export interface ResolvedStats {
  batting: Record<string, string>;
  pitching: Record<string, string>;
}
