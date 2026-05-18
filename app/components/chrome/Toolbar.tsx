"use client";
import React, { useRef, useState } from "react";
import { GlobalDefaults, ConfiguredDevice, Link } from "../../lib/types";
import FloatingPanel from "../ui/FloatingPanel";
import GlobalDefaultsPanel from "../panels/GlobalDefaultsPanel";
import BomPreviewPanel from "../panels/BomPreviewPanel";
import { Project } from "../../lib/types";
import { useProject } from "../../lib/storage/useProject";

type Props = {
  project: Project;
  devices: ConfiguredDevice[];
  links: Link[];
  globalDefaults: GlobalDefaults;
  setGlobalDefaults: (patch: Partial<GlobalDefaults>) => void;
  onExportBOM: () => void;
  onExportJSON: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
  bundleEdges: boolean;
  expandedBundleCount: number;
  onToggleBundleEdges: () => void;
  onCollapseAllBundles: () => void;
 
};

type PanelKey = "defaults" | "inventory" | "file" | null;

export default function Toolbar({
  project,
  devices,
  links,
  globalDefaults,
  setGlobalDefaults,
  onExportBOM,
  onExportJSON,
  onImport,
  onReset,
}: Props) {
  const [openPanel, setOpenPanel] = useState<PanelKey>(null);
  const { ui } = useProject();
  const defaultsRef = useRef<HTMLButtonElement>(null);
  const inventoryRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (key: PanelKey) => {
    setOpenPanel(openPanel === key ? null : key);
  };

  const handleClose = () => setOpenPanel(null);

  const handleImportClick = () => {
    document.getElementById("toolbar-import-input")?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (devices.length > 0 || links.length > 0) {
      if (!confirm("Replace your current topology?")) {
        e.target.value = "";
        return;
      }
    }
    onImport(file);
    e.target.value = "";
    setOpenPanel(null);
  };

  const handleResetClick = () => {
    if (devices.length === 0 && links.length === 0) return;
    if (confirm("Clear all devices and links?")) {
      onReset();
      setOpenPanel(null);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-2 py-1.5 flex items-center gap-1">
        <ToolbarButton
          ref={defaultsRef}
          icon="⚙"
          label="Defaults"
          active={openPanel === "defaults"}
          onClick={() => handleToggle("defaults")}
        />
        <ToolbarButton
          ref={inventoryRef}
          icon="📋"
          label={`BOM (${devices.length})`}
          active={openPanel === "inventory"}
          onClick={() => handleToggle("inventory")}
        />
        <ToolbarButton
          ref={fileRef}
          icon="📁"
          label="File ▾"
          active={openPanel === "file"}
          onClick={() => handleToggle("file")}
        />
          <div className="flex items-center gap-2">
      {/* ...your existing toolbar buttons (Defaults / BOM / File)... */}

  {/* ✨ NEW — Bundle toggle */}


     

    </div>

        <div className="flex-1" />
        {/* CCW Excel Export */}
        <button
          onClick={() => {
            onExportBOM();
            setOpenPanel(null);
          }}
          className="w-72 text-xs py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-bold transition-colors flex items-center justify-center gap-2"
        >
          📊 Export BOM (CCW Excel)
        </button>

        {/* JSON Backup Export */}
        <button
          onClick={() => {
            onExportJSON();
            setOpenPanel(null);
          }}
          className="w-72 text-xs py-2 bg-slate-100 hover:bg-slate-200 rounded font-bold transition-colors flex items-center justify-center gap-2"
        >
          💾 Export Topology (JSON Backup)
        </button>

        <input
          id="toolbar-import-input"
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      {/* ===== FLOATING PANELS ===== */}
      <FloatingPanel
        open={openPanel === "defaults"}
        onClose={handleClose}
        anchorRef={defaultsRef}
        title="Project Defaults"
        width={360}
      >
        <GlobalDefaultsPanel
          defaults={globalDefaults}
          onChange={setGlobalDefaults}
        />
      </FloatingPanel>

      <FloatingPanel
        open={openPanel === "inventory"}
        onClose={handleClose}
        anchorRef={inventoryRef}
        title="Inventory"
        width={520}
        maxHeight="80vh"
      >
        <BomPreviewPanel project={project} />
        
      </FloatingPanel>

      

      <FloatingPanel
        open={openPanel === "file"}
        onClose={handleClose}
        anchorRef={fileRef}
        title="Topology File"
        width={280}
      >
        <div className="space-y-2">
          <button
            onClick={() => {
              onExportJSON(); 
              setOpenPanel(null);
            }}
            className="..."
          >
            💾 Export Topology (JSON Backup)
          </button>
          <button
            onClick={handleImportClick}
            className="w-full text-xs py-2 bg-slate-100 hover:bg-slate-200 rounded font-bold transition-colors"
          >
            ⬆ Import Topology
          </button>
          <hr className="border-slate-200 my-2" />
          <button
            onClick={handleResetClick}
            disabled={devices.length === 0 && links.length === 0}
            className="w-full text-xs py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🗑 Reset Topology
          </button>
        </div>
      </FloatingPanel>
    </>
  );
}

const ToolbarButton = React.forwardRef<
  HTMLButtonElement,
  {
    icon: string;
    label: string;
    active: boolean;
    onClick: () => void;
  }
>(({ icon, label, active, onClick }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
      active
        ? "bg-slate-200 text-slate-900"
        : "text-slate-700 hover:bg-slate-100"
    }`}
  >
    <span>{icon}</span>
    {label}
  </button>
));
ToolbarButton.displayName = "ToolbarButton";
