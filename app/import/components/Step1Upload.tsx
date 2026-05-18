"use client";

import { useCallback, useRef, useState } from "react";

interface Step1UploadProps {
  onFileSelected: (file: File) => void;
  errors: string[];
  isProcessing: boolean;
}

export function Step1Upload({
  onFileSelected,
  errors,
  isProcessing,
}: Step1UploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const isExcel =
        file.name.toLowerCase().endsWith(".xls") ||
        file.name.toLowerCase().endsWith(".xlsx");

      if (!isExcel) {
        alert("Please select a .xls or .xlsx file.");
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-6">
      {/* Template warning */}
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
        <strong className="text-amber-900">Template requirement:</strong>
        <p className="mt-1 text-amber-800">
          The importer expects the canonical CCW estimate export format.
          Required columns:{" "}
          <code className="text-xs">
            Part Number, Quantity, Duration (Mnths), Initial Term(Months),
            Auto Renew Term(Months), Billing Model, Reference id, Group id
          </code>
          .
        </p>
        <p className="mt-1 text-amber-800">
          If your file uses a different format, the importer will refuse to
          process it.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={`rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 bg-white hover:border-slate-400"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl">📂</div>
          <div className="text-base font-medium text-slate-900">
            Drop a CCW estimate file here
          </div>
          <div className="text-sm text-slate-500">or</div>
          <button
            onClick={() => inputRef.current?.click()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Choose file"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <div className="mt-2 text-xs text-slate-400">
            Accepted formats: .xls, .xlsx
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <strong className="text-red-900">Errors:</strong>
          <ul className="mt-2 list-disc pl-5 text-sm text-red-800">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}