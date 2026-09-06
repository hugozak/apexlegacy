import type { ActionDef, Region, Role, Stats, Tier, TierId, Personality } from "./types";

export const REGIONS: { id: Region; name: string; desc: string }[] = [
  { id: "NA", name: "North America", desc: "Lobbies agressifs, orgs riches, forte visibilité." },
  { id: "EU", name: "Europe", desc: "Scène dense et tactique, scrims de haut niveau." },
  { id: "APAC", name: "Asie-Pacifique", desc: "Movement d'élite, compétition brutale." },
  { id: "SA", name: "South America", desc: "Scène jeune, moins d'argent, plus d'opportunités." },
];

export const ROLES: {
  id: Role;
  name: string;
  desc: string;
  base: Pick<Stats, "aim" | "movement" | "gameSense" | "leadership" | "mental">;
}[] = [
  {
    id: "Fragger",
    name: "Fragger",
    desc: "Tu ouvres les combats. Aim élevé, leadership faible.",
    base: { aim: 58, movement: 50, gameSense: 34, leadership: 20, mental: 42 },
  },
  {
    id: "IGL",
    name: "IGL",
    desc: "Tu appelles les rotations. Game sense et leadership élevés.",
    base: { aim: 36, movement: 38, gameSense: 55, leadership: 58, mental: 44 },
  },
  {
    id: "Anchor",
    name: "Anchor",
    desc: "Tu tiens la zone et l'équipe. Mental et game sense solides.",
    base: { aim: 38, movement: 40, gameSense: 52, leadership: 34, mental: 58 },
  },
];

export const LEGENDS = [
  "Wraith",
  "Pathfinder",
  "Horizon",
  "Bangalore",
  "Bloodhound",
  "Valkyrie",
  "Catalyst",
  "Ash",
  "Gibraltar",
  "Conduit",
] as const;

export const ACTIONS: ActionDef[] = [
  { id: "aim", name: "Aim training", desc: "+Aim, +Movement léger, -Mental léger", tone: "accent" },
  { id: "scrims", name: "Scrims", desc: "+Game sense, +Chimie, -Mental", tone: "violet" },
  { id: "vod", name: "VOD review", desc: "+Game sense, +Leadership", tone: "violet" },
  { id: "stream", name: "Stream", desc: "+Notoriété, +Argent, -Mental", tone: "accent" },
  { id: "network", name: "Networking", desc: "+Notoriété, +Chances d'offres", tone: "mint" },
  { id: "rest", name: "Repos", desc: "+Mental, récupération", tone: "mint" },
];

export const TIERS: Tier[] = [
  {
    id: "ranked",
    name: "Ranked Ladder",
    short: "RANKED",
    requires: { overall: 45, notoriety: 8 },
    prizePool: 0,
    weeklySalary: 0,
    lobbySize: 20,
  },
  {
    id: "scrims",
    name: "Scrims Amateurs",
    short: "SCRIMS",
    requires: { overall: 55, notoriety: 20 },
    prizePool: 400,
    weeklySalary: 0,
    lobbySize: 20,
  },
  {
    id: "challenger",
    name: "Challenger Circuit",
    short: "CHALLENGER",
    requires: { overall: 65, notoriety: 35 },
    prizePool: 3000,
    weeklySalary: 120,
    lobbySize: 20,
  },
  {
    id: "proleague",
    name: "Pro League",
    short: "PRO LEAGUE",
    requires: { overall: 74, notoriety: 55 },
    prizePool: 12000,
    weeklySalary: 600,
    lobbySize: 20,
  },
  {
    id: "algs",
    name: "ALGS Championship",
    short: "ALGS",
    requires: { overall: 82, notoriety: 72 },
    prizePool: 45000,
    weeklySalary: 1600,
    lobbySize: 20,
  },
  {
    id: "lan",
    name: "LAN Internationale",
    short: "LAN",
    requires: { overall: 999, notoriety: 999 },
    prizePool: 120000,
    weeklySalary: 3000,
    lobbySize: 20,
  },
];

export const TIER_ORDER: TierId[] = TIERS.map((t) => t.id);

export function tierOf(id: TierId): Tier {
  return TIERS.find((t) => t.id === id)!;
}

export const PERSONALITIES: Personality[] = [
  "Compétiteur",
  "Chill",
  "Toxique",
  "Studieux",
  "Showman",
  "Loyal",
];

export const ACTION_POINTS_PER_WEEK = 3;
export const WEEKS_PER_YEAR = 52;
export const MAX_WEEKS = 250;
export const STARTING_MONEY = 500;
export const RETIREMENT_AGE = 32;

export const TEAMMATE_NAMES = [
  "Zylo", "Kaido", "Nyx", "Rezz", "Vantage", "Skarn", "Mako", "Fero", "Quill",
  "Draven", "Ozar", "Kite", "Pyra", "Nova", "Sable", "Tekk", "Riven", "Volt",
  "Hexx", "Juno", "Cobalt", "Marrow", "Sync", "Blaze", "Orbit", "Krow",
  "Lumen", "Tundra", "Vex", "Sonar",
];

export const ORG_NAMES = [
  "Nightfall", "Vertex", "Ashborne", "Orbital", "Rift Collective", "Kestrel",
  "Meridian", "Zenith Gaming", "Black Lotus", "Coldfront", "Nova Syndicate",
  "Ironclad", "Solstice", "Hollow Point",
];
