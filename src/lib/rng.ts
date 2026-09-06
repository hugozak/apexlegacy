/** RNG utilitaires — non seedé, suffisant pour une simulation légère. */

export const rand = () => Math.random();

export function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickMany<T>(arr: readonly T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

/** Tirage pondéré. Retourne null si la liste est vide. */
export function weightedPick<T>(items: T[], weight: (item: T) => number): T | null {
  const total = items.reduce((s, i) => s + Math.max(0, weight(i)), 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const item of items) {
    r -= Math.max(0, weight(item));
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

export const clamp = (v: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, v));

/** Bruit gaussien approximé (somme de 3 uniformes). */
export function gauss(spread = 1) {
  return ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2 * spread;
}
