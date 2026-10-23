"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  PALETTE_THEMES,
  ThemeKey,
  UPGRADED_CSS_SOURCE,
  copyTextSafe,
} from "@/lib/palette";

interface ThemeContextValue {
  theme: ThemeKey;
  setThemeChoice: (t: ThemeKey) => void;
  showToast: (msg: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "aurora",
  setThemeChoice: () => {},
  showToast: () => {},
});

export function useThemePalette() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeKey>("aurora");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showCssInspector, setShowCssInspector] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
  };

  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), 2800);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = window.localStorage.getItem("propdesk_theme") as ThemeKey | null;
    const initialTheme: ThemeKey =
      savedTheme && PALETTE_THEMES[savedTheme] ? savedTheme : "aurora";

    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
    document.body.classList.add("css-upgraded");
  }, []);

  const setThemeChoice = (chosen: ThemeKey) => {
    setTheme(chosen);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("propdesk_theme", chosen);
      document.documentElement.setAttribute("data-theme", chosen);
      document.body.classList.add("css-upgraded");
    }
    showToast(`Activated "${PALETTE_THEMES[chosen].shortName}" Palette & Background`);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, setThemeChoice, showToast }}
    >
      {/* Top Preview Control Banner */}
      <div className="no-print bg-slate-900 text-white px-4 py-2.5 border-b border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Vercel + Neon Ready
            </span>
            <span className="text-slate-300 font-medium hidden lg:inline">
              HBBEAST/propdesk-property-matcher — Palette &amp; Aurora Background
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Theme Palette Switcher */}
            <div className="inline-flex items-center rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setThemeChoice("aurora")}
                className={
                  theme === "aurora"
                    ? "px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600 text-white transition flex items-center gap-1.5"
                    : "px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5"
                }
              >
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400"></span>
                Royal Aurora
              </button>
              <button
                type="button"
                onClick={() => setThemeChoice("emerald")}
                className={
                  theme === "emerald"
                    ? "px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600 text-white transition flex items-center gap-1.5"
                    : "px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5"
                }
              >
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400"></span>
                Emerald Luxe
              </button>
              <button
                type="button"
                onClick={() => setThemeChoice("sunset")}
                className={
                  theme === "sunset"
                    ? "px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600 text-white transition flex items-center gap-1.5"
                    : "px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5"
                }
              >
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-rose-400 to-amber-400"></span>
                Sunset Coral
              </button>
            </div>

            {/* View CSS Code Toggle */}
            <button
              type="button"
              onClick={() => setShowCssInspector((v) => !v)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition"
            >
              {"{ }"} Inspect globals.css
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="no-print fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* CSS Code Inspector Modal */}
      {showCssInspector && (
        <div className="no-print fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Upgraded <code className="text-pink-300">src/app/globals.css</code>
                </h2>
                <p className="text-xs text-slate-400">
                  Drop-in stylesheet with Color Palette Tokens &amp; Aurora Background for Vercel + Neon
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    copyTextSafe(UPGRADED_CSS_SOURCE);
                    showToast("Copied globals.css to clipboard!");
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition"
                >
                  📋 Copy globals.css
                </button>
                <button
                  type="button"
                  onClick={() => setShowCssInspector(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            <div className="bg-slate-950 text-slate-100 rounded-xl p-4 overflow-auto border border-slate-800 flex-1">
              <pre className="text-xs font-mono leading-relaxed">{UPGRADED_CSS_SOURCE}</pre>
            </div>
          </div>
        </div>
      )}

      {children}
    </ThemeContext.Provider>
  );
}

export function PaletteSwatchStrip() {
  const { theme, showToast } = useThemePalette();
  const activeTheme = PALETTE_THEMES[theme] || PALETTE_THEMES.aurora;

  return (
    <div className="no-print max-w-6xl w-full mx-auto px-4 pt-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            🎨 Active Color Palette:
          </span>
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
            {activeTheme.label}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeTheme.swatches.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => {
                copyTextSafe(s.hex);
                showToast(`Copied swatch ${s.hex} (${s.name}) to clipboard`);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-sm hover:scale-105 transition text-xs font-semibold text-slate-700"
              title={`${s.role} — Click to copy ${s.hex}`}
            >
              <span
                className="w-3 h-3 rounded-full border border-black/10"
                style={{ backgroundColor: s.hex }}
              />
              <span>{s.name}</span>
              <span className="font-mono text-[10px] text-slate-400">{s.hex}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
