"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CreationScreen from "@/components/CreationScreen";
import CareerScreen from "@/components/CareerScreen";
import EndingScreen from "@/components/EndingScreen";
import { useGame } from "@/store/game";

export default function Home() {
  const phase = useGame((s) => s.phase);
  const [hydrated, setHydrated] = useState(false);

  // Évite le mismatch SSR / localStorage.
  useEffect(() => {
    if (useGame.persist.hasHydrated()) setHydrated(true);
    return useGame.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="label animate-pulse">Chargement de la carrière…</span>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
      >
        {phase === "creation" && <CreationScreen />}
        {phase === "career" && <CareerScreen />}
        {phase === "ended" && <EndingScreen />}
      </motion.div>
    </AnimatePresence>
  );
}
