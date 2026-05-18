"use client";

import { useState } from "react";
import { PipelineState } from "../page";
import { buildCatalogOverride } from "@/app/lib/import/catalogPatchSerializer";
import {
  saveOverrides,
  loadCatalogOverrides,
} from "@/app/lib/hardware/catalog";

interface Step3OutputProps {
  pipeline: PipelineState;
  onBack: () => void;
  onStartOver: () => void;
}

export function Step3Output({
  pipeline,
  onBack,
  onStartOver,
}: Step3OutputProps) {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pipeline.serialized);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Copy failed. Use the download button instead.");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([pipeline.serialized], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const baseName = pipeline.fileName.replace(/\.[^.]+$/, "");
    a.href = url;
    a.download = `catalog-patch-${baseName}.ts`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyToLocalStorage = () => {
  const ok = confirm(
    "This will merge the imported chassis bundles into your local catalog overrides.\n\n" +
      "Note: Modules and new series can't be added this way — they require a code edit. " +
      "Use 'Copy to clipboard' or 'Download' for those.\n\n" +
      "Continue?"
  );
  if (!ok) return;

  try {
    const override = buildCatalogOverride(pipeline.patch);

    // 🔍 DEBUG LOGGING
    console.log("=== APPLY DEBUG ===");
    console.log("Patch chassisBundles count:", pipeline.patch.chassisBundles.length);
    console.log("Patch chassisBundles:", pipeline.patch.chassisBundles.map(b => ({
      pid: b.chassisPid,
      vendor: b.vendorFamily,
    })));
    console.log("Override bundles built:", override);
    console.log("Override series count:", Object.keys(override.bundles).length);

    if (Object.keys(override.bundles).length === 0) {
      alert(
        "Nothing was applied. All imported chassis belong to series that don't yet exist in the catalog. " +
        "Use 'Copy to clipboard' instead and add the new series via code edit."
      );
      return;
    }

    const existing = loadCatalogOverrides();
    console.log("Existing overrides before merge:", existing);

    const merged = {
      bundles: { ...existing.bundles },
    };
    for (const [series, pidPatches] of Object.entries(override.bundles)) {
      merged.bundles[series] = {
        ...(merged.bundles[series] ?? {}),
        ...pidPatches,
      };
    }

    console.log("Merged overrides being saved:", merged);
    saveOverrides(merged);

    // Verify by re-reading
    const verifyRead = loadCatalogOverrides();
    console.log("Verified read after save:", verifyRead);

    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  } catch (e) {
    console.error("Apply error:", e);
    alert(`Apply failed: ${(e as Error).message}`);
  }
};

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
        <strong className="text-blue-900">Two ways to apply this patch:</strong>
        <ol className="mt-2 list-decimal pl-5 text-sm text-blue-800">
          <li>
            <strong>Permanent (recommended):</strong> Copy the TypeScript and
            paste into <code>app/lib/hardware/catalog.ts</code>, then commit.
          </li>
          <li>
            <strong>Temporary (this browser only):</strong> Click{" "}
            <code>&quot;⚡ Apply to local catalog&quot;</code> — affects only{" "}
            <code>localStorage</code> overrides. Best for testing before
            committing.
          </li>
        </ol>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryStat
          label="Chassis bundles"
          value={pipeline.patch.chassisBundles.length}
        />
        <SummaryStat label="Modules" value={pipeline.patch.modules.length} />
        <SummaryStat label="Optics" value={pipeline.patch.optics.length} />
        <SummaryStat
          label="Need review"
          value={pipeline.patch.needsReview.length}
          warning={pipeline.patch.needsReview.length > 0}
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleCopy}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {copied ? "✓ Copied!" : "📋 Copy to clipboard"}
        </button>
        <button
          onClick={handleDownload}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          💾 Download .ts file
        </button>
        <button
          onClick={handleApplyToLocalStorage}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          {applied
            ? "✓ Applied to local catalog!"
            : "⚡ Apply to local catalog (this browser)"}
        </button>
      </div>

      {/* Code preview */}
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2">
          <span className="text-xs font-medium text-slate-400">
            catalog-patch.ts
          </span>
          <span className="text-xs text-slate-500">
            {pipeline.serialized.split("\n").length} lines
          </span>
        </div>
        <pre className="max-h-150 overflow-auto p-4 text-xs leading-relaxed text-slate-200">
          <code>{pipeline.serialized}</code>
        </pre>
      </div>

      {/* Navigation */}
      <div className="flex justify-between border-t border-slate-200 pt-4">
        <button
          onClick={onBack}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back to review
        </button>
        <button
          onClick={onStartOver}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          🔄 Import another file
        </button>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  warning,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
      <div
        className={`text-2xl font-semibold ${
          warning ? "text-amber-600" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}
