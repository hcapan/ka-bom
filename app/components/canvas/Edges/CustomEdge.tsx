"use client";
import {
  getBezierPath,
  useStore,
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  type ReactFlowState,
} from "@xyflow/react";
import { getEdgeTheme } from "./edgeTheme";

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
  selected,
  data,
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

  // Resolve speed from data.speed (if provided) — falls back to 1G
  const speed = (data as { speed?: string } | undefined)?.speed;
  const theme = getEdgeTheme(speed);

  // Allow inline style overrides to win over theme
  const resolvedStroke = (style.stroke as string) ?? theme.color;
  const resolvedWidth = (style.strokeWidth as number) ?? theme.strokeWidth;

  const edgePathParams = {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  };

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
    labelY = labelY + offset / 2;
  }

  const isLateralLink =
    (sourcePosition === "left" || sourcePosition === "right") &&
    (targetPosition === "left" || targetPosition === "right");

  // Lateral links keep their amber override (semantic signal)
  const finalStroke = isLateralLink ? "#f59e0b" : resolvedStroke;
  const finalWidth = isLateralLink ? Math.max(resolvedWidth, 3) : resolvedWidth;

  // Selection adds glow + slight width bump
  const selectionGlow = selected
    ? `drop-shadow(0 0 6px ${finalStroke})`
    : undefined;

  return (
    <>
      {/* Invisible hover hitbox for easier click target */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
      />

      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: finalStroke,
          strokeWidth: selected ? finalWidth + 0.5 : finalWidth,
          strokeDasharray: animated || selected ? "6 4" : undefined,
          filter: selectionGlow,
          transition: "stroke-width 150ms ease, filter 150ms ease",
        }}
      />

      {(animated || selected) && (
        <path
          d={path}
          fill="none"
          stroke={finalStroke}
          strokeWidth={finalWidth}
          strokeDasharray={isLateralLink ? "8 4" : "6 4"}
          style={{
            animation: "rf-dash 1s linear infinite",
            pointerEvents: "none",
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
              border: `1px solid ${finalStroke}33`,
              borderRadius: 8,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 700,
              color: finalStroke,
              pointerEvents: "all",
              boxShadow: "0 2px 6px -2px rgba(15,23,42,0.15)",
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