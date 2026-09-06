"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  ACTION_POINTS_PER_WEEK,
  ROLES,
  STARTING_MONEY,
  WEEKS_PER_YEAR,
} from "@/lib/constants";
import { generateTrio } from "@/lib/generate";
import { clamp } from "@/lib/rng";
import type {
  ActionId,
  EndingId,
  Region,
  Role,
  Stats,
  StatKey,
  Teammate,
  TierId,
  TimelineEntry,
  TournamentResult,
} from "@/lib/types";

export type Phase = "creation" | "career" | "ended";

export interface Player {
  handle: string;
  region: Region;
  role: Role;
  legend: string;
  startAge: number;
  stats: Stats;
}

export interface GameState {
  version: number;
  phase: Phase;
  week: number;
  player: Player | null;
  teammates: Teammate[];
  teamName: string | null;
  chemistry: number;
  money: number;
  tier: TierId;
  contract: { org: string; weeklySalary: number; weeksLeft: number } | null;
  timeline: TimelineEntry[];
  results: TournamentResult[];
  seenEvents: string[];
  ending: EndingId | null;
  /** Points d'action restants pour la semaine en cours. */
  actionPoints: number;
  /** Actions choisies cette semaine (pour l'UI). */
  pendingActions: ActionId[];

  createCareer: (input: {
    handle: string;
    region: Region;
    role: Role;
    legend: string;
    startAge: number;
  }) => void;
  reset: () => void;
  queueAction: (id: ActionId) => void;
  unqueueAction: (index: number) => void;
  applyStats: (delta: Partial<Stats>) => void;
  addMoney: (amount: number) => void;
  addChemistry: (amount: number) => void;
  pushTimeline: (entry: Omit<TimelineEntry, "year">) => void;
  setTeammates: (t: Teammate[]) => void;
  setTier: (t: TierId) => void;
  advanceWeek: () => void;
  endCareer: (ending: EndingId) => void;
}

export const STORAGE_KEY = "apex-legacy-save-v1";

const initial = {
  version: 1,
  phase: "creation" as Phase,
  week: 1,
  player: null,
  teammates: [] as Teammate[],
  teamName: null as string | null,
  chemistry: 50,
  money: STARTING_MONEY,
  tier: "ranked" as TierId,
  contract: null,
  timeline: [] as TimelineEntry[],
  results: [] as TournamentResult[],
  seenEvents: [] as string[],
  ending: null as EndingId | null,
  actionPoints: ACTION_POINTS_PER_WEEK,
  pendingActions: [] as ActionId[],
};

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initial,

      createCareer: ({ handle, region, role, legend, startAge }) => {
        const roleDef = ROLES.find((r) => r.id === role)!;
        const stats: Stats = { ...roleDef.base, notoriety: 5 };
        const [a, b] = generateTrio(38, role);
        set({
          ...initial,
          phase: "career",
          player: { handle, region, role, legend, startAge, stats },
          teammates: [a, b],
          teamName: `${handle} & co`,
          timeline: [
            {
              week: 1,
              year: 1,
              kind: "milestone",
              title: `${handle} entre dans la scène ${region}`,
              detail: `${role} sur ${legend}, ${startAge} ans. Objectif : l'ALGS.`,
              tone: "accent",
            },
          ],
        });
      },

      reset: () => set({ ...initial }),

      queueAction: (id) => {
        const { actionPoints, pendingActions } = get();
        if (actionPoints <= 0) return;
        set({ actionPoints: actionPoints - 1, pendingActions: [...pendingActions, id] });
      },

      unqueueAction: (index) => {
        const { actionPoints, pendingActions } = get();
        if (index < 0 || index >= pendingActions.length) return;
        const next = pendingActions.filter((_, i) => i !== index);
        set({ actionPoints: actionPoints + 1, pendingActions: next });
      },

      applyStats: (delta) => {
        const player = get().player;
        if (!player) return;
        const stats = { ...player.stats };
        (Object.keys(delta) as StatKey[]).forEach((k) => {
          stats[k] = clamp(stats[k] + (delta[k] ?? 0));
        });
        set({ player: { ...player, stats } });
      },

      addMoney: (amount) => set({ money: Math.round(get().money + amount) }),

      addChemistry: (amount) => set({ chemistry: clamp(get().chemistry + amount) }),

      pushTimeline: (entry) =>
        set({
          timeline: [
            ...get().timeline,
            { ...entry, year: Math.floor((entry.week - 1) / WEEKS_PER_YEAR) + 1 },
          ],
        }),

      setTeammates: (t) => set({ teammates: t }),

      setTier: (t) => set({ tier: t }),

      advanceWeek: () =>
        set({
          week: get().week + 1,
          actionPoints: ACTION_POINTS_PER_WEEK,
          pendingActions: [],
        }),

      endCareer: (ending) => set({ phase: "ended", ending }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (s) => {
        const { createCareer, reset, queueAction, unqueueAction, applyStats,
          addMoney, addChemistry, pushTimeline, setTeammates, setTier,
          advanceWeek, endCareer, ...data } = s;
        return data;
      },
    },
  ),
);

/* ---------------- Sélecteurs ---------------- */

export function overallOf(stats: Stats) {
  return (
    stats.aim * 0.28 +
    stats.movement * 0.15 +
    stats.gameSense * 0.28 +
    stats.leadership * 0.09 +
    stats.mental * 0.2
  );
}

export function ageOf(startAge: number, week: number) {
  return startAge + Math.floor((week - 1) / WEEKS_PER_YEAR);
}

export function seasonOf(week: number) {
  return {
    year: Math.floor((week - 1) / WEEKS_PER_YEAR) + 1,
    weekInYear: ((week - 1) % WEEKS_PER_YEAR) + 1,
  };
}
