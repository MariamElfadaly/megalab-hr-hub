import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { useRoster } from "../contexts/RosterContext";
import "./AppShell.css";

const SECTIONS = [
  { path: "/", key: "employees" },
  { path: "/file-tracker", key: "fileTracker" },
  { path: "/labels", key: "labelGenerator" },
  { path: "/locker-room", key: "lockerRoom" },
  { path: "/hr-timeline", key: "hrTimeline" },
];

export default function AppShell({ children }) {
  const { t, lang, setLang } = useLanguage();
  const { logout } = useAuth();
  const { search, loaded, syncError } = useRoster();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const results = query.trim() ? search(query) : [];

  function goToEmployee(id) {
    setQuery("");
    navigate(`/employees/${id}`);
  }

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <p className="shell__eyebrow">Lab ops</p>
        <h1 className="shell__title">{t("appName")}</h1>

        <nav className="shell__nav">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.path}
              to={s.path}
              end={s.path === "/"}
              className={({ isActive }) => "shell__navItem" + (isActive ? " is-active" : "")}
            >
              <span className="shell__dot" />
              {t(s.key)}
            </NavLink>
          ))}
        </nav>

        <div className="shell__sidebarFooter">
          <span className={"shell__syncPill" + (syncError ? " is-error" : loaded ? "" : " is-loading")}>
            <span className="shell__syncDot" />
            {syncError ? "Sync error" : loaded ? t("synced") : "Loading…"}
          </span>
          <button className="shell__langToggle" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
            {lang === "en" ? "AR" : "EN"}
          </button>
          <button className="shell__logout" onClick={logout}>
            {t("logout")}
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
