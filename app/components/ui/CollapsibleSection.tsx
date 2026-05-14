"use client";
import { useState, ReactNode } from "react";

type Props = {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
  storageKey?: string;
  /** Max height for content area before scrolling. Set to undefined for no limit. */
  maxHeight?: string;
};

export default function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  children,
  storageKey,
  maxHeight = "16rem", // default ~256px
}: Props) {
  const [open, setOpen] = useState(() => {
    if (typeof window !== "undefined" && storageKey) {
      const saved = localStorage.getItem(`collapse-${storageKey}`);
      if (saved !== null) return saved === "1";
    }
    return defaultOpen;
  });

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (storageKey && typeof window !== "undefined") {
        localStorage.setItem(`collapse-${storageKey}`, next ? "1" : "0");
      }
      return next;
    });
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <button
        onClick={toggle}
        className="w-full flex justify-between items-center cursor-pointer hover:bg-slate-50 -m-1 p-1 rounded transition-colors"
      >
        <p className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
          <span
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              open ? "bg-blue-500" : "bg-slate-300"
            }`}
          />
          {title}
          {typeof count === "number" && (
            <span className="ml-1 text-slate-400 font-normal">({count})</span>
          )}
        </p>
        <span
          className={`text-slate-400 text-xs transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      <div
        className={`grid transition-all duration-300 ${
          open ? "grid-rows-[1fr] mt-2 opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          {/* ✅ Inner scroll container */}
          <div
            className="overflow-y-auto pr-1 -mr-1 custom-scrollbar"
            style={maxHeight ? { maxHeight } : undefined}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}