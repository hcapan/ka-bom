"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, Zap, Layout, Cpu, Network, FileCheck } from "lucide-react";

export default function AboutPage() {
  const features = [
    {
      icon: <Zap className="h-6 w-6 text-blue-500" />,
      title: "Rapid Design",
      description: "Build complex switch stacks and modular chassis topologies in minutes, not hours.",
    },
    {
      icon: <Shield className="h-6 w-6 text-sky-500" />,
      title: "CCW Validation",
      description: "Automated SKU matching ensures your Bill of Materials is ready for direct CCW import.",
    },
    {
      icon: <Layout className="h-6 w-6 text-indigo-500" />,
      title: "Visual Clarity",
      description: "High-fidelity faceplates and realistic rack views provide immediate architectural insight.",
    },
    {
      icon: <FileCheck className="h-6 w-6 text-emerald-500" />,
      title: "HLD Documentation",
      description: "Automatically generate High-Level Design documents with diagrams and hardware tables.",
    },
    {
      icon: <Cpu className="h-6 w-6 text-violet-500" />,
      title: "Intelligent Stacking",
      description: "Manage physical and logical stack relationships with real-time cable validation.",
    },
    {
      icon: <Network className="h-6 w-6 text-amber-500" />,
      title: "Multi-Domain",
      description: "Design across Security, Wireless, and Core Switching within a single visual environment.",
    },
  ];

  return (
    <main className="w-full min-h-screen bg-white text-slate-900 overflow-hidden">
      {/* Hero Section */}
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center px-8 md:px-16 pt-24 pb-12 text-center">
        {/* Ambient background glows - matches Home Page */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-100 w-100 bg-blue-100 rounded-full blur-[120px] opacity-50 pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="z-10 max-w-3xl space-y-6"
        >
          <p className="text-sm tracking-[0.25em] uppercase text-blue-500 font-semibold">
            The Vision
          </p>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight text-slate-800">
            Simplified Network Engineering
          </h1>
          <p className="text-lg md:text-xl text-slate-500 leading-8 max-w-2xl mx-auto">
            CCW Canvas was born from a simple observation: network designers spend too much time in spreadsheets and not enough time designing. We&apos;ve built a visual-first workspace to bridge the gap between intent and procurement.
          </p>
          
          <div className="flex justify-center pt-4">
            <div className="w-24 h-1 bg-blue-500/30 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Value Pillars */}
      <section className="relative z-10 px-8 md:px-16 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 * idx, duration: 0.5 }}
              whileHover={{ y: -5 }}
              className="p-8 rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-blue-100 transition-all"
            >
              <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-8 text-center space-y-8">
          <div className="flex justify-center gap-4 text-slate-300">
            <Network size={32} />
            <Cpu size={32} />
            <FileCheck size={32} />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
            Ready to automate your next BOM?
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto">
            Join engineers who have reclaimed their time by moving from manual SKU lookups to visual canvas designing.
          </p>
          <div className="pt-4">
            <Link
              href="/canvas"
              className="inline-flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition px-10 py-4 rounded-2xl text-white text-lg font-semibold shadow-lg hover:shadow-2xl"
            >
              Go to Workspace
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-12 text-center text-slate-400 text-xs tracking-widest uppercase">
        CCW Canvas · Built for Cisco Engineers
      </footer>
    </main>
  );
}