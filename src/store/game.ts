"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  ACTION_POINTS_PER_WEEK,
  MAX_WEEKS,
  ROLES,
  STARTING_MONEY,
  TIER_ORDER,
  WEEKS_PER_YEAR,
  LEGENDS,
  teammateLevelFor,
  tierIndex,
  tierOf,
} from "@/lib/constants";
import { generateOrgName, generateTeammate, generateTrio, teammateOverall } from "@/lib/generate";
import { clamp, pick, rand } from "@/lib/rng";
import { eventChance, rollEvent } from "@/lib/events";
import {
  canPromote,
  contractOfferChance,
  checkTeammateDeparture,
  determineEnding,
  evolveTeammates,
  isTournamentWeek,
  nextTier,
  playerOverall,
  replaceTeammate,
  chemistryDrift,
  resolveActions,
  simulateTournament,
  softApply,
  tournamentAftermath,
} from "@/lib/simulation";
import type {
  ActionId,
  EndingId,
  GameEvent,
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

export interface Contract {
  org: string;
  weeklySalary: number;
  weeksLeft: number;
}

export interface WeekReport {
  week: number;
  statDelta: Partial<Stats>;
  money: number;
  notes: string[];
}

interface Core {
  version: number;
  phase: Phase;
  week: number;
  player: Player | null;
  teammates: Teammate[];
  chemistry: number;
  money: number;
  tier: TierId;
  contract: Contract | null;
  timeline: TimelineEntry[];
  results: TournamentResult[];
  eventLog: Record<string, number>;
  paths: string[];
  ending: EndingId | null;
  actionPoints: number;
  pendingActions: ActionId[];
  pendingEvent: GameEvent | null;
  lastResult: TournamentResult | null;
  lastReport: WeekReport | null;
  metaModifier: number;
  metaWeeksLeft: number;
  burnoutStrikes: number;
  bestPlacement: number | null;
  totalEarnings: number;
}

export interface GameState extends Core {
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
  clearActions: () => void;
  playWeek: (silent?: boolean) => void;
  fastForward: (weeks: number) => void;
  resolveEventChoice: (index: number) => void;
  dismissResult: () => void;
  retire: () => void;
}

export const STORAGE_KEY = "apex-legacy-save-v1";
const TIMELINE_CAP = 400;

const initial: Core = {
  version: 2,
  phase: "creation",
  week: 1,
  player: null,
  teammates: [],
  chemistry: 50,
  money: STARTING_MONEY,
  tier: "ranked",
  contract: null,
  timeline: [],
  results: [],
  eventLog: {},
  paths: [],
  ending: null,
  actionPoints: ACTION_POINTS_PER_WEEK,
  pendingActions: [],
  pendingEvent: null,
  lastResult: null,
  lastReport: null,
  metaModifier: 0,
  metaWeeksLeft: 0,
  burnoutStrikes: 0,
  bestPlacement: null,
  totalEarnings: 0,
};

const yearOf = (week: number) => Math.floor((week - 1) / WEEKS_PER_YEAR) + 1;

function applyStatDelta(stats: Stats, delta: Partial<Stats>): Stats {
  const next = { ...stats };
  (Object.keys(delta) as StatKey[]).forEach((k) => {
    next[k] = clamp(next[k] + (delta[k] ?? 0));
  });
  return next;
}

/** Offre de contrat générée à la volée, présentée comme un événement. */
function buildContractOffer(tier: TierId): GameEvent {
  const org = generateOrgName();
  const salary = Math.max(80, tierOf(tier).weeklySalary || 100);
  return {
    id: `offer_${org}_${Date.now()}`,
    title: `${org} te contacte`,
    text: `La structure ${org} veut te faire signer pour la saison. Salaire proposé : $${salary} par semaine, plus les primes de tournoi.`,
    category: "org",
    weight: 0,
    choices: [
      {
        label: "Signer avec " + org,
        outcome: `Contrat signé avec ${org}. Le maillot est à toi.`,
        effects: {
          money: salary * 4,
          stats: { notoriety: 3, mental: 4 },
          chemistry: 3,
          flags: ["sign_contract:" + org],
        },
      },
      {
        label: "Refuser et rester agent libre",
        outcome: "Tu gardes ta liberté et ton pouvoir de négociation.",
        effects: { stats: { mental: -1, notoriety: 1 } },
      },
    ],
  };
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initial,

      createCareer: ({ handle, region, role, legend, startAge }) => {
        const roleDef = ROLES.find((r) => r.id === role)!;
        const stats: Stats = { ...roleDef.base, notoriety: 5 };
        const [a, b] = generateTrio(teammateLevelFor("ranked"), role);
        set({
          ...initial,
          phase: "career",
          player: { handle, region, role, legend, startAge, stats },
          teammates: [a, b],
          timeline: [
            {
              week: 1,
              year: 1,
              kind: "milestone",
              title: `${handle} entre dans la scène ${region}`,
              detail: `${role} sur ${legend}, ${startAge} ans. Trio avec ${a.name} et ${b.name}.`,
              tone: "accent",
            },
          ],
        });
      },

      reset: () => {
        set({ ...initial });
        if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
      },

      queueAction: (id) => {
        const { actionPoints, pendingActions } = get();
        if (actionPoints <= 0) return;
        set({ actionPoints: actionPoints - 1, pendingActions: [...pendingActions, id] });
      },

      unqueueAction: (index) => {
        const { actionPoints, pendingActions } = get();
        if (index < 0 || index >= pendingActions.length) return;
        set({
          actionPoints: actionPoints + 1,
          pendingActions: pendingActions.filter((_, i) => i !== index),
        });
      },

      clearActions: () =>
        set({ actionPoints: ACTION_POINTS_PER_WEEK, pendingActions: [] }),

      /* -------- Résolution d'une semaine -------- */
      playWeek: (silent = false) => {
        const s = get();
        if (s.phase !== "career" || !s.player) return;
        if (s.pendingEvent || s.lastResult) return;
        if (s.pendingActions.length === 0) return;

        const week = s.week;
        const timeline: TimelineEntry[] = [];
        const notes: string[] = [];

        // 1. Actions
        const startMoney = s.money;
        const outcome = resolveActions(s.pendingActions, s.player.stats, s.tier);
        let stats = applyStatDelta(s.player.stats, outcome.statDelta);
        let money = s.money + outcome.money;
        let totalEarnings = s.totalEarnings + Math.max(0, outcome.money);
        let chemistry = clamp(s.chemistry + chemistryDrift(s.chemistry, outcome.chemistry));
        notes.push(...outcome.notes);

        // 2. Contrat : salaire et échéance
        let contract = s.contract;
        if (contract) {
          money += contract.weeklySalary;
          totalEarnings += contract.weeklySalary;
          contract = { ...contract, weeksLeft: contract.weeksLeft - 1 };
          if (contract.weeksLeft <= 0) {
            timeline.push({
              week,
              year: yearOf(week),
              kind: "contract",
              title: `Fin de contrat avec ${contract.org}`,
              tone: "muted",
            });
            contract = null;
          }
        } else {
          // Coût de la vie : il augmente avec le niveau (déplacements, matériel).
          money -= 60 + tierIndex(s.tier) * 45;
        }
        if (money < 0) {
          money = 0;
          stats = applyStatDelta(stats, { mental: -2 });
          notes.push("Fin de mois difficile : le mental prend un coup.");
        }

        // 3. Coéquipiers
        const evo = evolveTeammates(s.teammates, chemistry);
        let teammates = evo.teammates;
        notes.push(...evo.notes);

        const leaving = checkTeammateDeparture(
          teammates,
          playerOverall(stats),
          chemistry,
        );
        if (leaving) {
          const level = teammateLevelFor(s.tier);
          teammates = replaceTeammate(teammates, leaving, level, s.player.role);
          chemistry = clamp(chemistry - 18);
          const arrival = teammates[teammates.length - 1];
          timeline.push({
            week,
            year: yearOf(week),
            kind: "team",
            title: `${leaving.name} quitte le trio`,
            detail: `${arrival.name} (${arrival.role}) rejoint l'équipe.`,
            tone: "danger",
          });
        }

        // 4. Tournoi
        let tier = s.tier;
        let results = s.results;
        let lastResult: TournamentResult | null = null;
        let bestPlacement = s.bestPlacement;
        let promoted = false;

        if (isTournamentWeek(week)) {
          const result = simulateTournament({
            week,
            tier,
            stats,
            teammates,
            chemistry,
            metaModifier: s.metaModifier,
          });
          results = [...s.results, result];
          lastResult = result;
          money += result.prize;
          totalEarnings += result.prize;
          stats = applyStatDelta(stats, { notoriety: result.notorietyGain });

          const after = tournamentAftermath(result.placement, result.lobbySize, stats.mental);
          stats = applyStatDelta(stats, { mental: after.mental });
          chemistry = clamp(chemistry + after.chemistry);

          if (bestPlacement === null || result.placement < bestPlacement) {
            bestPlacement = result.placement;
          }
          if (result.placement <= 3) {
            timeline.push({
              week,
              year: yearOf(week),
              kind: "tournament",
              title: `Top ${result.placement} — ${result.tierName}`,
              detail: result.prize ? `$${result.prize.toLocaleString("fr-FR")} de gains.` : undefined,
              tone: result.placement === 1 ? "accent" : "mint",
            });
          }

          // 5. Promotion
          if (canPromote(tier, stats, results)) {
            const target = nextTier(tier);
            if (target !== tier) {
              tier = target;
              promoted = true;
              const t = tierOf(tier);
              chemistry = clamp(chemistry + 4);
              stats = applyStatDelta(stats, { mental: 6 });
              timeline.push({
                week,
                year: yearOf(week),
                kind: "promotion",
                title: `Promotion — ${t.name}`,
                detail: "Nouveau palier, nouveau niveau d'adversité.",
                tone: "accent",
              });
              // Les coéquipiers se mettent au niveau du palier.
              const level = teammateLevelFor(tier);
              teammates = teammates.map((tm, i) =>
                teammateOverall(tm) < level - 8
                  ? generateTeammate(
                      level,
                      [s.player!.role, ...teammates.filter((_, j) => j !== i).map((o) => o.role)],
                      teammates.map((o) => o.name),
                    )
                  : tm,
              );
            }
          }
        }

        // En avance rapide, seuls les résultats marquants interrompent le flux.
        if (silent && lastResult && lastResult.placement > 3 && !promoted) {
          lastResult = null;
        }

        // 6. Événement aléatoire
        let pendingEvent: GameEvent | null = null;
        const ctx = {
          week,
          tier,
          stats,
          chemistry,
          money,
          hasContract: !!contract,
          log: s.eventLog,
        };
        if (rand() < eventChance(ctx)) {
          pendingEvent = rollEvent(ctx);
        }
        if (
          !pendingEvent &&
          !contract &&
          TIER_ORDER.indexOf(tier) >= 1 &&
          rand() < contractOfferChance(s.pendingActions, stats.notoriety)
        ) {
          pendingEvent = buildContractOffer(tier);
        }

        // 7. Meta / burnout
        const metaWeeksLeft = Math.max(0, s.metaWeeksLeft - 1);
        const metaModifier = metaWeeksLeft === 0 ? 0 : s.metaModifier;

        let burnoutStrikes = stats.mental < 10 ? s.burnoutStrikes + 1 : 0;
        let phase: Phase = s.phase;
        let ending: EndingId | null = null;

        const nextWeek = week + 1;
        if (burnoutStrikes >= 6) {
          phase = "ended";
          ending = "burnout";
          timeline.push({
            week,
            year: yearOf(week),
            kind: "milestone",
            title: "Burn out",
            detail: "Le mental a lâché. La carrière s'arrête ici.",
            tone: "danger",
          });
        } else if (nextWeek > MAX_WEEKS) {
          phase = "ended";
          ending = determineEnding({
            stats,
            tier,
            money,
            results,
            paths: s.paths,
            weeks: week,
            burnedOut: false,
          });
        }

        set({
          week: nextWeek,
          player: { ...s.player, stats },
          teammates,
          chemistry,
          money: Math.round(money),
          totalEarnings: Math.round(totalEarnings),
          contract,
          tier,
          results,
          lastResult,
          lastReport: {
            week,
            statDelta: outcome.statDelta,
            money: Math.round(money) - startMoney,
            notes,
          },
          bestPlacement,
          pendingEvent,
          eventLog:
            pendingEvent && pendingEvent.weight > 0
              ? { ...s.eventLog, [pendingEvent.id]: week }
              : s.eventLog,
          timeline: [...s.timeline, ...timeline].slice(-TIMELINE_CAP),
          metaModifier,
          metaWeeksLeft,
          burnoutStrikes,
          phase,
          ending,
          // Le plan hebdomadaire est conservé pour pouvoir être rejoué tel quel :
          // les points restent consommés tant que le joueur ne le vide pas.
          actionPoints: 0,
          pendingActions: s.pendingActions,
        });
      },

      fastForward: (weeks) => {
        for (let i = 0; i < weeks; i++) {
          const s = get();
          if (s.phase !== "career" || s.pendingEvent || s.lastResult) break;
          if (s.pendingActions.length === 0) break;
          // Sécurité : on ne laisse pas filer les semaines avec un mental au sol.
          if (i > 0 && s.player && s.player.stats.mental < 20) break;
          get().playWeek(true);
        }
      },

      resolveEventChoice: (index) => {
        const s = get();
        const ev = s.pendingEvent;
        if (!ev || !s.player) return;
        const choice = ev.choices[index];
        if (!choice) return;

        const eff = choice.effects;
        let stats = softApply(s.player.stats, eff.stats ?? {});
        let money = s.money + (eff.money ?? 0);
        let totalEarnings = s.totalEarnings + Math.max(0, eff.money ?? 0);
        let chemistry = clamp(s.chemistry + (eff.chemistry ?? 0));
        let teammates = s.teammates;
        let contract = s.contract;
        let paths = s.paths;
        let metaModifier = s.metaModifier;
        let metaWeeksLeft = s.metaWeeksLeft;
        let legend = s.player.legend;
        const timeline: TimelineEntry[] = [
          {
            week: s.week - 1,
            year: yearOf(s.week - 1),
            kind: "event",
            title: ev.title,
            detail: choice.outcome,
            tone:
              (eff.stats?.mental ?? 0) < -4
                ? "danger"
                : (eff.stats?.notoriety ?? 0) > 4
                  ? "violet"
                  : "muted",
          },
        ];
        const level = teammateLevelFor(s.tier);

        for (const flag of eff.flags ?? []) {
          const [name, arg] = flag.split(":");
          switch (name) {
            case "teammate_leaves": {
              const leaving = pick(teammates);
              if (leaving) {
                teammates = replaceTeammate(teammates, leaving, level, s.player.role);
                chemistry = clamp(chemistry - 10);
                timeline.push({
                  week: s.week - 1,
                  year: yearOf(s.week - 1),
                  kind: "team",
                  title: `${leaving.name} quitte le trio`,
                  detail: `${teammates[teammates.length - 1].name} le remplace.`,
                  tone: "danger",
                });
              }
              break;
            }
            case "teammate_boost":
              teammates = teammates.map((t) => ({
                ...t,
                stats: {
                  ...t.stats,
                  mental: clamp(t.stats.mental + 8),
                  gameSense: clamp(t.stats.gameSense + 3),
                },
              }));
              break;
            case "teammate_tilt":
              teammates = teammates.map((t) => ({
                ...t,
                stats: { ...t.stats, mental: clamp(t.stats.mental - 8) },
              }));
              break;
            case "upgrade_teammates": {
              const first = generateTeammate(level + 12, [s.player.role]);
              teammates = [
                first,
                generateTeammate(level + 12, [s.player.role, first.role], [first.name]),
              ];
              break;
            }
            case "downgrade_teammates": {
              const lvl = Math.max(20, level - 12);
              const first = generateTeammate(lvl, [s.player.role]);
              teammates = [
                first,
                generateTeammate(lvl, [s.player.role, first.role], [first.name]),
              ];
              break;
            }
            case "sign_contract": {
              const org = arg || generateOrgName();
              const salary = Math.max(100, tierOf(s.tier).weeklySalary || 120);
              contract = { org, weeklySalary: salary, weeksLeft: 52 };
              timeline.push({
                week: s.week - 1,
                year: yearOf(s.week - 1),
                kind: "contract",
                title: `Contrat signé — ${org}`,
                detail: `$${salary}/semaine pendant un an.`,
                tone: "accent",
              });
              break;
            }
            case "lose_contract":
              if (contract) {
                timeline.push({
                  week: s.week - 1,
                  year: yearOf(s.week - 1),
                  kind: "contract",
                  title: `Départ de ${contract.org}`,
                  tone: "danger",
                });
              }
              contract = null;
              break;
            case "meta_down":
              metaModifier = -1;
              metaWeeksLeft = 12;
              break;
            case "meta_up":
              metaModifier = 1;
              metaWeeksLeft = 12;
              break;
            case "switch_legend": {
              const others = LEGENDS.filter((l) => l !== legend);
              legend = pick(others);
              metaModifier = 0;
              metaWeeksLeft = 0;
              break;
            }
            case "analyst_path":
            case "coach_path":
              if (!paths.includes(name)) paths = [...paths, name];
              break;
          }
        }

        if (money < 0) money = 0;

        set({
          player: { ...s.player, stats, legend },
          money: Math.round(money),
          totalEarnings: Math.round(totalEarnings),
          chemistry,
          teammates,
          contract,
          paths,
          metaModifier,
          metaWeeksLeft,
          timeline: [...s.timeline, ...timeline].slice(-TIMELINE_CAP),
          pendingEvent: null,
        });
      },

      dismissResult: () => set({ lastResult: null }),

      retire: () => {
        const s = get();
        if (!s.player) return;
        const ending = determineEnding({
          stats: s.player.stats,
          tier: s.tier,
          money: s.money,
          results: s.results,
          paths: s.paths,
          weeks: s.week,
          burnedOut: s.player.stats.mental < 15,
        });
        set({
          phase: "ended",
          ending,
          pendingEvent: null,
          lastResult: null,
          timeline: [
            ...s.timeline,
            {
              week: s.week,
              year: yearOf(s.week),
              kind: "milestone" as const,
              title: `${s.player.handle} prend sa retraite`,
              tone: "accent" as const,
            },
          ].slice(-TIMELINE_CAP),
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: () => ({ ...initial }) as GameState,
      partialize: (s) => {
        const {
          createCareer, reset, queueAction, unqueueAction, clearActions,
          playWeek, fastForward, resolveEventChoice, dismissResult, retire,
          ...data
        } = s;
        return data;
      },
    },
  ),
);

/* ---------------- Sélecteurs ---------------- */

export { playerOverall as overallOf };

export function ageOf(startAge: number, week: number) {
  return startAge + Math.floor((week - 1) / WEEKS_PER_YEAR);
}

export function seasonOf(week: number) {
  return {
    year: Math.floor((week - 1) / WEEKS_PER_YEAR) + 1,
    weekInYear: ((week - 1) % WEEKS_PER_YEAR) + 1,
  };
}
