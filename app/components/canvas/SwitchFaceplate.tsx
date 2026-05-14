"use client";
import { PortSpeed } from "../../lib/hardware/catalog";

type Props = {
  pid: string;
  vendor?: string;
  accessPortCount: number;
  accessPortSpeed: PortSpeed;
  uplinkPortCount: number;
  uplinkPortSpeed: PortSpeed;
  rackUnits?: number;
  hasPoe?: boolean;
};

const SPEED_COLORS: Record<PortSpeed, string> = {
  "1G": "#94a3b8",
  "2.5G": "#22c55e",
  "10G": "#0ea5e9",
  "25G": "#06b6d4",
  "40G": "#7c3aed",
  "50G": "#8b5cf6",
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
  // ✨ All numbers shrunk ~50% from your previous version
  const PORT_W = 5;       // ↓ was 10
  const PORT_H = 4;       // ↓ was 8
  const PORT_GAP = 1;     // ↓ was 2
  const ROW_GAP = 1.5;    // ↓ was 3
  const PADDING = 7;      // ↓ was 14
  const BRAND_W = 38;     // ↓ was 70
  const RU_HEIGHT = 20;   // ↓ was 38

  const portsPerRow = Math.ceil(accessPortCount / 2);
  const accessSectionW = portsPerRow * (PORT_W + PORT_GAP) + 4;
  const uplinkSectionW =
    uplinkPortCount > 0 ? uplinkPortCount * (PORT_W + 2) + 6 : 0;

  const totalW = BRAND_W + accessSectionW + uplinkSectionW + PADDING * 3;
  const totalH = rackUnits * RU_HEIGHT + 6;

  const accessColor = SPEED_COLORS[accessPortSpeed] ?? "#94a3b8";
  const uplinkColor = SPEED_COLORS[uplinkPortSpeed] ?? "#94a3b8";

  return (
    <svg
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      style={{ display: "block" }}  // ✅ NO scale transform
    >
      <rect
        x={0.5}
        y={0.5}
        width={totalW - 1}
        height={totalH - 1}
        rx={2}
        fill="#1e293b"
        stroke="#0f172a"
        strokeWidth={0.5}
      />
      <rect x={1} y={1} width={totalW - 2} height={1} fill="#334155" />
      <rect x={1} y={totalH - 2} width={totalW - 2} height={1} fill="#0a0f1c" />

      {/* Brand */}
      <g transform={`translate(${PADDING}, ${totalH / 2 - 5})`}>
        <text
          x={0}
          y={0}
          fill="#cbd5e1"
          fontSize={6}
          fontWeight={700}
          fontFamily="sans-serif"
          letterSpacing={0.5}
        >
          {vendor}
        </text>
        <text x={0} y={7} fill="#94a3b8" fontSize={4} fontFamily="monospace">
          {pid}
        </text>
      </g>

      {/* Access ports */}
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
                strokeWidth={0.3}
                rx={0.5}
              />
              {hasPoe && (
                <circle
                  cx={x + PORT_W - 1}
                  cy={y + 0.8}
                  r={0.4}
                  fill="#eab308"
                />
              )}
            </g>
          );
        })}
        <text
          x={(portsPerRow * (PORT_W + PORT_GAP)) / 2}
          y={2 * (PORT_H + ROW_GAP) + 5}
          fill={accessColor}
          fontSize={4.5}
          fontFamily="monospace"
          textAnchor="middle"
          fontWeight={700}
        >
          {accessPortCount}× {accessPortSpeed}
          {hasPoe ? " PoE+" : ""}
        </text>
      </g>

      {/* Uplinks */}
      {uplinkPortCount > 0 && (
        <>
          <line
            x1={BRAND_W + PADDING + accessSectionW + 2}
            y1={3}
            x2={BRAND_W + PADDING + accessSectionW + 2}
            y2={totalH - 3}
            stroke="#475569"
            strokeWidth={0.3}
          />
          <g
            transform={`translate(${
              BRAND_W + PADDING + accessSectionW + 5
            }, ${totalH / 2 - 4})`}
          >
            {Array.from({ length: uplinkPortCount }).map((_, i) => (
              <rect
                key={i}
                x={i * (PORT_W + 2)}
                y={0}
                width={PORT_W + 1}
                height={8}
                fill="#0a0f1c"
                stroke={uplinkColor}
                strokeWidth={0.5}
                rx={0.7}
              />
            ))}
            <text
              x={(uplinkPortCount * (PORT_W + 2)) / 2}
              y={13}
              fill={uplinkColor}
              fontSize={4.5}
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