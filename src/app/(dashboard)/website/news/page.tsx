"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Newspaper, Pencil, Pin, Plus, Search, Trash2 } from "lucide-react";
import { createSiteNews, deleteSiteNews, fetchSiteNews, updateSiteNews, type SiteNews } from "@/lib/api";
import {
    ConfirmDelete, ImagePicker, Modal, PageHeader, PUBLIC_SITE_URL, SITE_DEPARTMENTS, StatusPill,
    formatThaiDate, inputCls, labelCls, toDateInput, useCanEditWebsite, useToast,
} from "../_shared";

type Form = {
    title: string; slug: string; department: string; excerpt: string; content: string;
    coverUrl: string; images: string[]; isPublished: boolean; isPinned: boolean; publishedAt: string;
};

const emptyForm = (): Form => ({
    title: "", slug: "", department: SITE_DEPARTMENTS[0], excerpt: "", content: "",
    coverUrl: "", images: [], isPublished: false, isPinned: false, publishedAt: toDateInput(null),
});

/**
 * Date picked in the form → ISO timestamp. Keeps the original time when the date did not change,
 * uses "now" for today (so the news shows immediately), and 08:00 for any other day.
 */
function toPublishedAt(date: string, original: string | null): string | null {
    if (!date) return null;
    if (original && toDateInput(original) === date) return original;
    if (date === toDateInput(null)) return new Date().toISOString();
    return new Date(`${date}T08:00:00`).toISOString();
}

function NewsModal({ item, onClose, onSaved }: { item: SiteNews | null; onClose: () => void; onSaved: (msg: string) => void }) {
    const [form, setForm] = useState<Form>(() => item ? {
        title: item.title, slug: item.slug, department: item.department, excerpt: item.excerpt ?? "", content: item.content ?? "",
        coverUrl: item.coverUrl ?? "", images: item.images, isPublished: item.isPublished, isPinned: item.isPinned,
        publishedAt: toDateInput(item.publishedAt),
    } : emptyForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) { setError("กรุณากรอกหัวข้อข่าว"); return; }
        setSaving(true); setError("");
        const payload = { ...form, coverUrl: form.coverUrl || null, publishedAt: toPublishedAt(form.publishedAt, item?.publishedAt ?? null) };
        try {
            if (item) await updateSiteNews(item.id, payload as Partial<SiteNews>);
            else await createSiteNews(payload as Partial<SiteNews>);
            onSaved(item ? "บันทึกข่าวแล้ว" : "เพิ่มข่าวแล้ว");
        } catch (err) {
            const m = err instanceof Error ? err.message : "";
            setError(m.includes("409") ? "ลิงก์ข่าว (slug) นี้ถูกใช้แล้ว" : m.includes("400") ? "ข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง" : "บันทึกไม่สำเร็จ");
        } finally { setSaving(false); }
    };

    return (
        <Modal title={item ? "แก้ไขข่าว" : "เพิ่มข่าวใหม่"} onClose={onClose} wide>
            <form onSubmit={submit} className="p-6 space-y-4">
                <div>
                    <label htmlFor="n-title" className={labelCls}>หัวข้อข่าว <span className="text-rose-500">*</span></label>
                    <input id="n-title" required value={form.title} onChange={e => set("title", e.target.value)} className={inputCls} placeholder="เช่น ค่ายร็อบบานีย์ รุ่นที่ 16" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="n-dept" className={labelCls}>หน่วยงาน <span className="text-rose-500">*</span></label>
                        <select id="n-dept" value={form.department} onChange={e => set("department", e.target.value)} className={inputCls}>
                            {SITE_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="n-date" className={labelCls}>วันที่เผยแพร่</label>
                        <input id="n-date" type="date" value={form.publishedAt} onChange={e => set("publishedAt", e.target.value)} className={inputCls} />
                    </div>
                </div>
                <div>
                    <label htmlFor="n-excerpt" className={labelCls}>คำโปรย (แสดงในการ์ดข่าว)</label>
                    <textarea id="n-excerpt" rows={2} maxLength={300} value={form.excerpt} onChange={e => set("excerpt", e.target.value)} className={`${inputCls} resize-none`} placeholder="สรุปข่าว 1–2 บรรทัด" />
                </div>
                <div>
                    <label htmlFor="n-content" className={labelCls}>เนื้อหาข่าว</label>
                    <textarea id="n-content" rows={8} value={form.content} onChange={e => set("content", e.target.value)} className={`${inputCls} resize-y leading-relaxed`} placeholder="เว้นบรรทัดว่างเพื่อขึ้นย่อหน้าใหม่" />
                </div>
                <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4">
                    <ImagePicker label="ภาพปก" value={form.coverUrl ? [form.coverUrl] : []} onChange={urls => set("coverUrl", urls[0] ?? "")} />
                    <ImagePicker label="อัลบั้มภาพ" multiple value={form.images} onChange={urls => set("images", urls)} aspect="aspect-square" />
                </div>
                <details className="rounded-xl border border-slate-200 px-4 py-3">
                    <summary className="text-xs font-semibold text-slate-600 cursor-pointer">ตั้งค่าขั้นสูง</summary>
                    <div className="mt-3">
                        <label htmlFor="n-slug" className={labelCls}>ลิงก์ข่าว (slug)</label>
                        <div className="flex items-center gap-1 text-sm text-slate-400">
                            <span className="shrink-0">/news/</span>
                            <input id="n-slug" value={form.slug} onChange={e => set("slug", e.target.value.toLowerCase())} className={inputCls} placeholder="rabbani-camp-16 (เว้นว่างให้ระบบสร้างให้)" pattern="[a-z0-9]+(-[a-z0-9]+)*" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">ใช้ได้เฉพาะ a-z, 0-9 และขีด -</p>
                    </div>
                </details>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={form.isPublished} onChange={e => set("isPublished", e.target.checked)} className="w-4 h-4 accent-blue-600" />เผยแพร่บนเว็บไซต์
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={form.isPinned} onChange={e => set("isPinned", e.target.checked)} className="w-4 h-4 accent-blue-600" />ปักหมุดไว้บนสุด
                    </label>
                </div>
                {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
                <div className="flex gap-2 pt-1">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                    <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}{item ? "บันทึกการแก้ไข" : "เพิ่มข่าว"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default function WebsiteNewsPage() {
    const canEdit = useCanEditWebsite();
    const toast = useToast();
    const [items, setItems] = useState<SiteNews[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dept, setDept] = useState("");
    const [editing, setEditing] = useState<SiteNews | null | "new">(null);
    const [deleting, setDeleting] = useState<SiteNews | null>(null);
    const { show } = toast;

    const load = useCallback(async () => {
        setLoading(true);
        try { setItems(await fetchSiteNews()); } catch { show("โหลดข่าวไม่สำเร็จ", "error"); } finally { setLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => { load(); }, [load]);

    const shown = useMemo(() => items.filter(n =>
        (!dept || n.department === dept) && (!search || n.title.toLowerCase().includes(search.toLowerCase()))
    ), [items, dept, search]);
    const publishedCount = items.filter(n => n.isPublished).length;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <PageHeader icon={Newspaper} title="ข่าวประชาสัมพันธ์" subtitle={`ทั้งหมด ${items.length} ข่าว · เผยแพร่แล้ว ${publishedCount}`} previewPath="/news">
                {canEdit && (
                    <button onClick={() => setEditing("new")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-900/20">
                        <Plus className="w-4 h-4" />เพิ่มข่าว
                    </button>
                )}
            </PageHeader>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input aria-label="ค้นหาข่าว" value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาหัวข้อข่าว…" className={`${inputCls} pl-9 bg-slate-50/50`} />
                </div>
                <select aria-label="กรองตามหน่วยงาน" value={dept} onChange={e => setDept(e.target.value)} className={`${inputCls} w-auto bg-slate-50/50`}>
                    <option value="">ทุกหน่วยงาน</option>
                    {SITE_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-400">กำลังโหลด…</p></div>
                ) : shown.length === 0 ? (
                    <div className="py-16 text-center">
                        <Newspaper className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-slate-400">{items.length ? "ไม่พบข่าวที่ค้นหา" : "ยังไม่มีข่าว"}</p>
                        {!items.length && canEdit && <p className="text-xs text-slate-400 mt-1">กด &quot;เพิ่มข่าว&quot; เพื่อเริ่มต้น</p>}
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {shown.map(n => (
                            <li key={n.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/80">
                                <div className="w-24 aspect-video rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {n.coverUrl ? <img src={n.coverUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Newspaper className="w-5 h-5" /></div>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {n.isPinned && <Pin aria-label="ปักหมุด" className="w-3.5 h-3.5 text-amber-500" />}
                                        <p className="font-semibold text-slate-800 truncate">{n.title}</p>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">{n.department} · {formatThaiDate(n.publishedAt)}</p>
                                </div>
                                <StatusPill on={n.isPublished} onLabel="เผยแพร่" offLabel="ฉบับร่าง" />
                                <div className="flex items-center gap-1">
                                    {n.isPublished && (
                                        <a href={`${PUBLIC_SITE_URL}/news/${n.slug}`} target="_blank" rel="noreferrer" aria-label={`เปิดข่าว ${n.title} บนเว็บ`} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><ExternalLink className="w-4 h-4" /></a>
                                    )}
                                    {canEdit && <>
                                        <button onClick={() => setEditing(n)} aria-label={`แก้ไข ${n.title}`} className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => setDeleting(n)} aria-label={`ลบ ${n.title}`} className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                                    </>}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {editing && <NewsModal item={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={msg => { setEditing(null); show(msg); load(); }} />}
            {deleting && <ConfirmDelete text={`ลบข่าว "${deleting.title}" และรูปทั้งหมดของข่าวนี้?`} onCancel={() => setDeleting(null)}
                onConfirm={async () => { try { await deleteSiteNews(deleting.id); show("ลบข่าวแล้ว"); load(); } catch { show("ลบไม่สำเร็จ", "error"); } setDeleting(null); }} />}
            {toast.node}
        </div>
    );
}
