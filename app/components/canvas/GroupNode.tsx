"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";

export interface GroupNodeData extends Record<string, unknown> {
  label: string;
  collapsed: boolean;
  childDeviceCount: number;
  childGroupCount: number;
  depth: number;
  color?: string;
  onToggleCollapse: (id: string) => void;
  onRename: (id: string, newLabel: string) => void;
  onDelete: (id: string) => void;
}

export type GroupNodeType = Node<GroupNodeData, "group">;

const DEPTH_PALETTES = [
  { bg: "rgba(59, 130, 246, 0.05)", border: "#3b82f6", header: "#dbeafe" },
  { bg: "rgba(16, 185, 129, 0.05)", border: "#10b981", header: "#d1fae5" },
  { bg: "rgba(168, 85, 247, 0.05)", border: "#a855f7", header: "#ede9fe" },
  { bg: "rgba(245, 158, 11, 0.05)", border: "#f59e0b", header: "#fef3c7" },
  { bg: "rgba(244, 63, 94, 0.05)", border: "#f43f5e", header: "#ffe4e6" },
];

function GroupNode({ id, data, selected }: NodeProps<GroupNodeType>) {
  const palette = DEPTH_PALETTES[Math.min(data.depth, DEPTH_PALETTES.length - 1)];
  const accent = data.color ?? palette.border;
  const [editing, setEditing] = useState(false);

  // ✨ Just track the input element; read its value when needed.
  // Don't mirror data.label into a useState + useEffect.
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitRename = () => {
    const trimmed = inputRef.current?.value.trim() ?? "";
    if (trimmed && trimmed !== data.label) {
      data.onRename(id, trimmed);
    }
    setEditing(false);
  };

  const cancelRename = () => {
    if (inputRef.current) inputRef.current.value = data.label;
    setEditing(false);
  };

  // ─────────────────────────────────────
  // COLLAPSED VIEW
  // ─────────────────────────────────────
  if (data.collapsed) {
    return (
      <div
        className={`relative rounded-lg border-2 shadow-md transition ${
          selected ? "ring-2 ring-offset-2 ring-blue-400" : ""
        }`}
        style={{
          background: palette.header,
          borderColor: accent,
          minWidth: 260,
          padding: "10px 14px",
        }}
      >
        <Handle id="t" type="target" position={Position.Top} style={handleStyle(accent)} />
        <Handle id="b" type="source" position={Position.Bottom} style={handleStyle(accent)} />
        <Handle id="left" type="source" position={Position.Left} style={lateralStyle("#f59e0b")} />
        <Handle id="right" type="target" position={Position.Right} style={lateralStyle("#f59e0b")} />

        <div className="flex items-center gap-2">
          <button
            className="flex h-6 w-6 items-center justify-center rounded text-slate-700 hover:bg-white/70"
            onClick={() => data.onToggleCollapse(id)}
            title="Expand group"
          >
            ▶
          </button>
          <span className="text-base">📦</span>
          <span className="flex-1 truncate font-semibold text-slate-800">
            {data.label}
          </span>
          <span className="rounded-full border bg-white/80 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {data.childDeviceCount} dev
            {data.childGroupCount > 0 && ` · ${data.childGroupCount} sub`}
          </span>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────
  // EXPANDED VIEW
  // ─────────────────────────────────────
  return (
    <div
      className={`relative rounded-lg border-2 transition ${
        selected ? "ring-2 ring-offset-2 ring-blue-400" : ""
      }`}
      style={{
        background: palette.bg,
        borderColor: accent,
        borderStyle: "dashed",
        width: "100%",
        height: "100%",
        minWidth: 320,
        minHeight: 200,
      }}
    >
      <Handle id="t" type="target" position={Position.Top} style={handleStyle(accent)} />
      <Handle id="b" type="source" position={Position.Bottom} style={handleStyle(accent)} />
      <Handle id="left" type="source" position={Position.Left} style={lateralStyle("#f59e0b")} />
      <Handle id="right" type="target" position={Position.Right} style={lateralStyle("#f59e0b")} />

      <div
        className="flex items-center gap-2 rounded-t-md border-b px-3 py-2"
        style={{ background: palette.header, borderColor: `${accent}55` }}
      >
        <button
          className="flex h-5 w-5 items-center justify-center rounded text-slate-700 hover:bg-white/70"
          onClick={() => data.onToggleCollapse(id)}
          title="Collapse group"
        >
          ▼
        </button>

        <span className="text-sm leading-none">📦</span>

        {editing ? (
          // ✨ Uncontrolled input — `key` forces fresh mount when data.label
          //    changes externally. defaultValue seeds it once.
          <input
            key={data.label}
            ref={inputRef}
            defaultValue={data.label}
            className="flex-1 rounded border bg-white px-1.5 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") cancelRename();
            }}
          />
        ) : (
          <button
            className="flex-1 truncate text-left text-sm font-semibold text-slate-800 hover:underline"
            onDoubleClick={() => setEditing(true)}
            title="Double-click to rename"
          >
            {data.label}
          </button>
        )}

        <span className="rounded-full border bg-white/70 px-2 py-0.5 text-[10px] font-bold text-slate-600">
          {data.childDeviceCount} dev
          {data.childGroupCount > 0 && ` · ${data.childGroupCount} sub`}
        </span>

        <button
          className="ml-1 flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-white/70 hover:text-rose-600"
          onClick={(e) => {
            e.stopPropagation();
            if (
              confirm(
                `Delete group "${data.label}"? Children will be detached, not deleted.`
              )
            ) {
              data.onDelete(id);
            }
          }}
          title="Delete group"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function handleStyle(color: string): React.CSSProperties {
  return { width: 10, height: 10, background: color, border: "2px solid white" };
}

function lateralStyle(color: string): React.CSSProperties {
  return { width: 8, height: 8, background: color, border: "2px solid white" };
}

export default memo(GroupNode);