// app/components/BundledEdge.tsx
import {
  EdgeProps,
  Edge,
  getBezierPath,
  EdgeLabelRenderer,
} from "@xyflow/react";
import { getThemeForBandwidth } from "./edgeTheme";

export interface BundledEdgeData extends Record<string, unknown> {
  count: number;
  opticPid: string;
  totalBandwidthGbps: number;
  linkIds: string[];
  onExpand: (bundleId: string) => void;
}

export type BundledEdgeType = Edge<BundledEdgeData, "bundled">;

export function BundledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<BundledEdgeType>) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  if (!data) return null;

  // Aligned with shared theme palette
  const theme = getThemeForBandwidth(data.totalBandwidthGbps);
  const color = theme.color;

  // Stroke scales by bundle count (kept your original log curve, capped)
  const strokeWidth = Math.min(2 + Math.log2(data.count) * 1.5, 8);

  return (
    <>
      {/* Invisible hover hitbox */}
      <path d={path} fill="none" stroke="transparent" strokeWidth={20} />

      <path
        id={id}
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={selected ? strokeWidth + 0.5 : strokeWidth}
        strokeOpacity={selected ? 1 : 0.85}
        strokeDasharray={selected ? "8 4" : undefined}
        style={{
          filter: selected ? `drop-shadow(0 0 6px ${color})` : undefined,
          transition: "stroke-width 150ms ease, filter 150ms ease",
          animation: selected ? "rf-dash 1s linear infinite" : undefined,
        }}
        className="transition-all"
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          className="cursor-pointer select-none"
          onClick={() => data.onExpand(id)}
          title={`${data.count} × ${data.opticPid} — click to expand`}
        >
          <div
            className="
              rounded-md border bg-white px-2 py-0.5
              text-xs font-semibold
              shadow-[0_2px_6px_-2px_rgba(15,23,42,0.18)]
              transition-all
              hover:scale-105 hover:shadow-md
            "
            style={{ borderColor: color, color }}
          >
            {data.count}×{" "}
            {formatBandwidth(
              data.count > 0
                ? data.totalBandwidthGbps / data.count
                : data.totalBandwidthGbps,
            )}
          </div>
        </div>
      </EdgeLabelRenderer>

      <style>{`
        @keyframes rf-dash {
          to { stroke-dashoffset: -20; }
        }
      `}</style>
    </>
  );
}

function formatBandwidth(gbps: number): string {
  if (gbps >= 1000) return `${(gbps / 1000).toFixed(1)}T`;
  return `${gbps}G`;
}
