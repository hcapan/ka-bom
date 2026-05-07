"use client";

import Sidebar from "./SideBar";
import TopologyCanvas from "./TopologyCanvas";
import { useProject } from "../lib/storage/useProject";
import { useCallback } from "react";

const SCHEMA_VERSION = 3;

export default function TopologyApp() {
  const {
    isLoaded,
    devices,
    links,
    globalDefaults,
    setDevices,
    setLinks,
    setGlobalDefaults,
    resetProject,
    importProject,
    exportProject,
  } = useProject();

  // CCW-bound export will replace this in Chunk 6.
  // For now, keep JSON export working.
  const exportTopology = useCallback(async () => {
    if (devices.length === 0) {
      alert("Nothing to export — add some devices first.");
      return;
    }
    const json = await exportProject();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `topology-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [devices.length, exportProject]);

  const handleImport = useCallback(
    async (file: File) => {
      const text = await file.text();
      try {
        await importProject(text);
      } catch (err) {
        alert(
          `Could not import: ${err instanceof Error ? err.message : "error"}`
        );
      }
    },
    [importProject]
  );

  if (!isLoaded || !globalDefaults) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Loading topology…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row gap-4 p-4 bg-slate-50">
      <aside className="w-full lg:w-72 lg:shrink-0">
        <Sidebar
          devices={devices}
          links={links}
          setDevices={setDevices}
          setLinks={setLinks}
          defaultLinkSku={globalDefaults.defaultOptic}
          setDefaultLinkSku={(opt) => setGlobalDefaults({ defaultOptic: opt })}
          onExport={exportTopology}
          onImport={handleImport}
          onReset={resetProject}
        />
      </aside>

      <section className="flex-1 min-w-0 max-h-screen">
        <TopologyCanvas
          devices={devices}
          links={links}
          setDevices={setDevices}
          setLinks={setLinks}
          defaultLinkSku={globalDefaults.defaultOptic}
          onExport={exportTopology}
        />
      </section>
    </main>
  );
}