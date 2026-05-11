import { createContext, useContext, useEffect, useMemo, useState } from "react";
import translations from "./translations";

const LanguageContext = createContext(null);

export const SUPPORTED_LANGS = ["en", "nb", "zh"];
const STORAGE_KEY = "ff_lang_v1";

function readStoredLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && SUPPORTED_LANGS.includes(v)) return v;
  } catch {}
  return "en";
}

function lookup(dict, key) {
  const parts = key.split(".");
  let cur = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return undefined;
  }
  return cur;
}

function format(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  );
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => readStoredLang());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  }, [lang]);

  const value = useMemo(() => {
    function t(key, params) {
      const fromLang = lookup(translations[lang], key);
      const v = fromLang ?? lookup(translations.en, key) ?? key;
      return typeof v === "string" ? format(v, params) : v;
    }
    function tl(field, params) {
      if (field == null) return "";
      if (typeof field === "string") return format(field, params);
      const v = field[lang] ?? field.en ?? "";
      return typeof v === "string" ? format(v, params) : v;
    }
    return { lang, setLang: setLangState, t, tl };
  }, [lang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback so utility modules can call useLang outside provider
    // during HMR — returns English-only with no-ops.
    return {
      lang: "en",
      setLang: () => {},
      t: (key) => lookup(translations.en, key) ?? key,
      tl: (f) => (typeof f === "string" ? f : (f?.en ?? "")),
    };
  }
  return ctx;
}
