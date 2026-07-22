import { ThemeColor } from "../types";

export interface ThemeClasses {
  text: string;
  textMuted: string;
  bg: string;
  bgMuted: string;
  border: string;
  borderMuted: string;
  shadow: string;
  checkboxActive: string;
  hoverBg: string;
  gradientFrom: string;
  glow: string;
}

export const THEME_MAP: Record<ThemeColor, ThemeClasses> = {
  cyan: {
    text: "text-cyan-400",
    textMuted: "text-cyan-300",
    bg: "bg-cyan-500",
    bgMuted: "bg-cyan-500/10",
    border: "border-cyan-400/40",
    borderMuted: "border-cyan-500/25",
    shadow: "shadow-cyan-500/25",
    checkboxActive: "bg-cyan-700 border-cyan-600 text-cyan-300",
    hoverBg: "hover:bg-cyan-500/10",
    gradientFrom: "from-cyan-600/5",
    glow: "bg-cyan-600/5",
  },
  blue: {
    text: "text-blue-400",
    textMuted: "text-blue-300",
    bg: "bg-blue-500",
    bgMuted: "bg-blue-500/10",
    border: "border-blue-400/40",
    borderMuted: "border-blue-500/25",
    shadow: "shadow-blue-500/25",
    checkboxActive: "bg-blue-700 border-blue-600 text-blue-300",
    hoverBg: "hover:bg-blue-500/10",
    gradientFrom: "from-blue-600/5",
    glow: "bg-blue-600/5",
  },
  emerald: {
    text: "text-emerald-400",
    textMuted: "text-emerald-300",
    bg: "bg-emerald-500",
    bgMuted: "bg-emerald-500/10",
    border: "border-emerald-400/40",
    borderMuted: "border-emerald-500/25",
    shadow: "shadow-emerald-500/25",
    checkboxActive: "bg-emerald-700 border-emerald-600 text-emerald-300",
    hoverBg: "hover:bg-emerald-500/10",
    gradientFrom: "from-emerald-600/5",
    glow: "bg-emerald-600/5",
  },
  purple: {
    text: "text-purple-400",
    textMuted: "text-purple-300",
    bg: "bg-purple-500",
    bgMuted: "bg-purple-500/10",
    border: "border-purple-400/40",
    borderMuted: "border-purple-500/25",
    shadow: "shadow-purple-500/25",
    checkboxActive: "bg-purple-700 border-purple-600 text-purple-300",
    hoverBg: "hover:bg-purple-500/10",
    gradientFrom: "from-purple-600/5",
    glow: "bg-purple-600/5",
  },
  rose: {
    text: "text-rose-400",
    textMuted: "text-rose-300",
    bg: "bg-rose-500",
    bgMuted: "bg-rose-500/10",
    border: "border-rose-400/40",
    borderMuted: "border-rose-500/25",
    shadow: "shadow-rose-500/25",
    checkboxActive: "bg-rose-700 border-rose-600 text-rose-300",
    hoverBg: "hover:bg-rose-500/10",
    gradientFrom: "from-rose-600/5",
    glow: "bg-rose-600/5",
  },
  amber: {
    text: "text-amber-400",
    textMuted: "text-amber-300",
    bg: "bg-amber-500",
    bgMuted: "bg-amber-500/10",
    border: "border-amber-400/40",
    borderMuted: "border-amber-500/25",
    shadow: "shadow-amber-500/25",
    checkboxActive: "bg-amber-700 border-amber-600 text-amber-300",
    hoverBg: "hover:bg-amber-500/10",
    gradientFrom: "from-amber-600/5",
    glow: "bg-amber-600/5",
  },
  slate: {
    text: "text-slate-300",
    textMuted: "text-slate-400",
    bg: "bg-slate-500",
    bgMuted: "bg-slate-500/10",
    border: "border-slate-400/40",
    borderMuted: "border-slate-500/25",
    shadow: "shadow-slate-500/25",
    checkboxActive: "bg-slate-700 border-slate-600 text-slate-300",
    hoverBg: "hover:bg-slate-500/10",
    gradientFrom: "from-slate-600/5",
    glow: "bg-slate-600/5",
  }
};

export function getThemeClasses(color?: ThemeColor): ThemeClasses {
  return THEME_MAP[color || "cyan"];
}
