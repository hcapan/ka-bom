"use client";

import React, { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Settings,
  ListChecks,
  FolderOpen,
  Cable,
  CableCar,
  FileText,
  Save,
  FileSpreadsheet,
  Upload,
  Trash2,
} from "lucide-react";
import { GlobalDefaults, ConfiguredDevice, Link } from "../../lib/types";
import FloatingPanel from "../ui/FloatingPanel";
import GlobalDefaultsPanel from "../panels/GlobalDefaultsPanel";
import BomPreviewPanel from "../panels/BomPreviewPanel";
import { Project } from "../../lib/types";
import { useConfirm } from "../ui/Modal";

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
  bundleEdges,
  expandedBundleCount,
  onToggleBundleEdges,
  onCollapseAllBundles,
}: Props) {
  const [openPanel, setOpenPanel] = useState<PanelKey>(null);
  const confirm = useConfirm();

  const defaultsRef = useRef<HTMLButtonElement>(null);
  const inventoryRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (key: PanelKey) =>
    setOpenPanel(openPanel === key ? null : key);
  const handleClose = () => setOpenPanel(null);

  const handleImportClick = () =>
    document.getElementById("toolbar-import-input")?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (devices.length > 0 || links.length > 0) {
      const ok = await confirm({
        title: "Replace current topology?",
        message:
          "Importing will overwrite your current devices, links, and groups. This cannot be undone.",
        confirmLabel: "Replace",
        cancelLabel: "Keep current",
        variant: "danger",
      });
      if (!ok) {
        e.target.value = "";
        return;
      }
    }
    onImport(file);
    toast.success("Topology imported", { description: file.name });
    e.target.value = "";
    setOpenPanel(null);
  };

  const handleResetClick = async () => {
    if (devices.length === 0 && links.length === 0) return;
    const ok = await confirm({
      title: "Reset topology?",
      message: `This will permanently remove ${devices.length} device(s) and ${links.length} link(s).`,
      confirmLabel: "Reset",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (ok) {
      onReset();
      toast.success("Topology reset");
      setOpenPanel(null);
    }
  };

  const handleExportBOM = () => {
    onExportBOM();
    toast.success("BOM exported", { description: "CCW Excel file generated" });
    setOpenPanel(null);
  };
  const handleExportJSON = () => {
    onExportJSON();
    toast.success("Topology exported", { description: "JSON backup downloaded" });
    setOpenPanel(null);
  };
  const handleExportHLD = () => {
    toast.info("HLD export coming soon", {
      description:
        "High-Level Design document generation is planned for a future release.",
    });
  };

  return (
    <>
      <div
        className="
          flex items-center gap-1
          rounded-xl border border-slate-200 bg-white/90
          px-2 py-1.5 shadow-sm backdrop-blur-md
        "
      >
        {/* ─── BRAND WORDMARK ─── */}
        <div className="flex items-center gap-2 px-2 mr-1">
          <div
            className="
              flex h-6 w-6 items-center justify-center
              rounded-md bg-cisco-blue-500 text-white
              shadow-sm
            "
            aria-hidden
          >
            <Cable size={14} strokeWidth={2.5} />
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="text-[11px] font-bold tracking-tight text-cisco-indigo-500">
              Network<span className="text-cisco-blue-500">Designer</span>
            </div>
            <div className="text-[8px] uppercase tracking-[0.15em] text-slate-400">
              Topology · BOM
            </div>
          </div>
        </div>

        <ToolbarDivider />

        {/* ─── LEFT: View / Settings / File ─── */}
        <ToolbarButton
          ref={defaultsRef}
          icon={<Settings size={14} />}
          label="Defaults"
          active={openPanel === "defaults"}
          onClick={() => handleToggle("defaults")}
        />
        <ToolbarButton
          ref={inventoryRef}
          icon={<ListChecks size={14} />}
          label={`Inventory (${devices.length})`}
          active={openPanel === "inventory"}
          onClick={() => handleToggle("inventory")}
        />
        <ToolbarButton
          ref={fileRef}
          icon={<FolderOpen size={14} />}
          label="File"
          active={openPanel === "file"}
          onClick={() => handleToggle("file")}
        />

        <ToolbarDivider />

        {/* ─── MIDDLE: Edge controls ─── */}
        <ToolbarButton
          icon={bundleEdges ? <CableCar size={14} /> : <Cable size={14} />}
          label={bundleEdges ? "Bundled" : "Unbundled"}
          active={bundleEdges}
          onClick={onToggleBundleEdges}
          title={
            bundleEdges
              ? "Bundle parallel edges into a single visual link"
              : "Show every link as a separate edge"
          }
        />
        {bundleEdges && expandedBundleCount > 0 && (
          <button
            onClick={onCollapseAllBundles}
            className="
              rounded-md border border-slate-200 bg-white
              px-2 py-1 text-[10px] font-semibold text-slate-600
              hover:bg-slate-50
            "
            title={`${expandedBundleCount} bundle(s) currently expanded`}
          >
            Collapse all ({expandedBundleCount})
          </button>
        )}

        <div className="flex-1" />

        {/* ─── RIGHT: Stats + Exports ─── */}
        <span
          className="
            rounded-full bg-slate-100 px-2.5 py-0.5
            text-[10px] font-semibold text-slate-700
            ring-1 ring-inset ring-slate-200
          "
          title="Topology stats"
        >
          {devices.length} dev · {links.length} link
        </span>

        <ToolbarDivider />

        <button
          onClick={handleExportHLD}
          disabled={devices.length === 0}
          className="
            inline-flex items-center gap-1.5
            rounded-md border border-slate-300 bg-white px-2.5 py-1.5
            text-xs font-bold text-slate-700
            transition-colors hover:border-cisco-blue-500 hover:text-cisco-blue-700
            disabled:cursor-not-allowed disabled:opacity-40
          "
          title="Export High-Level Design document (coming soon)"
        >
          <FileText size={14} />
          HLD
        </button>

        <button
          onClick={handleExportJSON}
          disabled={devices.length === 0}
          className="
            inline-flex items-center gap-1.5
            rounded-md border border-slate-300 bg-white px-2.5 py-1.5
            text-xs font-bold text-slate-700
            transition-colors hover:border-cisco-blue-500 hover:text-cisco-blue-700
            disabled:cursor-not-allowed disabled:opacity-40
          "
          title="Export topology as JSON backup"
        >
          <Save size={14} />
          JSON
        </button>

        <button
          onClick={handleExportBOM}
          disabled={devices.length === 0}
          className="
            inline-flex items-center gap-1.5
            rounded-md bg-cisco-blue-500 px-3 py-1.5
            text-xs font-bold text-white
            transition-colors hover:bg-cisco-blue-600
            disabled:cursor-not-allowed disabled:opacity-40
            shadow-sm
          "
          title="Export Bill of Materials as CCW-compliant Excel"
        >
          <FileSpreadsheet size={14} />
          BOM
        </button>

        <input
          id="toolbar-import-input"
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      {/* ───── Floating Panels ───── */}
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
        title="Inventory · BOM Preview"
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
            onClick={handleImportClick}
            className="
              flex w-full items-center justify-center gap-2
              rounded-md bg-slate-100 py-2
              text-xs font-bold text-slate-700
              transition-colors hover:bg-slate-200
            "
          >
            <Upload size={14} />
            Import Topology (JSON)
          </button>
          <hr className="my-2 border-slate-200" />
          <button
            onClick={handleResetClick}
            disabled={devices.length === 0 && links.length === 0}
            className="
              flex w-full items-center justify-center gap-2
              rounded-md bg-rose-50 py-2
              text-xs font-bold text-rose-700
              transition-colors hover:bg-rose-100
              disabled:cursor-not-allowed disabled:opacity-40
            "
          >
            <Trash2 size={14} />
            Reset Topology
          </button>
        </div>
      </FloatingPanel>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

const ToolbarButton = React.forwardRef<
  HTMLButtonElement,
  {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
    title?: string;
  }
>(({ icon, label, active, onClick, title }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    title={title}
    className={`
      flex items-center gap-1.5 rounded-md px-2.5 py-1.5
      text-xs font-semibold transition-colors
      ${
        active
          ? "bg-cisco-blue-50 text-cisco-blue-700 ring-1 ring-inset ring-cisco-blue-200"
          : "text-slate-700 hover:bg-slate-100"
      }
    `}
  >
    {icon}
    {label}
  </button>
));
ToolbarButton.displayName = "ToolbarButton";

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px bg-slate-200" aria-hidden />;
}