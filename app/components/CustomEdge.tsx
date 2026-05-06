"use client";
import {
  getBezierPath,
  useStore,
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  type ReactFlowState,
} from "@xyflow/react";

type GetSpecialPathParams = {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
};

const getSpecialPath = (
  { sourceX, sourceY, targetX, targetY }: GetSpecialPathParams,
  offset: number
) => {
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;
  return `M ${sourceX} ${sourceY} Q ${centerX} ${
    centerY + offset
  } ${targetX} ${targetY}`;
};

export default function CustomEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  label,
  animated,
  style = {},
}: EdgeProps) {
  // Find all edges between the same node pair (regardless of direction)
  const { edgeIndex, edgeCount } = useStore((s: ReactFlowState) => {
    const sameLinks = s.edges.filter(
      (e) =>
        (e.source === source && e.target === target) ||
        (e.source === target && e.target === source)
    );
    const idx = sameLinks.findIndex((e) => e.id === id);
    return { edgeIndex: idx, edgeCount: sameLinks.length };
  });

  const edgePathParams = {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  };

  // Compute offset: center the bundle around 0
  // 1 edge → [0]
  // 2 edges → [-30, 30]
  // 3 edges → [-60, 0, 60]
  // 4 edges → [-90, -30, 30, 90]
  const SPREAD = 60;
  const offset =
    edgeCount > 1 ? (edgeIndex - (edgeCount - 1) / 2) * SPREAD : 0;

  let path = "";
  let labelX = (sourceX + targetX) / 2;
  let labelY = (sourceY + targetY) / 2;

  if (offset === 0) {
    const [bezierPath, lx, ly] = getBezierPath(edgePathParams);
    path = bezierPath;
    labelX = lx;
    labelY = ly;
  } else {
    path = getSpecialPath(edgePathParams, offset);
    labelY = labelY + offset / 2; // approximate label position on the curve
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeDasharray: animated ? "6 4" : undefined,
        }}
      />
      {animated && (
        <path
          d={path}
          fill="none"
          stroke={(style.stroke as string) ?? "#7c3aed"}
          strokeWidth={(style.strokeWidth as number) ?? 2}
          strokeDasharray="6 4"
          style={{
            animation: "rf-dash 1s linear infinite",
          }}
        />
      )}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 700,
              color: (style.stroke as string) ?? "#0f172a",
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
      <style>{`
        @keyframes rf-dash {
          to { stroke-dashoffset: -20; }
        }
      `}</style>
    </>
  );
}