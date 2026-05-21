"use client";

import type { PortSpeed } from "../../lib/hardware/types";
import {
  CHASSIS_COLORS,
  CHASSIS_SIZES,
  PORT_SPEED_COLORS,
} from "./chassisStyles";
import { LAYER_CONFIG, type DeviceType } from "../../lib/hardware/catalog";

// ─── Local type used for rendering (matches lib/types UplinkModule) ───
type UplinkModule = {
  pid: string;
  portCount: number;
  portSpeed: PortSpeed;
};

type Props = {
  pid: string;
  vendor?: string;
  accessPortCount: number;
  accessPortSpeed: PortSpeed;

  // Fixed uplinks (9300L)
  uplinkPortCount?: number;
  uplinkPortSpeed?: PortSpeed;

  // Modular uplinks (9300 / 9300X) — passed by DeviceNode
  uplinkModules?: UplinkModule[];

  rackUnits?: number;
  hasPoe?: boolean;
  hostname?: string;
  layer?: DeviceType;
  description?: string;
};

export default function SwitchFaceplate({
  pid,
  vendor = "Cisco",
  accessPortCount,
  accessPortSpeed,
  uplinkPortCount = 0,
  uplinkPortSpeed,
  uplinkModules,
  rackUnits = 1,
  hasPoe = false,
  hostname,
  layer,
  description,
}: Props) {
  const { PORT_W, PORT_H, PORT_GAP, ROW_GAP, BRAND_W, RU_HEIGHT } =
    CHASSIS_SIZES;

  const PAD = 10;
  const GAP = 12;
  const MODULE_GAP = 6;

  // ─── Determine uplink mode ──────────────────────────────────
  const hasModularUplinks = !!uplinkModules && uplinkModules.length > 0;
  const hasFixedUplinks = !hasModularUplinks && uplinkPortCount > 0;

  // ─── Access port layout ─────────────────────────────────────
  const portsPerRow = Math.ceil(accessPortCount / 2);
  const accessW = portsPerRow * (PORT_W + PORT_GAP) - PORT_GAP;

  // ─── Uplink width calculation ───────────────────────────────
  let uplinkW = 0;
  if (hasModularUplinks) {
    uplinkW = uplinkModules!.reduce((sum, mod, idx) => {
      const modW = mod.portCount * (PORT_W + 3) - 3;
      return sum + modW + (idx > 0 ? MODULE_GAP : 0);
    }, 0);
  } else if (hasFixedUplinks) {
    uplinkW = uplinkPortCount * (PORT_W + 3) - 3;
  }

  // ─── Right-side LED area ────────────────────────────────────
  const LED_AREA_W = 22;

  const totalW =
    PAD * 2 +
    BRAND_W +
    GAP +
    accessW +
    (uplinkW > 0 ? GAP + uplinkW : 0) +
    LED_AREA_W;

  const totalH = rackUnits * RU_HEIGHT + PAD * 2;

  const accessX = PAD + BRAND_W + GAP;
  const accessY = totalH / 2 - (PORT_H * 2 + ROW_GAP) / 2;
  const uplinkX = accessX + accessW + GAP;

  const accessColor =
    PORT_SPEED_COLORS[accessPortSpeed] ?? CHASSIS_COLORS.textSecondary;
  const fixedUplinkColor = uplinkPortSpeed
    ? (PORT_SPEED_COLORS[uplinkPortSpeed] ?? CHASSIS_COLORS.textSecondary)
    : CHASSIS_COLORS.textSecondary;

  const layerColor = layer ? LAYER_CONFIG[layer].color : "#0ea5e9";

  const ledX = totalW - PAD - 6;
  const ledTop = PAD + 4;

  // ─── Tooltip text ───────────────────────────────────────────
  const uplinkSummary = hasModularUplinks
    ? uplinkModules!
        .map((m) => `${m.portCount}× ${m.portSpeed} (${m.pid})`)
        .join(", ")
    : hasFixedUplinks
      ? `${uplinkPortCount}× ${uplinkPortSpeed ?? ""}`
      : "";

  const tooltipText =
    description ??
    `${pid}${hostname ? ` · ${hostname}` : ""} — ${accessPortCount}× ${accessPortSpeed}${
      hasPoe ? " PoE" : ""
    }${uplinkSummary ? ` + ${uplinkSummary}` : ""}`;

  // ─── Highest uplink speed (for SPD LED) ─────────────────────
  const speedRank: Record<string, number> = {
    "1G": 1,
    "10G": 2,
    "25G": 3,
    "40G": 4,
    "100G": 5,
  };
  const highestUplinkSpeed: PortSpeed | undefined = hasModularUplinks
    ? uplinkModules!.reduce<PortSpeed | undefined>((best, m) => {
        if (!best) return m.portSpeed;
        return (speedRank[m.portSpeed] ?? 0) > (speedRank[best] ?? 0)
          ? m.portSpeed
          : best;
      }, undefined)
    : uplinkPortSpeed;

  const spdColor = highestUplinkSpeed
    ? (PORT_SPEED_COLORS[highestUplinkSpeed] ?? accessColor)
    : accessColor;

  return (
    <div title={tooltipText} style={{ display: "inline-block", lineHeight: 0 }}>
      <svg
        width={totalW}
        height={totalH}
        viewBox={`0 0 ${totalW} ${totalH}`}
        style={{ display: "block" }}
      >
        {/* SVG filter for embossed text effect */}
        <defs>
          <filter id="emboss" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.3" />
            <feSpecularLighting
              result="specOut"
              specularConstant="0.8"
              specularExponent="20"
              lightingColor="#ffffff"
            >
              <feDistantLight azimuth="225" elevation="60" />
            </feSpecularLighting>
            <feComposite
              in="specOut"
              in2="SourceAlpha"
              operator="in"
              result="specOut"
            />
            <feComposite
              in="SourceGraphic"
              in2="specOut"
              operator="arithmetic"
              k1="0"
              k2="1"
              k3="1"
              k4="0"
            />
          </filter>
        </defs>

        {/* ========================= CHASSIS ========================= */}
        <rect
          x={0}
          y={0}
          width={totalW}
          height={totalH}
          rx={4}
          fill="#c7ccd2"
          stroke="#8e959c"
          strokeWidth={0.8}
        />
        <rect x={0} y={0} width={totalW} height={1} fill="#f4f6f8" opacity={0.7} />
        <rect
          x={0}
          y={totalH - 1}
          width={totalW}
          height={1}
          fill="#9aa3ab"
          opacity={0.5}
        />

        {/* LAYER ACCENT BAR */}
        <rect x={PAD / 2} y={2} width={3} height={totalH - 4} fill={layerColor} />

        {/* ================= VENDOR + PID + HOSTNAME ================= */}
        <g transform={`translate(${PAD}, ${PAD + 2})`}>
          <text
            fill="#1f2937"
            fontSize={7}
            fontWeight={800}
            letterSpacing={0.8}
            filter="url(#emboss)"
          >
            {vendor.toUpperCase()}
          </text>
          <text
            y={9}
            fill="#374151"
            fontSize={4.8}
            fontWeight={700}
            fontFamily="monospace"
            filter="url(#emboss)"
          >
            {pid}
          </text>
          {hostname && (
            <text
              y={16}
              fill="#1e3a8a"
              fontSize={4.8}
              fontWeight={800}
              fontFamily="monospace"
              letterSpacing={0.4}
            >
              {hostname}
            </text>
          )}
        </g>

        {/* ================= ACCESS PORTS ================= */}
        <g transform={`translate(${accessX}, ${accessY})`}>
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
                  rx={1.2}
                  fill="#9aa3ab"
                  stroke="#6b7280"
                  strokeWidth={0.4}
                />
                <rect
                  x={x + 0.6}
                  y={y + 0.6}
                  width={PORT_W - 1.2}
                  height={PORT_H - 1.2}
                  rx={1}
                  fill="#2f3640"
                />
                <rect
                  x={x + 1}
                  y={y + 1}
                  width={PORT_W - 2}
                  height={1}
                  fill={accessColor}
                  opacity={0.6}
                />
                {hasPoe && (
                  <circle cx={x + PORT_W - 1} cy={y + 1} r={0.45} fill="#22c55e" />
                )}
              </g>
            );
          })}
          <text
            x={(portsPerRow * (PORT_W + PORT_GAP)) / 2}
            y={PORT_H * 2 + 10}
            textAnchor="middle"
            fill="#374151"
            fontSize={4.5}
            fontWeight={700}
          >
            {accessPortCount} × {accessPortSpeed}
          </text>
        </g>

        {/* ================= UPLINKS — MODULAR (9300/9300X) ================= */}
        {hasModularUplinks && (
          <g transform={`translate(${uplinkX}, ${accessY})`}>
            {(() => {
              let xOffset = 0;
              return uplinkModules!.map((mod, modIdx) => {
                const modColor =
                  PORT_SPEED_COLORS[mod.portSpeed] ??
                  CHASSIS_COLORS.textSecondary;
                const modStartX = xOffset;
                const modWidth = mod.portCount * (PORT_W + 3) - 3;

                const moduleGroup = (
                  <g
                    key={`mod-${modIdx}`}
                    transform={`translate(${modStartX}, 0)`}
                  >
                    {/* Module backplate */}
                    <rect
                      x={-2}
                      y={-2}
                      width={modWidth + 4}
                      height={PORT_H + 4}
                      rx={1.5}
                      fill="#b3b9c0"
                      stroke="#6b7280"
                      strokeWidth={0.3}
                    />

                    {/* Ports */}
                    {Array.from({ length: mod.portCount }).map((_, i) => (
                      <g key={i}>
                        <rect
                          x={i * (PORT_W + 3)}
                          y={0}
                          width={PORT_W}
                          height={PORT_H}
                          rx={1.2}
                          fill="#9aa3ab"
                          stroke={modColor}
                          strokeWidth={0.5}
                        />
                        <rect
                          x={i * (PORT_W + 3) + 0.6}
                          y={0.6}
                          width={PORT_W - 1.2}
                          height={PORT_H - 1.2}
                          rx={1}
                          fill="#2f3640"
                        />
                        <rect
                          x={i * (PORT_W + 3) + 1}
                          y={1}
                          width={PORT_W - 2}
                          height={1}
                          fill={modColor}
                          opacity={0.7}
                        />
                      </g>
                    ))}

                    {/* count × speed */}
                    <text
                      x={modWidth / 2}
                      y={PORT_H + 10}
                      textAnchor="middle"
                      fill="#374151"
                      fontSize={4.5}
                      fontWeight={700}
                    >
                      {mod.portCount} × {mod.portSpeed}
                    </text>

                    {/* model PID */}
                    <text
                      x={modWidth / 2}
                      y={PORT_H + 16}
                      textAnchor="middle"
                      fill="#6b7280"
                      fontSize={3.2}
                      fontWeight={600}
                      fontFamily="monospace"
                    >
                      {mod.pid}
                    </text>
                  </g>
                );

                xOffset += modWidth + MODULE_GAP;
                return moduleGroup;
              });
            })()}
          </g>
        )}

        {/* ================= UPLINKS — FIXED (9300L) ================= */}
        {hasFixedUplinks && (
          <g transform={`translate(${uplinkX}, ${accessY})`}>
            {Array.from({ length: uplinkPortCount }).map((_, i) => (
              <g key={i}>
                <rect
                  x={i * (PORT_W + 3)}
                  y={0}
                  width={PORT_W}
                  height={PORT_H}
                  rx={1.2}
                  fill="#9aa3ab"
                  stroke={fixedUplinkColor}
                  strokeWidth={0.5}
                />
                <rect
                  x={i * (PORT_W + 3) + 0.6}
                  y={0.6}
                  width={PORT_W - 1.2}
                  height={PORT_H - 1.2}
                  rx={1}
                  fill="#2f3640"
                />
                <rect
                  x={i * (PORT_W + 3) + 1}
                  y={1}
                  width={PORT_W - 2}
                  height={1}
                  fill={fixedUplinkColor}
                  opacity={0.7}
                />
              </g>
            ))}
            <text
              x={(uplinkPortCount * (PORT_W + 3)) / 2}
              y={PORT_H + 10}
              textAnchor="middle"
              fill="#374151"
              fontSize={4.5}
              fontWeight={700}
            >
              {uplinkPortCount} × {uplinkPortSpeed ?? ""}
            </text>
            <text
              x={(uplinkPortCount * (PORT_W + 3)) / 2}
              y={PORT_H + 16}
              textAnchor="middle"
              fill="#6b7280"
              fontSize={3.2}
              fontWeight={600}
              fontFamily="monospace"
            >
              FIXED
            </text>
          </g>
        )}

        {/* ⭐ STATUS LEDs */}
        <g transform={`translate(${ledX}, ${ledTop})`}>
          <Led y={0} color="#22c55e" label="SYS" />
          {hasPoe && <Led y={9} color="#fbbf24" label="PoE" />}
          <Led y={hasPoe ? 18 : 9} color={spdColor} label="SPD" />
        </g>
      </svg>
    </div>
  );
}

// ============================================================
// LED — small glowing indicator with label
// ============================================================
function Led({
  y,
  color,
  label,
}: {
  y: number;
  color: string;
  label: string;
}) {
  return (
    <g transform={`translate(0, ${y})`}>
      <circle cx={0} cy={2.5} r={2.4} fill={color} opacity={0.25} />
      <circle cx={0} cy={2.5} r={1.4} fill={color} />
      <circle cx={-0.4} cy={2.0} r={0.4} fill="#ffffff" opacity={0.7} />
      <text
        x={3.5}
        y={3.8}
        fill="#1f2937"
        fontSize={3.2}
        fontWeight={800}
        fontFamily="monospace"
        letterSpacing={0.2}
      >
        {label}
      </text>
    </g>
  );
}