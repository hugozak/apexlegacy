/**
 * Harness d'équilibrage : simule des carrières complètes en dehors de React
 * pour vérifier la courbe de progression, les paliers atteints et les fins.
 *
 *   npx tsx scripts/balance.ts [nbCarrieres]
 */
import { ROLES, TIER_ORDER, tierOf, teammateLevelFor, MAX_WEEKS } from "../src/lib/constants";
import { generateTrio, generateTeammate, teammateOverall } from "../src/lib/generate";
import { clamp, pick, rand } from "../src/lib/rng";
import { eventChance, rollEvent } from "../src/lib/events";
import {
  canPromote, checkTeammateDeparture, determineEnding, evolveTeammates,
  isTournamentWeek, nextTier, playerOverall, replaceTeammate, resolveActions,
  simulateTournament, softApply, tournamentAftermath, chemistryDrift,
} from "../src/lib/simulation";
import type { ActionId, Stats, TierId, TournamentResult, Role } from "../src/lib/types";

type Strategy = "equilibre" | "grind" | "content" | "lazy" | "smart" | "optimal";

const PLANS: Record<Strategy, ActionId[]> = {
  equilibre: ["aim", "scrims", "rest"],
  grind: ["aim", "scrims", "vod"],
  content: ["stream", "network", "rest"],
  lazy: ["rest", "rest", "stream"],
  smart: [],
  optimal: [],
};

/** Joueur qui optimise : chimie entretenue, mental surveillé, notoriété
 *  travaillée juste ce qu'il faut pour débloquer le palier suivant. */
function optimalPlan(stats: Stats, tier: TierId, chemistry: number): ActionId[] {
  const plan: ActionId[] = [];
  const need = tierOf(tier).requires;
  if (stats.mental < 40) plan.push("rest");
  if (stats.mental < 22) plan.push("rest");
  if (chemistry < 65 && plan.length < 3) plan.push("scrims");
  if (stats.notoriety < need.notoriety && plan.length < 3) plan.push("stream");
  while (plan.length < 3) {
    if (stats.aim < 82) plan.push("aim");
    else if (stats.gameSense < 82) plan.push("scrims");
    else plan.push("vod");
  }
  return plan.slice(0, 3);
}

/** Joueur qui s'adapte : repos si le mental fatigue, contenu si la notoriété
 *  bloque la promotion, entraînement sinon. */
function smartPlan(stats: Stats, tier: TierId): ActionId[] {
  const plan: ActionId[] = [];
  const need = tierOf(tier).requires;
  if (stats.mental < 45) plan.push("rest");
  if (stats.mental < 25) plan.push("rest");
  if (stats.notoriety < need.notoriety && stats.notoriety < 90) plan.push("stream");
  while (plan.length < 3) {
    plan.push(stats.aim < stats.gameSense ? "aim" : plan.includes("scrims") ? "vod" : "scrims");
  }
  return plan.slice(0, 3);
}

function runCareer(strategy: Strategy, role: Role) {
  const roleDef = ROLES.find((r) => r.id === role)!;
  let stats: Stats = { ...roleDef.base, notoriety: 5 };
  let teammates = generateTrio(teammateLevelFor("ranked"), role) as ReturnType<typeof generateTrio>;
  let mates = [...teammates];
  let chemistry = 50;
  let money = 500;
  let totalEarnings = 0;
  let tier: TierId = "ranked";
  let contract: { weeklySalary: number; weeksLeft: number } | null = null;
  const results: TournamentResult[] = [];
  const eventLog: Record<string, number> = {};
  const paths: string[] = [];
  let burnoutStrikes = 0;
  let eventsFired = 0;
  let week = 1;



  for (; week <= MAX_WEEKS; week++) {
    const plan =
      strategy === "smart"
        ? smartPlan(stats, tier)
        : strategy === "optimal"
          ? optimalPlan(stats, tier, chemistry)
          : PLANS[strategy];
    const out = resolveActions(plan, stats, tier);
    for (const [k, v] of Object.entries(out.statDelta)) {
      stats[k as keyof Stats] = clamp(stats[k as keyof Stats] + (v as number));
    }
    money += out.money;
    totalEarnings += Math.max(0, out.money);
    chemistry = clamp(chemistry + chemistryDrift(chemistry, out.chemistry));

    if (contract) {
      money += contract.weeklySalary;
      totalEarnings += contract.weeklySalary;
      contract.weeksLeft--;
      if (contract.weeksLeft <= 0) contract = null;
    } else {
      money -= 60 + TIER_ORDER.indexOf(tier) * 45;
      // offre de contrat simplifiée
      if (TIER_ORDER.indexOf(tier) >= 1 && rand() < 0.05) {
        contract = { weeklySalary: Math.max(100, tierOf(tier).weeklySalary || 120), weeksLeft: 52 };
      }
    }
    if (money < 0) { money = 0; stats.mental = clamp(stats.mental - 2); }

    const evo = evolveTeammates(mates, chemistry);
    mates = evo.teammates;
    const leaving = checkTeammateDeparture(mates, playerOverall(stats), chemistry);
    if (leaving) {
      mates = replaceTeammate(mates, leaving, teammateLevelFor(tier), role);
      chemistry = clamp(chemistry - 18);
    }

    if (isTournamentWeek(week)) {
      const r = simulateTournament({ week, tier, stats, teammates: mates, chemistry, metaModifier: 0 });
      results.push(r);
      money += r.prize;
      totalEarnings += r.prize;
      stats.notoriety = clamp(stats.notoriety + r.notorietyGain);
      const after = tournamentAftermath(r.placement, r.lobbySize, stats.mental);
      stats.mental = clamp(stats.mental + after.mental);
      chemistry = clamp(chemistry + after.chemistry);

      if (canPromote(tier, stats, results)) {
        const next = nextTier(tier);
        if (next !== tier) {
          tier = next;
          stats.mental = clamp(stats.mental + 6);
          chemistry = clamp(chemistry + 4);
          const level = teammateLevelFor(tier);
          mates = mates.map((tm) =>
            teammateOverall(tm) < level - 8 ? generateTeammate(level, [role]) : tm,
          ) as typeof mates;
        }
      }
    }

    const ctx = { week, tier, stats, chemistry, money, hasContract: !!contract, log: eventLog };
    if (rand() < eventChance(ctx)) {
      const ev = rollEvent(ctx);
      if (ev) {
        eventsFired++;
        eventLog[ev.id] = week;
        // choix aléatoire, comme un joueur qui ne réfléchit pas
        const c = pick(ev.choices);
        stats = softApply(stats, c.effects.stats ?? {});
        money = Math.max(0, money + (c.effects.money ?? 0));
        totalEarnings += Math.max(0, c.effects.money ?? 0);
        chemistry = clamp(chemistry + (c.effects.chemistry ?? 0));
        for (const f of c.effects.flags ?? []) {
          const name = f.split(":")[0];
          if (name === "analyst_path" || name === "coach_path") paths.push(name);
          if (name === "teammate_leaves") {
            mates = replaceTeammate(mates, pick(mates), teammateLevelFor(tier), role);
            chemistry = clamp(chemistry - 10);
          }
        }
      }
    }

    burnoutStrikes = stats.mental < 10 ? burnoutStrikes + 1 : 0;
    if (burnoutStrikes >= 6) break;
  }

  const burnedOut = burnoutStrikes >= 6;
  const ending = burnedOut
    ? "burnout"
    : determineEnding({ stats, tier, money, results, paths, weeks: week, burnedOut });

  return {
    strategy, role, weeks: Math.min(week, MAX_WEEKS), tier, ending, stats,
    overall: playerOverall(stats), wins: results.filter((r) => r.placement === 1).length,
    podiums: results.filter((r) => r.placement <= 3).length,
    tournaments: results.length, totalEarnings, eventsFired,
    seenRatio: Object.keys(eventLog).length,
  };
}

const N = Number(process.argv[2] ?? 60);
const strategies: Strategy[] = ["optimal", "smart", "equilibre", "grind", "content", "lazy"];
const roles: Role[] = ["Fragger", "IGL", "Anchor"];

for (const s of strategies) {
  const runs = Array.from({ length: N }, (_, i) => runCareer(s, roles[i % 3]));
  const avg = (f: (r: (typeof runs)[0]) => number) =>
    Math.round((runs.reduce((a, r) => a + f(r), 0) / runs.length) * 10) / 10;
  const tiers: Record<string, number> = {};
  const endings: Record<string, number> = {};
  runs.forEach((r) => {
    tiers[r.tier] = (tiers[r.tier] ?? 0) + 1;
    endings[r.ending] = (endings[r.ending] ?? 0) + 1;
  });
  console.log(`\n=== ${s.toUpperCase()} (${N} carrières) ===`);
  console.log(
    `  semaines ${avg((r) => r.weeks)} | OVR ${avg((r) => r.overall)} | mental ${avg((r) => r.stats.mental)} | notoriété ${avg((r) => r.stats.notoriety)}`,
  );
  console.log(
    `  titres ${avg((r) => r.wins)} | podiums ${avg((r) => r.podiums)}/${avg((r) => r.tournaments)} | gains $${avg((r) => r.totalEarnings)}`,
  );
  console.log(`  événements déclenchés ${avg((r) => r.eventsFired)}`);
  console.log(`  paliers finaux : ${JSON.stringify(tiers)}`);
  console.log(`  fins : ${JSON.stringify(endings)}`);
}
