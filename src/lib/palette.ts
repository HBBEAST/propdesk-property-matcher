export type ThemeKey = "aurora" | "emerald" | "sunset";

export interface SwatchItem {
  name: string;
  token: string;
  hex: string;
  role: string;
}

export interface PaletteTheme {
  key: ThemeKey;
  shortName: string;
  label: string;
  swatches: SwatchItem[];
}

export const PALETTE_THEMES: Record<ThemeKey, PaletteTheme> = {
  aurora: {
    key: "aurora",
    shortName: "Royal Aurora",
    label: "Cyber Pink & Purple Gradient (Hot Pink • Vivid Purple • Deep Violet • Neon Fuchsia)",
    swatches: [
      { name: "Hot Pink", token: "--palette-primary", hex: "#DB2777", role: "Primary Gradient & CTA Start" },
      { name: "Vivid Purple", token: "--palette-secondary", hex: "#9333EA", role: "Secondary Gradient & Table Header" },
      { name: "Deep Violet", token: "--bg-base-start", hex: "#2E1065", role: "Hard Gradient Background Anchor" },
      { name: "Fuchsia Plum", token: "--bg-base-mid", hex: "#701A75", role: "Mid-Stop Purple-Pink Blend" },
      { name: "Neon Orchid", token: "--palette-accent", hex: "#E879F9", role: "Glowing Pink-Purple Highlight" },
      { name: "Electric Rose", token: "--palette-warm", hex: "#F43F5E", role: "Warm Gradient End & Hover Glow" },
    ],
  },
  emerald: {
    key: "emerald",
    shortName: "Emerald Luxe",
    label: "Neon Magenta & Indigo (Vivid Fuchsia • Electric Indigo • Deep Purple)",
    swatches: [
      { name: "Vivid Magenta", token: "--palette-primary", hex: "#C026D3", role: "Primary Gradient & CTA Start" },
      { name: "Electric Indigo", token: "--palette-secondary", hex: "#4F46E5", role: "Secondary Gradient & Table Header" },
      { name: "Midnight Indigo", token: "--bg-base-start", hex: "#1E1B4B", role: "Hard Gradient Background Start" },
      { name: "Royal Purple", token: "--bg-base-mid", hex: "#581C87", role: "Mid-Stop Deep Purple Blend" },
      { name: "Hyper Pink", token: "--palette-accent", hex: "#EC4899", role: "Mesh Spotlight & Border Glow" },
      { name: "Cyber Cyan", token: "--palette-warm", hex: "#06B6D4", role: "Contrast Accent Orb" },
    ],
  },
  sunset: {
    key: "sunset",
    shortName: "Sunset Coral",
    label: "Crimson Berry & Violet (Crimson Pink • Royal Purple • Dark Plum • Gold)",
    swatches: [
      { name: "Crimson Pink", token: "--palette-primary", hex: "#E11D48", role: "Primary Gradient & CTA Start" },
      { name: "Royal Purple", token: "--palette-secondary", hex: "#9333EA", role: "Secondary Gradient & Table Header" },
      { name: "Dark Plum", token: "--bg-base-start", hex: "#3B0764", role: "Hard Gradient Background Start" },
      { name: "Berry Wine", token: "--bg-base-mid", hex: "#831843", role: "Mid-Stop Crimson-Purple Blend" },
      { name: "Hot Magenta", token: "--palette-accent", hex: "#DB2777", role: "Interactive Accent & Glow" },
      { name: "Solar Gold", token: "--palette-warm", hex: "#F59E0B", role: "Warm Sunset Contrast Orb" },
    ],
  },
};

export function copyTextSafe(str: string): void {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(str).catch(() => {});
    return;
  }
  if (typeof document !== "undefined") {
    const ta = document.createElement("textarea");
    ta.value = str;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

export const UPGRADED_CSS_SOURCE = `@tailwind base;
@tailwind components;
@tailwind utilities;

/* ==========================================================================
   PropDesk — Property Matcher CRM
   Bold Pink & Purple Gradient Palette & High-Impact Multi-Color Background
   (Next.js 14 App Router + Tailwind CSS on Vercel & Neon)
   ========================================================================== */

:root,
[data-theme="aurora"] {
  --background: #3b0764;
  --foreground: #0f172a;
  --surface: rgba(255, 255, 255, 0.94);
  --surface-solid: #ffffff;
  --surface-subtle: #fdf4ff;
  --border-subtle: rgba(236, 72, 153, 0.42);
  --border-strong: #ec4899;

  --palette-primary: #db2777;       /* Hot Pink */
  --palette-primary-dark: #701a75;  /* Deep Fuchsia Plum */
  --palette-secondary: #9333ea;     /* Vivid Royal Purple */
  --palette-accent: #e879f9;        /* Neon Orchid Pink */
  --palette-warm: #f43f5e;          /* Electric Rose */
  --palette-gold: #f59e0b;          /* Solar Amber */
  --palette-emerald: #10b981;       /* Mint Emerald */

  --brand-50: #fdf2f8;
  --brand-100: #fce7f3;
  --brand-200: #fbcfe8;
  --brand-500: #ec4899;
  --brand-600: #db2777;
  --brand-700: #be185d;
  --brand-glow: rgba(219, 39, 119, 0.34);

  --bg-mesh-1: rgba(236, 72, 153, 0.65);
  --bg-mesh-2: rgba(147, 51, 234, 0.65);
  --bg-mesh-3: rgba(217, 70, 239, 0.55);
  --bg-mesh-4: rgba(244, 63, 94, 0.55);
  --bg-mesh-5: rgba(79, 70, 229, 0.55);
  --bg-base-start: #2e1065;
  --bg-base-mid: #701a75;
  --bg-base-end: #be185d;

  --shadow-card: 0 12px 32px -4px rgba(46, 16, 101, 0.38),
                 0 4px 12px -2px rgba(219, 39, 119, 0.22);
  --shadow-card-hover: 0 20px 42px -6px rgba(46, 16, 101, 0.50),
                       0 6px 18px -2px rgba(236, 72, 153, 0.36);
  --shadow-btn: 0 4px 14px 0 rgba(190, 24, 93, 0.48),
                0 2px 4px 0 rgba(15, 23, 42, 0.2);
  --shadow-btn-hover: 0 8px 25px -2px rgba(236, 72, 153, 0.68);
}

[data-theme="emerald"] {
  --background: #1e1b4b;
  --border-subtle: rgba(192, 38, 211, 0.45);
  --border-strong: #d946ef;
  --palette-primary: #c026d3;
  --palette-primary-dark: #4c1d95;
  --palette-secondary: #4f46e5;
  --palette-accent: #ec4899;
  --palette-warm: #06b6d4;
  --bg-base-start: #1e1b4b;
  --bg-base-mid: #581c87;
  --bg-base-end: #9d174d;
}

[data-theme="sunset"] {
  --background: #4c0519;
  --border-subtle: rgba(244, 63, 94, 0.48);
  --border-strong: #f43f5e;
  --palette-primary: #e11d48;
  --palette-primary-dark: #881337;
  --palette-secondary: #9333ea;
  --palette-accent: #db2777;
  --palette-warm: #f59e0b;
  --bg-base-start: #3b0764;
  --bg-base-mid: #831843;
  --bg-base-end: #be123c;
}
`;
