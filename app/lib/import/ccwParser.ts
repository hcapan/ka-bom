// ============================================================================
// CCW PARSER
// Reads a CCW estimate Excel file and returns hierarchical anchor structure.
//
// Pipeline:
//   ArrayBuffer (Excel)
//     → xlsx parses sheet
//     → validate column headers against canonical template
//     → extract RawCcwRow[]
//     → walk rows, attach NaN-Group-id rows to last anchor
//     → return ParsedCcw
// ============================================================================

import * as XLSX from "xlsx";
import {
  RawCcwRow,
  ParsedCcw,
  ParsedAnchor,
  TemplateValidationResult,
  REQUIRED_COLUMNS,
  RequiredColumn,
} from "./types";

// ----------------------------------------------------------------------------
// PUBLIC ENTRY POINTS
// ----------------------------------------------------------------------------

export interface ParseInput {
  fileName: string;
  buffer: ArrayBuffer;
}

export interface ParseOutput {
  validation: TemplateValidationResult;
  parsed: ParsedCcw | null;
  errors: string[];
}

/**
 * Top-level parser. Validates the template, then parses if valid.
 * Returns errors (not throws) so the UI can surface them gracefully.
 */
export function parseCcwExcel(input: ParseInput): ParseOutput {
  const errors: string[] = [];

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(input.buffer, { type: "array" });
  } catch (e) {
    return {
      validation: {
        isValid: false,
        missingColumns: [...REQUIRED_COLUMNS],
        extraColumns: [],
        message: "File could not be opened as a valid Excel workbook.",
      },
      parsed: null,
      errors: [`Failed to read Excel file: ${(e as Error).message}`],
    };
  }

  // CCW exports always put the data on the first sheet.
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      validation: {
        isValid: false,
        missingColumns: [...REQUIRED_COLUMNS],
        extraColumns: [],
        message: "Workbook contains no sheets.",
      },
      parsed: null,
      errors: ["Workbook is empty."],
    };
  }

  const sheet = workbook.Sheets[sheetName];

  // Convert sheet to array-of-arrays so we can locate the header row.
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  if (rows.length === 0) {
    return {
      validation: {
        isValid: false,
        missingColumns: [...REQUIRED_COLUMNS],
        extraColumns: [],
        message: "Sheet is empty.",
      },
      parsed: null,
      errors: ["No rows found in the first sheet."],
    };
  }

  // Find the header row (first row containing "Part Number").
  const headerRowIndex = findHeaderRow(rows);
  if (headerRowIndex === -1) {
    return {
      validation: {
        isValid: false,
        missingColumns: [...REQUIRED_COLUMNS],
        extraColumns: [],
        message:
          'Could not locate the header row. Expected a row containing "Part Number".',
      },
      parsed: null,
      errors: ["Header row not found."],
    };
  }

  const headerRow = rows[headerRowIndex].map((c) => String(c ?? "").trim());
  const validation = validateTemplate(headerRow);

  if (!validation.isValid) {
    return {
      validation,
      parsed: null,
      errors: [
        `Template validation failed: missing column(s): ${validation.missingColumns.join(", ")}`,
      ],
    };
  }

  // Build a column-name → column-index map from the actual header.
  const columnIndex = buildColumnIndex(headerRow);

  // Extract data rows into RawCcwRow[].
  const dataRows = rows.slice(headerRowIndex + 1);
  const rawRows: RawCcwRow[] = [];

  dataRows.forEach((row, idx) => {
    // Skip totally empty rows.
    if (!row || row.every((c) => c === null || c === "")) return;

    const partNumber = readString(row, columnIndex["Part Number"]);
    if (!partNumber) {
      // No PID = junk row (e.g., totals, footnotes). Skip silently.
      return;
    }

    rawRows.push({
      rowIndex: idx + 1, // 1-based after header
      partNumber,
      quantity: readNumber(row, columnIndex["Quantity"]) ?? 1,
      durationMonths: readNumber(row, columnIndex["Duration (Mnths)"]),
      initialTermMonths: readNumber(row, columnIndex["Initial Term(Months)"]),
      autoRenewTermMonths: readNumber(row, columnIndex["Auto Renew Term(Months)"]),
      billingModel: readString(row, columnIndex["Billing Model"]),
      referenceId: readString(row, columnIndex["Reference id"]),
      groupId: readString(row, columnIndex["Group id"]),
    });
  });

  if (rawRows.length === 0) {
    return {
      validation,
      parsed: null,
      errors: ["No data rows found beneath the header."],
    };
  }

  // Walk rows: each non-null Group id starts a new anchor.
  const { anchors, orphans } = walkAnchors(rawRows);

  if (anchors.length === 0) {
    errors.push(
      "No anchor rows found (no rows with a non-empty Group id). " +
        "Check that the file is a valid CCW estimate export."
    );
  }

  return {
    validation,
    parsed: {
      sourceFileName: input.fileName,
      parsedAt: new Date().toISOString(),
      totalRows: rawRows.length,
      anchors,
      orphanRows: orphans,
    },
    errors,
  };
}

// ----------------------------------------------------------------------------
// TEMPLATE VALIDATION
// ----------------------------------------------------------------------------

function validateTemplate(headerRow: string[]): TemplateValidationResult {
  const headerSet = new Set(headerRow.filter((h) => h.length > 0));
  const missing: RequiredColumn[] = [];

  for (const col of REQUIRED_COLUMNS) {
    if (!headerSet.has(col)) {
      missing.push(col);
    }
  }

  const required = new Set<string>(REQUIRED_COLUMNS);
  const extras = headerRow.filter((h) => h.length > 0 && !required.has(h));

  return {
    isValid: missing.length === 0,
    missingColumns: missing,
    extraColumns: extras,
    message:
      missing.length === 0
        ? undefined
        : `This file is missing required columns and may not be a CCW estimate export. ` +
          `Use the canonical CCW estimate template.`,
  };
}

// ----------------------------------------------------------------------------
// HEADER LOCATION
// ----------------------------------------------------------------------------

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    if (row.some((c) => String(c ?? "").trim() === "Part Number")) {
      return i;
    }
  }
  return -1;
}

function buildColumnIndex(headerRow: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((name, idx) => {
    if (name) map[name] = idx;
  });
  return map;
}

// ----------------------------------------------------------------------------
// CELL READERS
// ----------------------------------------------------------------------------

function readString(row: unknown[], colIdx: number | undefined): string | null {
  if (colIdx === undefined) return null;
  const v = row[colIdx];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "" || s.toLowerCase() === "nan") return null;
  return s;
}

function readNumber(row: unknown[], colIdx: number | undefined): number | null {
  if (colIdx === undefined) return null;
  const v = row[colIdx];
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (s === "" || s.toLowerCase() === "nan") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ----------------------------------------------------------------------------
// ANCHOR WALKING
// Rule: any row with a non-null groupId is an anchor.
// All consecutive null-groupId rows belong to the previous anchor.
// ----------------------------------------------------------------------------

function walkAnchors(rows: RawCcwRow[]): {
  anchors: ParsedAnchor[];
  orphans: RawCcwRow[];
} {
  const anchors: ParsedAnchor[] = [];
  const orphans: RawCcwRow[] = [];
  let current: ParsedAnchor | null = null;

  for (const row of rows) {
    if (row.groupId !== null) {
      // Start a new anchor.
      current = { anchor: row, children: [] };
      anchors.push(current);
    } else {
      if (current === null) {
        // Child appears before any anchor — orphan.
        orphans.push(row);
      } else {
        current.children.push(row);
      }
    }
  }

  return { anchors, orphans };
}