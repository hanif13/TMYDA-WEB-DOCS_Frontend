"use client";
// When opening a new working year: tick which units and which people to carry over from an
// earlier year. Anything left unticked does not exist in the new year.
import { useEffect, useState } from "react";
import { Building2, Loader2, Users } from "lucide-react";
import { apiErrorMessage, fetchYearCopySource, type YearCopySource } from "@/lib/api";
import { cn } from "@/lib/utils";

export type CopySelection = { copyFromYear: number | null; departmentIds: string[]; userIds: string[] };

export function CopyFromYear({ years, value, onChange }: { years: number[]; value: CopySelection; onChange: (v: CopySelection) => void }) {
    const [loaded, setLoaded] = useState<{ year: number; data: YearCopySource | null; error?: string } | null>(null);
    const from = value.copyFromYear;
    const src = loaded?.year === from ? loaded.data : null;

    useEffect(() => {
        if (!from) return;
        fetchYearCopySource(from)
            .then(data => {
                setLoaded({ year: from, data });
                // default: everything ticked
                onChange({ copyFromYear: from, departmentIds: data.departments.map(d => d.id), userIds: data.users.map(u => u.id) });
            })
            .catch(e => setLoaded({ year: from, data: null, error: apiErrorMessage(e, "โหลดข้อมูลปีต้นทางไม่สำเร็จ") }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [from]);

    const toggle = (key: "departmentIds" | "userIds", id: string) =>
        onChange({ ...value, [key]: value[key].includes(id) ? value[key].filter(x => x !== id) : [...value[key], id] });
    const setAll = (key: "departmentIds" | "userIds", ids: string[]) => onChange({ ...value, [key]: ids });

    return (
        <div className="space-y-3">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">คัดลอกจากปีก่อน</label>
                <select
                    value={from ?? ""}
                    onChange={e => onChange({ copyFromYear: e.target.value ? Number(e.target.value) : null, departmentIds: [], userIds: [] })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                >
                    <option value="">ไม่คัดลอก — เริ่มปีใหม่แบบว่าง</option>
                    {[...years].sort((a, b) => b - a).map(y => <option key={y} value={y}>คัดลอกจากปี {y}</option>)}
                </select>
                <p className="text-[11px] text-slate-400 pl-1">เลือกเฉพาะหน่วยงานและคนที่ยังทำงานต่อ — ที่ไม่ได้เลือกจะไม่มีในปีใหม่ (เพิ่มภายหลังได้)</p>
            </div>

            {from && !src && !loaded?.error && <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}
            {loaded?.error && loaded.year === from && <p className="text-sm text-rose-600">{loaded.error}</p>}

            {src && (
                <div className="grid sm:grid-cols-2 gap-3">
                    {([
                        { key: "departmentIds" as const, icon: Building2, title: "หน่วยงาน", items: src.departments.map(d => ({ id: d.id, label: d.name, sub: d.isCommitteeOnly ? "เฉพาะหน้าคณะกรรมการ" : null })) },
                        { key: "userIds" as const, icon: Users, title: "ผู้ใช้งาน (พร้อมสิทธิ์เดิม)", items: src.users.map(u => ({ id: u.id, label: u.name, sub: [u.department, u.position].filter(Boolean).join(" · ") || `@${u.username}` })) },
                    ]).map(col => (
                        <div key={col.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-black text-slate-600 flex items-center gap-1.5"><col.icon className="w-3.5 h-3.5" />{col.title} ({value[col.key].length}/{col.items.length})</p>
                                <button type="button" onClick={() => setAll(col.key, value[col.key].length === col.items.length ? [] : col.items.map(i => i.id))} className="text-[10px] font-bold text-blue-600">
                                    {value[col.key].length === col.items.length ? "ไม่เลือกเลย" : "เลือกทั้งหมด"}
                                </button>
                            </div>
                            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                                {col.items.map(i => {
                                    const on = value[col.key].includes(i.id);
                                    return (
                                        <label key={i.id} className={cn("flex items-start gap-2 px-2.5 py-2 rounded-lg cursor-pointer border text-sm", on ? "bg-white border-blue-200" : "bg-white/50 border-transparent")}>
                                            <input type="checkbox" checked={on} onChange={() => toggle(col.key, i.id)} className="mt-0.5 accent-blue-600" />
                                            <span className="min-w-0"><span className={cn("block font-semibold truncate", on ? "text-slate-800" : "text-slate-400")}>{i.label}</span>{i.sub && <span className="block text-[10px] text-slate-400 truncate">{i.sub}</span>}</span>
                                        </label>
                                    );
                                })}
                                {!col.items.length && <p className="text-[11px] text-slate-400 py-2">ไม่มีข้อมูลในปีนั้น</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
