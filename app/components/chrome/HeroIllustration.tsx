"use client"

import { motion } from "framer-motion"

export default function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 1100 700"
      className="w-full h-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ================= DARK HOLOGRAPHIC BASE ================= */}
      <defs>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.22" />
          <stop offset="40%" stopColor="#3B82F6" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="ringGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>

      <rect width="1100" height="700" fill="#04060F" />
      <circle cx="550" cy="350" r="300" fill="url(#coreGlow)" />

      {/* ================= CENTRAL HOLOGRAM CORE ================= */}
      <motion.circle
        cx="550"
        cy="350"
        r="90"
        stroke="url(#ringGlow)"
        strokeWidth="2"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
        style={{ transformOrigin: "550px 350px" }}
      />

      <motion.circle
        cx="550"
        cy="350"
        r="140"
        stroke="#3B82F6"
        strokeWidth="1.5"
        opacity="0.6"
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
        style={{ transformOrigin: "550px 350px" }}
      />

      <motion.circle
        cx="550"
        cy="350"
        r="200"
        stroke="#6366F1"
        strokeWidth="1"
        opacity="0.4"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
        style={{ transformOrigin: "550px 350px" }}
      />

      {/* ================= CENTER CORE LABEL ================= */}
      <motion.g
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        <rect x="495" y="330" width="110" height="40" rx="12" fill="#0EA5E9" />
        <text x="525" y="355" fill="white" fontSize="12">
          CCW CORE
        </text>
      </motion.g>

      {/* ================= FLOATING BOM NODES ================= */}
      {[
        { x: 280, y: 220, color: "#22D3EE", label: "Switch" },
        { x: 820, y: 220, color: "#3B82F6", label: "Router" },
        { x: 260, y: 500, color: "#6366F1", label: "License" },
        { x: 840, y: 500, color: "#8B5CF6", label: "Support" },
      ].map((n, i) => (
        <motion.g
          key={i}
          animate={{
            y: [0, -10, 0],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 3 + i * 0.3,
            repeat: Infinity,
          }}
        >
          <circle cx={n.x} cy={n.y} r="28" fill={n.color} opacity="0.9" />
          <text x={n.x - 22} y={n.y + 50} fill="#CBD5E1" fontSize="12">
            {n.label}
          </text>
        </motion.g>
      ))}

      {/* ================= ENERGY LINKS (ORBITAL CONNECTIONS) ================= */}
      <motion.path
        d="M300 220 C420 280, 480 320, 550 350"
        stroke="#22D3EE"
        strokeWidth="2"
        strokeDasharray="8 8"
        animate={{ strokeDashoffset: [0, -40] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />

      <motion.path
        d="M820 220 C700 280, 640 320, 550 350"
        stroke="#3B82F6"
        strokeWidth="2"
        strokeDasharray="8 8"
        animate={{ strokeDashoffset: [0, -40] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
      />

      <motion.path
        d="M260 500 C400 420, 480 380, 550 350"
        stroke="#6366F1"
        strokeWidth="2"
        strokeDasharray="8 8"
        animate={{ strokeDashoffset: [0, -40] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />

      <motion.path
        d="M840 500 C700 420, 620 380, 550 350"
        stroke="#8B5CF6"
        strokeWidth="2"
        strokeDasharray="8 8"
        animate={{ strokeDashoffset: [0, -40] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
      />

      {/* ================= DATA PARTICLES ================= */}
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.circle
          key={i}
          cx={550 + Math.cos(i) * 220}
          cy={350 + Math.sin(i) * 140}
          r="2"
          fill="#38BDF8"
          animate={{
            opacity: [0.2, 1, 0.2],
            scale: [1, 1.6, 1],
          }}
          transition={{
            duration: 2 + i * 0.1,
            repeat: Infinity,
          }}
        />
      ))}
    </svg>
  )
}