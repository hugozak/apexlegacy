"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Button, Card } from "@/components/ui";
import { ACTIONS, ACTION_POINTS_PER_WEEK } from "@/lib/constants";
import { isTournamentWeek, TOURNAMENT_INTERVAL } from "@/lib/simulation";
import { useGame } from "@/store/game";
import type { ActionId } from "@/lib/types";

const TONE_RING: Record<string, string> = {
  accent: "border-accent/50 bg-accent/10 text-accent",
  violet: "border-violet/50 bg-violet/10 text-violet",
  mint: "border-mint/50 bg-mint/10 text-mint",
  danger: "border-danger/50 bg-danger/10 text-danger",
};

export default function ActionPanel() {
  const { actionPoints, pendingActions, week, lastReport } = useGame();
  const queueAction = useGame((s) => s.queueAction);
  const unqueueAction = useGame((s) => s.unqueueAction);
  const clearActions = useGame((s) => s.clearActions);
  const playWeek = useGame((s) => s.playWeek);
  const fastForward = useGame((s) => s.fastForward);

  const ready = pendingActions.length === ACTION_POINTS_PER_WEEK;
  const tournamentIn =
    (TOURNAMENT_INTERVAL - (week % TOURNAMENT_INTERVAL)) % TOURNAMENT_INTERVAL;

  const counts = pendingActions.reduce<Record<string, number>>((acc, a) => {
    acc[a] = (acc[a] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Card
      title="Plan de la semaine"
      right={
        <span className="num text-sm text-white/80">
          {actionPoints} / {ACTION_POINTS_PER_WEEK} PA
        </span>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {ACTIONS.map((a) => {
          const n = counts[a.id] ?? 0;
          return (
            <button
              key={a.id}
              onClick={() => queueAction(a.id as ActionId)}
              disabled={actionPoints <= 0}
              className={`group relative rounded-card border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                n > 0 ? TONE_RING[a.tone] : "border-line bg-raised hover:border-white/25"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-base uppercase tracking-[0.1em] text-white">
                  {a.name}
                </span>
                {n > 0 && <span className="num text-sm">×{n}</span>}
              </div>
              <p className="mt-0.5 text-xs text-muted">{a.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-3 min-h-[34px]">
        <AnimatePresence initial={false}>
          {pendingActions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap items-center gap-1.5"
            >
              {pendingActions.map((a, i) => {
                const def = ACTIONS.find((x) => x.id === a)!;
                return (
                  <button
                    key={`${a}-${i}`}
                    onClick={() => unqueueAction(i)}
                    className="rounded-full border border-line bg-raised px-2.5 py-0.5 font-display text-2xs uppercase tracking-[0.12em] text-white/70 hover:border-danger/50 hover:text-danger"
                    title="Retirer"
                  >
                    {def.name} ✕
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" disabled={!ready} onClick={playWeek}>
          Semaine suivante
        </Button>
        <Button variant="violet" disabled={!ready} onClick={() => fastForward(4)}>
          ×4 semaines
        </Button>
        <Button variant="violet" disabled={!ready} onClick={() => fastForward(12)}>
          ×12
        </Button>
        <Button onClick={clearActions} disabled={pendingActions.length === 0}>
          Vider
        </Button>
        <span className="ml-auto text-2xs uppercase tracking-[0.14em] text-muted">
          {isTournamentWeek(week)
            ? "Tournoi cette semaine"
            : `Tournoi dans ${tournamentIn} sem.`}
        </span>
      </div>
      {lastReport && (
        <motion.div
          key={lastReport.week}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 flex flex-wrap items-center gap-x-3 border-t border-line pt-2 text-2xs"
        >
          <span className="label">Semaine {lastReport.week}</span>
          <span className={`num ${lastReport.money >= 0 ? "text-mint" : "text-danger"}`}>
            {lastReport.money >= 0 ? "+" : "-"}$
            {Math.abs(lastReport.money).toLocaleString("fr-FR")}
          </span>
          {lastReport.notes.map((n, i) => (
            <span key={i} className="text-danger">
              {n}
            </span>
          ))}
        </motion.div>
      )}

      {!ready && (
        <p className="mt-2 text-2xs text-muted">
          Répartis tes {ACTION_POINTS_PER_WEEK} points d&apos;action pour lancer la semaine.
          Le plan est conservé d&apos;une semaine sur l&apos;autre.
        </p>
      )}
    </Card>
  );
}
