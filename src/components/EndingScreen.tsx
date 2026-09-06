"use client";

import { motion } from "framer-motion";
import { Button, Card, Metric, Pill } from "@/components/ui";
import { TIERS, tierOf } from "@/lib/constants";
import { ENDINGS } from "@/lib/simulation";
import Timeline from "@/components/Timeline";
import { ageOf, overallOf, useGame } from "@/store/game";

export default function EndingScreen() {
  const { player, ending, week, tier, money, totalEarnings, results, bestPlacement, timeline } =
    useGame();
  const reset = useGame((s) => s.reset);

  if (!player || !ending) return null;
  const e = ENDINGS[ending];
  const wins = results.filter((r) => r.placement === 1).length;
  const podiums = results.filter((r) => r.placement <= 3).length;
  const peakTier = results.reduce(
    (best, r) =>
      TIERS.findIndex((t) => t.id === r.tier) > TIERS.findIndex((t) => t.id === best)
        ? r.tier
        : best,
    tier,
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="label">Fin de carrière</div>
        <h1 className="mt-1 font-display text-5xl uppercase leading-none tracking-[0.08em] text-white">
          {e.title}
        </h1>
        <p className="mt-2 font-display text-lg uppercase tracking-[0.14em] text-accent">
          {e.tagline}
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75">{e.text}</p>
      </motion.div>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Carrière" value={`${Math.round(week / 52 * 10) / 10} ans`} />
        <Metric label="Palier max" value={tierOf(peakTier).short} tone="accent" />
        <Metric label="Titres" value={wins} tone={wins > 0 ? "accent" : "default"} />
        <Metric label="Podiums" value={podiums} tone="mint" />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Gains totaux" value={`$${totalEarnings.toLocaleString("fr-FR")}`} tone="mint" />
        <Metric label="Solde final" value={`$${money.toLocaleString("fr-FR")}`} />
        <Metric label="Meilleur résultat" value={bestPlacement ? `#${bestPlacement}` : "—"} />
        <Metric label="Âge" value={`${ageOf(player.startAge, week)} ans`} />
      </div>

      <Card title="Fiche finale" className="mt-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="font-display text-2xl uppercase tracking-[0.12em] text-white">
            {player.handle}
          </span>
          <Pill tone="accent">{player.region}</Pill>
          <Pill tone="violet">{player.role}</Pill>
          <Pill>{player.legend}</Pill>
          <Pill tone="mint">OVR {Math.round(overallOf(player.stats))}</Pill>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
          {(
            [
              ["Aim", player.stats.aim],
              ["Movement", player.stats.movement],
              ["Game sense", player.stats.gameSense],
              ["Leadership", player.stats.leadership],
              ["Mental", player.stats.mental],
              ["Notoriété", player.stats.notoriety],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="flex items-baseline justify-between">
              <span className="label">{label}</span>
              <span className="num text-sm text-white">{Math.round(v)}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4">
        <Timeline full />
      </div>

      <div className="mt-6 flex justify-center">
        <Button variant="primary" onClick={reset}>
          Nouvelle carrière
        </Button>
      </div>
      <p className="mt-3 text-center text-2xs text-muted">
        {timeline.length} moments enregistrés dans cette carrière.
      </p>
    </main>
  );
}
