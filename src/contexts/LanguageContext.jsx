import { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext(null);

// Minimal starter dictionary. Extend as each section is ported in —
// keep every section's own strings here rather than scattering them,
// so EN/AR stays consistent across the whole merged app.
const STRINGS = {
  en: {
    appName: "MegaLab",
    synced: "Synced",
    searchPlaceholder: "Search by name or ID",
    employees: "Employees",
    fileTracker: "File tracker",
    labelGenerator: "Label generator",
    lockerRoom: "Locker room",
    hrTimeline: "HR timeline",
    logout: "Log out",
  },
  ar: {
    appName: "ميجا لاب",
    synced: "متزامن",
    searchPlaceholder: "ابحث بالاسم أو الرقم",
    employees: "الموظفون",
    fileTracker: "متابعة الملفات",
    labelGenerator: "طباعة الملصقات",
    lockerRoom: "غرفة الخزائن",
    hrTimeline: "المسار الوظيفي",
    logout: "تسجيل الخروج",
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("megalab_lang") || "en");

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    localStorage.setItem("megalab_lang", lang);
  }, [lang]);

  const t = (key) => STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRtl: lang === "ar" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
