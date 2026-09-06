"use client";

import { Button, Card, Metric, Pill, StatBar } from "@/components/ui";
import { tierOf } from "@/lib/constants";
import { teammateOverall } from "@/lib/generate";
import { ageOf, overallOf, seasonOf, useGame } from "@/store/game";

export default function CareerScreen() {
  const { player, week, tier, money, chemistry, teammates, timeline } = useGame();
  const reset = useGame((s) => s.reset);
  if (!player) return null;

  const { year, weekInYear } = seasonOf(week);
  const overall = overallOf(player.stats);
  const t = tierOf(tier);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-5 w-1 rounded-full bg-accent" />
            <h1 className="font-display text-3xl uppercase tracking-[0.14em] text-white">
              {player.handle}
            </h1>
            <span className="num text-sm text-muted">
              OVR {Math.round(overall)}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Pill tone="accent">{player.region}</Pill>
            <Pill tone="violet">{player.role}</Pill>
            <Pill>{player.legend}</Pill>
            <Pill>{ageOf(player.startAge, week)} ans</Pill>
          </div>
        </div>
        <Button variant="danger" onClick={() => confirm("Réinitialiser la carrière ?") && reset()}>
          Nouvelle carrière
        </Button>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Semaine" value={`S${weekInYear} · A${year}`} />
        <Metric label="Palier" value={t.short} tone="accent" />
        <Metric label="Argent" value={`$${money.toLocaleString("fr-FR")}`} tone="mint" />
        <Metric
          label="Chimie"
          value={Math.round(chemistry)}
          tone={chemistry < 35 ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card title="Statistiques">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatBar label="Aim" value={player.stats.aim} />
            <StatBar label="Movement" value={player.stats.movement} />
            <StatBar label="Game sense" value={player.stats.gameSense} tone="violet" />
            <StatBar label="Leadership" value={player.stats.leadership} tone="violet" />
            <StatBar
              label="Mental"
              value={player.stats.mental}
              tone={player.stats.mental < 20 ? "danger" : "mint"}
            />
            <StatBar label="Notoriété" value={player.stats.notoriety} tone="mint" />
          </div>
          {player.stats.mental < 20 && (
            <p className="mt-3 rounded-card border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              Mental critique — tu sous-performes fortement en tournoi. Repose-toi.
            </p>
          )}
        </Card>

        <Card title="Trio">
          <div className="space-y-2">
            {teammates.map((tm) => (
              <div
                key={tm.id}
                className="rounded-card border border-line bg-raised px-3 py-2"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-base uppercase tracking-[0.1em] text-white">
                    {tm.name}
                  </span>
                  <span className="num text-sm text-muted">
                    {Math.round(teammateOverall(tm))}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Pill tone="violet">{tm.role}</Pill>
                  <Pill>{tm.legend}</Pill>
                  <Pill>{tm.personality}</Pill>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Timeline" className="mt-4">
        <ol className="space-y-2">
          {[...timeline].reverse().map((e, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="num w-14 shrink-0 text-muted">S{e.week}</span>
              <div>
                <span className="text-white">{e.title}</span>
                {e.detail && <p className="text-xs text-muted">{e.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <p className="mt-6 text-center text-2xs uppercase tracking-[0.16em] text-muted">
        Étapes 1 & 2 — boucle hebdomadaire à venir
      </p>
    </main>
  );
}
