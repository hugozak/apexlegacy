import { LEGENDS, PERSONALITIES, ROLES, TEAMMATE_NAMES, ORG_NAMES } from "./constants";
import { clamp, pick, randInt } from "./rng";
import type { Role, Teammate } from "./types";

let idCounter = 0;
const nextId = () => `tm_${Date.now().toString(36)}_${idCounter++}`;

/** Génère un coéquipier calibré autour d'un niveau moyen (0-100). */
export function generateTeammate(level: number, excludeRoles: Role[] = []): Teammate {
  const roles = ROLES.filter((r) => !excludeRoles.includes(r.id));
  const role = pick(roles.length ? roles : ROLES);
  const jitter = () => randInt(-8, 8);
  const scale = level / 50;

  const base = role.base;
  return {
    id: nextId(),
    name: pick(TEAMMATE_NAMES),
    role: role.id,
    legend: pick(LEGENDS),
    personality: pick(PERSONALITIES),
    ambition: randInt(25, 95),
    loyalty: randInt(30, 90),
    form: 0,
    stats: {
      aim: clamp(base.aim * scale + jitter()),
      movement: clamp(base.movement * scale + jitter()),
      gameSense: clamp(base.gameSense * scale + jitter()),
      leadership: clamp(base.leadership * scale + jitter()),
      mental: clamp(base.mental * scale + jitter()),
    },
  };
}

export function generateTrio(level: number, playerRole: Role): [Teammate, Teammate] {
  const a = generateTeammate(level, [playerRole]);
  const b = generateTeammate(level, [playerRole, a.role]);
  if (b.name === a.name) b.name = `${b.name}X`;
  return [a, b];
}

export function generateOrgName() {
  return pick(ORG_NAMES);
}

/** Note globale d'un coéquipier. */
export function teammateOverall(t: Teammate) {
  const s = t.stats;
  return (
    s.aim * 0.3 + s.movement * 0.15 + s.gameSense * 0.3 + s.leadership * 0.1 + s.mental * 0.15
  );
}
