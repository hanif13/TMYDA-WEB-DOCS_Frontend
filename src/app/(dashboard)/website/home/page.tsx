"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Globe, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import {
    createSiteBanner, deleteSiteBanner, fetchSiteBanners, fetchSiteSettings, reorderSiteBanners, updateSiteBanner, updateSiteSetting,
    type SiteBanner, type SiteSettings,
} from "@/lib/api";
import { ConfirmDelete, ImagePicker, Modal, PageHeader, StatusPill, inputCls, labelCls, useCanEditWebsite, useToast } from "../_shared";

function Section({ title, description, children, action }: { title: string; description: string; children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100">
                <div>
                    <h2 className="text-base font-bold text-slate-800">{title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                </div>
                {action}
            </div>
            <div className="p-6">{children}</div>
        </section>
    );
}

function SaveButton({ busy, disabled }: { busy: boolean; disabled?: boolean }) {
    return (
        <button type="submit" disabled={busy || disabled} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}บันทึก
        </button>
    );
}

function BannerModal({ item, onClose, onSaved }: { item: SiteBanner | null; onClose: () => void; onSaved: (m: string) => void }) {
    const [form, setForm] = useState({ imageUrl: item?.imageUrl ?? "", title: item?.title ?? "", linkUrl: item?.linkUrl ?? "", isActive: item?.isActive ?? true });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.imageUrl) { setError("กรุณาอัปโหลดรูปแบนเนอร์"); return; }
        setSaving(true);
        try { if (item) await updateSiteBanner(item.id, form); else await createSiteBanner(form); onSaved(item ? "บันทึกแบนเนอร์แล้ว" : "เพิ่มแบนเนอร์แล้ว"); }
        catch { setError("บันทึกไม่สำเร็จ"); } finally { setSaving(false); }
    };
    return (
        <Modal title={item ? "แก้ไขแบนเนอร์" : "เพิ่มแบนเนอร์"} onClose={onClose}>
            <form onSubmit={submit} className="p-6 space-y-4">
                <ImagePicker label="รูปแบนเนอร์ (แนะนำ 16:9 กว้าง 1600px ขึ้นไป)" value={form.imageUrl ? [form.imageUrl] : []} onChange={u => setForm(f => ({ ...f, imageUrl: u[0] ?? "" }))} />
                <div>
                    <label htmlFor="b-title" className={labelCls}>คำอธิบายภาพ (สำหรับผู้ใช้โปรแกรมอ่านหน้าจอ)</label>
                    <input id="b-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="เช่น ภาพบรรยากาศค่ายร็อบบานีย์" />
                </div>
                <div>
                    <label htmlFor="b-link" className={labelCls}>ลิงก์เมื่อกดภาพ (ไม่บังคับ)</label>
                    <input id="b-link" value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} className={inputCls} placeholder="/news/rabbani-camp-16 หรือ https://…" />
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-blue-600" />แสดงบนหน้าแรก
                </label>
                {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
                <div className="flex gap-2 pt-1">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                    <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}บันทึก
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default function WebsiteHomePage() {
    const canEdit = useCanEditWebsite();
    const toast = useToast();
    const { show } = toast;
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [banners, setBanners] = useState<SiteBanner[]>([]);
    const [busy, setBusy] = useState<"" | "home" | "contact">("");
    const [editing, setEditing] = useState<SiteBanner | null | "new">(null);
    const [deleting, setDeleting] = useState<SiteBanner | null>(null);

    const loadBanners = useCallback(async () => { try { setBanners(await fetchSiteBanners()); } catch { show("โหลดแบนเนอร์ไม่สำเร็จ", "error"); } }, [show]);
    useEffect(() => {
        fetchSiteSettings().then(setSettings).catch(() => show("โหลดค่าตั้งไม่สำเร็จ", "error"));
        loadBanners();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const save = async (key: "home" | "contact") => {
        if (!settings) return;
        setBusy(key);
        try {
            const value = await updateSiteSetting(key, settings[key] as never);
            setSettings(s => s && ({ ...s, [key]: value }));
            show("บันทึกแล้ว — เว็บไซต์จะอัปเดตภายใน 1 นาที");
        } catch { show("บันทึกไม่สำเร็จ", "error"); } finally { setBusy(""); }
    };

    const move = async (index: number, dir: -1 | 1) => {
        const next = [...banners];
        const [b] = next.splice(index, 1);
        next.splice(index + dir, 0, b);
        setBanners(next);
        try { await reorderSiteBanners(next.map(x => x.id)); } catch { show("จัดลำดับไม่สำเร็จ", "error"); loadBanners(); }
    };

    const toggle = async (b: SiteBanner) => {
        try { await updateSiteBanner(b.id, { isActive: !b.isActive }); loadBanners(); } catch { show("บันทึกไม่สำเร็จ", "error"); }
    };

    if (!settings) return <div className="py-24 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></div>;
    const home = settings.home;
    const setHome = (patch: Partial<SiteSettings["home"]>) => setSettings(s => s && ({ ...s, home: { ...s.home, ...patch } }));
    const contact = settings.contact;
    const setContact = (k: keyof SiteSettings["contact"], v: string) => setSettings(s => s && ({ ...s, contact: { ...s.contact, [k]: v } }));

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <PageHeader icon={Globe} title="หน้าแรก & แบนเนอร์" subtitle="ข้อความส่วนหัว แถบกิจกรรมเด่น ภาพแบนเนอร์ และข้อมูลติดต่อของเว็บไซต์หลัก" previewPath="/" />

            <Section title="ส่วนหัวหน้าแรก (Hero)" description="ข้อความใหญ่ด้านบนสุดของหน้าแรก">
                <form onSubmit={e => { e.preventDefault(); save("home"); }} className="space-y-4">
                    <fieldset disabled={!canEdit} className="space-y-4">
                        <div>
                            <label htmlFor="h-badge" className={labelCls}>ป้ายข้อความเล็ก</label>
                            <input id="h-badge" value={home.heroBadge} onChange={e => setHome({ heroBadge: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                            <label htmlFor="h-title" className={labelCls}>หัวข้อหลัก (ขึ้นบรรทัดใหม่ได้)</label>
                            <textarea id="h-title" rows={2} value={home.heroTitle} onChange={e => setHome({ heroTitle: e.target.value })} className={`${inputCls} resize-none`} />
                        </div>
                        <div>
                            <label htmlFor="h-sub" className={labelCls}>คำอธิบายองค์กร / สโลแกน</label>
                            <textarea id="h-sub" rows={2} value={home.heroSubtitle} onChange={e => setHome({ heroSubtitle: e.target.value })} className={`${inputCls} resize-none`} />
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                            <label className="flex items-center gap-2 text-sm font-bold text-amber-900 cursor-pointer">
                                <input type="checkbox" checked={home.highlight.enabled} onChange={e => setHome({ highlight: { ...home.highlight, enabled: e.target.checked } })} className="w-4 h-4 accent-amber-600" />
                                แสดงแถบกิจกรรมเด่นใต้ส่วนหัว
                            </label>
                            <div className="grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
                                <div>
                                    <label htmlFor="h-hl-text" className={labelCls}>ข้อความ</label>
                                    <input id="h-hl-text" value={home.highlight.text} onChange={e => setHome({ highlight: { ...home.highlight, text: e.target.value } })} className={inputCls} placeholder="เช่น เปิดรับสมัครค่ายร็อบบานีย์ รุ่นที่ 16" />
                                </div>
                                <div>
                                    <label htmlFor="h-hl-href" className={labelCls}>ลิงก์</label>
                                    <input id="h-hl-href" value={home.highlight.href} onChange={e => setHome({ highlight: { ...home.highlight, href: e.target.value } })} className={inputCls} placeholder="/news/…" />
                                </div>
                            </div>
                        </div>
                    </fieldset>
                    {canEdit && <div className="flex justify-end"><SaveButton busy={busy === "home"} /></div>}
                </form>
            </Section>

            <Section title="ภาพแบนเนอร์ (Carousel)" description="ภาพที่เปิดอยู่จะเลื่อนสลับกันบนหน้าแรก เรียงตามลำดับในรายการนี้"
                action={canEdit && (
                    <button onClick={() => setEditing("new")} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shrink-0">
                        <Plus className="w-4 h-4" />เพิ่มภาพ
                    </button>
                )}>
                {banners.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">ยังไม่มีภาพแบนเนอร์ — หน้าแรกจะแสดงพื้นที่ว่างแทน</p>
                ) : (
                    <ul className="space-y-3">
                        {banners.map((b, i) => (
                            <li key={b.id} className="flex items-center gap-4 rounded-xl border border-slate-200 p-2.5">
                                <div className="w-32 aspect-video rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={b.imageUrl} alt={b.title ?? ""} className={`w-full h-full object-cover ${b.isActive ? "" : "opacity-40 grayscale"}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{b.title || <span className="text-slate-400 font-normal">ไม่มีคำอธิบาย</span>}</p>
                                    <p className="text-xs text-slate-500 truncate">{b.linkUrl || "ไม่มีลิงก์"}</p>
                                </div>
                                <StatusPill on={b.isActive} onLabel="แสดง" offLabel="ซ่อน" />
                                {canEdit && (
                                    <div className="flex items-center gap-0.5">
                                        <button disabled={i === 0} onClick={() => move(i, -1)} aria-label="เลื่อนขึ้น" className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                                        <button disabled={i === banners.length - 1} onClick={() => move(i, 1)} aria-label="เลื่อนลง" className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                                        <button onClick={() => toggle(b)} aria-label={b.isActive ? "ซ่อนภาพ" : "แสดงภาพ"} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">{b.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                                        <button onClick={() => setEditing(b)} aria-label="แก้ไขภาพ" className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => setDeleting(b)} aria-label="ลบภาพ" className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            <Section title="ข้อมูลติดต่อ & โซเชียล" description="แสดงที่หน้าติดต่อประสานงาน และส่วนท้ายของทุกหน้า (Footer)">
                <form onSubmit={e => { e.preventDefault(); save("contact"); }} className="space-y-4">
                    <fieldset disabled={!canEdit} className="grid sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label htmlFor="c-address" className={labelCls}>ที่อยู่</label>
                            <textarea id="c-address" rows={2} value={contact.address} onChange={e => setContact("address", e.target.value)} className={`${inputCls} resize-none`} />
                        </div>
                        {([
                            ["phone", "โทรศัพท์", "tel"], ["email", "อีเมล", "email"],
                            ["hours", "เวลาทำการ", "text"], ["mapUrl", "ลิงก์ Google Maps", "url"],
                            ["facebook", "Facebook (ลิงก์)", "url"], ["youtube", "YouTube (ลิงก์)", "url"],
                            ["tiktok", "TikTok (ลิงก์)", "url"], ["instagram", "Instagram (ลิงก์)", "url"],
                            ["line", "LINE (ลิงก์หรือไอดี)", "text"],
                        ] as const).map(([k, label, type]) => (
                            <div key={k}>
                                <label htmlFor={`c-${k}`} className={labelCls}>{label}</label>
                                <input id={`c-${k}`} type={type} value={contact[k]} onChange={e => setContact(k, e.target.value)} className={inputCls} />
                            </div>
                        ))}
                    </fieldset>
                    {canEdit && <div className="flex justify-end"><SaveButton busy={busy === "contact"} /></div>}
                </form>
            </Section>

            {editing && <BannerModal item={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={m => { setEditing(null); show(m); loadBanners(); }} />}
            {deleting && <ConfirmDelete text="ลบภาพแบนเนอร์นี้?" onCancel={() => setDeleting(null)}
                onConfirm={async () => { try { await deleteSiteBanner(deleting.id); show("ลบแล้ว"); loadBanners(); } catch { show("ลบไม่สำเร็จ", "error"); } setDeleting(null); }} />}
            {toast.node}
        </div>
    );
}
