// app/components/BundledEdge.tsx
import { EdgeProps, Edge, getBezierPath, EdgeLabelRenderer } from "@xyflow/react";

// 1️⃣ Define the data shape
export interface BundledEdgeData extends Record<string, unknown> {
  count: number;
  opticPid: string;
  totalBandwidthGbps: number;
  linkIds: string[];
  onExpand: (bundleId: string) => void;
}

// 2️⃣ Build a typed Edge variant — note the second generic ('bundled') matches
//    the key you registered in edgeTypes
export type BundledEdgeType = Edge<BundledEdgeData, "bundled">;

// 3️⃣ Use EdgeProps<BundledEdgeType> — NOT EdgeProps<BundledEdgeData>
export function BundledEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data,
  selected,
}: EdgeProps<BundledEdgeType>) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
  });

  // `data` may be undefined per RF types — guard it
  if (!data) return null;

  const strokeWidth = Math.min(2 + Math.log2(data.count) * 1.5, 8);

  const color =
    data.totalBandwidthGbps >= 400 ? "#a855f7" :
    data.totalBandwidthGbps >= 100 ? "#3b82f6" :
    data.totalBandwidthGbps >= 40  ? "#10b981" :
                                     "#64748b";

  return (
    <>
      <path
        id={id}
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity={selected ? 1 : 0.85}
        className="transition-all"
      />
      {/* invisible thick hitbox */}
      <path d={path} fill="none" stroke="transparent" strokeWidth={20} />

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
            className="rounded-md border bg-white px-2 py-0.5 text-xs font-semibold shadow-sm hover:bg-slate-50"
            style={{ borderColor: color, color }}
          >
            {data.count}× {formatBandwidth(data.totalBandwidthGbps)}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

function formatBandwidth(gbps: number): string {
  if (gbps >= 1000) return `${(gbps / 1000).toFixed(1)}T`;
  return `${gbps}G`;
}