import { TIERS, TIER_ORDER, tierIndex, tierOf } from "./constants";
import { generateTeammate, teammateOverall } from "./generate";
import { clamp, gauss, pick, rand, randInt } from "./rng";
import type {
  ActionId,
  EndingId,
  Ending,
  Role,
  Stats,
  Teammate,
  TierId,
  TournamentResult,
} from "./types";

/* ---------------- Actions hebdomadaires ---------------- */

export interface WeekOutcome {
  statDelta: Partial<Stats>;
  money: number;
  chemistry: number;
  notes: string[];
}

/**
 * La chimie revient toujours vers son niveau naturel (45) : un trio qui ne
 * scrim plus se délite, un trio en crise finit par se reparler. Et plus elle
 * est haute, moins chaque session en rajoute.
 */
export function chemistryDrift(current: number, gained: number) {
  return gained * Math.max(0.15, 1 - current / 115) - (current - 45) * 0.02;
}

/**
 * Gain décroissant : chaque point coûte de plus en plus cher.
 * L'exposant 1.7 rend les 80+ très difficiles à atteindre et impossibles
 * à tenir sans travail constant.
 */
function gain(current: number, base: number) {
  const room = Math.max(0, 1 - current / 100);
  return base * Math.pow(room, 1.5) * (0.85 + rand() * 0.3);
}

/**
 * La notoriété ne suit pas la même courbe qu'une compétence : elle a de
 * l'inertie. Difficile de démarrer, elle s'emballe au milieu, puis plafonne.
 */
function fameGain(current: number, base: number) {
  const momentum = 0.4 + current / 80;
  const room = Math.max(0, 1 - current / 105);
  return base * momentum * room * (0.85 + rand() * 0.3);
}

/** Récupération de mental : d'autant plus faible que le mental est déjà haut. */
function restGain(mental: number) {
  return 6 * Math.max(0, 1 - mental / 100);
}

const add = (d: Partial<Stats>, k: keyof Stats, v: number) => {
  d[k] = (d[k] ?? 0) + v;
};

export function resolveActions(
  actions: ActionId[],
  stats: Stats,
  tier: TierId = "ranked",
): WeekOutcome {
  const d: Partial<Stats> = {};
  let money = 0;
  let chemistry = 0;
  const notes: string[] = [];

  // Un mental bas réduit l'efficacité du travail — mais aussi son coût :
  // un joueur cramé s'entraîne mollement.
  const efficiency = stats.mental < 20 ? 0.5 : stats.mental < 40 ? 0.8 : 1;
  const strain = stats.mental < 25 ? 0.5 : 1;

  for (const a of actions) {
    switch (a) {
      case "aim":
        add(d, "aim", gain(stats.aim, 1.6) * efficiency);
        add(d, "movement", gain(stats.movement, 0.6) * efficiency);
        add(d, "mental", -1.0 * strain);
        break;
      case "scrims":
        add(d, "gameSense", gain(stats.gameSense, 1.4) * efficiency);
        add(d, "movement", gain(stats.movement, 0.4) * efficiency);
        add(d, "mental", -1.5 * strain);
        chemistry += 2.5;
        break;
      case "vod":
        add(d, "gameSense", gain(stats.gameSense, 1.05) * efficiency);
        add(d, "leadership", gain(stats.leadership, 1.0) * efficiency);
        add(d, "mental", -0.5 * strain);
        break;
      case "stream":
        add(d, "notoriety", fameGain(stats.notoriety, 1.8));
        add(d, "mental", -1.5 * strain);
        money += 30 + Math.round(stats.notoriety * 4.5);
        break;
      case "network":
        add(d, "notoriety", fameGain(stats.notoriety, 0.9));
        add(d, "leadership", gain(stats.leadership, 0.35));
        add(d, "mental", -0.4 * strain);
        break;
      case "rest":
        add(d, "mental", restGain(stats.mental));
        chemistry += 0.3;
        break;
    }
  }

  // Pression permanente, aggravée par le palier.
  add(d, "mental", -0.3 - tierIndex(tier) * 0.35);

  // Sous 30, le corps impose ses pauses : on ne descend plus aussi vite,
  // mais on stagne à un niveau où l'on sous-performe en tournoi.
  if (stats.mental < 30) add(d, "mental", 2);

  // La notoriété s'érode en permanence : il faut l'entretenir ou gagner.
  add(d, "notoriety", -(0.1 + stats.notoriety * 0.005));

  if (efficiency < 1 && actions.some((a) => a !== "rest")) {
    notes.push("Mental bas : entraînement moins efficace.");
  }

  return { statDelta: d, money, chemistry, notes };
}

/** Le networking augmente la probabilité d'une offre de contrat. */
export function contractOfferChance(actions: ActionId[], notoriety: number) {
  const net = actions.filter((a) => a === "network").length;
  return Math.min(0.5, net * 0.09 + notoriety / 900);
}

/**
 * Applique un delta de stats en amortissant les gains : plus une stat est
 * haute, moins un bonus ponctuel rapporte. Les pertes, elles, sont pleines.
 */
export function softApply(stats: Stats, delta: Partial<Stats>): Stats {
  const next = { ...stats };
  (Object.keys(delta) as (keyof Stats)[]).forEach((k) => {
    const v = delta[k] ?? 0;
    const scaled =
      v > 0
        ? v * Math.max(0.15, 1 - next[k] / 95)
        : v * Math.min(1, next[k] / 40 + 0.3);
    next[k] = clamp(next[k] + scaled);
  });
  return next;
}

/* ---------------- Évolution des coéquipiers ---------------- */

export function evolveTeammates(
  teammates: Teammate[],
  chemistry: number,
): { teammates: Teammate[]; notes: string[] } {
  const notes: string[] = [];
  const next = teammates.map((t) => {
    const s = { ...t.stats };
    const drive = t.ambition / 100;
    const roll = rand();

    if (roll < 0.35 + drive * 0.2) {
      // Progression
      const k = pick(["aim", "movement", "gameSense", "leadership"] as const);
      s[k] = clamp(s[k] + gain(s[k], 1.1));
    } else if (roll > 0.9) {
      // Régression / passage à vide
      const k = pick(["aim", "gameSense", "mental"] as const);
      s[k] = clamp(s[k] - 1.2);
    }

    // Mental influencé par la chimie du trio.
    s.mental = clamp(s.mental + (chemistry > 60 ? 0.8 : chemistry < 35 ? -1.2 : 0));
    if (t.personality === "Toxique" && chemistry < 45) s.mental = clamp(s.mental - 0.6);

    const form = clamp(t.form + gauss(2), -10, 10);
    let loyalty = clamp(t.loyalty + (chemistry > 65 ? 0.5 : -0.6));
    if (t.personality === "Loyal") loyalty = clamp(loyalty + 0.4);

    if (s.mental < 18 && rand() < 0.2) {
      notes.push(`${t.name} tilt sévèrement cette semaine.`);
    }

    return { ...t, stats: s, form, loyalty };
  });

  return { teammates: next, notes };
}

/** Un coéquipier ambitieux et déloyal peut quitter le trio. */
export function checkTeammateDeparture(
  teammates: Teammate[],
  playerOverall: number,
  chemistry: number,
): Teammate | null {
  for (const t of teammates) {
    const ovr = teammateOverall(t);
    const outgrown = ovr - playerOverall;
    let p = 0.004;
    if (chemistry < 35) p += 0.02;
    if (t.loyalty < 35) p += 0.02;
    if (outgrown > 10) p += 0.025;
    if (t.ambition > 75) p += 0.01;
    if (t.personality === "Loyal") p *= 0.4;
    if (rand() < p) return t;
  }
  return null;
}

export function replaceTeammate(
  teammates: Teammate[],
  leaving: Teammate,
  level: number,
  playerRole: Role,
): Teammate[] {
  const others = teammates.filter((t) => t.id !== leaving.id);
  const excluded = [playerRole, ...others.map((t) => t.role)];
  const names = [leaving.name, ...others.map((t) => t.name)];
  return [...others, generateTeammate(level, excluded, names)];
}

/* ---------------- Tournois ---------------- */

export const TOURNAMENT_INTERVAL = 4;

export function isTournamentWeek(week: number) {
  return week % TOURNAMENT_INTERVAL === 0;
}

export interface TournamentInput {
  week: number;
  tier: TierId;
  stats: Stats;
  teammates: Teammate[];
  chemistry: number;
  metaModifier: number; // -1 (nerf) .. +1 (buff)
}

export function playerOverall(stats: Stats) {
  return (
    stats.aim * 0.3 +
    stats.movement * 0.16 +
    stats.gameSense * 0.3 +
    stats.leadership * 0.12 +
    stats.mental * 0.12
  );
}

export function teamStrength(input: TournamentInput) {
  const { stats, teammates, chemistry, metaModifier } = input;
  const mates = teammates.length
    ? teammates.reduce((s, t) => s + teammateOverall(t) + t.form * 0.4, 0) /
      teammates.length
    : 30;

  // Le joueur pèse plus que ses coéquipiers : on ne se fait pas porter
  // indéfiniment par un bon trio.
  let strength = playerOverall(stats) * 0.55 + mates * 0.45;

  // Chimie : ±12 %
  strength *= 0.88 + (chemistry / 100) * 0.24;

  // Mental critique : forte sous-performance
  if (stats.mental < 20) strength *= 0.72;
  else if (stats.mental < 35) strength *= 0.92;

  // Le leadership stabilise le trio en fin de zone.
  strength += stats.leadership * 0.04;

  // Meta de la légende main
  strength *= 1 + metaModifier * 0.05;

  return strength;
}

export function simulateTournament(input: TournamentInput): TournamentResult {
  const tier = tierOf(input.tier);
  const strength = teamStrength(input);

  // Le niveau du lobby monte avec le palier, et le matchmaking rattrape
  // la moitié de l'écart quand une équipe surclasse son palier : dominer
  // un tier reste possible, l'écraser indéfiniment non.
  const lobbyBase =
    tier.difficulty + Math.max(0, (strength - tier.difficulty) * 0.35);

  const ours = strength + gauss(15);
  let better = 0;
  for (let i = 0; i < tier.lobbySize - 1; i++) {
    const opp = lobbyBase + gauss(13) + randInt(-3, 3);
    if (opp > ours) better++;
  }
  const placement = better + 1;

  const prize = prizeFor(tier.prizePool, placement, tier.lobbySize);
  const notorietyGain = notorietyFor(
    input.tier,
    placement,
    tier.lobbySize,
    input.stats.notoriety,
  );

  return {
    week: input.week,
    tier: input.tier,
    tierName: tier.name,
    placement,
    lobbySize: tier.lobbySize,
    score: Math.round(strength),
    prize,
    notorietyGain,
  };
}

function prizeFor(pool: number, placement: number, lobbySize: number) {
  if (!pool) return 0;
  if (placement > Math.ceil(lobbySize / 2)) return 0;
  const ratio = Math.pow(0.72, placement - 1);
  return Math.round(pool * ratio);
}

function notorietyFor(
  tier: TierId,
  placement: number,
  lobbySize: number,
  current = 40,
) {
  const tierWeight = TIER_ORDER.indexOf(tier) + 1;
  const perf = 1 - (placement - 1) / lobbySize;
  let g = tierWeight * perf * 1.5 - 0.5;
  // Difficile de se faire un nom quand on en a déjà un.
  if (g > 0) g *= Math.max(0.15, 1 - current / 115);
  return Math.round(g * 10) / 10;
}

/** Impact d'un résultat sur le mental et la chimie. */
export function tournamentAftermath(
  placement: number,
  lobbySize: number,
  mental = 50,
) {
  const top = placement <= 3;
  const good = placement <= Math.ceil(lobbySize * 0.25);
  const bad = placement > Math.ceil(lobbySize * 0.7);
  const raw = top ? 7 : good ? 3 : bad ? -6 : -1;
  // Une défaite fait d'autant moins mal qu'on est déjà au fond : on
  // n'attend plus rien. Les victoires, elles, remontent toujours autant.
  const scaled = raw < 0 ? raw * Math.min(1, mental / 55) : raw;
  return {
    mental: Math.round(scaled * 10) / 10,
    chemistry: top ? 6 : good ? 3 : bad ? -5 : 0,
  };
}

/* ---------------- Paliers ---------------- */

export function canPromote(
  tier: TierId,
  stats: Stats,
  recent: TournamentResult[],
): boolean {
  const idx = TIER_ORDER.indexOf(tier);
  if (idx >= TIER_ORDER.length - 1) return false;
  const t = TIERS[idx];
  if (playerOverall(stats) < t.requires.overall) return false;
  if (stats.notoriety < t.requires.notoriety) return false;

  const atTier = recent.filter((r) => r.tier === tier);
  const last = atTier.slice(-4);
  if (last.length < 4) return false;
  const avg = last.reduce((s, r) => s + r.placement, 0) / last.length;
  // Régularité ET un vrai coup d'éclat récent.
  return avg <= 6.5 && last.some((r) => r.placement <= 3);
}

export function nextTier(tier: TierId): TierId {
  const idx = TIER_ORDER.indexOf(tier);
  return TIER_ORDER[Math.min(idx + 1, TIER_ORDER.length - 1)];
}

/* ---------------- Fins ---------------- */

export interface EndingInput {
  stats: Stats;
  tier: TierId;
  money: number;
  results: TournamentResult[];
  paths: string[];
  weeks: number;
  burnedOut: boolean;
}

export const ENDINGS: Record<EndingId, Ending> = {
  legend: {
    id: "legend",
    title: "Légende de la scène",
    tagline: "Retraite au sommet",
    text: "Tu raccroches avec un trophée sur l'étagère et un nom que la scène citera pendant dix ans. Les rookies étudient tes VOD.",
  },
  caster: {
    id: "caster",
    title: "Caster / Analyste",
    tagline: "De l'autre côté de la caméra",
    text: "Ta lecture du jeu valait plus que ton aim. Le desk t'a offert un siège permanent, et ta voix accompagne désormais les finales.",
  },
  streamer: {
    id: "streamer",
    title: "Streamer full time",
    tagline: "La communauté avant les trophées",
    text: "La compétition t'a donné une audience, l'audience t'a donné une carrière. Tu joues encore tous les jours — sans la pression des poules.",
  },
  coach: {
    id: "coach",
    title: "Coach",
    tagline: "Transmettre plutôt que jouer",
    text: "Tu as toujours mieux vu le jeu que tu ne l'as joué. Une structure t'a confié son roster, et tes joueurs gagnent ce que tu n'as pas gagné.",
  },
  burnout: {
    id: "burnout",
    title: "Burn out",
    tagline: "Retour à la vie normale",
    text: "Un matin, tu n'as pas rallumé le PC. Puis un autre. La scène a continué sans toi, et étrangement, ça allait mieux comme ça.",
  },
  journeyman: {
    id: "journeyman",
    title: "Journeyman",
    tagline: "Une longue carrière sans gloire",
    text: "Six équipes, aucun titre, et le respect discret de tous ceux qui ont joué contre toi. Tu as duré. C'est déjà rare.",
  },
};

export function determineEnding(input: EndingInput): EndingId {
  const { stats, tier, results, paths, money, burnedOut } = input;
  const tierIdx = TIER_ORDER.indexOf(tier);
  const wins = results.filter((r) => r.placement === 1).length;
  const bigWins = results.filter(
    (r) => r.placement === 1 && (r.tier === "algs" || r.tier === "lan"),
  ).length;

  if (burnedOut || stats.mental < 15) return "burnout";
  if (bigWins > 0 && stats.notoriety > 70) return "legend";
  if (tierIdx >= 4 && wins >= 4 && playerOverall(stats) > 80) return "legend";
  if (paths.includes("analyst_path") && stats.gameSense > 62 && stats.notoriety > 45)
    return "caster";
  if (stats.notoriety > 72 && money > 25000) return "streamer";
  if (paths.includes("coach_path") && stats.gameSense > 60 && stats.leadership > 55)
    return "coach";
  if (stats.leadership > 68 && stats.gameSense > 65) return "coach";
  if (stats.notoriety > 62) return "streamer";
  return "journeyman";
}
