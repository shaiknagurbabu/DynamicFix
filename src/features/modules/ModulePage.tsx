import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp, ChevronDown, ChevronLeft, ChevronRight, Download, Ellipsis, Eye, FileDown, Filter,
  Pencil, Plus, Search, Trash2, UsersRound, X,
} from "lucide-react";
import type { ErpModule, RecordData } from "../../../shared/modules";
import { ApiRequestError, type RecordListQuery, type RecordListResponse } from "../../services/api";
import { exportModuleToExcel, exportModuleToPdf } from "../../services/exports";
import ConfirmDialog from "../../components/ConfirmDialog";
import RecordDialog from "../../components/RecordDialog";

interface ModulePageProps {
  module: ErpModule;
  records: RecordData[];
  search: string;
  onSearch: (value: string) => void;
  onAdd: (record: RecordData) => void | Promise<void>;
  onEdit: (index: number, record: RecordData) => void | Promise<void>;
  onDelete: (index: number, record: RecordData) => void | Promise<void>;
  onArchive: (index: number, record: RecordData) => void | Promise<void>;
  onRestore: (index: number, record: RecordData) => void | Promise<void>;
  apiMode?: boolean;
  onLoadRecords?: (query: RecordListQuery) => Promise<RecordListResponse>;
  onLoadAllRecords?: (query: Omit<RecordListQuery, "page" | "limit">) => Promise<RecordData[]>;
  onUnauthorized?: () => void;
  permissions?: string[];
}

type DialogState = { mode: "add" } | { mode: "view" | "edit"; index: number } | null;
const pageSize = 8;

function recordLabel(module: ErpModule, record: RecordData): string {
  const key = module.fields.find((field) => ["name", "title", "order", "invoice", "reference", "employee", "description", "setting"].includes(field.key))?.key;
  return (key ? record[key] : "") || "this record";
}

function statusClass(value: string): string {
  const normalized = value.toLowerCase();
  if (["active", "paid", "approved", "completed", "delivered", "present", "awarded", "reconciled", "in stock", "current", "ready"].includes(normalized)) return "status-green";
  if (["pending", "due", "review", "reviewing", "processing", "in progress", "submitted", "unread", "late", "low stock"].includes(normalized)) return "status-amber";
  if (["inactive", "declined", "rejected", "lost", "cancelled", "overdue", "out of stock", "failed", "suspended"].includes(normalized)) return "status-red";
  return "status-blue";
}

export default function ModulePage({
  module, records, search, onSearch, onAdd, onEdit, onDelete, onArchive, onRestore,
  apiMode = false, onLoadRecords, onLoadAllRecords, onUnauthorized, permissions = [],
}: ModulePageProps) {
  const [filterValue, setFilterValue] = useState("");
  const [sortKey, setSortKey] = useState(module.fields[0]?.key ?? "");
  const [sortAscending, setSortAscending] = useState(true);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [exportMessage, setExportMessage] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [remoteResponse, setRemoteResponse] = useState<RecordListResponse | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const statusField = module.fields.find((field) => field.kind === "select");
  const [filterKey, setFilterKey] = useState(statusField?.key ?? module.fields[0]?.key ?? "");
  const filterField = module.fields.find((field) => field.key === filterKey) ?? module.fields[0];
  const currentRecords = apiMode ? remoteResponse?.records ?? [] : records;
  const filterOptions = filterField?.kind === "select"
    ? filterField.options ?? []
    : [...new Set(currentRecords.map((record) => record[filterKey]).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
  const visibleFields = module.fields.slice(0, 5);
  if (statusField && !visibleFields.includes(statusField)) visibleFields[visibleFields.length - 1] = statusField;

  useEffect(() => setPage(1), [search, filterKey, filterValue, includeArchived]);

  useEffect(() => {
    if (!apiMode || !onLoadRecords) return;
    let active = true;
    setRemoteLoading(true);
    setRemoteError("");
    setRemoteResponse(null);
    const timer = window.setTimeout(() => {
      void onLoadRecords({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        filterField: filterValue ? filterKey : undefined,
        filterValue: filterValue || undefined,
        includeArchived,
      }).then((response) => {
        if (active) setRemoteResponse(response);
      }).catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiRequestError && error.status === 401) onUnauthorized?.();
        const message = error instanceof Error ? error.message : "Could not load records.";
        setRemoteError(message);
        console.error(`Could not load ${module.name} from the ERP API.`, error);
      }).finally(() => {
        if (active) setRemoteLoading(false);
      });
    }, search.trim() ? 200 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [apiMode, onLoadRecords, onUnauthorized, module.name, page, search, filterKey, filterValue, includeArchived, refreshKey]);

  const filtered = useMemo(() => {
    if (apiMode) {
      return currentRecords.map((record, index) => ({ record, index })).sort((a, b) => {
        const comparison = (a.record[sortKey] ?? "").localeCompare(b.record[sortKey] ?? "", undefined, { numeric: true, sensitivity: "base" });
        return sortAscending ? comparison : -comparison;
      });
    }
    const query = search.trim().toLowerCase();
    const result = currentRecords.map((record, index) => ({ record, index })).filter(({ record }) => {
      if (!includeArchived && record._archived === "true") return false;
      const matchesSearch = !query || module.fields.some((field) => (record[field.key] ?? "").toLowerCase().includes(query));
      const matchesFilter = !filterValue || record[filterKey] === filterValue;
      return matchesSearch && matchesFilter;
    });
    result.sort((a, b) => {
      const comparison = (a.record[sortKey] ?? "").localeCompare(b.record[sortKey] ?? "", undefined, { numeric: true, sensitivity: "base" });
      return sortAscending ? comparison : -comparison;
    });
    return result;
  }, [apiMode, currentRecords, search, filterKey, filterValue, module.fields, sortKey, sortAscending, includeArchived]);

  const totalCount = apiMode ? remoteResponse?.pagination.total ?? 0 : records.length;
  const filteredCount = apiMode ? remoteResponse?.pagination.total ?? 0 : filtered.length;
  const pageCount = apiMode ? Math.max(1, remoteResponse?.pagination.pages ?? 1) : Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = apiMode ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeDialogRecord = dialog && dialog.mode !== "add" ? currentRecords[dialog.index] : undefined;
  const archivedCount = currentRecords.filter((record) => record._archived === "true").length;
  const canPerform = (action: string) => !apiMode || permissions.includes("*") || permissions.includes(`records:${module.id}:${action}`);

  const selectDialogRecord = (mode: "edit" | "view", index: number) => {
    setDialog({ mode, index });
    setMenuIndex(null);
  };

  const handleSave = async (record: RecordData) => {
    if (!dialog) return;
    try {
      if (dialog.mode === "add") await onAdd(record);
      else await onEdit(dialog.index, record);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) onUnauthorized?.();
      throw error;
    }
    setDialog(null);
    setPage(1);
    if (apiMode) setRefreshKey((current) => current + 1);
  };

  const getExportRecords = async () => {
    if (apiMode && onLoadAllRecords) {
      return onLoadAllRecords({
        search: search.trim() || undefined,
        filterField: filterValue ? filterKey : undefined,
        filterValue: filterValue || undefined,
        includeArchived,
      });
    }
    return filtered.map(({ record }) => record);
  };

  const doExport = async (format: "excel" | "pdf") => {
    try {
      const exportRecords = await getExportRecords();
      if (format === "excel") exportModuleToExcel(module, exportRecords);
      else exportModuleToPdf(module, exportRecords);
      setExportMessage(`${exportRecords.length} ${module.name.toLowerCase()} exported to ${format === "excel" ? "Excel" : "PDF"}.`);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) onUnauthorized?.();
      const message = error instanceof Error ? error.message : "The file could not be created.";
      setExportMessage(`Export failed: ${message}`);
      console.error(`Could not export ${module.name} to ${format}.`, error);
    }
    window.setTimeout(() => setExportMessage(""), 3500);
  };

  const runAction = async (action: (index: number, record: RecordData) => void | Promise<void>, index: number): Promise<boolean> => {
    try {
      const record = currentRecords[index];
      if (!record) return false;
      await action(index, record);
      if (apiMode) setRefreshKey((current) => current + 1);
      return true;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) onUnauthorized?.();
      const message = error instanceof Error ? error.message : "The action could not be completed.";
      setRemoteError(message);
      console.error(`Could not update ${module.name}.`, error);
      return false;
    }
  };

  return (
    <div className="module-page">
      <div className="module-breadcrumb"><span>Workspace</span><ChevronRight size={14} /><span>{module.group}</span><ChevronRight size={14} /><strong>{module.name}</strong></div>
      <section className="module-heading">
        <div>
          <div className="module-title-row"><h1>{module.name}</h1><span className="record-count">{apiMode ? (includeArchived ? `${totalCount} total` : `${totalCount} active`) : `${records.length - archivedCount} active`}</span></div>
          <p>{module.description}</p>
        </div>
        {canPerform("create") && <button className="button button-primary" onClick={() => setDialog({ mode: "add" })}><Plus size={17} /> Add record</button>}
      </section>
      <section className="module-stats">
        <div className="module-stat"><span className="module-stat-icon blue"><UsersRound size={17} /></span><span><small>Total records</small><strong>{apiMode ? totalCount : records.length}</strong></span></div>
        <div className="module-stat"><span className="module-stat-icon green"><Filter size={17} /></span><span><small>Showing</small><strong>{filteredCount}</strong></span></div>
        <div className="module-stat module-stat-note"><span className="module-stat-icon violet"><ArrowDownUp size={17} /></span><span><small>Persistence</small><strong>{apiMode ? "Connected API" : "Browser only"}</strong></span></div>
      </section>
      <section className="data-panel">
        <div className="table-toolbar">
          <div className="table-heading"><div><h2>All {module.name.toLowerCase()}</h2><p>Search and manage your {module.name.toLowerCase()}.</p></div></div>
          <div className="table-actions">
            <label className="table-search"><Search size={15} /><input value={search} onChange={(event) => { onSearch(event.target.value); setPage(1); }} placeholder="Search..." aria-label={`Search ${module.name}`} />{search && <button aria-label="Clear search" onClick={() => onSearch("")}><X size={14} /></button>}</label>
            {filterField && <div className="filter-control">
              <Filter size={15} />
              <select value={filterKey} onChange={(event) => { setFilterKey(event.target.value); setFilterValue(""); }} aria-label="Choose filter field">
                {module.fields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
              </select>
              {apiMode && filterField.kind !== "select" ? (
                <input value={filterValue} onChange={(event) => { setFilterValue(event.target.value); setPage(1); }} aria-label={`Filter by ${filterField.label}`} placeholder={`Exact ${filterField.label.toLowerCase()} value`} />
              ) : (
                <select value={filterValue} onChange={(event) => { setFilterValue(event.target.value); setPage(1); }} aria-label={`Filter by ${filterField.label}`}>
                  <option value="">All {filterField.label.toLowerCase()} values</option>
                  {filterOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              )}
              {(!apiMode || filterField.kind === "select") && <ChevronDown size={14} />}
            </div>}
            {module.softDelete && <label className="archived-toggle"><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /> Include archived{archivedCount > 0 ? ` (${archivedCount})` : ""}</label>}
            <div className="export-menu">
              <button className="button button-secondary export-button" onClick={() => setMenuIndex(menuIndex === -2 ? null : -2)}><Download size={15} /> Export <ChevronDown size={14} /></button>
              {menuIndex === -2 && <div className="action-menu export-dropdown">
                <button onClick={() => { doExport("excel"); setMenuIndex(null); }}><FileDown size={15} /> Export to Excel (.xlsx)</button>
                <button onClick={() => { doExport("pdf"); setMenuIndex(null); }}><FileDown size={15} /> Export to PDF</button>
              </div>}
            </div>
          </div>
        </div>
        {remoteError && <div className="storage-warning" role="alert">{remoteError}</div>}
        {exportMessage && <div className="export-toast" role="status">{exportMessage}</div>}
        <div className="table-scroll">
          <table>
            <thead><tr>
              {visibleFields.map((field) => <th key={field.key}><button className="sort-button" onClick={() => { if (sortKey === field.key) setSortAscending(!sortAscending); else { setSortKey(field.key); setSortAscending(true); } }}>{field.label}<ArrowDownUp size={12} /></button></th>)}
              <th>Actions</th>
            </tr></thead>
            <tbody>
              {visible.map(({ record, index }) => (
                  <tr key={record._recordId ?? `${module.id}-${index}`} className={record._archived === "true" ? "archived-row" : ""}>
                  {visibleFields.map((field, fieldIndex) => {
                    const value = record[field.key] ?? "—";
                    return <td key={field.key}>{field.kind === "select" ? <span className={`status-pill ${statusClass(value)}`}><span />{value}</span> : <span className={fieldIndex === 0 ? "primary-cell" : ""}>{value}</span>}{fieldIndex === 0 && record._archived === "true" && <span className="archived-pill">Archived</span>}</td>;
                  })}
                  <td className="row-actions">
                    <button className="row-action view-action" aria-label={`View ${recordLabel(module, record)}`} onClick={() => selectDialogRecord("view", index)}><Eye size={16} /></button>
                    {record._archived !== "true" && canPerform("update") && <button className="row-action" aria-label={`Edit ${recordLabel(module, record)}`} onClick={() => selectDialogRecord("edit", index)}><Pencil size={15} /></button>}
                    <div className="row-menu-wrap">
                      <button className="row-action" aria-label={`More actions for ${recordLabel(module, record)}`} onClick={() => setMenuIndex(menuIndex === index ? null : index)}><Ellipsis size={17} /></button>
                      {menuIndex === index && <div className="action-menu row-dropdown">
                        <button onClick={() => selectDialogRecord("view", index)}><Eye size={14} /> View details</button>
                        {record._archived !== "true" && canPerform("update") && <button onClick={() => selectDialogRecord("edit", index)}><Pencil size={14} /> Edit record</button>}
                        {module.softDelete && record._archived === "true"
                          ? canPerform("update") && <button onClick={() => { setMenuIndex(null); void runAction(onRestore, index); }}><ArrowDownUp size={14} /> Restore record</button>
                          : canPerform("delete") && <button className="delete-menu-item" onClick={() => { setDeleteIndex(index); setMenuIndex(null); }}><Trash2 size={14} /> {module.softDelete ? "Archive record" : "Delete record"}</button>}
                      </div>}
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length && <tr><td className="empty-cell" colSpan={visibleFields.length + 1}>
                {remoteLoading ? <div className="empty-state"><span className="loading-spinner" /><strong>Loading records...</strong></div> :
                <div className="empty-state"><span><Search size={21} /></span><strong>{remoteError ? "Records could not be loaded" : "No records found"}</strong><p>{remoteError || (search || filterValue ? "Try adjusting your search or filters." : `Add your first ${module.name.toLowerCase()} record to get started.`)}</p>{!remoteError && !search && !filterValue && canPerform("create") && <button className="button button-primary button-small" onClick={() => setDialog({ mode: "add" })}><Plus size={15} /> Add record</button>}</div>
                }
              </td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="table-footer">
          <span>Showing <strong>{filteredCount ? (page - 1) * pageSize + 1 : 0}–{Math.min((page - 1) * pageSize + visible.length, filteredCount)}</strong> of <strong>{filteredCount}</strong> records</span>
          <div className="pagination">
            <button className="button button-secondary page-button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={15} /> Previous</button>
            <span>Page {page} of {pageCount}</span>
            <button className="button button-secondary page-button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next <ChevronRight size={15} /></button>
          </div>
        </footer>
      </section>
      {dialog && <RecordDialog key={`${module.id}-${dialog.mode}-${dialog.mode !== "add" ? dialog.index : "new"}`} module={module} mode={dialog.mode} initialRecord={activeDialogRecord} onClose={() => setDialog(null)} onSave={handleSave} />}
      {deleteIndex !== null && <ConfirmDialog action={module.softDelete ? "archive" : "delete"} name={recordLabel(module, currentRecords[deleteIndex] ?? {})} onCancel={() => setDeleteIndex(null)} onConfirm={() => {
        const action = module.softDelete ? onArchive : onDelete;
        const selectedIndex = deleteIndex;
        void runAction(action, selectedIndex).then((succeeded) => { if (succeeded) { setDeleteIndex(null); setPage(1); } });
      }} />}
    </div>
  );
}
