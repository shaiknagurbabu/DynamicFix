import { useState } from "react";
import {
  Activity, Archive, BadgeDollarSign, BarChart3, BriefcaseBusiness, Building2, ChevronDown, ChevronLeft,
  ClipboardList, FileText, GraduationCap, LayoutDashboard, Package, PanelLeftClose, RotateCcw, Settings,
  ShieldCheck, ShoppingCart, Truck, Users, Warehouse, type LucideIcon,
} from "lucide-react";
import { moduleGroups, modules } from "../../shared/modules";

const groupIcons: Record<string, LucideIcon> = {
  Administration: Users,
  HR: BriefcaseBusiness,
  "Daily Work": ClipboardList,
  Projects: BriefcaseBusiness,
  Tenders: FileText,
  Training: GraduationCap,
  Trading: Package,
  "Import / Export": Truck,
  Sales: ShoppingCart,
  Inventory: Warehouse,
  Finance: BadgeDollarSign,
  Reports: BarChart3,
  CRM: Building2,
  Vendors: Archive,
  Documents: FileText,
  Security: ShieldCheck,
  Settings,
};

interface SidebarProps {
  activeId: string;
  collapsed: boolean;
  modules?: typeof modules;
  apiMode?: boolean;
  onToggle: () => void;
  onNavigate: (id: string) => void;
  onReset: () => void;
}

export default function Sidebar({ activeId, collapsed, modules: visibleModules = modules, apiMode = false, onToggle, onNavigate, onReset }: SidebarProps) {
  const [expanded, setExpanded] = useState<string[]>(moduleGroups);
  const toggleGroup = (group: string) => setExpanded((current) => current.includes(group) ? current.filter((item) => item !== group) : [...current, group]);

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="brand">
        <div className="brand-mark">D<span>F</span></div>
        {!collapsed && <div className="brand-copy"><strong>Dynamicfix</strong><small>TECH INNOVATION PRIVATE LIMITED</small></div>}
        <button className="collapse-button" type="button" onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}><PanelLeftClose size={18} /></button>
      </div>
      <nav className="side-nav" aria-label="Main navigation">
        <button className={`nav-overview ${activeId === "overview" ? "active" : ""}`} onClick={() => onNavigate("overview")} title="Overview">
          <LayoutDashboard size={18} /> {!collapsed && <span>Overview</span>}
        </button>
        {!collapsed && <div className="nav-label">WORKSPACE</div>}
        {moduleGroups.map((group) => {
          const Icon = groupIcons[group] ?? Activity;
          const groupModules = visibleModules.filter((item) => item.group === group);
          if (!groupModules.length) return null;
          const isExpanded = expanded.includes(group);
          return (
            <div className="nav-group" key={group}>
              <button className="nav-group-heading" onClick={() => collapsed ? onNavigate(groupModules[0].id) : toggleGroup(group)} title={group}>
                <Icon size={17} />
                {!collapsed && <><span>{group}</span><ChevronDown className={isExpanded ? "" : "chevron-closed"} size={14} /></>}
              </button>
              {!collapsed && isExpanded && <div className="nav-children">
                {groupModules.map((item) => (
                  <button key={item.id} className={`nav-child ${activeId === item.id ? "active" : ""}`} onClick={() => onNavigate(item.id)}>
                    <span className="nav-dot" />{item.name}
                  </button>
                ))}
              </div>}
            </div>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        {!apiMode && <button className="sidebar-utility" onClick={onReset} title="Reset sample data"><RotateCcw size={17} />{!collapsed && <span>Reset sample data</span>}</button>}
        {!collapsed && <div className="workspace-card">
          <div className="workspace-avatar">DF</div>
          <div><strong>DynamicFix Inc.</strong><span>Business workspace</span></div>
          <ChevronLeft size={15} />
        </div>}
      </div>
    </aside>
  );
}
