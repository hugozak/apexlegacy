"use client";

import { motion } from "framer-motion";
import { Button, Card, Metric, Pill, StatBar } from "@/components/ui";
import { MAX_WEEKS, TIERS, tierOf } from "@/lib/constants";
import { teammateOverall } from "@/lib/generate";
import ActionPanel from "@/components/ActionPanel";
import EventModal from "@/components/EventModal";
import TournamentModal from "@/components/TournamentModal";
import Timeline from "@/components/Timeline";
import { ageOf, overallOf, seasonOf, useGame } from "@/store/game";

function TierTrack({ current }: { current: string }) {
  const idx = TIERS.findIndex((t) => t.id === current);
  return (
    <div className="flex items-center gap-1">
      {TIERS.map((t, i) => (
        <div key={t.id} className="flex flex-1 flex-col gap-1">
          <div
            className={`h-1 rounded-full ${
              i < idx ? "bg-accent/50" : i === idx ? "bg-accent" : "bg-white/[0.08]"
            }`}
          />
          <span
            className={`font-display text-[9px] uppercase tracking-[0.1em] ${
              i === idx ? "text-accent" : "text-muted"
            }`}
          >
            {t.short}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CareerScreen() {
  const {
    player, week, tier, money, chemistry, teammates, contract, results,
    lastReport, metaModifier, lastResult,
  } = useGame();
  const reset = useGame((s) => s.reset);
  const retire = useGame((s) => s.retire);
  if (!player) return null;

  const { year, weekInYear } = seasonOf(week);
  const overall = overallOf(player.stats);
  const t = tierOf(tier);
  const nextT = TIERS[Math.min(TIERS.findIndex((x) => x.id === tier) + 1, TIERS.length - 1)];
  const canRetire = week > 60;
  const d = lastReport?.statDelta;
  const recent = results.slice(-5).reverse();

  return (
    <>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-5 w-1 rounded-full bg-accent" />
              <h1 className="font-display text-3xl uppercase tracking-[0.14em] text-white">
                {player.handle}
              </h1>
              <span className="num text-sm text-muted">OVR {Math.round(overall)}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Pill tone="accent">{player.region}</Pill>
              <Pill tone="violet">{player.role}</Pill>
              <Pill
                tone={metaModifier > 0 ? "mint" : metaModifier < 0 ? "danger" : "muted"}
              >
                {player.legend}
                {metaModifier > 0 ? " ▲" : metaModifier < 0 ? " ▼" : ""}
              </Pill>
              <Pill>{ageOf(player.startAge, week)} ans</Pill>
              {contract ? (
                <Pill tone="mint">{contract.org}</Pill>
              ) : (
                <Pill tone="danger">Agent libre</Pill>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {canRetire && (
              <Button
                onClick={() =>
                  confirm("Prendre ta retraite maintenant et voir ta fin de carrière ?") &&
                  retire()
                }
              >
                Prendre sa retraite
              </Button>
            )}
            <Button
              variant="danger"
              onClick={() =>
                confirm("Effacer cette carrière et recommencer ?") && reset()
              }
            >
              Nouvelle carrière
            </Button>
          </div>
        </header>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Semaine" value={`S${weekInYear} · Année ${year}`} />
          <Metric label="Palier" value={t.short} tone="accent" />
          <Metric label="Argent" value={`$${money.toLocaleString("fr-FR")}`} tone="mint" />
          <Metric
            label="Chimie d'équipe"
            value={Math.round(chemistry)}
            tone={chemistry < 35 ? "danger" : chemistry > 70 ? "mint" : "default"}
          />
        </div>

        <Card className="mb-4">
          <TierTrack current={tier} />
          {nextT.id !== tier && (
            <p className="mt-2 text-2xs text-muted">
              Promotion vers <span className="text-white">{nextT.name}</span> : OVR{" "}
              <span className={overall >= t.requires.overall ? "text-mint" : "text-danger"}>
                {Math.round(overall)}/{t.requires.overall}
              </span>{" "}
              · Notoriété{" "}
              <span
                className={
                  player.stats.notoriety >= t.requires.notoriety ? "text-mint" : "text-danger"
                }
              >
                {Math.round(player.stats.notoriety)}/{t.requires.notoriety}
              </span>{" "}
              · 3 tournois à finir dans le top 5.
            </p>
          )}
        </Card>

        {week <= 4 && (
          <Card title="Comment ça marche" className="mb-4">
            <ul className="grid gap-1.5 text-xs text-muted sm:grid-cols-2">
              <li>
                <span className="text-white">3 points d&apos;action</span> par semaine à
                répartir. Le plan est rejoué tant que tu ne le changes pas.
              </li>
              <li>
                <span className="text-white">Un tournoi toutes les 4 semaines</span> :
                le résultat dépend des stats du trio, de la chimie et du mental.
              </li>
              <li>
                <span className="text-white">Le mental</span> conditionne tout. Sous 20,
                tu t&apos;effondres en tournoi. Le repos est un investissement.
              </li>
              <li>
                <span className="text-white">La notoriété</span> ouvre les paliers
                supérieurs : sans stream ni résultats, plafond garanti.
              </li>
            </ul>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <ActionPanel />

            <Card title="Statistiques">
              <div className="grid gap-3 sm:grid-cols-2">
                <StatBar label="Aim" value={player.stats.aim} delta={d?.aim} />
                <StatBar label="Movement" value={player.stats.movement} delta={d?.movement} />
                <StatBar label="Game sense" value={player.stats.gameSense} tone="violet" delta={d?.gameSense} />
                <StatBar label="Leadership" value={player.stats.leadership} tone="violet" delta={d?.leadership} />
                <StatBar
                  label="Mental"
                  value={player.stats.mental}
                  tone={player.stats.mental < 20 ? "danger" : "mint"}
                  delta={d?.mental}
                />
                <StatBar label="Notoriété" value={player.stats.notoriety} tone="mint" delta={d?.notoriety} />
              </div>
              {player.stats.mental < 20 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 rounded-card border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
                >
                  Mental critique — tu sous-performes fortement en tournoi. Repose-toi.
                </motion.p>
              )}
            </Card>

            <Timeline />
          </div>

          <div className="space-y-4">
            <Card title="Trio">
              <div className="space-y-2">
                {teammates.map((tm) => (
                  <div key={tm.id} className="rounded-card border border-line bg-raised px-3 py-2">
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-base uppercase tracking-[0.1em] text-white">
                        {tm.name}
                      </span>
                      <span className="num text-sm text-muted">
                        {Math.round(teammateOverall(tm))}
                        {tm.form > 3 && <span className="ml-1 text-mint">▲</span>}
                        {tm.form < -3 && <span className="ml-1 text-danger">▼</span>}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Pill tone="violet">{tm.role}</Pill>
                      <Pill>{tm.legend}</Pill>
                      <Pill tone={tm.personality === "Toxique" ? "danger" : "muted"}>
                        {tm.personality}
                      </Pill>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-2xs text-muted">
                      <span>
                        Mental{" "}
                        <span className={tm.stats.mental < 25 ? "text-danger" : "text-white/70"}>
                          {Math.round(tm.stats.mental)}
                        </span>
                      </span>
                      <span>
                        Loyauté{" "}
                        <span className={tm.loyalty < 35 ? "text-danger" : "text-white/70"}>
                          {Math.round(tm.loyalty)}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <StatBar
                  label="Chimie"
                  value={chemistry}
                  tone={chemistry < 35 ? "danger" : "mint"}
                />
              </div>
            </Card>

            <Card title="Derniers résultats">
              {recent.length === 0 ? (
                <p className="text-xs text-muted">Aucun tournoi disputé.</p>
              ) : (
                <ul className="space-y-1.5">
                  {recent.map((r, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-2xs uppercase tracking-[0.1em] text-muted">
                        S{r.week} · {tierOf(r.tier).short}
                      </span>
                      <span
                        className={`num ${
                          r.placement === 1
                            ? "text-accent"
                            : r.placement <= 3
                              ? "text-mint"
                              : r.placement > r.lobbySize * 0.7
                                ? "text-danger"
                                : "text-white"
                        }`}
                      >
                        #{r.placement}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Saison">
              <div className="space-y-1.5 text-xs text-muted">
                <div className="flex justify-between">
                  <span>Semaine</span>
                  <span className="num text-white">
                    {week} / {MAX_WEEKS}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tournois joués</span>
                  <span className="num text-white">{results.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Victoires</span>
                  <span className="num text-white">
                    {results.filter((r) => r.placement === 1).length}
                  </span>
                </div>
                {contract && (
                  <div className="flex justify-between">
                    <span>Contrat restant</span>
                    <span className="num text-white">{contract.weeksLeft} sem.</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Une seule modale à la fois : le résultat de tournoi passe d'abord,
          l'événement de la semaine ensuite. */}
      {lastResult ? <TournamentModal /> : <EventModal />}
    </>
  );
}
