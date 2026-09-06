/** Trace la trajectoire du mental pour un plan donné, hors événements. */
import { resolveActions, isTournamentWeek, tournamentAftermath } from "../src/lib/simulation";
import { clamp } from "../src/lib/rng";
import type { ActionId, Stats } from "../src/lib/types";

const plan = (process.argv[2] ?? "aim,scrims,vod").split(",") as ActionId[];
const stats: Stats = { aim: 58, movement: 50, gameSense: 34, leadership: 20, mental: 42, notoriety: 5 };

for (let w = 1; w <= 80; w++) {
  const out = resolveActions(plan, stats, "ranked");
  stats.mental = clamp(stats.mental + (out.statDelta.mental ?? 0));
  if (isTournamentWeek(w)) {
    stats.mental = clamp(stats.mental + tournamentAftermath(15, 20, stats.mental).mental);
  }
  if (w % 8 === 0) console.log(`S${w}\tmental ${stats.mental.toFixed(1)}`);
}
