"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { User, getStoredUser } from "@/lib/api";
import { PALETTE_THEMES, copyTextSafe } from "@/lib/palette";
import { useThemePalette } from "@/components/ThemeBanner";

export default function PaletteShowcasePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const { theme, setThemeChoice, showToast } = useThemePalette();
  const activeTheme = PALETTE_THEMES[theme] || PALETTE_THEMES.aurora;

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(stored);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              PropDesk Color Palette &amp; Background System
            </h1>
            <p className="text-sm text-slate-600">
              Click any swatch below to copy its Hex code or CSS custom property token
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["aurora", "emerald", "sunset"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setThemeChoice(key)}
                className={
                  theme === key
                    ? "px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow"
                    : "px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                }
              >
                {PALETTE_THEMES[key].shortName}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTheme.swatches.map((s) => (
            <div
              key={s.name}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <div
                onClick={() => {
                  copyTextSafe(s.hex);
                  showToast(`Copied ${s.hex} to clipboard`);
                }}
                className="h-24 w-full flex items-end justify-between p-3 text-white font-bold text-xs cursor-pointer"
                style={{ background: s.hex }}
              >
                <span>{s.name}</span>
                <span className="font-mono bg-black/25 px-2 py-0.5 rounded">
                  {s.hex}
                </span>
              </div>
              <div className="p-4 space-y-2">
                <div className="text-xs font-mono text-indigo-700 font-semibold">
                  {s.token}
                </div>
                <div className="text-xs text-slate-600">{s.role}</div>
                <button
                  type="button"
                  onClick={() => {
                    const tokenDecl = `${s.token}: ${s.hex};`;
                    copyTextSafe(tokenDecl);
                    showToast(`Copied "${tokenDecl}"`);
                  }}
                  className="mt-1 w-full py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Copy CSS Token
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            Multi-Layered Aurora Background Architecture
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Instead of a flat grey background, <code>src/app/globals.css</code>{" "}
            layers 5 radial color orbs (<code>--bg-mesh-1</code> through{" "}
            <code>--bg-mesh-5</code>) over a 135° diagonal base gradient (
            <code>--bg-base-start</code> → <code>--bg-base-mid</code> →{" "}
            <code>--bg-base-end</code>) with{" "}
            <code>background-attachment: fixed</code>, while cards use
            translucent frosted glass (
            <code>rgba(255, 255, 255, 0.94)</code> +{" "}
            <code>backdrop-filter: blur(16px)</code>) so the background colors
            softly glow through.
          </p>
        </div>
      </main>
    </div>
  );
}
