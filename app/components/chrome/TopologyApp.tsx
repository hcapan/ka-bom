"use client";

import { useCallback, useState } from "react";
import { useProject } from "../../lib/storage/useProject";
import { buildBOM, downloadCCWExcel } from "../../lib/bom";
import Toolbar from "./Toolbar";
import DeviceListPanel from "../panels/DeviceListPanel";
import TopologyCanvas from "../canvas/TopologyCanvas";
import ConfigurePanel from "../panels/ConfigurePanel";

export default function TopologyApp() {
  const {
    isLoaded,
    project,
    devices,
    links,
    globalDefaults,
    naming,
    setDevices,
    setLinks,
    setGlobalDefaults,
    setNaming,
    updateDevice,
    resetProject,
    importProject,
    exportProject,
    ui, // ✨ MUST be here
    expandBundle,
    toggleBundleEdges,
    collapseAllBundles,
    groups,
    toggleGroupCollapse,
    renameGroup,
    removeGroup,
    addGroup,
    setGroups,
    updateStackSettings,
    convertStackToLogical,
  } = useProject();

  const [configureDeviceId, setConfigureDeviceId] = useState<string | null>(
    null,
  );

  // ============================================================
  // EXPORT BOM AS CCW EXCEL  ← primary action
  // ============================================================
  const exportBOM = useCallback(() => {
    if (!project) return;
    if (devices.length === 0) {
      alert("Nothing to export — add some devices first.");
      return;
    }

    try {
      const result = buildBOM(project);

      if (result.lines.length === 0) {
        alert(
          "No BOM lines could be generated. Check that your devices have CCW bundle data defined.",
        );
        return;
      }

      // If there are warnings, give user a chance to abort
      if (result.warnings.length > 0) {
        const proceed = confirm(
          `BOM generated with ${result.warnings.length} warning(s).\n\n` +
            `${result.stats.devicesWithoutBundle} device(s) skipped (no bundle).\n` +
            `Total lines: ${result.stats.totalLines}\n\n` +
            `Continue with export?`,
        );
        if (!proceed) return;
      }

      downloadCCWExcel(result.lines, project);
    } catch (err) {
      alert(
        `Export failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }, [project, devices.length]);

  // ============================================================
  // EXPORT JSON (kept as backup option in File menu)
  // ============================================================
  const exportJSON = useCallback(async () => {
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
          `Could not import: ${err instanceof Error ? err.message : "error"}`,
        );
      }
    },
    [importProject],
  );

  if (!isLoaded || !globalDefaults || !project) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Loading topology…</div>
      </main>
    );
  }

  const configureDevice =
    configureDeviceId !== null
      ? (devices.find((d) => d.id === configureDeviceId) ?? null)
      : null;

  return (
    <>
      <main className="h-[calc(100vh-56px)] flex flex-col gap-3 p-3 bg-slate-50">
        <Toolbar
          project={project}
          devices={devices}
          links={links}
          globalDefaults={globalDefaults}
          setGlobalDefaults={setGlobalDefaults}
          onExportBOM={exportBOM} // ✅ Excel BOM
          onExportJSON={exportJSON} // ✅ JSON backup
          onImport={handleImport}
          onReset={resetProject}
          bundleEdges={ui.bundleEdges}
          expandedBundleCount={ui.expandedBundles.length}
          onToggleBundleEdges={toggleBundleEdges}
          onCollapseAllBundles={collapseAllBundles}
        />

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 min-h-0">
          <DeviceListPanel
            devices={devices}
            links={links}
            setDevices={setDevices}
            setLinks={setLinks}
            naming={naming} // ✅ NEW
            setNaming={setNaming}
            defaultLinkSku={globalDefaults.defaultOptic}
            setDefaultLinkSku={(sku) =>
              setGlobalDefaults({ defaultOptic: sku })
            }
            onConfigureDevice={setConfigureDeviceId}
            onCreateGroup={addGroup}
            groups={groups}
            setGroups={setGroups}
          />

          <section className="min-w-0 min-h-0">
            <TopologyCanvas
              devices={devices}
              links={links}
              setDevices={setDevices}
              setLinks={setLinks}
              defaultLinkSku={globalDefaults.defaultOptic}
              onExport={exportBOM} // ✅ canvas FAB also runs CCW export
              onNodeClick={setConfigureDeviceId}
              ui={ui} // ✨ MUST forward
              onExpandBundle={expandBundle}
              groups={groups}
              onToggleGroupCollapse={toggleGroupCollapse}
              onRenameGroup={renameGroup}
              onRemoveGroup={removeGroup}
              setGroups={setGroups}
              onUpdateStack={updateStackSettings}
              onConvertStackToLogical={convertStackToLogical}
            />
          </section>
        </div>
      </main>

      <ConfigurePanel
        device={configureDevice}
        globalDefaults={globalDefaults}
        onClose={() => setConfigureDeviceId(null)}
        onUpdate={updateDevice}
      />
    </>
  );
}
