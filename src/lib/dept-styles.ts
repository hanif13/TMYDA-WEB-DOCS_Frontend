import { 
  Users, 
  Home, 
  Heart, 
  Palette, 
  Briefcase, 
  FileText,
  ShieldCheck,
  Zap
} from "lucide-react";

/**
 * Metadata for department UI styles.
 * These are mapped by name because the DB schema doesn't include color/icon fields yet.
 * If a department name isn't found, it falls back to a default style.
 */
export const DEPT_UI_CONFIG: Record<string, { 
  color: string; 
  bg: string; 
  text: string; 
  dot: string;
  icon: any;
}> = {
  "สำนักอำนวยการ": { 
    color: "amber", 
    bg: "bg-amber-100", 
    text: "text-amber-800", 
    dot: "bg-amber-400",
    icon: ShieldCheck
  },
  "สมาคมพัฒนาเยาวชนมุสลิมไทย": { 
    color: "blue", 
    bg: "bg-blue-100", 
    text: "text-blue-800", 
    dot: "bg-blue-400",
    icon: Users
  },
  "สำนักกิจการสตรี สมาคมฯ": { 
    color: "pink", 
    bg: "bg-pink-100", 
    text: "text-pink-800", 
    dot: "bg-pink-400",
    icon: Heart
  },
  "ครอบครัวฟิตยะตุลฮัก": { 
    color: "emerald", 
    bg: "bg-emerald-100", 
    text: "text-emerald-800", 
    dot: "bg-emerald-400",
    icon: Home
  }
};

export const DEFAULT_DEPT_UI = {
  color: "slate",
  bg: "bg-slate-100",
  text: "text-slate-800",
  dot: "bg-slate-400",
  icon: Briefcase
};

/**
 * Utility to get department styles by name
 */
export const getDeptStyle = (name?: string) => {
  if (!name) return DEFAULT_DEPT_UI;
  return DEPT_UI_CONFIG[name] || DEFAULT_DEPT_UI;
};
