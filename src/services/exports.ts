import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { ErpModule, RecordData } from "../../shared/modules";

export function exportModuleToExcel(module: ErpModule, records: RecordData[]): void {
  const includeArchiveStatus = records.some((record) => record._archived === "true");
  const exportFields = [...module.fields.map((field) => field.label), ...(includeArchiveStatus ? ["Record status"] : [])];
  const rows = records.map((record) => [
    ...module.fields.map((field) => {
      const value = record[field.key] ?? "";
      if (field.kind !== "number" || !value) return value;
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : value;
    }),
    ...(includeArchiveStatus ? [record._archived === "true" ? "Archived" : "Active"] : []),
  ]);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([exportFields, ...rows]);
  XLSX.utils.book_append_sheet(workbook, worksheet, module.name.slice(0, 31));
  XLSX.writeFile(workbook, `${module.id}-export.xlsx`);
}

export function exportModuleToPdf(module: ErpModule, records: RecordData[]): void {
  const includeArchiveStatus = records.some((record) => record._archived === "true");
  const pdf = new jsPDF({ orientation: module.fields.length > 5 ? "landscape" : "portrait" });
  pdf.setFontSize(16);
  pdf.text(`${module.name} report`, 14, 18);
  pdf.setFontSize(9);
  pdf.text(`Generated ${new Date().toLocaleString()} - ${records.length} records`, 14, 25);
  autoTable(pdf, {
    startY: 31,
    head: [[...module.fields.map((field) => field.label), ...(includeArchiveStatus ? ["Record status"] : [])]],
    body: records.map((record) => [...module.fields.map((field) => record[field.key] ?? ""), ...(includeArchiveStatus ? [record._archived === "true" ? "Archived" : "Active"] : [])]),
    styles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
    headStyles: { fillColor: [39, 73, 132] },
    margin: { left: 14, right: 14 },
  });
  pdf.save(`${module.id}-export.pdf`);
}
