"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { StackSettingsPopover } from "./StackSettingsPopover";

// ⭐ STACK: data shape now carries optional stack metadata
export interface GroupNodeData extends Record<string, unknown> {
  label: string;
  collapsed: boolean;
  childDeviceCount: number;
  childGroupCount: number;
  depth: number;
  color?: string;

  // ⭐ STACK fields (only present when groupKind === "stack")
  groupKind?: "logical" | "stack";
  stackingCablePid?: string;
  stackingCableQty?: number;
  stackPowerCablePid?: string;
  stackPowerCableQty?: number;
  stackSeries?: string;
  stackMaxSize?: number;

  // Callbacks
  onToggleCollapse: (id: string) => void;
  onRename: (id: string, newLabel: string) => void;
  onDelete: (id: string) => void;
  onUpdateStack?: (id: string, patch: Partial<StackPatch>) => void;
  onConvertToLogical?: (id: string) => void;
}

export interface StackPatch {
  stackingCablePid?: string;
  stackingCableQty?: number;
  stackPowerCablePid?: string | null;
  stackPowerCableQty?: number;
}

export type GroupNodeType = Node<GroupNodeData, "group">;

const DEPTH_PALETTES = [
  { bg: "rgba(59, 130, 246, 0.05)", border: "#3b82f6", header: "#dbeafe" },
  { bg: "rgba(16, 185, 129, 0.05)", border: "#10b981", header: "#d1fae5" },
  { bg: "rgba(168, 85, 247, 0.05)", border: "#a855f7", header: "#ede9fe" },
  { bg: "rgba(245, 158, 11, 0.05)", border: "#f59e0b", header: "#fef3c7" },
  { bg: "rgba(244, 63, 94, 0.05)", border: "#f43f5e", header: "#ffe4e6" },
];

// ⭐ STACK: a stack always uses a distinct purple palette for instant recognition
const STACK_PALETTE = {
  bg: "rgba(168, 85, 247, 0.08)",
  border: "#9333ea",
  header: "#f3e8ff",
};

function GroupNode({ id, data, selected }: NodeProps<GroupNodeType>) {
  const isStack = data.groupKind === "stack";
  const palette = isStack
    ? STACK_PALETTE
    : DEPTH_PALETTES[Math.min(data.depth, DEPTH_PALETTES.length - 1)];
  const accent = data.color ?? palette.border;
  const [editing, setEditing] = useState(false);

  // ⭐ STACK: popover state
  const [showStackPopover, setShowStackPopover] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

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

  // ⭐ STACK: icon + count badge for stacks
  const icon = isStack ? "📚" : "📦";
  const stackBadge = isStack ? (
    <span
      className="rounded-full border bg-white/80 px-2 py-0.5 text-[10px] font-bold"
      style={{ color: STACK_PALETTE.border, borderColor: STACK_PALETTE.border }}
    >
      {data.childDeviceCount}/{data.stackMaxSize ?? 8}
    </span>
  ) : (
    <span className="rounded-full border bg-white/80 px-2 py-0.5 text-[10px] font-bold text-slate-600">
      {data.childDeviceCount} dev
      {data.childGroupCount > 0 && ` · ${data.childGroupCount} sub`}
    </span>
  );

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
          minWidth: 280,
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
          <span className="text-base">{icon}</span>
          <span className="flex-1 truncate font-semibold text-slate-800">
            {data.label}
          </span>

          {/* ⭐ STACK: settings cog (only for stacks) */}
          {isStack && (
            <button
              className="flex h-5 w-5 items-center justify-center rounded text-slate-600 hover:bg-white/70"
              onClick={(e) => {
                e.stopPropagation();
                setShowStackPopover((v) => !v);
              }}
              title="Stack settings"
            >
              ⚙
            </button>
          )}

          {stackBadge}
        </div>

        {/* ⭐ STACK: popover */}
        {isStack && showStackPopover && data.onUpdateStack && data.onConvertToLogical && (
          <StackSettingsPopover
            groupId={id}
            label={data.label}
            series={data.stackSeries ?? "Unknown series"}
            memberCount={data.childDeviceCount}
            maxSize={data.stackMaxSize ?? 8}
            stackingCablePid={data.stackingCablePid}
            stackingCableQty={data.stackingCableQty}
            stackPowerCablePid={data.stackPowerCablePid}
            stackPowerCableQty={data.stackPowerCableQty}
            onUpdate={(patch) => data.onUpdateStack!(id, patch)}
            onConvertToLogical={() => {
              data.onConvertToLogical!(id);
              setShowStackPopover(false);
            }}
            onClose={() => setShowStackPopover(false)}
          />
        )}
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

        <span className="text-sm leading-none">{icon}</span>

        {editing ? (
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

        {/* ⭐ STACK: cog button */}
        {isStack && (
          <button
            className="flex h-5 w-5 items-center justify-center rounded text-slate-600 hover:bg-white/70"
            onClick={(e) => {
              e.stopPropagation();
              setShowStackPopover((v) => !v);
            }}
            title="Stack settings"
          >
            ⚙
          </button>
        )}

        {stackBadge}

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

      {/* ⭐ STACK: popover (anchored above the header) */}
      {isStack && showStackPopover && data.onUpdateStack && data.onConvertToLogical && (
        <StackSettingsPopover
          groupId={id}
          label={data.label}
          series={data.stackSeries ?? "Unknown series"}
          memberCount={data.childDeviceCount}
          maxSize={data.stackMaxSize ?? 8}
          stackingCablePid={data.stackingCablePid}
          stackingCableQty={data.stackingCableQty}
          stackPowerCablePid={data.stackPowerCablePid}
          stackPowerCableQty={data.stackPowerCableQty}
          onUpdate={(patch) => data.onUpdateStack!(id, patch)}
          onConvertToLogical={() => {
            data.onConvertToLogical!(id);
            setShowStackPopover(false);
          }}
          onClose={() => setShowStackPopover(false)}
        />
      )}
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