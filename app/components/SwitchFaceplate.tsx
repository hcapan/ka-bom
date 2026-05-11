"use client";
import { PortSpeed } from "../lib/hardware";

type Props = {
  pid: string;
  vendor?: string;
  accessPortCount: number;
  accessPortSpeed: PortSpeed;          // ✅ widened from 4-speed union
  uplinkPortCount: number;
  uplinkPortSpeed: PortSpeed;          // ✅ widened
  rackUnits?: number;
  hasPoe?: boolean;
};

const SPEED_COLORS: Record<PortSpeed, string> = {
  "1G":   "#94a3b8",
  "2.5G": "#22c55e",
  "10G":  "#0ea5e9",
  "25G":  "#06b6d4",
  "40G":  "#7c3aed",
  "50G":  "#8b5cf6",
  "100G": "#9333ea",
  "400G": "#ec4899",
};

export default function SwitchFaceplate({
  pid,
  vendor = "CISCO",
  accessPortCount,
  accessPortSpeed,
  uplinkPortCount,
  uplinkPortSpeed,
  rackUnits = 1,
  hasPoe = false,
}: Props) {
  const PORT_W = 12;
  const PORT_H = 10;
  const PORT_GAP = 2;
  const ROW_GAP = 3;
  const PADDING = 14;
  const BRAND_W = 70;

  // Access ports in 2 rows (industry standard)
  const portsPerRow = Math.ceil(accessPortCount / 2);
  const accessSectionW = portsPerRow * (PORT_W + PORT_GAP) + 8;

  const uplinkSectionW =
    uplinkPortCount > 0 ? uplinkPortCount * (PORT_W + 4) + 12 : 0;

  const totalW = BRAND_W + accessSectionW + uplinkSectionW + PADDING * 3;
  const totalH = rackUnits * 38 + 12;

  const accessColor = SPEED_COLORS[accessPortSpeed] ?? "#94a3b8";
  const uplinkColor = SPEED_COLORS[uplinkPortSpeed] ?? "#94a3b8";

  return (
    <svg
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      style={{ display: "block" }}
    >
      {/* Chassis body */}
      <rect
        x={1}
        y={1}
        width={totalW - 2}
        height={totalH - 2}
        rx={3}
        fill="#1e293b"
        stroke="#0f172a"
        strokeWidth={1}
      />

      {/* 3D highlights */}
      <rect x={2} y={2} width={totalW - 4} height={2} fill="#334155" />
      <rect x={2} y={totalH - 4} width={totalW - 4} height={2} fill="#0a0f1c" />

      {/* Brand area (left) */}
      <g transform={`translate(${PADDING}, ${totalH / 2 - 8})`}>
        <text
          x={0}
          y={0}
          fill="#cbd5e1"
          fontSize={11}
          fontWeight={700}
          fontFamily="sans-serif"
          letterSpacing={1}
        >
          {vendor}
        </text>
        <text
          x={0}
          y={12}
          fill="#94a3b8"
          fontSize={7}
          fontFamily="monospace"
        >
          {pid}
        </text>
      </g>

      {/* Access ports — 2 rows */}
      <g
        transform={`translate(${BRAND_W + PADDING}, ${
          totalH / 2 - PORT_H - ROW_GAP / 2
        })`}
      >
        {Array.from({ length: accessPortCount }).map((_, i) => {
          const row = Math.floor(i / portsPerRow);
          const col = i % portsPerRow;
          const x = col * (PORT_W + PORT_GAP);
          const y = row * (PORT_H + ROW_GAP);
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={PORT_W}
                height={PORT_H}
                fill="#0a0f1c"
                stroke={accessColor}
                strokeWidth={0.5}
                rx={1}
              />
              {hasPoe && (
                <circle
                  cx={x + PORT_W - 2}
                  cy={y + 1.5}
                  r={0.8}
                  fill="#eab308"
                />
              )}
            </g>
          );
        })}
        <text
          x={(portsPerRow * (PORT_W + PORT_GAP)) / 2}
          y={2 * (PORT_H + ROW_GAP) + 8}
          fill={accessColor}
          fontSize={7}
          fontFamily="monospace"
          textAnchor="middle"
          fontWeight={700}
        >
          {accessPortCount}× {accessPortSpeed}
          {hasPoe ? " PoE+" : ""}
        </text>
      </g>

      {/* Divider + uplinks (only if there ARE uplinks) */}
      {uplinkPortCount > 0 && (
        <>
          <line
            x1={BRAND_W + PADDING + accessSectionW + 4}
            y1={6}
            x2={BRAND_W + PADDING + accessSectionW + 4}
            y2={totalH - 6}
            stroke="#475569"
            strokeWidth={0.5}
          />
          <g
            transform={`translate(${
              BRAND_W + PADDING + accessSectionW + 10
            }, ${totalH / 2 - 7})`}
          >
            {Array.from({ length: uplinkPortCount }).map((_, i) => (
              <rect
                key={i}
                x={i * (PORT_W + 4)}
                y={0}
                width={PORT_W + 2}
                height={14}
                fill="#0a0f1c"
                stroke={uplinkColor}
                strokeWidth={0.8}
                rx={1.5}
              />
            ))}
            <text
              x={(uplinkPortCount * (PORT_W + 4)) / 2}
              y={22}
              fill={uplinkColor}
              fontSize={7}
              fontFamily="monospace"
              textAnchor="middle"
              fontWeight={700}
            >
              {uplinkPortCount}× {uplinkPortSpeed}
            </text>
          </g>
        </>
      )}
    </svg>
  );
}