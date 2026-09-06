"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/* ---------------- Card ---------------- */

export function Card({
  title,
  right,
  children,
  className = "",
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-4 ${className}`}>
      {(title || right) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="label">{title}</h2>}
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

/* ---------------- Button ---------------- */

type Variant = "primary" | "ghost" | "danger" | "violet";

const VARIANTS: Record<Variant, string> = {
  primary:
    "border-accent/50 bg-accent/15 text-accent hover:bg-accent/25 hover:border-accent",
  violet:
    "border-violet/40 bg-violet/10 text-violet hover:bg-violet/20 hover:border-violet",
  danger:
    "border-danger/40 bg-danger/10 text-danger hover:bg-danger/20 hover:border-danger",
  ghost:
    "border-line bg-raised text-white/70 hover:text-white hover:border-white/25",
};

export function Button({
  children,
  onClick,
  variant = "ghost",
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-card border px-4 py-2 font-display text-sm uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------------- StatBar ---------------- */

export function StatBar({
  label,
  value,
  max = 100,
  tone = "accent",
  delta,
}: {
  label: string;
  value: number;
  max?: number;
  tone?: "accent" | "violet" | "mint" | "danger";
  delta?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bg = {
    accent: "bg-accent",
    violet: "bg-violet",
    mint: "bg-mint",
    danger: "bg-danger",
  }[tone];

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="num text-sm text-white/90">
          {Math.round(value)}
          {delta !== undefined && delta !== 0 && (
            <span className={delta > 0 ? "ml-1 text-mint" : "ml-1 text-danger"}>
              {delta > 0 ? "+" : ""}
              {Math.round(delta)}
            </span>
          )}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className={`h-full rounded-full ${bg}`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 22 }}
        />
      </div>
    </div>
  );
}

/* ---------------- Pill / Tag ---------------- */

export function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "violet" | "mint" | "danger";
}) {
  const styles = {
    muted: "border-line text-muted",
    accent: "border-accent/40 text-accent",
    violet: "border-violet/40 text-violet",
    mint: "border-mint/40 text-mint",
    danger: "border-danger/40 text-danger",
  }[tone];
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 font-display text-2xs uppercase tracking-[0.14em] ${styles}`}
    >
      {children}
    </span>
  );
}

/* ---------------- Stat block (big number) ---------------- */

export function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "mint" | "danger";
}) {
  const color = {
    default: "text-white",
    accent: "text-accent",
    mint: "text-mint",
    danger: "text-danger",
  }[tone];
  return (
    <div className="rounded-card border border-line bg-raised px-3 py-2">
      <div className="label">{label}</div>
      <div className={`num text-xl leading-tight ${color}`}>{value}</div>
    </div>
  );
}

/* ---------------- Modal ---------------- */

export function Modal({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        className="w-full max-w-xl"
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ---------------- Section divider ---------------- */

export function Divider() {
  return <div className="my-4 h-px w-full bg-line" />;
}
