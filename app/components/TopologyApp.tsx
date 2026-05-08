"use client";

import { useCallback, useState } from "react";
import { useProject } from "../lib/storage/useProject";
import Toolbar from "./Toolbar";
import DeviceListPanel from "./DeviceListPanel";
import TopologyCanvas from "./TopologyCanvas";
import ConfigurePanel from "./ConfigurePanel";

export default function TopologyApp() {
  const {
    isLoaded,
    devices,
    links,
    globalDefaults,
    setDevices,
    setLinks,
    setGlobalDefaults,
    updateDevice,
    resetProject,
    importProject,
    exportProject,
  } = useProject();

  const [configureDeviceId, setConfigureDeviceId] = useState<string | null>(null);

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

  const configureDevice =
    configureDeviceId !== null
      ? devices.find((d) => d.id === configureDeviceId) ?? null
      : null;

  return (
    <>
      <main className="h-[calc(100vh-56px)] flex flex-col gap-3 p-3 bg-slate-50">
        {/* ===== TOP TOOLBAR ===== */}
        <Toolbar
          devices={devices}
          links={links}
          globalDefaults={globalDefaults}
          setGlobalDefaults={setGlobalDefaults}
          onExport={exportTopology}
          onImport={handleImport}
          onReset={resetProject}
        />

        {/* ===== MAIN ROW: Device list + Canvas ===== */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 min-h-0">
          <DeviceListPanel
            devices={devices}
            links={links}
            setDevices={setDevices}
            setLinks={setLinks}
            onConfigureDevice={setConfigureDeviceId}
          />

          <section className="min-w-0 min-h-0">
            <TopologyCanvas
              devices={devices}
              links={links}
              setDevices={setDevices}
              setLinks={setLinks}
              defaultLinkSku={globalDefaults.defaultOptic}
              onExport={exportTopology}
              onNodeClick={setConfigureDeviceId}
            />
          </section>
        </div>
      </main>

      {/* ===== CONFIGURE DRAWER (right side) ===== */}
      <ConfigurePanel
        device={configureDevice}
        globalDefaults={globalDefaults}
        onClose={() => setConfigureDeviceId(null)}
        onUpdate={updateDevice}
      />
    </>
  );
}