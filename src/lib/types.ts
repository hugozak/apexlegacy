export type Region = "NA" | "EU" | "APAC" | "SA";
export type Role = "Fragger" | "IGL" | "Anchor";

export type StatKey =
  | "aim"
  | "movement"
  | "gameSense"
  | "leadership"
  | "mental"
  | "notoriety";

export type Stats = Record<StatKey, number>;

export type TierId =
  | "ranked"
  | "scrims"
  | "challenger"
  | "proleague"
  | "algs"
  | "lan";

export interface Tier {
  id: TierId;
  name: string;
  short: string;
  /** Seuils requis pour être promu depuis ce palier. */
  requires: { overall: number; notoriety: number };
  /** Cash de base d'un tournoi à ce palier (1re place). */
  prizePool: number;
  /** Salaire hebdo sous contrat à ce palier. */
  weeklySalary: number;
  /** Nombre d'équipes dans le lobby simulé. */
  lobbySize: number;
}

export type Personality =
  | "Compétiteur"
  | "Chill"
  | "Toxique"
  | "Studieux"
  | "Showman"
  | "Loyal";

export interface Teammate {
  id: string;
  name: string;
  role: Role;
  legend: string;
  personality: Personality;
  ambition: number; // 0-100
  loyalty: number; // 0-100
  stats: Pick<Stats, "aim" | "movement" | "gameSense" | "leadership" | "mental">;
  form: number; // -10..+10, variation de forme
}

export type ActionId =
  | "aim"
  | "scrims"
  | "vod"
  | "stream"
  | "network"
  | "rest";

export interface ActionDef {
  id: ActionId;
  name: string;
  desc: string;
  tone: "accent" | "violet" | "mint" | "danger";
}

export interface TimelineEntry {
  week: number;
  year: number;
  kind: "event" | "tournament" | "promotion" | "team" | "contract" | "milestone";
  title: string;
  detail?: string;
  tone?: "accent" | "violet" | "mint" | "danger" | "muted";
}

export interface TournamentResult {
  week: number;
  tier: TierId;
  tierName: string;
  placement: number;
  lobbySize: number;
  score: number;
  prize: number;
  notorietyGain: number;
}

/* ---------------- Événements ---------------- */

export interface EventEffects {
  stats?: Partial<Stats>;
  money?: number;
  chemistry?: number;
  /** Effets spéciaux résolus par le moteur. */
  flags?: string[];
}

export interface EventChoice {
  label: string;
  outcome: string;
  effects: EventEffects;
}

export interface EventConditions {
  minWeek?: number;
  maxWeek?: number;
  tiers?: TierId[];
  minStats?: Partial<Stats>;
  maxStats?: Partial<Stats>;
  minChemistry?: number;
  maxChemistry?: number;
  minMoney?: number;
  hasContract?: boolean;
}

export interface GameEvent {
  id: string;
  title: string;
  text: string;
  category: "team" | "org" | "media" | "meta" | "perso" | "opportunite";
  weight: number;
  once?: boolean;
  conditions?: EventConditions;
  choices: EventChoice[];
}

/* ---------------- Fins ---------------- */

export type EndingId =
  | "legend"
  | "caster"
  | "streamer"
  | "coach"
  | "burnout"
  | "journeyman";

export interface Ending {
  id: EndingId;
  title: string;
  tagline: string;
  text: string;
}
