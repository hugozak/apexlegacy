"use client";

import { motion } from "framer-motion";
import { Button, Modal } from "@/components/ui";
import { teammateOverall } from "@/lib/generate";
import { useGame } from "@/store/game";

function placementTone(placement: number, lobby: number) {
  if (placement === 1) return "text-accent";
  if (placement <= 3) return "text-mint";
  if (placement > lobby * 0.7) return "text-danger";
  return "text-white";
}

export default function TournamentModal() {
  const result = useGame((s) => s.lastResult);
  const dismiss = useGame((s) => s.dismissResult);
  const player = useGame((s) => s.player);
  const teammates = useGame((s) => s.teammates);
  const chemistry = useGame((s) => s.chemistry);

  if (!result || !player) return null;

  const label =
    result.placement === 1
      ? "VICTOIRE"
      : result.placement <= 3
        ? "PODIUM"
        : result.placement <= result.lobbySize * 0.25
          ? "SOLIDE"
          : result.placement > result.lobbySize * 0.7
            ? "ÉLIMINÉ TÔT"
            : "MILIEU DE TABLEAU";

  return (
    <Modal>
      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-3">
          <div className="label">{result.tierName} · Semaine {result.week}</div>
          <h2 className="mt-1 font-display text-2xl uppercase tracking-[0.1em] text-white">
            {label}
          </h2>
        </div>

        <div className="px-5 py-5">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 16 }}
            className="text-center"
          >
            <div className={`num text-6xl leading-none ${placementTone(result.placement, result.lobbySize)}`}>
              #{result.placement}
            </div>
            <div className="label mt-1">sur {result.lobbySize} équipes</div>
          </motion.div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-card border border-line bg-raised py-2">
              <div className="label">Gains</div>
              <div className="num text-lg text-mint">
                ${result.prize.toLocaleString("fr-FR")}
              </div>
            </div>
            <div className="rounded-card border border-line bg-raised py-2">
              <div className="label">Notoriété</div>
              <div className="num text-lg text-violet">
                {result.notorietyGain >= 0 ? "+" : ""}
                {result.notorietyGain}
              </div>
            </div>
            <div className="rounded-card border border-line bg-raised py-2">
              <div className="label">Chimie</div>
              <div className="num text-lg text-white">{Math.round(chemistry)}</div>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="label">Composition du trio</div>
            {[
              { name: player.handle, role: player.role, ovr: 0, you: true },
              ...teammates.map((t) => ({
                name: t.name,
                role: t.role,
                ovr: Math.round(teammateOverall(t)),
                you: false,
              })),
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-card border border-line bg-raised px-3 py-1.5"
              >
                <span className={`font-display text-sm uppercase tracking-[0.1em] ${row.you ? "text-accent" : "text-white"}`}>
                  {row.name}
                </span>
                <span className="text-2xs text-muted">{row.role}</span>
              </div>
            ))}
          </div>

          <Button variant="primary" className="mt-4 w-full" onClick={dismiss}>
            Continuer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
