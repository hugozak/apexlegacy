import raw from "@/data/events.json";
import { weightedPick } from "./rng";
import type { GameEvent, EventConditions, StatKey, Stats, TierId } from "./types";

export const EVENTS = raw as unknown as GameEvent[];

export interface EventContext {
  week: number;
  tier: TierId;
  stats: Stats;
  chemistry: number;
  money: number;
  hasContract: boolean;
  /** Dernière semaine où chaque événement s'est déclenché. */
  log: Record<string, number>;
}

/** Un événement non structurel peut revenir après ce délai. */
export const EVENT_COOLDOWN = 70;

function matches(c: EventConditions | undefined, ctx: EventContext): boolean {
  if (!c) return true;
  if (c.minWeek !== undefined && ctx.week < c.minWeek) return false;
  if (c.maxWeek !== undefined && ctx.week > c.maxWeek) return false;
  if (c.tiers && !c.tiers.includes(ctx.tier)) return false;
  if (c.minChemistry !== undefined && ctx.chemistry < c.minChemistry) return false;
  if (c.maxChemistry !== undefined && ctx.chemistry > c.maxChemistry) return false;
  if (c.minMoney !== undefined && ctx.money < c.minMoney) return false;
  if (c.hasContract !== undefined && ctx.hasContract !== c.hasContract) return false;
  if (c.minStats) {
    for (const [k, v] of Object.entries(c.minStats) as [StatKey, number][]) {
      if (ctx.stats[k] < v) return false;
    }
  }
  if (c.maxStats) {
    for (const [k, v] of Object.entries(c.maxStats) as [StatKey, number][]) {
      if (ctx.stats[k] > v) return false;
    }
  }
  return true;
}

export function eligibleEvents(ctx: EventContext): GameEvent[] {
  return EVENTS.filter((e) => {
    const last = ctx.log[e.id];
    if (last !== undefined) {
      if (e.once) return false;
      if (ctx.week - last < EVENT_COOLDOWN) return false;
    }
    return matches(e.conditions, ctx);
  });
}

/**
 * Tire un événement pondéré. Le poids est modulé par la situation :
 * un mental bas favorise les événements perso, une forte notoriété
 * les événements média, une chimie basse les événements d'équipe.
 */
export function rollEvent(ctx: EventContext): GameEvent | null {
  const pool = eligibleEvents(ctx);
  if (!pool.length) return null;

  return weightedPick(pool, (e) => {
    let w = e.weight;
    if (e.category === "perso" && ctx.stats.mental < 40) w *= 1.8;
    if (e.category === "perso" && ctx.stats.mental > 70) w *= 0.6;
    if (e.category === "media") w *= 0.5 + ctx.stats.notoriety / 60;
    if (e.category === "team" && ctx.chemistry < 45) w *= 1.7;
    if (e.category === "team" && ctx.chemistry > 75) w *= 0.6;
    if (e.category === "org" && ctx.money < 300) w *= 1.5;
    if (e.category === "opportunite") w *= 0.7 + ctx.stats.notoriety / 80;
    return w;
  });
}

/** Probabilité qu'un événement se déclenche une semaine donnée. */
export function eventChance(ctx: EventContext): number {
  let p = 0.22;
  if (ctx.stats.mental < 25) p += 0.12;
  if (ctx.chemistry < 35) p += 0.08;
  if (ctx.week < 5) p = 0.12;
  return Math.min(0.4, p);
}
