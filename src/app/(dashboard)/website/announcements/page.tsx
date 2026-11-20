"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, Megaphone, Pencil, Plus, Trash2, Upload } from "lucide-react";
import {
    createSiteAnnouncement, deleteSiteAnnouncement, fetchSiteAnnouncements, updateSiteAnnouncement, uploadSitePdf,
    type SiteAnnouncement,
} from "@/lib/api";
import { RegistryAnnouncements } from "./registry";
import { Tabs, useHashTab } from "../_editors";
import { ConfirmDelete, Modal, PageHeader, StatusPill, formatThaiDate, inputCls, labelCls, toDateInput, useCanEditWebsite, useToast } from "../_shared";

function AnnouncementModal({ item, onClose, onSaved }: { item: SiteAnnouncement | null; onClose: () => void; onSaved: (m: string) => void }) {
    const thaiYear = new Date().getFullYear() + 543;
    const [form, setForm] = useState({
        number: item?.number ?? `ประกาศที่ /${thaiYear}`, title: item?.title ?? "", date: toDateInput(item?.date),
        pdfUrl: item?.pdfUrl ?? "", isPublished: item?.isPublished ?? true,
    });
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const upload = async (file?: File) => {
        if (!file) return;
        if (file.type !== "application/pdf") { setError("รองรับเฉพาะไฟล์ PDF"); return; }
        setUploading(true); setError("");
        try { const { url } = await uploadSitePdf(file); setForm(f => ({ ...f, pdfUrl: url })); }
        catch { setError("อัปโหลด PDF ไม่สำเร็จ"); } finally { setUploading(false); }
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError("");
        const payload = { ...form, pdfUrl: form.pdfUrl || null, date: new Date(`${form.date}T08:00:00`).toISOString() };
        try {
            if (item) await updateSiteAnnouncement(item.id, payload); else await createSiteAnnouncement(payload);
            onSaved(item ? "บันทึกประกาศแล้ว" : "เพิ่มประกาศแล้ว");
        } catch { setError("บันทึกไม่สำเร็จ ตรวจสอบว่ากรอกข้อมูลครบ"); } finally { setSaving(false); }
    };

    return (
        <Modal title={item ? "แก้ไขประกาศ" : "เพิ่มประกาศ / แถลงการณ์"} onClose={onClose}>
            <form onSubmit={submit} className="p-6 space-y-4">
                <div className="grid sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4">
                    <div>
                        <label htmlFor="a-number" className={labelCls}>เลขที่ <span className="text-rose-500">*</span></label>
                        <input id="a-number" required value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label htmlFor="a-date" className={labelCls}>วันที่ประกาศ <span className="text-rose-500">*</span></label>
                        <input id="a-date" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                    </div>
                </div>
                <div>
                    <label htmlFor="a-title" className={labelCls}>หัวข้อ <span className="text-rose-500">*</span></label>
                    <input id="a-title" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
                </div>
                <div>
                    <span className={labelCls}>ไฟล์ PDF</span>
                    {form.pdfUrl ? (
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                            <FileText className="w-5 h-5 text-rose-600 shrink-0" />
                            <a href={form.pdfUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-600 truncate flex-1">เปิดไฟล์ PDF</a>
                            <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-semibold text-slate-600 hover:text-blue-600">เปลี่ยนไฟล์</button>
                            <button type="button" onClick={() => setForm(f => ({ ...f, pdfUrl: "" }))} className="text-xs font-semibold text-rose-600">ลบ</button>
                        </div>
                    ) : (
                        <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
                            className="w-full rounded-xl border-2 border-dashed border-slate-200 py-5 flex flex-col items-center gap-1 text-slate-500 hover:border-blue-400 hover:text-blue-600">
                            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            <span className="text-sm font-semibold">{uploading ? "กำลังอัปโหลด…" : "เลือกไฟล์ PDF"}</span>
                        </button>
                    )}
                    <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => { upload(e.target.files?.[0]); e.target.value = ""; }} />
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} className="w-4 h-4 accent-blue-600" />แสดงบนเว็บไซต์
                </label>
                {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
                <div className="flex gap-2 pt-1">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                    <button type="submit" disabled={saving || uploading} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}บันทึก
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default function WebsiteAnnouncementsPage() {
    const canEdit = useCanEditWebsite();
    const toast = useToast();
    const { show } = toast;
    const [items, setItems] = useState<SiteAnnouncement[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<SiteAnnouncement | null | "new">(null);
    const [deleting, setDeleting] = useState<SiteAnnouncement | null>(null);
    const [tab, setTab] = useHashTab<"registry" | "manual">(["registry", "manual"], "registry");

    const load = useCallback(async () => {
        setLoading(true);
        try { setItems(await fetchSiteAnnouncements()); } catch { show("โหลดประกาศไม่สำเร็จ", "error"); } finally { setLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => { load(); }, [load]);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <PageHeader icon={Megaphone} title="คำประกาศ / แถลงการณ์" subtitle="ประกาศจากทะเบียนเอกสารแสดงอัตโนมัติ และเพิ่มประกาศเองได้ · หน้าแรกของเว็บแสดง 3 รายการล่าสุด" previewPath="/announcements">
                {canEdit && tab === "manual" && (
                    <button onClick={() => setEditing("new")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-900/20">
                        <Plus className="w-4 h-4" />เพิ่มประกาศ
                    </button>
                )}
            </PageHeader>
            <Tabs tabs={[{ key: "registry", label: "จากทะเบียนเอกสาร (อัตโนมัติ)" }, { key: "manual", label: "เพิ่มเอง", count: items.length }]} value={tab} onChange={setTab} />
            {tab === "registry" ? <RegistryAnnouncements toast={show} /> : <>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-400">กำลังโหลด…</p></div>
                ) : items.length === 0 ? (
                    <div className="py-16 text-center"><Megaphone className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-sm font-semibold text-slate-400">ยังไม่มีประกาศ</p></div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {items.map(a => (
                            <li key={a.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50/80">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-blue-600">{a.number}</p>
                                    <p className="font-semibold text-slate-800 truncate">{a.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{formatThaiDate(a.date)}</p>
                                </div>
                                {a.pdfUrl
                                    ? <a href={a.pdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline"><FileText className="w-4 h-4" />PDF</a>
                                    : <span className="text-xs text-slate-400">ไม่มีไฟล์</span>}
                                <StatusPill on={a.isPublished} onLabel="แสดง" offLabel="ซ่อน" />
                                {canEdit && (
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setEditing(a)} aria-label={`แก้ไข ${a.number}`} className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => setDeleting(a)} aria-label={`ลบ ${a.number}`} className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            </>}
            {editing && <AnnouncementModal item={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={m => { setEditing(null); show(m); load(); }} />}
            {deleting && <ConfirmDelete text={`ลบ "${deleting.number}" และไฟล์ PDF?`} onCancel={() => setDeleting(null)}
                onConfirm={async () => { try { await deleteSiteAnnouncement(deleting.id); show("ลบประกาศแล้ว"); load(); } catch { show("ลบไม่สำเร็จ", "error"); } setDeleting(null); }} />}
            {toast.node}
        </div>
    );
}
