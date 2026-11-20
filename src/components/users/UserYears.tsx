"use client";
// Per-year access of one person: which working years they can open, and whether each is
// "แก้ไขได้" or "ดูอย่างเดียว". Role, permissions and unit are set per year in the main form
// (for the year currently selected in the sidebar).
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Search, UserPlus, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { apiErrorMessage, fetchAllUsers, removeUserYear, setUserYear } from "@/lib/api";
import { cn } from "@/lib/utils";

type YearRow = { thaiYear: number; access: string; role?: string; department?: string | null };

export function UserYearsEditor({ userId, years, allYears, currentYear, onChanged }: {
    userId: string;
    years: YearRow[];
    /** years the admin may manage */
    allYears: number[];
    currentYear: number | null;
    onChanged: (user: { years: YearRow[] }) => void;
}) {
    const [busy, setBusy] = useState<number | null>(null);
    const run = async (year: number, fn: () => Promise<{ years: YearRow[]; keptViewOnly?: boolean; history?: number }>) => {
        setBusy(year);
        try {
            const r = await fn();
            if (r.keptViewOnly) toast(`มีประวัติคำขอเอกสาร ${r.history} รายการในปี ${year} — เปลี่ยนเป็นดูอย่างเดียวแทนการนำออก`, { icon: "ℹ️", duration: 6000 });
            onChanged(r);
        }
        catch (e) { toast.error(apiErrorMessage(e, "บันทึกไม่สำเร็จ")); }
        finally { setBusy(null); }
    };

    return (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-1">
                <CalendarDays className="w-4 h-4" /> ปีการทำงานที่เข้าถึงได้
            </h4>
            <p className="text-[11px] text-slate-400 mb-3">ปีที่ไม่ได้เลือก ผู้ใช้นี้จะมองไม่เห็นข้อมูลของปีนั้นเลย · เพิ่มปีใหม่จะคัดลอกระดับสิทธิ์และหน่วยงานจากปีที่ใกล้ที่สุด</p>
            <div className="space-y-1.5">
                {[...allYears].sort((a, b) => b - a).map(y => {
                    const row = years.find(r => r.thaiYear === y);
                    const isCurrent = y === currentYear;
                    return (
                        <div key={y} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white", row ? "border-blue-200/60" : "border-slate-100")}>
                            <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!row}
                                    disabled={busy !== null}
                                    onChange={() => {
                                        if (row) {
                                            if (!confirm(`นำผู้ใช้นี้ออกจากปี ${y}?\n(ถ้ามีประวัติคำขอเอกสารในปีนั้น จะเปลี่ยนเป็นดูอย่างเดียวแทน เพื่อให้ยังเห็นประวัติของตัวเอง)`)) return;
                                            run(y, () => removeUserYear(userId, y));
                                        } else run(y, () => setUserYear(userId, y, "edit"));
                                    }}
                                    className="accent-blue-600 w-4 h-4"
                                />
                                <span className={cn("text-sm font-bold", row ? "text-slate-800" : "text-slate-400")}>พ.ศ. {y}</span>
                                {isCurrent && <span className="text-[10px] font-bold text-blue-500">(ปีที่กำลังแก้ไข)</span>}
                                {row?.department && <span className="text-[11px] text-slate-400 truncate">· {row.department}</span>}
                            </label>
                            {busy === y ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : row && (
                                <select
                                    value={row.access}
                                    onChange={e => run(y, () => setUserYear(userId, y, e.target.value as "edit" | "view"))}
                                    className={cn("text-xs font-bold rounded-lg border px-2 py-1", row.access === "view" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700")}
                                >
                                    <option value="edit">แก้ไขได้</option>
                                    <option value="view">ดูอย่างเดียว</option>
                                </select>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/** Pick an existing account and give it access to the working year. */
export function AddExistingUserModal({ year, onClose, onAdded }: { year: number; onClose: () => void; onAdded: () => void }) {
    const [all, setAll] = useState<Awaited<ReturnType<typeof fetchAllUsers>> | null>(null);
    const [q, setQ] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    useEffect(() => { fetchAllUsers().then(setAll).catch(e => { toast.error(apiErrorMessage(e, "โหลดรายชื่อไม่สำเร็จ")); setAll([]); }); }, []);
    const list = useMemo(() => (all ?? [])
        .filter(u => !u.superAdmin && !u.years.includes(year))
        .filter(u => !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.username.toLowerCase().includes(q.toLowerCase())), [all, q, year]);

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
            <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                    <div>
                        <h3 className="font-black text-slate-800">เพิ่มผู้ใช้เดิมเข้าปี {year}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">บัญชีที่มีอยู่แล้วแต่ยังไม่ได้อยู่ในปีนี้ — สิทธิ์และหน่วยงานคัดลอกจากปีล่าสุดของเขา แก้ต่อได้หลังเพิ่ม</p>
                    </div>
                    <button onClick={onClose} aria-label="ปิด" className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
                </div>
                <div className="px-6 pt-4">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาชื่อหรือชื่อผู้ใช้" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
                    </div>
                </div>
                <div className="p-6 pt-3 overflow-y-auto space-y-1.5">
                    {!all ? <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                        : !list.length ? <p className="py-10 text-center text-sm text-slate-400">ไม่มีบัญชีที่ยังไม่ได้อยู่ในปีนี้</p>
                            : list.map(u => (
                                <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-slate-800 truncate">{u.name}</p>
                                        <p className="text-[11px] text-slate-400">@{u.username}{u.years.length ? ` · เคยอยู่ปี ${[...u.years].sort().join(", ")}` : " · ยังไม่มีปีใด"}</p>
                                    </div>
                                    <button
                                        disabled={!!busy}
                                        onClick={async () => {
                                            setBusy(u.id);
                                            try { await setUserYear(u.id, year, "edit"); toast.success(`เพิ่ม ${u.name} เข้าปี ${year} แล้ว`); onAdded(); }
                                            catch (e) { toast.error(apiErrorMessage(e, "เพิ่มไม่สำเร็จ")); }
                                            finally { setBusy(null); }
                                        }}
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {busy === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}เพิ่ม
                                    </button>
                                </div>
                            ))}
                </div>
            </div>
        </div>
    );
}
