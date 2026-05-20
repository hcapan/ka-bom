"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRightIcon } from "../ui/icons";

// ──────────────────────────────────────────────────────────────────────────
// ValidationBadge
// ──────────────────────────────────────────────────────────────────────────

export type ValidationState = "ok" | "warn" | "info" | "error";

const BADGE_STYLES: Record<ValidationState, string> = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warn: "bg-amber-50 text-amber-700 ring-amber-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  error: "bg-rose-50 text-rose-700 ring-rose-200",
};

const BADGE_GLYPHS: Record<ValidationState, string> = {
  ok: "✓",
  warn: "⚠",
  info: "ℹ",
  error: "✕",
};

export function ValidationBadge({
  state,
  label,
}: {
  state: ValidationState;
  label: string;
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full px-2 py-0.5
        text-[10px] font-semibold ring-1 ring-inset
        ${BADGE_STYLES[state]}
      `}
    >
      <span aria-hidden>{BADGE_GLYPHS[state]}</span>
      {label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Accordion
// ──────────────────────────────────────────────────────────────────────────

export function Accordion({
  title,
  icon,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: ReactNode;
  badge?: { state: ValidationState; label: string };
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-slate-200 bg-white/70 backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="
          flex w-full items-center justify-between gap-2
          px-3 py-2.5 text-left
          transition-colors hover:bg-slate-50
          focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
        "
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <span className="flex items-center justify-center text-slate-500 [&>svg]:h-3.5 [&>svg]:w-3.5">
              {icon}
            </span>
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            {title}
          </span>
          {badge && <ValidationBadge state={badge.state} label={badge.label} />}
        </div>

        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.18 }}
          className="flex h-4 w-4 items-center justify-center text-slate-400"
          aria-hidden
        >
          <ChevronRightIcon size={14} strokeWidth={2.5} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-slate-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Field variants
// ──────────────────────────────────────────────────────────────────────────

/** Compact inline field — label left, control right (110px label column). */
export function FieldInline({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2">
      <label className="text-[11px] font-medium text-slate-600">{label}</label>
      <div>{children}</div>
    </div>
  );
}

/** Stacked field — label on top, control full-width (used for card pickers). */
export function FieldStacked({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[11px] font-medium text-slate-600">
          {label}
        </label>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// RadioCardGroup
// ──────────────────────────────────────────────────────────────────────────

export interface RadioCardOption {
  value: string;
  /** Primary label (e.g., "1100W AC") */
  label: string;
  /** Mono PID (e.g., "PWR-C1-1100WAC-P") */
  pid?: string;
  /** Optional sub-description */
  description?: string;
  /** Mark as default option */
  isDefault?: boolean;
  /** Optional disabled state */
  disabled?: boolean;
}

export function RadioCardGroup({
  name,
  value,
  options,
  onChange,
  icon,
}: {
  name: string;
  value: string | undefined;
  options: RadioCardOption[];
  onChange: (value: string) => void;
  /** Optional icon shown on each card (emoji or node) */
  icon?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <label
            key={opt.value}
            className={`
              group relative flex items-start gap-2.5
              rounded-lg border px-3 py-2 cursor-pointer
              transition-all
              ${
                selected
                  ? "border-sky-400 bg-sky-50/60 ring-2 ring-sky-300/40"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }
              ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              disabled={opt.disabled}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />

            {/* Icon column */}
            {icon && (
              <span className="mt-0.5 text-base text-slate-500" aria-hidden>
                {icon}
              </span>
            )}

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-semibold text-slate-800 truncate">
                  {opt.label}
                </span>
                {opt.isDefault && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-sky-600 bg-sky-100 rounded px-1 py-0.5">
                    Default
                  </span>
                )}
              </div>

              {opt.pid && (
                <div className="mt-0.5 font-mono text-[10px] text-slate-500 truncate">
                  {opt.pid}
                </div>
              )}

              {opt.description && (
                <div className="mt-0.5 text-[10px] text-slate-500 leading-snug">
                  {opt.description}
                </div>
              )}
            </div>

            {/* Selected indicator */}
            <span
              className={`
                mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center
                rounded-full border-2
                ${
                  selected
                    ? "border-sky-500 bg-sky-500"
                    : "border-slate-300 bg-white"
                }
              `}
              aria-hidden
            >
              {selected && (
                <span className="block h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
