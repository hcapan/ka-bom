"use client";
import dynamic from "next/dynamic";
import { ProjectProvider } from "@/app/lib/storage/ProjectContext";

const TopologyApp = dynamic(() => import("../components/chrome/TopologyApp"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-500 text-sm">Loading topology…</div>
    </main>
  ),
});

export default function Page() {
  return (
    <ProjectProvider>
      <TopologyApp />
    </ProjectProvider>
  );
}