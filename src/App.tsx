import { useCallback, useEffect, useMemo, useState } from "react";
import { Menu, RotateCcw } from "lucide-react";
import Dashboard from "./features/dashboard/Dashboard";
import ModulePage from "./features/modules/ModulePage";
import LoginPage from "./components/LoginPage";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import {
  createRecord, deleteRecord as deleteApiRecord, getAllRecords, getCurrentUser, getRecords, login,
  restoreRecord as restoreApiRecord, updateRecord as updateApiRecord, ApiRequestError,
  type ApiRecord, type AuthenticatedUser, type RecordListQuery,
} from "./services/api";
import { modules, moduleById, type RecordData } from "../shared/modules";
import { createInitialStore, loadStore, saveStore, type RecordStore } from "./services/storage";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
const apiMode = Boolean(apiBaseUrl);

function getInitialState(): { store: RecordStore; error: string; shouldSave: boolean } {
  try {
    const hasSavedData = window.localStorage.getItem("dynamicfix-erp-records") !== null;
    return { store: loadStore(), error: "", shouldSave: !hasSavedData };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Saved browser data could not be loaded.";
    console.error("Could not load DynamicFix ERP data.", error);
    return { store: createInitialStore(), error: `${message} Sample data is shown; restore sample data to replace the saved data.`, shouldSave: false };
  }
}

function asApiRecord(record: RecordData): ApiRecord {
  const recordId = record._recordId;
  const archived = record._archived;
  if (typeof recordId !== "string" || typeof archived !== "string") {
    throw new Error("The API record is missing its server ID. Refresh the list and try again.");
  }
  return { ...record, _recordId: recordId, _archived: archived };
}

export default function App() {
  const [initialState] = useState(() => apiMode
    ? { store: createInitialStore(), error: "", shouldSave: false }
    : getInitialState());
  const [store, setStore] = useState<RecordStore>(initialState.store);
  const [activeId, setActiveId] = useState("overview");
  const [search, setSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [resetPrompt, setResetPrompt] = useState(false);
  const [storageError, setStorageError] = useState(initialState.error);
  const [canSave, setCanSave] = useState(initialState.shouldSave);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [moduleTotals, setModuleTotals] = useState<Record<string, number>>({});
  const [dashboardRefresh, setDashboardRefresh] = useState(0);
  const activeModule = moduleById(activeId);
  const visibleModules = useMemo(() => !apiMode || permissions.includes("*")
    ? modules
    : modules.filter((item) => permissions.includes(`records:${item.id}:read`)), [permissions]);

  useEffect(() => {
    if (apiMode || !canSave) return;
    try {
      saveStore(store);
      setStorageError("");
      setCanSave(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save your changes to browser storage.";
      setStorageError(message);
      console.error("Could not save DynamicFix ERP data.", error);
    }
  }, [store, canSave]);

  const signOut = useCallback((message = "") => {
    setToken("");
    setUser(null);
    setPermissions([]);
    setLoginError(message);
    setStore(createInitialStore());
    setModuleTotals({});
    setDashboardError("");
    setDashboardLoading(false);
    setActiveId("overview");
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setLoginLoading(true);
    setLoginError("");
    try {
      const session = await login(apiBaseUrl, email, password);
      const profile = await getCurrentUser(apiBaseUrl, session.accessToken);
      setToken(session.accessToken);
      setUser(profile.user);
      setPermissions(profile.permissions);
      setStore(Object.fromEntries(modules.map((item) => [item.id, []])) as RecordStore);
      setSearch("");
      setActiveId("overview");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign-in failed.";
      setLoginError(message);
      console.error("Could not sign in to DynamicFix ERP.", error);
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const navigate = useCallback((id: string, query = "") => {
    setActiveId(id);
    setSearch(query);
    setMobileSidebarOpen(false);
  }, []);

  const updateModule = (moduleId: string, updater: (records: RecordData[]) => RecordData[]) => {
    setCanSave(true);
    setStore((current) => ({ ...current, [moduleId]: updater(current[moduleId] ?? []) }));
  };

  const addRecord = useCallback(async (record: RecordData) => {
    if (apiMode) {
      if (!token) throw new Error("Your session has expired. Sign in again.");
      await createRecord(apiBaseUrl, token, activeId, record);
      setDashboardRefresh((current) => current + 1);
      return;
    }
    updateModule(activeId, (records) => [record, ...records]);
  }, [activeId, token]);

  const editRecord = useCallback(async (index: number, record: RecordData) => {
    if (apiMode) {
      if (!token) throw new Error("Your session has expired. Sign in again.");
      await updateApiRecord(apiBaseUrl, token, activeId, asApiRecord(record), record);
      setDashboardRefresh((current) => current + 1);
      return;
    }
    updateModule(activeId, (records) => records.map((item, itemIndex) => itemIndex === index ? record : item));
  }, [activeId, token]);

  const deleteRecord = useCallback(async (index: number, record: RecordData) => {
    if (apiMode) {
      if (!token) throw new Error("Your session has expired. Sign in again.");
      await deleteApiRecord(apiBaseUrl, token, activeId, asApiRecord(record));
      setDashboardRefresh((current) => current + 1);
      return;
    }
    updateModule(activeId, (records) => records.filter((_, itemIndex) => itemIndex !== index));
  }, [activeId, token]);

  const archiveRecord = useCallback(async (index: number, record: RecordData) => {
    if (apiMode) return deleteRecord(index, record);
    updateModule(activeId, (records) => records.map((item, itemIndex) => itemIndex === index ? { ...item, _archived: "true" } : item));
  }, [activeId, deleteRecord]);

  const restoreRecord = useCallback(async (index: number, record: RecordData) => {
    if (apiMode) {
      if (!token) throw new Error("Your session has expired. Sign in again.");
      await restoreApiRecord(apiBaseUrl, token, activeId, asApiRecord(record));
      setDashboardRefresh((current) => current + 1);
      return;
    }
    updateModule(activeId, (records) => records.map((item, itemIndex) => itemIndex === index ? { ...item, _archived: "false" } : item));
  }, [activeId, token]);

  const loadActiveRecords = useCallback((query: RecordListQuery) => {
    if (!token) throw new Error("Your session has expired. Sign in again.");
    return getRecords(apiBaseUrl, token, activeId, query);
  }, [activeId, token]);

  const loadAllActiveRecords = useCallback((query: Omit<RecordListQuery, "page" | "limit">) => {
    if (!token) throw new Error("Your session has expired. Sign in again.");
    return getAllRecords(apiBaseUrl, token, activeId, query);
  }, [activeId, token]);

  const handleUnauthorized = useCallback(() => signOut("Your session expired. Sign in again."), [signOut]);

  useEffect(() => {
    if (!apiMode || !token || activeId !== "overview") return;
    let active = true;
    setDashboardLoading(true);
    setDashboardError("");
    const snapshot: RecordStore = Object.fromEntries(modules.map((item) => [item.id, []]));
    const totals: Record<string, number> = {};
    const readable = permissions.includes("*") ? modules : modules.filter((item) => permissions.includes(`records:${item.id}:read`));
    let nextModule = 0;
    const workers = Array.from({ length: Math.min(6, readable.length) }, async () => {
      while (active && nextModule < readable.length) {
        const module = readable[nextModule++];
        try {
          if (search.trim() || ["employees", "projects", "stock", "invoices"].includes(module.id)) {
            const matchingRecords = await getAllRecords(apiBaseUrl, token, module.id, { search: search.trim() });
            snapshot[module.id] = matchingRecords;
            totals[module.id] = matchingRecords.length;
          } else {
            const response = await getRecords(apiBaseUrl, token, module.id, { page: 1, limit: 100 });
            snapshot[module.id] = response.records;
            totals[module.id] = response.pagination.total;
          }
        } catch (error) {
          if (error instanceof ApiRequestError && error.status === 401) {
            if (active) signOut("Your session expired. Sign in again.");
            return;
          }
          console.error(`Could not load ${module.name} for the dashboard.`, error);
          if (active) setDashboardError(`Some dashboard data could not be loaded: ${error instanceof Error ? error.message : "Unknown API error."}`);
        }
      }
    });
    void Promise.all(workers).then(() => {
      if (active) {
        setStore(snapshot);
        setModuleTotals(totals);
        setDashboardLoading(false);
      }
    });
    return () => { active = false; };
  }, [token, permissions, search, activeId, dashboardRefresh, signOut]);

  const globalCount = useMemo(() => apiMode
    ? Object.values(moduleTotals).reduce((sum, total) => sum + total, 0)
    : Object.values(store).reduce((sum, records) => sum + records.length, 0), [store, moduleTotals]);

  const resetData = () => {
    setCanSave(true);
    setStore(createInitialStore());
    setResetPrompt(false);
  };

  if (apiMode && !token) {
    return <LoginPage apiUrl={apiBaseUrl} loading={loginLoading} error={loginError} onLogin={handleLogin} />;
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? "app-sidebar-collapsed" : ""}`}>
      <div className={`sidebar-backdrop ${mobileSidebarOpen ? "visible" : ""}`} onClick={() => setMobileSidebarOpen(false)} />
      <div className={mobileSidebarOpen ? "mobile-sidebar-open" : ""}>
        <Sidebar activeId={activeId} collapsed={sidebarCollapsed} modules={visibleModules} apiMode={apiMode} onToggle={() => setSidebarCollapsed((current) => !current)} onNavigate={navigate} onReset={() => setResetPrompt(true)} />
      </div>
      <div className="main-shell">
        <Topbar value={search} onSearch={setSearch} onNavigate={navigate} onSignOut={apiMode ? () => signOut() : undefined} profileName={user?.name} profileRole={permissions.includes("*") ? "Administrator" : "ERP user"} showNotifications={!apiMode || visibleModules.some((item) => item.id === "notifications")} />
        <main className="main-content">
          <button className="mobile-menu-button" onClick={() => setMobileSidebarOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
          {storageError && <div className="storage-warning" role="alert"><strong>{canSave ? "Changes could not be saved." : "Saved data could not be loaded."}</strong> {storageError}</div>}
          {dashboardError && activeId === "overview" && <div className="storage-warning" role="alert">{dashboardError}</div>}
          {activeModule ? (
            <ModulePage
              key={activeModule.id}
              module={activeModule}
              records={store[activeModule.id] ?? []}
              search={search}
              onSearch={setSearch}
              onAdd={addRecord}
              onEdit={editRecord}
              onDelete={deleteRecord}
              onArchive={archiveRecord}
              onRestore={restoreRecord}
              apiMode={apiMode}
              onLoadRecords={apiMode ? loadActiveRecords : undefined}
              onLoadAllRecords={apiMode ? loadAllActiveRecords : undefined}
              onUnauthorized={handleUnauthorized}
              permissions={permissions}
            />
          ) : (
            <Dashboard modules={visibleModules} store={store} search={search} onNavigate={navigate} moduleTotals={moduleTotals} loading={dashboardLoading} userName={user?.name} apiMode={apiMode} />
          )}
          <footer className="app-footer"><span>© 2026 DynamicFix ERP</span><span>{globalCount} {apiMode ? "records" : "sample records"} <i /> {apiMode ? "Connected workspace" : "Prototype workspace"}</span></footer>
        </main>
      </div>
      {resetPrompt && <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setResetPrompt(false)}>
        <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="reset-title">
          <div className="confirm-icon"><RotateCcw size={21} /></div><h2 id="reset-title">Restore sample data?</h2>
          <p>This replaces all records in this browser with the original sample data.</p>
          <div className="dialog-footer"><button className="button button-secondary" onClick={() => setResetPrompt(false)}>Cancel</button><button className="button button-primary" onClick={resetData}>Restore data</button></div>
        </section>
      </div>}
    </div>
  );
}
