import { useEffect, useRef } from "react";
import { Bell, ChevronDown, Command, Search } from "lucide-react";

interface TopbarProps {
  onSearch: (value: string) => void;
  onNavigate: (id: string) => void;
  onSignOut?: () => void;
  profileName?: string;
  profileRole?: string;
  showNotifications?: boolean;
  value: string;
}

export default function Topbar({ onSearch, onNavigate, onSignOut, profileName = "Jagadeesh", profileRole = "Administrator", showNotifications = true, value }: TopbarProps) {
  const searchInput = useRef<HTMLInputElement>(null);
  const initials = profileName.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <header className="topbar">
      <div className="breadcrumbs"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Operations</strong></div>
      <div className="topbar-right">
        <label className="global-search">
          <Search size={16} />
          <input ref={searchInput} value={value} onChange={(event) => onSearch(event.target.value)} placeholder="Search records..." aria-label="Search workspace or current module records" />
          <kbd><Command size={11} /> K</kbd>
        </label>
        {showNotifications && <button className="top-icon notification-button" aria-label="Notifications" onClick={() => onNavigate("notifications")}><Bell size={18} /><span /></button>}
        <div className="top-divider" />
        {onSignOut ? (
          <button className="profile-button" onClick={onSignOut} title="Sign out">
            <span className="profile-avatar">{initials}</span>
            <span className="profile-info"><strong>{profileName}</strong><small>{profileRole} · Sign out</small></span>
            <ChevronDown size={15} />
          </button>
        ) : (
          <div className="profile-button">
            <span className="profile-avatar">{initials}</span>
            <span className="profile-info"><strong>{profileName}</strong><small>{profileRole}</small></span>
            <ChevronDown size={15} />
          </div>
        )}
      </div>
    </header>
  );
}
