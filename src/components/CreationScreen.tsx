"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button, Card, Pill, StatBar } from "@/components/ui";
import { LEGENDS, REGIONS, ROLES } from "@/lib/constants";
import { useGame } from "@/store/game";
import type { Region, Role } from "@/lib/types";

export default function CreationScreen() {
  const createCareer = useGame((s) => s.createCareer);

  const [handle, setHandle] = useState("");
  const [region, setRegion] = useState<Region>("EU");
  const [role, setRole] = useState<Role>("Fragger");
  const [legend, setLegend] = useState<string>(LEGENDS[0]);
  const [startAge, setStartAge] = useState(17);

  const roleDef = ROLES.find((r) => r.id === role)!;
  const valid = handle.trim().length >= 2 && handle.trim().length <= 16;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-accent" />
          <h1 className="font-display text-4xl uppercase tracking-[0.16em] text-white">
            Apex <span className="text-accent">Legacy</span>
          </h1>
        </div>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Crée ton pro player, monte de la ranked jusqu&apos;à la LAN internationale, et
          vis les choix qui font ou détruisent une carrière.
        </p>
      </motion.header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card title="Identité">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label mb-1.5 block">Pseudo</label>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.slice(0, 16))}
                  placeholder="ex. Fuse"
                  className="w-full rounded-card border border-line bg-raised px-3 py-2 font-display text-lg uppercase tracking-[0.1em] text-white outline-none placeholder:text-muted/60 focus:border-accent/60"
                />
              </div>
              <div>
                <label className="label mb-1.5 block">
                  Âge de départ — <span className="text-white">{startAge} ans</span>
                </label>
                <input
                  type="range"
                  min={16}
                  max={19}
                  value={startAge}
                  onChange={(e) => setStartAge(Number(e.target.value))}
                  className="mt-3 w-full accent-[#f05828]"
                />
                <div className="mt-1 flex justify-between text-2xs text-muted">
                  <span>16</span>
                  <span>19</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Région">
            <div className="grid gap-2 sm:grid-cols-2">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRegion(r.id)}
                  className={`rounded-card border px-3 py-2.5 text-left transition-colors ${
                    region === r.id
                      ? "border-accent/60 bg-accent/10"
                      : "border-line bg-raised hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base uppercase tracking-[0.14em] text-white">
                      {r.id}
                    </span>
                    <span className="text-2xs text-muted">{r.name}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{r.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Rôle">
            <div className="grid gap-2 sm:grid-cols-3">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`rounded-card border px-3 py-3 text-left transition-colors ${
                    role === r.id
                      ? "border-violet/60 bg-violet/10"
                      : "border-line bg-raised hover:border-white/20"
                  }`}
                >
                  <div className="font-display text-lg uppercase tracking-[0.12em] text-white">
                    {r.name}
                  </div>
                  <p className="mt-1 text-xs leading-snug text-muted">{r.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Légende main">
            <div className="flex flex-wrap gap-2">
              {LEGENDS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLegend(l)}
                  className={`rounded-card border px-3 py-1.5 font-display text-sm uppercase tracking-[0.1em] transition-colors ${
                    legend === l
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : "border-line bg-raised text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Aperçu">
            <div className="mb-3">
              <div className="font-display text-2xl uppercase tracking-[0.12em] text-white">
                {handle.trim() || "—"}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Pill tone="accent">{region}</Pill>
                <Pill tone="violet">{role}</Pill>
                <Pill>{legend}</Pill>
                <Pill>{startAge} ans</Pill>
              </div>
            </div>
            <div className="space-y-2.5">
              <StatBar label="Aim" value={roleDef.base.aim} />
              <StatBar label="Movement" value={roleDef.base.movement} />
              <StatBar label="Game sense" value={roleDef.base.gameSense} tone="violet" />
              <StatBar label="Leadership" value={roleDef.base.leadership} tone="violet" />
              <StatBar label="Mental" value={roleDef.base.mental} tone="mint" />
              <StatBar label="Notoriété" value={5} tone="mint" />
            </div>
          </Card>

          <Button
            variant="primary"
            disabled={!valid}
            className="w-full"
            onClick={() =>
              createCareer({ handle: handle.trim(), region, role, legend, startAge })
            }
          >
            Démarrer la carrière
          </Button>
          {!valid && (
            <p className="text-center text-2xs text-muted">
              Choisis un pseudo de 2 à 16 caractères.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
