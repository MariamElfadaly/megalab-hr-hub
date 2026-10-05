import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { useRoster } from "../contexts/RosterContext";
import logo from "../assets/megalab-logo.png";
import ReminderBell from "./ReminderBell";
import "./AppShell.css";

const SECTIONS = [
  { path: "/", key: "employees" },
  { path: "/file-tracker", key: "fileTracker" },
  { path: "/labels", key: "labelGenerator" },
  { path: "/locker-room", key: "lockerRoom" },
  { path: "/hr-timeline", key: "hrTimeline" },
  { path: "/reminders", key: "reminders" },
];

export default function AppShell({ children }) {
  const { t, lang, setLang } = useLanguage();
  const { logout } = useAuth();
  const { search, loaded, syncError } = useRoster();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("megalab_sidebar_collapsed") === "1");
  const navigate = useNavigate();

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("megalab_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }

  const results = query.trim() ? search(query) : [];

  function goToEmployee(id) {
    setQuery("");
    // Was previously /employees/:id — that route doesn't exist and
    // silently bounced back to the dashboard. File Tracker is the most
    // "home base" per-employee view (full checklist + links to every
    // other system), so it's the sensible default landing spot.
    navigate(`/file-tracker/${id}`);
  }

  return (
    <div className="shell">
      <aside className={"shell__sidebar" + (collapsed ? " is-collapsed" : "")}>
        <button
          className="shell__collapseBtn"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: collapsed ? "rotate(180deg)" : "none" }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="shell__topRow">
          {!collapsed && <img src={logo} alt="MegaLab" className="shell__logo" />}
          <ReminderBell />
        </div>
        {!collapsed && <p className="shell__eyebrow">Lab ops</p>}

        <nav className="shell__nav">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.path}
              to={s.path}
              end={s.path === "/"}
              title={collapsed ? t(s.key) : undefined}
              className={({ isActive }) => "shell__navItem" + (isActive ? " is-active" : "")}
            >
              <span className="shell__dot" />
              {!collapsed && t(s.key)}
            </NavLink>
          ))}
        </nav>

        <div className="shell__sidebarFooter">
          <span
            className={"shell__syncPill" + (syncError ? " is-error" : loaded ? "" : " is-loading")}
            title={collapsed ? (syncError ? "Sync error" : loaded ? t("synced") : "Loading…") : undefined}
          >
            <span className="shell__syncDot" />
            {!collapsed && (syncError ? "Sync error" : loaded ? t("synced") : "Loading…")}
          </span>
          <button className="shell__langToggle" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
            {lang === "en" ? "AR" : "EN"}
          </button>
          <button className="shell__logout" onClick={logout} title={collapsed ? t("logout") : undefined}>
            {collapsed ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            ) : (
              t("logout")
            )}
          </button>
        </div>
      </aside>

      <main className="shell__main paper-grid">
        <div className="shell__search">
          <input
            className="shell__searchInput"
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {results.length > 0 && (
            <div className="shell__searchResults">
              {results.slice(0, 8).map((emp) => (
                <button key={emp.id} className="shell__searchResult" onClick={() => goToEmployee(emp.id)}>
                  <span className="shell__searchResultId">{emp.id}</span>
                  <span>{emp.nameEn}</span>
                  <span className="shell__searchResultAr">{emp.nameAr}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {children}
      </main>
    </div>
  );
}
