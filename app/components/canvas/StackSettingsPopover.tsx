"use client";

import { useEffect, useRef } from "react";
import {
  getStackingCablesForSeries,
  getStackPowerCablesForSeries,
} from "@/app/lib/hardware/catalog";
import { StackPatch } from "./GroupNode";

interface StackSettingsPopoverProps {
  groupId: string;
  label: string;
  series: string;
  memberCount: number;
  maxSize: number;
  stackingCablePid?: string;
  stackingCableQty?: number;
  stackPowerCablePid?: string;
  stackPowerCableQty?: number;
  onUpdate: (patch: Partial<StackPatch>) => void;
  onConvertToLogical: () => void;
  onClose: () => void;
}

export function StackSettingsPopover({
  label,
  series,
  memberCount,
  maxSize,
  stackingCablePid,
  stackingCableQty,
  stackPowerCablePid,
  stackPowerCableQty,
  onUpdate,
  onConvertToLogical,
  onClose,
}: StackSettingsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    // Defer one tick so the click that opened the popover doesn't immediately close it
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const dataCables = getStackingCablesForSeries(series);
  const powerCables = getStackPowerCablesForSeries(series);
  const stackPowerSupported = powerCables.length > 0;
  const stackPowerEnabled = !!stackPowerCablePid;

  const cableQty = stackingCableQty ?? memberCount;
  const powerQty = stackPowerCableQty ?? memberCount;

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 w-80 rounded-lg border border-slate-300 bg-white shadow-xl"
      style={{
        bottom: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Arrow pointing down */}
      <div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-b border-r border-slate-300 bg-white"
        aria-hidden
      />

      <div className="border-b border-slate-200 bg-purple-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📚</span>
            <span className="text-sm font-semibold text-slate-900">{label}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-3 text-sm">
        {/* Series + member count */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Series</span>
            <span className="font-mono text-slate-700">{series}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Members</span>
            <span className="font-mono text-slate-700">
              {memberCount} / {maxSize}
            </span>
          </div>
        </div>

        {/* Stacking cable */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Stacking Cable
          </label>
          <select
            value={stackingCablePid ?? ""}
            onChange={(e) => onUpdate({ stackingCablePid: e.target.value })}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
          >
            {dataCables.length === 0 ? (
              <option value="">No cables found in catalog</option>
            ) : (
              dataCables.map((c) => (
                <option key={c.pid} value={c.pid}>
                  {c.pid} — {c.length}
                </option>
              ))
            )}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Qty:</label>
            <input
              type="number"
              min={1}
              max={maxSize}
              value={cableQty}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                onUpdate({ stackingCableQty: Number.isFinite(v) ? v : undefined });
              }}
              className="w-16 rounded border border-slate-300 px-2 py-0.5 text-xs"
            />
            <span className="text-[10px] text-slate-400">
              ring topology default: {memberCount}
            </span>
          </div>
        </div>

        {/* StackPower */}
        {stackPowerSupported && (
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <input
                type="checkbox"
                checked={stackPowerEnabled}
                onChange={(e) => {
                  if (e.target.checked) {
                    // Enable: pick first available cable
                    onUpdate({
                      stackPowerCablePid: powerCables[0]?.pid,
                      stackPowerCableQty: memberCount,
                    });
                  } else {
                    // Disable: clear
                    onUpdate({ stackPowerCablePid: null });
                  }
                }}
              />
              StackPower
            </label>
            {stackPowerEnabled && (
              <>
                <select
                  value={stackPowerCablePid ?? ""}
                  onChange={(e) => onUpdate({ stackPowerCablePid: e.target.value })}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  {powerCables.map((c) => (
                    <option key={c.pid} value={c.pid}>
                      {c.pid} — {c.length}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Qty:</label>
                  <input
                    type="number"
                    min={1}
                    max={maxSize}
                    value={powerQty}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      onUpdate({
                        stackPowerCableQty: Number.isFinite(v) ? v : undefined,
                      });
                    }}
                    className="w-16 rounded border border-slate-300 px-2 py-0.5 text-xs"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {!stackPowerSupported && (
          <div className="rounded bg-slate-50 px-2 py-1.5 text-[11px] text-slate-500">
            ℹ {series} does not support StackPower.
          </div>
        )}

        {/* Convert back to logical */}
        <div className="border-t border-slate-200 pt-3">
          <button
            onClick={() => {
              if (
                confirm(
                  `Convert "${label}" back to a logical group? Stacking cables will be removed from the BOM.`
                )
              ) {
                onConvertToLogical();
              }
            }}
            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Convert to logical group
          </button>
        </div>
      </div>
    </div>
  );
}