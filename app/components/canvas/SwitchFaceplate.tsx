"use client";

import type { PortSpeed } from "../../lib/hardware/types";
import {
  CHASSIS_COLORS,
  CHASSIS_SIZES,
  PORT_SPEED_COLORS,
} from "./chassisStyles";
import { LAYER_CONFIG, type DeviceType } from "../../lib/hardware/catalog";

type Props = {
  pid: string;
  vendor?: string;
  accessPortCount: number;
  accessPortSpeed: PortSpeed;
  uplinkPortCount: number;
  uplinkPortSpeed: PortSpeed;
  rackUnits?: number;
  hasPoe?: boolean;
  // ⭐ NEW props
  hostname?: string;
  layer?: DeviceType;
  description?: string;
};

export default function SwitchFaceplate({
  pid,
  vendor = "Cisco",
  accessPortCount,
  accessPortSpeed,
  uplinkPortCount,
  uplinkPortSpeed,
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

  const portsPerRow = Math.ceil(accessPortCount / 2);
  const accessW = portsPerRow * (PORT_W + PORT_GAP) - PORT_GAP;

  const uplinkW =
    uplinkPortCount > 0 ? uplinkPortCount * (PORT_W + 3) - 3 : 0;

  // ⭐ Reserve space on the right for status LEDs
  const LED_AREA_W = 22;

  const totalW =
    PAD * 2 +
    BRAND_W +
    GAP +
    accessW +
    (uplinkPortCount ? GAP + uplinkW : 0) +
    LED_AREA_W;

  const totalH = rackUnits * RU_HEIGHT + PAD * 2;

  const accessX = PAD + BRAND_W + GAP;
  const accessY = totalH / 2 - (PORT_H * 2 + ROW_GAP) / 2;

  const uplinkX = accessX + accessW + GAP;

  const accessColor =
    PORT_SPEED_COLORS[accessPortSpeed] ?? CHASSIS_COLORS.textSecondary;
  const uplinkColor =
    PORT_SPEED_COLORS[uplinkPortSpeed] ?? CHASSIS_COLORS.textSecondary;

  // ⭐ Layer accent — fall back to vendor cyan if layer unknown
  const layerColor = layer ? LAYER_CONFIG[layer].color : "#0ea5e9";

  // ⭐ LED column position (right edge)
  const ledX = totalW - PAD - 6;
  const ledTop = PAD + 4;

  // ⭐ Tooltip text
  const tooltipText =
    description ??
    `${pid}${hostname ? ` · ${hostname}` : ""} — ${accessPortCount}× ${accessPortSpeed}${
      hasPoe ? " PoE" : ""
    }${uplinkPortCount > 0 ? ` + ${uplinkPortCount}× ${uplinkPortSpeed}` : ""}`;

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

        {/* =========================
            CISCO HARDWARE CHASSIS
            ========================= */}
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

        {/* top metal highlight */}
        <rect
          x={0}
          y={0}
          width={totalW}
          height={1}
          fill="#f4f6f8"
          opacity={0.7}
        />

        {/* bottom shadow */}
        <rect
          x={0}
          y={totalH - 1}
          width={totalW}
          height={1}
          fill="#9aa3ab"
          opacity={0.5}
        />

        {/* ⭐ #3 LAYER ACCENT BAR (replaces the flat brand strip) */}
        <rect x={PAD / 2} y={2} width={3} height={totalH - 4} fill={layerColor} />

        {/* ================= VENDOR + PID + HOSTNAME ================= */}
        <g transform={`translate(${PAD}, ${PAD + 2})`}>
          {/* Vendor (embossed) */}
          <text
            fill="#1f2937"
            fontSize={7}
            fontWeight={800}
            letterSpacing={0.8}
            filter="url(#emboss)"
          >
            {vendor.toUpperCase()}
          </text>

          {/* PID (embossed, monospace) */}
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

          {/* ⭐ #8 HOSTNAME (only when provided) */}
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
                {/* port cavity */}
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
                {/* inner port slot */}
                <rect
                  x={x + 0.6}
                  y={y + 0.6}
                  width={PORT_W - 1.2}
                  height={PORT_H - 1.2}
                  rx={1}
                  fill="#2f3640"
                />
                {/* speed LED hint */}
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

        {/* ================= UPLINKS ================= */}
        {uplinkPortCount > 0 && (
          <g transform={`translate(${uplinkX}, ${accessY})`}>
            {Array.from({ length: uplinkPortCount }).map((_, i) => (
              <rect
                key={i}
                x={i * (PORT_W + 4)}
                y={0}
                width={PORT_W}
                height={PORT_H}
                rx={1.2}
                fill="#9aa3ab"
                stroke={uplinkColor}
                strokeWidth={0.5}
              />
            ))}
            <text
              x={(uplinkPortCount * (PORT_W + 4)) / 2}
              y={PORT_H + 10}
              textAnchor="middle"
              fill="#374151"
              fontSize={4.5}
              fontWeight={700}
            >
              {uplinkPortCount} × {uplinkPortSpeed}
            </text>
          </g>
        )}

        {/* ⭐ #1 STATUS LEDs (right edge column) */}
        <g transform={`translate(${ledX}, ${ledTop})`}>
          {/* SYS — solid green = system OK */}
          <Led y={0} color="#22c55e" label="SYS" />

          {/* PoE — amber when device has PoE capability */}
          {hasPoe && <Led y={9} color="#fbbf24" label="PoE" />}

          {/* SPD — neutral; reflects highest configured speed */}
          <Led
            y={hasPoe ? 18 : 9}
            color={accessColor}
            label="SPD"
          />
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
      {/* outer glow */}
      <circle cx={0} cy={2.5} r={2.4} fill={color} opacity={0.25} />
      {/* core LED */}
      <circle cx={0} cy={2.5} r={1.4} fill={color} />
      {/* tiny highlight (specular) */}
      <circle cx={-0.4} cy={2.0} r={0.4} fill="#ffffff" opacity={0.7} />
      {/* label */}
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