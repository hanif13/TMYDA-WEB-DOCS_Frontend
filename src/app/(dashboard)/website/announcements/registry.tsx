"use client";
// Registry (ทะเบียนเอกสาร) documents in a "ประกาศ…" category show on the public website automatically.
// Staff can hide individual documents (e.g. internal orders) from here.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, FileText, Loader2, Search } from "lucide-react";
import { fetchRegistryAnnouncements, setRegistryAnnouncementVisibility, type RegistryAnnouncement } from "@/lib/api";
import { PUBLIC_SITE_URL, formatThaiDate, inputCls, useCanEditWebsite } from "../_shared";
import { errMsg } from "../_editors";

export function RegistryAnnouncements({ toast }: { toast: (m: string, t?: "success" | "error") => void }) {
    const canEdit = useCanEditWebsite();
    const [items, setItems] = useState<RegistryAnnouncement[] | null>(null);
    const [q, setQ] = useState("");
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        try { setItems(await fetchRegistryAnnouncements()); } catch { toast("โหลดเอกสารประกาศไม่สำเร็จ", "error"); }
    }, [toast]);
    useEffect(() => { load(); }, [load]);

    const shown = useMemo(() => (items ?? []).filter(d => !q || `${d.docNo} ${d.name} ${d.department?.name ?? ""}`.toLowerCase().includes(q.toLowerCase())), [items, q]);
    const visible = (items ?? []).filter(d => !d.hideOnWebsite).length;

    const toggle = async (ids: string[], hide: boolean) => {
        setBusy(ids.length > 1 ? "all" : ids[0]);
        try {
            await setRegistryAnnouncementVisibility(ids, hide);
            setItems(list => list?.map(d => (ids.includes(d.id) ? { ...d, hideOnWebsite: hide } : d)) ?? null);
            toast(hide ? "ซ่อนจากเว็บไซต์แล้ว · มีผลภายใน 1 นาที" : "แสดงบนเว็บไซต์แล้ว · มีผลภายใน 1 นาที");
        } catch (e) { toast(errMsg(e, "บันทึกไม่สำเร็จ"), "error"); }
        finally { setBusy(null); }
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                เอกสารประเภท <strong>ประกาศหรือคำสั่ง</strong> ในเมนู <strong>ทะเบียนเอกสาร</strong> แสดงบนเว็บไซต์ให้อัตโนมัติ (เลขที่ ชื่อเรื่อง หน่วยงาน วันที่ และไฟล์ PDF)
                หากเป็นเอกสารภายในที่ไม่ควรเผยแพร่ กด &quot;ซ่อน&quot; ได้ทีละรายการ
            </p>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input aria-label="ค้นหาเอกสารประกาศ" value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาเลขที่หรือชื่อเรื่อง…" className={`${inputCls} pl-9 bg-slate-50/50`} />
                </div>
                <span className="text-sm text-slate-500">แสดงบนเว็บ {visible} / {items?.length ?? 0}</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {!items ? <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></div>
                    : !shown.length ? <p className="py-16 text-center text-sm font-semibold text-slate-400">ไม่พบเอกสาร</p>
                        : <ul className="divide-y divide-slate-100">
                            {shown.map(d => (
                                <li key={d.id} className={`flex items-center gap-3 px-4 py-3 ${d.hideOnWebsite ? "bg-slate-50/80" : ""}`}>
                                    <FileText className={`w-5 h-5 shrink-0 ${d.hideOnWebsite ? "text-slate-300" : "text-rose-500"}`} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-blue-600">{d.docNo}</p>
                                        <p className={`font-semibold truncate ${d.hideOnWebsite ? "text-slate-400 line-through" : "text-slate-800"}`}>{d.name}</p>
                                        <p className="text-xs text-slate-500">{d.department?.name ?? "—"} · {formatThaiDate(d.createdAt)}</p>
                                    </div>
                                    {!d.hideOnWebsite && <a href={`${PUBLIC_SITE_URL}/announcements/doc_${d.id}`} target="_blank" rel="noreferrer" className="hidden sm:block text-xs font-semibold text-blue-600 hover:underline">ดูบนเว็บ</a>}
                                    {canEdit ? (
                                        <button onClick={() => toggle([d.id], !d.hideOnWebsite)} disabled={busy !== null}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border disabled:opacity-50 ${d.hideOnWebsite ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                                            {busy === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : d.hideOnWebsite ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                            {d.hideOnWebsite ? "แสดง" : "ซ่อน"}
                                        </button>
                                    ) : (
                                        <span className="text-xs font-semibold text-slate-500">{d.hideOnWebsite ? "ซ่อนอยู่" : "แสดงอยู่"}</span>
                                    )}
                                </li>
                            ))}
                        </ul>}
            </div>
        </div>
    );
}
