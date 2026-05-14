"use client";
import { ReactNode, useEffect, useRef, useState, useLayoutEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  width?: number | "auto";
  maxHeight?: number | string;
  title: string;
  children: ReactNode;
};

type Position = { top: number; left: number };

// Use layoutEffect on client, plain useEffect on server (avoids SSR warning)
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function FloatingPanel({
  open,
  onClose,
  anchorRef,
  width = 360,
  maxHeight = "70vh",
  title,
  children,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({ top: 60, left: 16 });

  // ✅ Compute position AFTER mount, not during render
  useIsoLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) {
        setPosition({
          top: rect.bottom + 8,
          left: rect.left,
        });
      }
    };
    updatePosition();

    // Reposition on window resize/scroll
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };
    const id = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
  }, [open, onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const style: React.CSSProperties = {
    position: "fixed",
    top: position.top,
    left: position.left,
    width: width === "auto" ? undefined : width,
    maxHeight,
    zIndex: 50,
  };

  return (
    <div
      ref={panelRef}
      style={style}
      className="bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 text-sm font-bold"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {children}
      </div>
    </div>
  );
}