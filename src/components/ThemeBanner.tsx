"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextValue {
  showToast: (msg: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  showToast: () => {},
});

export function useThemePalette() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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
    document.documentElement.setAttribute("data-theme", "aurora");
    document.body.classList.add("css-upgraded");
  }, []);

  return (
    <ThemeContext.Provider value={{ showToast }}>
      {toastMsg && (
        <div className="no-print fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMsg}</span>
        </div>
      )}

      {children}
    </ThemeContext.Provider>
  );
}
