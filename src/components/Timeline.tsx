"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui";
import { useGame } from "@/store/game";
import type { TimelineEntry } from "@/lib/types";

const KIND_LABEL: Record<TimelineEntry["kind"], string> = {
  event: "Événement",
  tournament: "Tournoi",
  promotion: "Promotion",
  team: "Équipe",
  contract: "Contrat",
  milestone: "Étape",
};

const TONE_DOT: Record<string, string> = {
  accent: "bg-accent",
  violet: "bg-violet",
  mint: "bg-mint",
  danger: "bg-danger",
  muted: "bg-white/25",
};

export default function Timeline({ full = false }: { full?: boolean }) {
  const timeline = useGame((s) => s.timeline);
  const [expanded, setExpanded] = useState(full);

  const entries = [...timeline].reverse();
  const shown = expanded ? entries : entries.slice(0, 6);

  return (
    <Card
      title="Timeline de carrière"
      right={
        !full && entries.length > 6 ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="font-display text-2xs uppercase tracking-[0.14em] text-accent hover:underline"
          >
            {expanded ? "Réduire" : `Tout voir (${entries.length})`}
          </button>
        ) : null
      }
    >
      {entries.length === 0 ? (
        <p className="text-xs text-muted">Rien à raconter pour l&apos;instant.</p>
      ) : (
        <ol className="relative space-y-3 border-l border-line pl-4">
          <AnimatePresence initial={false}>
            {shown.map((e, i) => (
              <motion.li
                key={`${e.week}-${e.title}-${i}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative"
              >
                <span
                  className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${TONE_DOT[e.tone ?? "muted"]}`}
                />
                <div className="flex items-baseline gap-2">
                  <span className="num text-2xs text-muted">
                    A{e.year} · S{e.week}
                  </span>
                  <span className="label">{KIND_LABEL[e.kind]}</span>
                </div>
                <div className="text-sm text-white">{e.title}</div>
                {e.detail && <p className="text-xs leading-snug text-muted">{e.detail}</p>}
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </Card>
  );
}
