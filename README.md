# Apex Legacy

Jeu de simulation de carrière esport sur Apex Legends, dans l'esprit d'*Onze de Rêve*
ou *DPM Legacy*. Tu crées un pro player, tu répartis ton temps chaque semaine, tu
encaisses les événements de la scène, et tes choix décident de la fin de ta carrière.

100 % client : aucun backend, aucune base de données, sauvegarde en `localStorage`.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Zustand (persist) · Framer Motion.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

## Boucle de jeu

Un tour = une semaine, **3 points d'action** à répartir entre *aim training*, *scrims*,
*VOD review*, *stream*, *networking* et *repos*. Le plan est conservé d'une semaine sur
l'autre : `Semaine suivante`, `×4` et `×12` le rejouent tel quel, et l'avance rapide
s'interrompt sur un événement, un podium, une promotion ou un mental qui s'effondre.
Une carrière complète fait 250 semaines (≈ 5 ans), soit 20 à 30 minutes de jeu.

Un tournoi tombe **toutes les 4 semaines**. Le classement dépend de la note du trio,
de la chimie d'équipe, du mental et d'une part d'aléatoire.

## Systèmes

**Stats (0-100)** — Aim, Movement, Game sense, Leadership, Mental, Notoriété.
Chaque point coûte de plus en plus cher (`gain ∝ (1 − stat/100)^1.5`) : au-delà de 80,
la progression devient un travail de longue haleine.

**Mental** — la stat centrale. Il descend avec l'entraînement, les défaites et les
mauvais choix, remonte avec le repos et les victoires. La récupération faiblit à mesure
qu'il est haut et la pression augmente avec le palier : chaque niveau a son point
d'équilibre, et il baisse quand on monte. Sous 35 la performance en tournoi baisse,
sous 20 elle s'effondre (−28 %). Six semaines sous 10 et c'est le burn out.

**Notoriété** — courbe à inertie : difficile à lancer, elle s'emballe au milieu, plafonne
en haut, et s'érode en permanence. On l'entretient en streamant ou en gagnant. Sans elle,
les paliers supérieurs restent fermés quel que soit le niveau de jeu.

**Trio** — deux coéquipiers générés avec stats, personnalité, ambition et loyauté. Ils
progressent, régressent, tiltent, et peuvent partir s'ils te dépassent ou si la chimie
s'effondre. La chimie revient toujours vers 45 : sans scrims réguliers, un trio se délite.

**Paliers** — Ranked → Scrims amateurs → Challenger Circuit → Pro League → ALGS
Championship → LAN internationale. Chacun a un seuil d'OVR et de notoriété, plus une
exigence de régularité (4 tournois, moyenne ≤ 6,5 et au moins un podium). Le matchmaking
rattrape 35 % de l'écart quand une équipe surclasse son palier : on domine un tier, on ne
l'écrase pas indéfiniment.

**Événements** — 55 événements dans `src/data/events.json`, tirage pondéré par les stats,
la chimie, l'argent et le palier. 15 sont uniques, les autres reviennent après 70 semaines.
Les bonus de stats issus des événements sont amortis quand la stat est déjà haute.

**Fins** — Légende de la scène, Caster/analyste, Streamer full time, Coach, Burn out,
Journeyman. Déterminées par les stats finales, le palier atteint, les titres et les
opportunités saisies en cours de route.

## Structure

```
src/
  app/            layout, page, globals.css, icon.svg
  components/     ui.tsx (design system), CreationScreen, CareerScreen,
                  ActionPanel, EventModal, TournamentModal, Timeline, EndingScreen
  data/           events.json
  lib/            types, constants (paliers, rôles, actions), rng, generate,
                  events (tirage), simulation (actions, tournois, paliers, fins)
  store/          game.ts — état Zustand persisté
scripts/          outils de dev (voir ci-dessous)
```

## Outils de dev

```bash
npx tsx scripts/balance.ts 100    # simule 100 carrières × 6 stratégies, hors React
npx tsx scripts/trace-mental.ts aim,scrims,rest   # trajectoire du mental sur 80 semaines
```

`balance.ts` sert de garde-fou d'équilibrage : il compare un joueur optimisé, un joueur
équilibré, un grinder sans repos, un créateur de contenu et un joueur passif. Repères
actuels sur 100 carrières par stratégie :

| Stratégie | Palier atteint | Fins dominantes |
|---|---|---|
| Optimale | ALGS 60 %, LAN 1 % | caster, coach, légende |
| Équilibrée | Pro League / ALGS | journeyman, caster |
| Grind sans repos | Ranked | burn out 100 % |
| Full contenu | Scrims | streamer, caster |

## Design

Fond `#08080f`, accent orange `#f05828`, secondaires violet `#9272f0`, vert `#3dd68c`,
rouge `#f06060`. Barlow Condensed pour les titres et les chiffres, Inter pour le corps.
Bordures à 7 % d'opacité, cards en radius 10px.
