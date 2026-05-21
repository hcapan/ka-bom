"use client";

import { memo, useState, useRef, useEffect ,useMemo} from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { StackSettingsPopover } from "./StackSettingsPopover";
import {
  layoutChildrenInGroup,
  pickColsFor,
  HEADER_H,
} from "@/app/lib/utils/groupLayout";
import { Sparkles } from "lucide-react";
import { COLLAPSED_H, COLLAPSED_W } from "@/app/lib/utils/groupLayout";

export interface GroupNodeData extends Record<string, unknown> {
  label: string;
  collapsed: boolean;
  childDeviceCount: number;
  childGroupCount: number;
  depth: number;
  color?: string;

  childDevicesSummary?: Array<{
    model: string;
    series?: string;
    portCount?: number;
  }>;

  groupKind?: "logical" | "stack";
  stackingCablePid?: string;
  stackingCableQty?: number;
  stackPowerCablePid?: string;
  stackPowerCableQty?: number;
  stackSeries?: string;
  stackMaxSize?: number;

  onToggleCollapse: (id: string) => void;
  onRename: (id: string, newLabel: string) => void;
  onDelete: (id: string) => void;
  onUpdateStack?: (id: string, patch: Partial<StackPatch>) => void;
  onConvertToLogical?: (id: string) => void;
  onTidy?: (id: string) => void;
}

export interface StackPatch {
  stackingCablePid?: string;
  stackingCableQty?: number;
  stackPowerCablePid?: string | null;
  stackPowerCableQty?: number;
}

export type GroupNodeType = Node<GroupNodeData, "group">;

const DEPTH_PALETTES = [
  {
    bg: "from-blue-500/5 to-cyan-500/5",
    border: "#3b82f6",
    glow: "shadow-blue-500/20",
    header: "from-blue-100 to-cyan-50",
  },
  {
    bg: "from-emerald-500/5 to-green-500/5",
    border: "#10b981",
    glow: "shadow-emerald-500/20",
    header: "from-emerald-100 to-green-50",
  },
  {
    bg: "from-violet-500/5 to-purple-500/5",
    border: "#8b5cf6",
    glow: "shadow-violet-500/20",
    header: "from-violet-100 to-purple-50",
  },
  {
    bg: "from-amber-500/5 to-orange-500/5",
    border: "#f59e0b",
    glow: "shadow-amber-500/20",
    header: "from-amber-100 to-orange-50",
  },
  {
    bg: "from-rose-500/5 to-pink-500/5",
    border: "#f43f5e",
    glow: "shadow-rose-500/20",
    header: "from-rose-100 to-pink-50",
  },
];

const STACK_PALETTE = {
  bg: "from-violet-500/10 via-purple-500/5 to-fuchsia-500/10",
  border: "#9333ea",
  glow: "shadow-violet-500/30",
  header: "from-violet-100 via-purple-50 to-fuchsia-100",
};

function GroupNode({ id, data, selected }: NodeProps<GroupNodeType>) {
  const {
    label,
    collapsed,
    childDeviceCount,
    childGroupCount,
    childDevicesSummary = [],
    depth,
    groupKind,
    onToggleCollapse,
  } = data;

  const isStack = data.groupKind === "stack";

  const palette = isStack
    ? STACK_PALETTE
    : DEPTH_PALETTES[Math.min(data.depth, DEPTH_PALETTES.length - 1)];

  const accent = data.color ?? palette.border;

  const [editing, setEditing] = useState(false);
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
    if (inputRef.current) {
      inputRef.current.value = data.label;
    }

    setEditing(false);
  };

  const icon = isStack ? "⚡" : "◈";

  const stackBadge = isStack ? (
    <div
      className="flex items-center gap-1 rounded-full border bg-white/80 px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm"
      style={{
        borderColor: `${accent}55`,
        color: accent,
      }}
    >
      <div
        className="h-1.5 w-1.5 rounded-full animate-pulse"
        style={{ background: accent }}
      />
      {data.childDeviceCount}/{data.stackMaxSize ?? 8}
    </div>
  ) : (
    <div className="rounded-full border-0 border-slate-200 bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-slate-600 backdrop-blur-sm">
      {data.childDeviceCount} devices
      {data.childGroupCount > 0 && ` · ${data.childGroupCount} groups`}
    </div>
  );

  // ─────────────────────────────────────
  // COLLAPSED
  // ─────────────────────────────────────

  const deviceTypeBreakdown = useMemo(() => {
    if (!data.childDevicesSummary?.length) return [];
    const counts = new Map<string, number>();
    data.childDevicesSummary.forEach((d) => {
      const key = d.model || d.series || "Unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [data.childDevicesSummary]);

  if (data.collapsed) {
    return (
      <div
        className={`
    group relative overflow-visible rounded-2xl border
    bg-white/60 backdrop-blur-xl
    shadow-lg transition-all duration-300
    ${selected ? "ring-2 ring-blue-400 ring-offset-2" : ""}
  `}
        style={{
          borderColor: `${accent}30`,
          width: 300,
          height: 140,
        }}
      >
        {/* Glow */}
        <div
          className="absolute inset-0 opacity-20 blur-2xl"
          style={{
            background: `radial-gradient(circle at top right, ${accent}, transparent 60%)`,
          }}
        />

        {/* Handles */}
        <Handle
          id="t"
          type="target"
          position={Position.Top}
          style={handleStyle(accent)}
        />
        <Handle
          id="b"
          type="source"
          position={Position.Bottom}
          style={handleStyle(accent)}
        />
        <Handle
          id="left"
          type="source"
          position={Position.Left}
          style={lateralStyle(accent)}
        />
        <Handle
          id="right"
          type="target"
          position={Position.Right}
          style={lateralStyle(accent)}
        />

        <div className="relative flex items-center gap-3 px-4 py-3">
          <button
            className="
              flex h-8 w-8 items-center justify-center
              rounded-xl border border-white/50
              bg-white/70 text-slate-700
              backdrop-blur-md
              transition hover:scale-105 hover:bg-white
            "
            onClick={() => data.onToggleCollapse(id)}
            title="Expand group"
          >
            ▶
          </button>

          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg shadow-inner"
            style={{
              background: `${accent}15`,
              color: accent,
            }}
          >
            {icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-slate-800">
              {data.label}
            </div>

            <div className="mt-0.5 text-[11px] text-slate-500">
              {isStack ? "Stack Group" : "Logical Group"}
            </div>
          </div>

          {isStack && (
            <button
              className="
                flex h-8 w-8 items-center justify-center
                rounded-xl border border-white/50
                bg-white/70 text-slate-600
                backdrop-blur-md
                transition hover:rotate-90 hover:bg-white
              "
              onClick={(e) => {
                e.stopPropagation();
                setShowStackPopover((v) => !v);
              }}
            >
              ⚙
            </button>
          )}

          {stackBadge}
        </div>

        {/* 👇 PASTE THE OVERVIEW BODY HERE 👇 */}
        <div className="relative px-4 pb-3 pt-1 space-y-1">
          {data.childDeviceCount === 0 ? (
            <div className="text-[11px] italic text-slate-400">Empty pod</div>
          ) : (
            <>
              {deviceTypeBreakdown.slice(0, 2).map(([model, count]) => (
                <div
                  key={model}
                  className="flex items-center justify-between text-[11px]"
                >
                  <span className="truncate text-slate-600">{model}</span>
                  <span
                    className="ml-2 shrink-0 font-mono"
                    style={{ color: accent }}
                  >
                    ×{count}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-3 border-t border-slate-200/60 pt-1.5 mt-1">
                <span className="font-mono text-[10px] text-slate-500">
                  {data.childDeviceCount} device 
                  {data.childDeviceCount > 1 ? "s" : ""}
                </span>
                <span>
                </span>
                {data.childGroupCount > 0 && (
                  <span className="font-mono text-[10px] text-slate-500">
                    {data.childGroupCount} sub-group
                    {data.childGroupCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        {/* 👆 END OVERVIEW BODY 👆 */}

        {isStack &&
          showStackPopover &&
          data.onUpdateStack &&
          data.onConvertToLogical && (
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
  // EXPANDED
  // ─────────────────────────────────────

  return (
    <div
      className={`
      group relative flex flex-col overflow-hidden
      rounded-3xl border
      bg-white/70 
      backdrop-blur-xl
      border-b border-slate-200/60
      shadow-2xl ${palette.glow}
      transition-all duration-300
      ${selected ? "ring-2 ring-blue-400 ring-offset-2" : ""}
    `}
      style={{
        borderColor: `${accent}55`,
        width: "100%",
        minWidth: 340,
        height: "100%",
        minHeight: data.childDeviceCount > 0 ? 320 : 220,
      }}
    >
      {/* Ambient Glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at top right, ${accent}, transparent 60%)`,
        }}
      />

      {/* Top highlight */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${accent}, transparent)`,
        }}
      />

      {/* Handles */}
      <Handle
        id="t"
        type="target"
        position={Position.Top}
        style={handleStyle(accent)}
      />
      <Handle
        id="b"
        type="source"
        position={Position.Bottom}
        style={handleStyle(accent)}
      />
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        style={lateralStyle(accent)}
      />
      <Handle
        id="right"
        type="target"
        position={Position.Right}
        style={lateralStyle(accent)}
      />

      {/* HEADER */}
      <div
        className={`
        relative flex items-center gap-3
        border-b border-white/30
        bg-linear-to-r ${palette.header}
        px-4 py-3
        backdrop-blur-xl
        shrink-0 z-10
      `}
      >
        <button
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/50 bg-white/70 text-slate-700 backdrop-blur-md transition hover:scale-105 hover:bg-white"
          onClick={() => data.onToggleCollapse(id)}
        >
          ▼
        </button>

        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-lg shadow-inner"
          style={{
            background: `${accent}15`,
            color: accent,
          }}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={inputRef}
              defaultValue={data.label}
              className="
              w-full rounded-xl border border-white/50
              bg-white/80 px-3 py-1.5
              text-sm font-bold text-slate-800
              backdrop-blur-md outline-none
              focus:border-blue-400
            "
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") cancelRename();
              }}
            />
          ) : (
            <button
              className="w-full text-left"
              onDoubleClick={() => setEditing(true)}
            >
              <div className="truncate text-sm font-bold text-slate-800">
                {data.label}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {isStack ? "Stack Infrastructure" : "Logical Container"}
              </div>
            </button>
          )}
        </div>

        {isStack && (
          <button
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/50 bg-white/70 text-slate-600 backdrop-blur-md transition hover:rotate-90 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              setShowStackPopover((v) => !v);
            }}
          >
            ⚙
          </button>
        )}

        {stackBadge}

        <button
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/50 bg-white/70 text-slate-400 backdrop-blur-md transition hover:bg-rose-50 hover:text-rose-600"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete group "${data.label}"?`)) {
              data.onDelete(id);
            }
          }}
        >
          ×
        </button>
      </div>

      {/* CONTENT (NOW FULLY STRETCHABLE) */}
      <div className="absolute flex-1 min-h-0 overflow-visible">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
      radial-gradient(circle, ${accent} 1px, transparent 1px)
    `,
            backgroundSize: "18px 18px",
            paddingTop: 82,
            paddingLeft: 24,
            paddingRight: 24,
            paddingBottom: 24,
          }}
        />

        {/* Inner soft frame */}
        <div className="absolute inset-3 rounded-2xl border border-dashed border-white/20" />
        <div className="pointer-events-none absolute inset-0">
          {data.childDeviceCount === 0 && (
            <div
              className="flex h-full items-center justify-center"
              style={{ paddingTop: HEADER_H }}
            >
              <div className="text-[11px] text-slate-400 italic">
                Drag devices here
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STACK POPOVER (unchanged logic) */}
      {isStack &&
        showStackPopover &&
        data.onUpdateStack &&
        data.onConvertToLogical && (
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
  return {
    width: 12,
    height: 12,
    background: color,
    border: "2px solid rgba(255,255,255,0.9)",
    boxShadow: `0 0 12px ${color}`,
  };
}

function lateralStyle(color: string): React.CSSProperties {
  return {
    width: 10,
    height: 10,
    background: color,
    border: "2px solid rgba(255,255,255,0.9)",
    boxShadow: `0 0 10px ${color}`,
  };
}

export default memo(GroupNode);
