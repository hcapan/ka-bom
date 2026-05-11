import * as XLSX from "xlsx";
import { BOMLine } from "./types";
import { Project } from "../types";

// ============================================================
// CCW COLUMN SCHEMA — matches your sample exactly
// ============================================================
type CCWRow = {
  "Part Number": string;
  Quantity: number;
  "Duration (Mnths)": number | "";
  "List Price": number | "";
  "Discount %": number;
  "Initial Term(Months)": number | "";
  "Auto Renew Term(Months)": number | "";
  "Billing Model": string;
  "Requested Start Date": string;
  "Reference id": string;
  "Group id": number | "";
  Notes: string;
};

const CCW_COLUMNS: (keyof CCWRow)[] = [
  "Part Number",
  "Quantity",
  "Duration (Mnths)",
  "List Price",
  "Discount %",
  "Initial Term(Months)",
  "Auto Renew Term(Months)",
  "Billing Model",
  "Requested Start Date",
  "Reference id",
  "Group id",
  "Notes",
];

const SHEET_NAME = "Price Estimate";

// ============================================================
// CONVERTER — BOMLine → CCWRow
// ============================================================
function bomLineToCCWRow(line: BOMLine): CCWRow {
  return {
    "Part Number": line.partNumber,
    Quantity: line.quantity,
    "Duration (Mnths)": line.durationMonths ?? "",
    "List Price": "",                          // CCW computes
    "Discount %": 0,                            // default 0
    "Initial Term(Months)": "",                 // CCW handles
    "Auto Renew Term(Months)": "",
    "Billing Model": "",
    "Requested Start Date": "",
    "Reference id": "",                         // CCW generates
    "Group id": line.groupId ?? "",
    Notes: line.description ?? "",
  };
}

// ============================================================
// EXCEL BUILDER
// ============================================================
export function generateCCWWorkbook(
  lines: BOMLine[],
  project: Project
): XLSX.WorkBook {
  const rows = lines.map(bomLineToCCWRow);

  // Build worksheet with explicit column order
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: CCW_COLUMNS });

  // Set column widths for readable Excel viewing
  worksheet["!cols"] = [
    { wch: 22 }, // Part Number
    { wch: 8 },  // Quantity
    { wch: 16 }, // Duration
    { wch: 12 }, // List Price
    { wch: 10 }, // Discount %
    { wch: 18 }, // Initial Term
    { wch: 22 }, // Auto Renew
    { wch: 14 }, // Billing Model
    { wch: 22 }, // Start Date
    { wch: 14 }, // Reference id
    { wch: 14 }, // Group id
    { wch: 40 }, // Notes
  ];

  // Build workbook with project metadata
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: project.metadata.name || "KA-BOM Topology",
    Subject: "Cisco BOM (CCW-compatible)",
    Author: project.metadata.owner || "KA-BOM",
    CreatedDate: new Date(),
  };

  XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME);
  return workbook;
}

// ============================================================
// FILE DOWNLOAD HELPER
// ============================================================
export function downloadCCWExcel(lines: BOMLine[], project: Project): void {
  if (lines.length === 0) {
    throw new Error("BOM is empty — add devices before exporting.");
  }

  const workbook = generateCCWWorkbook(lines, project);

  // Sanitize project name for filename
  const safeName = (project.metadata.name || "topology")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .toLowerCase();
  const date = new Date().toISOString().split("T")[0];
  const filename = `BOM-${safeName}-${date}.xlsx`;

  // Trigger download
  XLSX.writeFile(workbook, filename, { bookType: "xlsx" });
}

// ============================================================
// FILENAME GENERATOR (exposed for UI preview)
// ============================================================
export function getExportFilename(project: Project): string {
  const safeName = (project.metadata.name || "topology")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .toLowerCase();
  const date = new Date().toISOString().split("T")[0];
  return `BOM-${safeName}-${date}.xlsx`;
}