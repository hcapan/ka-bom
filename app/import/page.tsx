"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ImportPipelineResult,
  TemplateValidationResult,
  ParsedCcw,
  ClassifiedAnchorGroup,
  CatalogPatch,
} from "@/app/lib/import/types";
import { parseCcwExcel } from "@/app/lib/import/ccwParser";
import { classifyParsedCcw } from "@/app/lib/import/ccwClassifier";
import { assembleCatalogPatch } from "@/app/lib/import/ccwToCatalogPatch";
import { serializeCatalogPatch } from "@/app/lib/import/catalogPatchSerializer";
import { Step1Upload } from "./components/Step1Upload";
import { Step2Review } from "./components/Step2Review";
import { Step3Output } from "./components/Step3Output";

type WizardStep = 1 | 2 | 3;

export interface PipelineState {
  fileName: string;
  validation: TemplateValidationResult;
  parsed: ParsedCcw;
  classified: ClassifiedAnchorGroup[];
  patch: CatalogPatch;
  serialized: string;
}

export default function ImportPage() {
  const [step, setStep] = useState<WizardStep>(1);
  const [pipeline, setPipeline] = useState<PipelineState | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelected = useCallback(async (file: File) => {
    setIsProcessing(true);
    setErrors([]);
    try {
      const buffer = await file.arrayBuffer();

      // Step 1: parse
      const parseResult = parseCcwExcel({ fileName: file.name, buffer });
      if (!parseResult.parsed) {
        setErrors([
          ...(parseResult.validation.message ? [parseResult.validation.message] : []),
          ...parseResult.errors,
        ]);
        setIsProcessing(false);
        return;
      }

      // Step 2: classify
      const classified = classifyParsedCcw(parseResult.parsed);

      // Step 3: assemble
      const patch = assembleCatalogPatch({
        sourceFileName: file.name,
        classifiedGroups: classified,
      });

      // Step 4: serialize
      const serialized = serializeCatalogPatch(patch);

      setPipeline({
        fileName: file.name,
        validation: parseResult.validation,
        parsed: parseResult.parsed,
        classified,
        patch,
        serialized,
      });
      setStep(2);
    } catch (e) {
      setErrors([`Unexpected error: ${(e as Error).message}`]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleStartOver = useCallback(() => {
    setPipeline(null);
    setErrors([]);
    setStep(1);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              CCW Catalog Importer
            </h1>
            <p className="text-sm text-slate-500">
              Enrich your hardware catalog from a CCW estimate export
            </p>
          </div>
          <Link
            href="/canvas"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to canvas
          </Link>
        </div>
      </header>

      {/* Step indicator */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-3">
          <StepBadge num={1} label="Upload" active={step === 1} done={step > 1} />
          <StepConnector done={step > 1} />
          <StepBadge num={2} label="Review" active={step === 2} done={step > 2} />
          <StepConnector done={step > 2} />
          <StepBadge num={3} label="Output" active={step === 3} done={false} />
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {step === 1 && (
          <Step1Upload
            onFileSelected={handleFileSelected}
            errors={errors}
            isProcessing={isProcessing}
          />
        )}

        {step === 2 && pipeline && (
          <Step2Review
            pipeline={pipeline}
            onContinue={() => setStep(3)}
            onBack={handleStartOver}
          />
        )}

        {step === 3 && pipeline && (
          <Step3Output
            pipeline={pipeline}
            onBack={() => setStep(2)}
            onStartOver={handleStartOver}
          />
        )}
      </div>
    </main>
  );
}

// ============================================================================
// STEP INDICATOR HELPERS
// ============================================================================

interface StepBadgeProps {
  num: number;
  label: string;
  active: boolean;
  done: boolean;
}

function StepBadge({ num, label, active, done }: StepBadgeProps) {
  const colors = done
    ? "bg-green-600 text-white"
    : active
    ? "bg-blue-600 text-white"
    : "bg-slate-200 text-slate-500";

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${colors}`}
      >
        {done ? "✓" : num}
      </div>
      <span
        className={
          active
            ? "text-sm font-medium text-slate-900"
            : done
            ? "text-sm font-medium text-green-700"
            : "text-sm text-slate-500"
        }
      >
        {label}
      </span>
    </div>
  );
}

function StepConnector({ done }: { done: boolean }) {
  return (
    <div
      className={`mx-2 h-0.5 w-12 ${done ? "bg-green-600" : "bg-slate-200"}`}
    />
  );
}