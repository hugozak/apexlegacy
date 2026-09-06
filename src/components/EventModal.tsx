"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button, Modal, Pill } from "@/components/ui";
import { useGame } from "@/store/game";
import type { EventEffects } from "@/lib/types";

const CATEGORY_TONE = {
  team: "violet",
  org: "accent",
  media: "violet",
  meta: "mint",
  perso: "danger",
  opportunite: "mint",
} as const;

function EffectsLine({ e }: { e: EventEffects }) {
  const bits: { text: string; good: boolean }[] = [];
  const labels: Record<string, string> = {
    aim: "Aim",
    movement: "Move",
    gameSense: "Game sense",
    leadership: "Leadership",
    mental: "Mental",
    notoriety: "Notoriété",
  };
  Object.entries(e.stats ?? {}).forEach(([k, v]) => {
    if (!v) return;
    bits.push({ text: `${v > 0 ? "+" : ""}${v} ${labels[k] ?? k}`, good: v > 0 });
  });
  if (e.chemistry) {
    bits.push({
      text: `${e.chemistry > 0 ? "+" : ""}${e.chemistry} Chimie`,
      good: e.chemistry > 0,
    });
  }
  if (e.money) {
    bits.push({
      text: `${e.money > 0 ? "+" : "-"}$${Math.abs(e.money).toLocaleString("fr-FR")}`,
      good: e.money > 0,
    });
  }
  if (!bits.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
      {bits.map((b, i) => (
        <span key={i} className={`num text-2xs ${b.good ? "text-mint" : "text-danger"}`}>
          {b.text}
        </span>
      ))}
    </div>
  );
}

export default function EventModal() {
  const ev = useGame((s) => s.pendingEvent);
  const resolve = useGame((s) => s.resolveEventChoice);
  const [chosen, setChosen] = useState<number | null>(null);

  if (!ev) return null;
  const choice = chosen !== null ? ev.choices[chosen] : null;

  return (
    <Modal>
      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-3">
          <Pill tone={CATEGORY_TONE[ev.category]}>{ev.category}</Pill>
          <h2 className="mt-2 font-display text-2xl uppercase tracking-[0.1em] text-white">
            {ev.title}
          </h2>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-relaxed text-white/80">{ev.text}</p>

          {!choice ? (
            <div className="mt-4 space-y-2">
              {ev.choices.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setChosen(i)}
                  className="w-full rounded-card border border-line bg-raised px-3.5 py-2.5 text-left transition-colors hover:border-accent/50 hover:bg-accent/[0.07]"
                >
                  <span className="text-sm text-white">{c.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <div className="rounded-card border border-accent/30 bg-accent/[0.07] px-3.5 py-3">
                <p className="text-sm leading-relaxed text-white/90">{choice.outcome}</p>
                <EffectsLine e={choice.effects} />
              </div>
              <Button
                variant="primary"
                className="mt-3 w-full"
                onClick={() => {
                  const idx = chosen;
                  setChosen(null);
                  if (idx !== null) resolve(idx);
                }}
              >
                Continuer
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </Modal>
  );
}
