"use client";

import { useEffect, useState } from "react";
import CreationScreen from "@/components/CreationScreen";
import CareerScreen from "@/components/CareerScreen";
import { useGame } from "@/store/game";

export default function Home() {
  const phase = useGame((s) => s.phase);
  const [hydrated, setHydrated] = useState(false);

  // Évite le mismatch SSR / localStorage.
  useEffect(() => {
    setHydrated(useGame.persist.hasHydrated());
    return useGame.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="label animate-pulse">Chargement de la carrière…</span>
      </div>
    );
  }

  return phase === "creation" ? <CreationScreen /> : <CareerScreen />;
}
