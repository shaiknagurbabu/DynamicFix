import {
  ArrowDownRight, ArrowRight, BriefcaseBusiness, CircleDollarSign, ClipboardCheck,
  Package, TrendingUp, Users,
} from "lucide-react";
import type { ErpModule, RecordData } from "../../../shared/modules";
import type { RecordStore } from "../../services/storage";

interface DashboardProps {
  modules: ErpModule[];
  store: RecordStore;
  search: string;
  onNavigate: (id: string, search?: string) => void;
  moduleTotals?: Record<string, number>;
  loading?: boolean;
  userName?: string;
  apiMode?: boolean;
}

const cardIcons = [Users, BriefcaseBusiness, Package, CircleDollarSign];
const cardColors = ["blue", "violet", "amber", "green"];

function getRecordTitle(module: ErpModule, record: RecordData): string {
  const primary = module.fields.find((field) => ["name", "title", "order", "invoice", "reference", "employee", "description", "setting"].includes(field.key));
  return primary ? record[primary.key] || module.name : module.name;
}

export default function Dashboard({ modules, store, search, onNavigate, moduleTotals = {}, loading = false, userName = "Jagadeesh", apiMode = false }: DashboardProps) {
  const totalRecords = apiMode
    ? Object.values(moduleTotals).reduce((sum, total) => sum + total, 0)
    : Object.values(store).reduce((sum, records) => sum + records.length, 0);
  const stats = [
    { label: "Total employees", value: (moduleTotals.employees ?? store.employees?.filter((employee) => employee._archived !== "true").length ?? 0).toString(), detail: "team members", note: "Current workforce", target: "employees" },
    { label: "Active projects", value: (store.projects?.filter((project) => project._archived !== "true" && project.status === "In progress").length ?? 0).toString(), detail: "in progress", note: "Current projects", target: "projects" },
    { label: "Products in stock", value: (store.stock ?? []).reduce((sum, row) => sum + (Number(row.quantity) || 0), 0).toLocaleString(), detail: "units on hand", note: "From stock records", target: "stock" },
    { label: "Open invoices", value: (store.invoices ?? []).filter((row) => row._archived !== "true" && row.status !== "Paid").length.toString(), detail: "awaiting payment", note: "Current invoices", target: "invoices" },
  ];
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase();
  const query = search.trim().toLowerCase();
  const matches = modules.flatMap((module) =>
    (store[module.id] ?? [])
      .map((record, index) => ({ module, record, index }))
      .filter(({ record }) => record._archived !== "true" && (!query || module.fields.some((field) => (record[field.key] ?? "").toLowerCase().includes(query)))),
  );
  const recent = (query ? matches : matches.slice(0, 6));
  const resultCount = query
    ? modules.reduce((sum, module) => sum + (moduleTotals[module.id] ?? (store[module.id] ?? []).length), 0)
    : totalRecords;
  const canNavigate = (id: string) => !apiMode || modules.some((module) => module.id === id);

  return (
    <div className="dashboard-page">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">{today}</div>
          <h1>Good morning, {userName.split(/\s+/)[0]} <span>✦</span></h1>
          <p>Here’s what’s happening across your business today.</p>
        </div>
        {canNavigate("tasks") && <button className="button button-primary" onClick={() => onNavigate("tasks")}><ArrowRight size={16} /> View tasks</button>}
      </section>
      <section className="stat-grid" aria-label="Business summary">
        {stats.map((stat, index) => {
          const Icon = cardIcons[index];
          return (
            <button className="stat-card" key={stat.label} disabled={!canNavigate(stat.target)} onClick={() => onNavigate(stat.target)}>
              <div className={`stat-icon ${cardColors[index]}`}><Icon size={18} /></div>
              <span className="stat-label">{stat.label}</span>
              <div className="stat-value-row"><strong>{stat.value}</strong><span className="stat-trend">{stat.detail}</span></div>
              <span className="stat-note">{stat.note}</span>
            </button>
          );
        })}
      </section>
      <div className="dashboard-grid">
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">{query ? "ALL MODULES" : "YOUR WORKSPACE"}</span><h2>{query ? "Search results" : "Explore records"}</h2></div>
            {!query && canNavigate("employees") && <button className="text-button" onClick={() => onNavigate("employees")}>View all <ArrowRight size={15} /></button>}
          </div>
          <div className="activity-list">
            {apiMode && !modules.length && <div className="global-empty">Your account does not have permission to view any modules.</div>}
            {recent.slice(0, query ? 12 : 6).map(({ module, record, index }) => (
              <button className="activity-row" key={`${module.id}-${index}`} onClick={() => onNavigate(module.id, query)}>
                <span className={`activity-icon activity-${module.group.toLowerCase().replace(/[^a-z]/g, "")}`}><ClipboardCheck size={17} /></span>
                <span className="activity-copy"><strong>{getRecordTitle(module, record)}</strong><small>{module.name} · {record.status || record.date || "Updated recently"}</small></span>
                <span className="activity-meta">Open <ArrowRight size={13} /></span>
              </button>
            ))}
            {loading && !recent.length && <div className="global-empty">Loading records...</div>}
            {query && !loading && !resultCount && <div className="global-empty">No records match “{search}”. Try another search.</div>}
          </div>
          <div className="panel-footer"><span>{query ? `${resultCount} results across ${modules.length} modules` : `${totalRecords} records across ${modules.length} modules`}</span><TrendingUp size={16} /></div>
        </section>
        <section className="panel quick-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">JUMP BACK IN</span><h2>Quick access</h2></div>
          </div>
          <div className="quick-links">
            {[
              { id: "employees", title: "Employee directory", caption: `${moduleTotals.employees ?? store.employees?.filter((employee) => employee._archived !== "true").length ?? 0} team members`, icon: Users, tone: "blue" },
              { id: "tasks", title: "Daily work", caption: `${moduleTotals.tasks ?? store.tasks?.length ?? 0} tasks to track`, icon: ClipboardCheck, tone: "violet" },
              { id: "products", title: "Product catalog", caption: `${moduleTotals.products ?? store.products?.length ?? 0} products listed`, icon: Package, tone: "amber" },
              { id: "transactions", title: "Finance overview", caption: `${moduleTotals.transactions ?? store.transactions?.length ?? 0} transactions in workspace`, icon: CircleDollarSign, tone: "green" },
            ].filter(({ id }) => canNavigate(id)).map(({ id, title, caption, icon: Icon, tone }) => (
              <button className="quick-link" key={id} onClick={() => onNavigate(id)}>
                <span className={`quick-icon ${tone}`}><Icon size={17} /></span>
                <span><strong>{title}</strong><small>{caption}</small></span>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
          {modules[0] && <button className="all-modules-link" onClick={() => onNavigate(modules[0].id)}>Explore all modules <ArrowDownRight size={15} /></button>}
        </section>
      </div>
      <section className="dashboard-banner">
        <div><span className="banner-sparkle">✦</span><div><strong>Your ERP, all in one place</strong><small>Manage operations, people, and performance from a single workspace.</small></div></div>
        <span className="banner-records">{totalRecords} <small>{apiMode ? "records" : "sample records"}</small></span>
      </section>
    </div>
  );
}
