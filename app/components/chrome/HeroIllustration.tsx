"use client";

import { motion } from "framer-motion";
import { Network, Server, Cpu, Layers, Shield, Wifi, HardDrive } from "lucide-react";

export default function HeroIllustration() {
  return (
    <div className="relative h-112.5 w-full max-w-137.5 select-none">
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-75 w-75 bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/4 right-0 h-50 w-50 bg-sky-300/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Main Illustration Container */}
      <div className="relative h-full w-full flex items-center justify-center">
        
        {/* Animated Connection Lines */}
        <svg className="absolute inset-0 h-full w-full" style={{ filter: 'drop-shadow(0 0 4px rgba(14, 165, 233, 0.2))' }}>
          <motion.path
            d="M 275 225 L 140 140"
            stroke="#e2e8f0"
            strokeWidth="2"
            strokeDasharray="4 4"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
          />
          <motion.path
            d="M 275 225 L 410 140"
            stroke="#e2e8f0"
            strokeWidth="2"
            strokeDasharray="4 4"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.7 }}
          />
          <motion.path
            d="M 275 225 L 150 340"
            stroke="#e2e8f0"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.8 }}
            transition={{ duration: 1.5, delay: 1.1 }}
          />
          <motion.path
            d="M 275 225 L 80 225"
            stroke="#e2e8f0"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.8 }}
            transition={{ duration: 1.5, delay: 1.3 }}
          />
          <motion.path
            d="M 275 225 L 275 360"
            stroke="#0ea5e9"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.4 }}
            transition={{ duration: 1.5, delay: 0.9 }}
          />
        </svg>

        {/* Center "Core" Node */}
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 12, stiffness: 90, delay: 0.2 }}
          className="relative z-20 flex h-28 w-28 items-center justify-center rounded-[2.5rem] border border-white/50 bg-white/80 p-1 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex h-full w-full items-center justify-center rounded-4xl bg-linear-to-br from-blue-500 to-sky-600 shadow-inner">
            <Server className="h-10 w-10 text-white" />
          </div>
          {/* Status dots */}
          <div className="absolute -top-1 -right-1 flex gap-1">
            <div className="h-3 w-3 rounded-full bg-green-500 border-2 border-white animate-pulse" />
          </div>
        </motion.div>

        {/* Access Node 1 (Top Left) */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[10%] top-[15%] z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-lg"
        >
          <Network className="h-7 w-7 text-slate-400" />
        </motion.div>

        {/* Access Node 2 (Top Right) */}
        <motion.div
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute right-[10%] top-[15%] z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-lg"
        >
          <Layers className="h-7 w-7 text-slate-400" />
        </motion.div>

        {/* Security Node (Bottom Left) */}
        <motion.div
          animate={{ y: [0, 10, 0], x: [0, 5, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[15%] bottom-[20%] z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-md"
        >
          <Shield className="h-6 w-6 text-slate-400" />
        </motion.div>

        {/* Wireless Node (Top center-ish) */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[30%] top-[8%] z-10 flex h-12 w-12 items-center justify-center rounded-full border border-sky-100 bg-sky-50/50 shadow-sm"
        >
          <Wifi className="h-5 w-5 text-sky-400" />
        </motion.div>

        {/* Appliance/Storage Node (Mid Left) */}
        <motion.div
          animate={{ x: [0, -8, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute left-[5%] top-[45%] z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-md"
        >
          <HardDrive className="h-6 w-6 text-slate-400" />
        </motion.div>

        {/* BOM Preview UI (Bottom) */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="absolute bottom-[10%] z-30 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between mb-3">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bill of Materials</div>
             <div className="h-2 w-2 rounded-full bg-sky-500" />
          </div>
          <div className="space-y-2">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div initial={{ x: '-100%' }} animate={{ x: '0%' }} transition={{ delay: 1.5, duration: 1 }} className="h-full w-2/3 bg-sky-400" />
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div initial={{ x: '-100%' }} animate={{ x: '0%' }} transition={{ delay: 1.7, duration: 1 }} className="h-full w-1/2 bg-sky-300" />
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div initial={{ x: '-100%' }} animate={{ x: '0%' }} transition={{ delay: 1.9, duration: 1 }} className="h-full w-4/5 bg-slate-200" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="h-5 w-16 bg-blue-500 rounded-lg flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
              EXPORT
            </div>
          </div>
        </motion.div>

        {/* Decorative Floating Icon (CPU/Logic) */}
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute right-[20%] bottom-[25%] opacity-20">
           <Cpu className="h-12 w-12 text-blue-900" />
        </motion.div>
      </div>
    </div>
  );
}