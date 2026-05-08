"use client";
import React, { useRef, useState } from "react";
import { GlobalDefaults, ConfiguredDevice, Link } from "../lib/types";
import FloatingPanel from "./FloatingPanel";
import GlobalDefaultsPanel from "./GlobalDefaultsPanel";
import InventoryPanel from "./InventoryPanel";

type Props = {
  devices: ConfiguredDevice[];
  links: Link[];
  globalDefaults: GlobalDefaults;
  setGlobalDefaults: (patch: Partial<GlobalDefaults>) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
};

type PanelKey = "defaults" | "inventory" | "file" | null;

export default function Toolbar({
  devices,
  links,
  globalDefaults,
  setGlobalDefaults,
  onExport,
  onImport,
  onReset,
}: Props) {
  const [openPanel, setOpenPanel] = useState<PanelKey>(null);

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
          label={`Inventory (${devices.length})`}
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

        <div className="flex-1" />

        <button
          onClick={onExport}
          className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
        >
          ⬇ Export BOM
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
        width={400}
        maxHeight="80vh"
      >
        <InventoryPanel devices={devices} links={links} />
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
              onExport();
              setOpenPanel(null);
            }}
            className="w-full text-xs py-2 bg-slate-100 hover:bg-slate-200 rounded font-bold transition-colors"
          >
            ⬇ Export Topology (JSON)
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