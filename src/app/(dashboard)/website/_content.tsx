"use client";
/* eslint-disable @typescript-eslint/no-explicit-any -- form values are typed per field definition at runtime */
// Generic list manager for SiteContent (articles, courses, camps, books, videos, Q&A,
// recommended links, committee members, partners). Each type passes its own field list.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Pencil, Plus, Search, Trash2, BookOpen, Clapperboard, FileText, GraduationCap, Handshake, Lightbulb, MessageCircleQuestion, Sparkles, Tent, UserRound } from "lucide-react";
import {
    createSiteContent, deleteSiteContent, fetchSiteContent, reorderSiteContent, updateSiteContent,
    type SiteContent, type SiteContentType,
} from "@/lib/api";
import { ConfirmDelete, ImagePicker, Modal, PUBLIC_SITE_URL, StatusPill, formatThaiDate, inputCls, labelCls, toDateInput, useCanEditWebsite } from "./_shared";
import { Field, LinesInput, PdfPicker, RowsEditor, TagsInput, TonePicker, errMsg, type RowCol } from "./_editors";
import { CategoryManager, CategoryPicker, TagPicker, useCategories } from "./_categories";
import { ARTICLE_ICONS } from "./_icons";
import { Tags } from "lucide-react";

export type Option = { value: string; label: string };
export type FieldDef = {
    /** title | slug | category | coverUrl | fileUrl | date | data.<key> */
    path: string;
    label: string;
    kind: "text" | "textarea" | "longtext" | "number" | "date" | "select" | "tags" | "lines" | "image" | "pdf" | "tone" | "rows" | "images" | "categories" | "icon";
    /** kind "categories": which managed list (qa, recommended, book, video, partner) */
    catType?: string;
    /** kind "tags": suggest tags already used by this content type */
    tagType?: string;
    options?: Option[];
    required?: boolean;
    hint?: string;
    half?: boolean;
    placeholder?: string;
    columns?: RowCol<any>[];
    blank?: () => any;
};

export type ContentConfig = {
    type: SiteContentType;
    noun: string;                       // "บทความ", "หลักสูตร" …
    category?: string;                  // fixed category for this list (articles)
    /** the category can be changed in the form (articles: move between the religious subcategories) */
    categoryChoices?: Option[];
    fields: FieldDef[];
    subtitle: (item: SiteContent) => string;
    publicPath?: (item: SiteContent) => string | null;
    defaults?: () => Partial<FormState>;
    sortable?: boolean;                 // show ↑↓ (order matters on the website)
    filter?: { path: string; label: string; options: Option[] };
    /** managed categories (filter + จัดการหมวดหมู่ button) */
    categories?: { type: string; label: string };
    emptyHint?: string;
};

type FormState = {
    title: string; slug: string; category: string; coverUrl: string; fileUrl: string; date: string;
    isPublished: boolean; data: Record<string, any>;
};

function getPath(f: FormState, path: string): any {
    if (path.startsWith("data.")) return f.data[path.slice(5)];
    return (f as any)[path];
}
function setPath(f: FormState, path: string, v: any): FormState {
    if (path.startsWith("data.")) return { ...f, data: { ...f.data, [path.slice(5)]: v } };
    return { ...f, [path]: v };
}

function toForm(item: SiteContent | null, cfg: ContentConfig): FormState {
    if (!item) {
        return {
            title: "", slug: "", category: cfg.category ?? cfg.fields.find(f => f.path === "category")?.options?.[0]?.value ?? "",
            coverUrl: "", fileUrl: "", date: toDateInput(null), isPublished: true, data: { tone: "blue" },
            ...cfg.defaults?.(),
        };
    }
    return {
        title: item.title, slug: item.slug, category: item.category ?? "", coverUrl: item.coverUrl ?? "", fileUrl: item.fileUrl ?? "",
        date: item.date ? toDateInput(item.date) : "", isPublished: item.isPublished,
        // older items have one category only → start the multi-select from it
        data: cfg.categories && !item.data?.categories?.length && item.category ? { ...item.data, categories: [item.category] } : { ...item.data },
    };
}

function FieldInput({ def, form, setForm }: { def: FieldDef; form: FormState; setForm: (f: (s: FormState) => FormState) => void }) {
    const value = getPath(form, def.path);
    const set = (v: any) => setForm(s => setPath(s, def.path, v));
    const id = `f-${def.path.replace(".", "-")}`;
    switch (def.kind) {
        case "textarea":
        case "longtext":
            return (
                <Field label={def.label} required={def.required} hint={def.hint}>
                    <textarea id={id} rows={def.kind === "longtext" ? 9 : 3} value={value ?? ""} placeholder={def.placeholder} onChange={e => set(e.target.value)} className={`${inputCls} resize-y leading-relaxed`} />
                </Field>
            );
        case "number":
            return (
                <Field label={def.label} hint={def.hint}>
                    <input id={id} type="number" inputMode="numeric" value={value ?? ""} onChange={e => set(e.target.value === "" ? null : Number(e.target.value))} className={inputCls} />
                </Field>
            );
        case "date":
            return (
                <Field label={def.label} hint={def.hint}>
                    <input id={id} type="date" value={value ?? ""} onChange={e => set(e.target.value)} className={inputCls} />
                </Field>
            );
        case "select":
            return (
                <Field label={def.label} required={def.required} hint={def.hint}>
                    <select id={id} value={value ?? ""} onChange={e => set(e.target.value)} className={inputCls}>
                        {!def.required && <option value="">— ไม่ระบุ —</option>}
                        {def.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </Field>
            );
        // article topics follow the subcategory picked in the form (article:<category>)
        case "categories": return <CategoryPicker type={def.catType?.startsWith("article:") ? `article:${form.category}` : def.catType ?? ""} label={def.label} value={value ?? []} onChange={set} canManage />;
        case "tags": return def.tagType
            ? <TagPicker type={def.tagType} label={def.label} value={value ?? []} onChange={set} />
            : <TagsInput label={def.label} value={value ?? []} onChange={set} hint={def.hint} />;
        case "lines": return <LinesInput label={def.label} value={value ?? []} onChange={set} hint={def.hint} placeholder={def.placeholder} />;
        case "image": return <ImagePicker label={def.label} value={value ? [value] : []} onChange={urls => set(urls[0] ?? "")} aspect={def.hint === "square" ? "aspect-square" : "aspect-video"} />;
        case "images": return <ImagePicker label={def.label} multiple value={value ?? []} onChange={set} aspect="aspect-square" />;
        case "pdf": return <PdfPicker label={def.label} value={value ?? ""} onChange={set} />;
        case "tone": return <TonePicker value={value ?? "blue"} onChange={set} label={def.label} />;
        case "icon": return (
            <Field label={def.label} hint="ไม่เลือก = ใช้ไอคอนประจำหมวด">
                <div role="radiogroup" aria-label={def.label} className="grid grid-cols-8 gap-1.5">
                    {ARTICLE_ICONS.map(({ key, label, Icon }) => (
                        <button key={key} type="button" role="radio" aria-checked={value === key} aria-label={label} title={label}
                            onClick={() => set(value === key ? "" : key)}
                            className={`flex aspect-square items-center justify-center rounded-xl border transition ${value === key ? "border-[#0c121b] bg-[#0c121b] text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"}`}>
                            <Icon className="h-4 w-4" />
                        </button>
                    ))}
                </div>
            </Field>
        );
        case "rows": return <RowsEditor label={def.label} rows={value ?? []} onChange={set} columns={def.columns ?? []} blank={def.blank ?? (() => ({}))} />;
        default:
            return (
                <Field label={def.label} required={def.required} hint={def.hint}>
                    <input id={id} value={value ?? ""} required={def.required} placeholder={def.placeholder} onChange={e => set(e.target.value)} className={inputCls} />
                </Field>
            );
    }
}

export function ContentModal({ cfg, item, onClose, onSaved }: { cfg: ContentConfig; item: SiteContent | null; onClose: () => void; onSaved: (msg: string) => void }) {
    const [form, setForm] = useState<FormState>(() => toForm(item, cfg));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) { setError("กรุณากรอกชื่อ/หัวข้อ"); return; }
        setSaving(true); setError("");
        const payload: Partial<SiteContent> & { slug?: string } = {
            type: cfg.type, title: form.title, slug: form.slug, category: cfg.categoryChoices ? (form.category || cfg.category || null) : cfg.category ?? (form.category || null),
            coverUrl: form.coverUrl || null, fileUrl: form.fileUrl || null, isPublished: form.isPublished, data: form.data,
            date: form.date ? new Date(`${form.date}T09:00:00`).toISOString() : null,
        };
        try {
            if (item) await updateSiteContent(item.id, payload);
            else await createSiteContent(payload);
            onSaved(item ? `บันทึก${cfg.noun}แล้ว` : `เพิ่ม${cfg.noun}แล้ว`);
        } catch (err) { setError(errMsg(err, "บันทึกไม่สำเร็จ")); }
        finally { setSaving(false); }
    };

    const hasSlug = cfg.fields.some(f => f.path === "slug");
    return (
        <Modal title={item ? `แก้ไข${cfg.noun}` : `เพิ่ม${cfg.noun}`} onClose={onClose} wide>
            <form onSubmit={submit} className="p-6 space-y-4">
                {cfg.categoryChoices && (
                    <div>
                        <label htmlFor="f-category" className={labelCls}>อยู่ในหมวด</label>
                        <select id="f-category" value={form.category} onChange={e => setForm(s => ({ ...s, category: e.target.value, data: { ...s.data, topics: [] } }))} className={inputCls}>
                            {cfg.categoryChoices.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {item && form.category !== (item.category ?? "") && <p className="text-[11px] text-amber-600 mt-1">บันทึกแล้วโพสต์จะย้ายไปหมวดนี้ · ลิงก์บนเว็บจะเปลี่ยนตามหมวดใหม่</p>}
                    </div>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                    {cfg.fields.filter(f => f.path !== "slug").map(def => (
                        <div key={def.path} className={def.half ? "" : "sm:col-span-2"}>
                            <FieldInput def={def} form={form} setForm={setForm} />
                        </div>
                    ))}
                </div>
                {hasSlug && (
                    <details className="rounded-xl border border-slate-200 px-4 py-3">
                        <summary className="text-xs font-semibold text-slate-600 cursor-pointer">ตั้งค่าขั้นสูง</summary>
                        <div className="mt-3">
                            <label htmlFor="f-slug" className={labelCls}>ลิงก์ (slug)</label>
                            <input id="f-slug" value={form.slug} onChange={e => setForm(s => ({ ...s, slug: e.target.value.toLowerCase() }))} className={inputCls}
                                placeholder="เว้นว่างให้ระบบสร้างให้" pattern="[a-z0-9]+(-[a-z0-9]+)*" />
                            <p className="text-[11px] text-slate-400 mt-1">ใช้ได้เฉพาะ a-z, 0-9 และขีด - · เปลี่ยนแล้วลิงก์เดิมจะใช้ไม่ได้</p>
                        </div>
                    </details>
                )}
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.isPublished} onChange={e => setForm(s => ({ ...s, isPublished: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                    แสดงบนเว็บไซต์
                </label>
                {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
                <div className="flex gap-2 pt-1">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                    <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}{item ? "บันทึกการแก้ไข" : `เพิ่ม${cfg.noun}`}
                    </button>
                </div>
            </form>
        </Modal>
    );
}


/** Picture for an item without a cover image (one colour for every type). */
const TYPE_ICON: Record<string, React.ElementType> = {
    article: Lightbulb, course: GraduationCap, camp: Tent, book: BookOpen, video: Clapperboard,
    qa: MessageCircleQuestion, recommended: Sparkles, committee: UserRound, partner: Handshake,
};

export function ContentManager({ cfg, onCount, toast }: { cfg: ContentConfig; onCount?: (n: number) => void; toast: (msg: string, type?: "success" | "error") => void }) {
    const canEdit = useCanEditWebsite();
    const [all, setAll] = useState<SiteContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("");
    const [editing, setEditing] = useState<SiteContent | "new" | null>(null);
    const [deleting, setDeleting] = useState<SiteContent | null>(null);
    const [managing, setManaging] = useState(false);
    const catList = useCategories(cfg.categories?.type ?? "");
    const catsOf = (i: SiteContent): string[] => i.data?.categories?.length ? i.data.categories : i.category ? [i.category] : [];

    const load = useCallback(async () => {
        setLoading(true);
        try { setAll(await fetchSiteContent(cfg.type)); }
        catch { toast("โหลดข้อมูลไม่สำเร็จ", "error"); }
        finally { setLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cfg.type]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { setSearch(""); setFilter(""); }, [cfg]);

    const items = useMemo(() => (cfg.category ? all.filter(i => i.category === cfg.category) : all), [all, cfg.category]);
    useEffect(() => { onCount?.(items.length); }, [items.length, onCount]);

    const shown = items.filter(i =>
        (!filter || (cfg.categories ? catsOf(i).includes(filter) : getPath(toForm(i, cfg), cfg.filter!.path) === filter)) &&
        (!search || `${i.title} ${cfg.subtitle(i)}`.toLowerCase().includes(search.toLowerCase())),
    );
    const canReorder = cfg.sortable && canEdit && !search && !filter;

    const move = async (index: number, d: number) => {
        const j = index + d;
        if (j < 0 || j >= items.length) return;
        const next = [...items];
        [next[index], next[j]] = [next[j], next[index]];
        const others = all.filter(i => !next.includes(i));
        setAll([...others, ...next]);
        try { await reorderSiteContent(next.map(i => i.id)); }
        catch { toast("จัดลำดับไม่สำเร็จ", "error"); load(); }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input aria-label={`ค้นหา${cfg.noun}`} value={search} onChange={e => setSearch(e.target.value)} placeholder={`ค้นหา${cfg.noun}…`} className={`${inputCls} pl-9 bg-slate-50/50`} />
                </div>
                {cfg.categories ? (
                    <select aria-label={cfg.categories.label} value={filter} onChange={e => setFilter(e.target.value)} className={`${inputCls} w-auto bg-slate-50/50`}>
                        <option value="">{cfg.categories.label}: ทั้งหมด</option>
                        {(catList ?? []).map(c => <option key={c} value={c}>{c} ({items.filter(i => catsOf(i).includes(c)).length})</option>)}
                    </select>
                ) : cfg.filter && (
                    <select aria-label={cfg.filter.label} value={filter} onChange={e => setFilter(e.target.value)} className={`${inputCls} w-auto bg-slate-50/50`}>
                        <option value="">{cfg.filter.label}: ทั้งหมด</option>
                        {cfg.filter.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                )}
                {cfg.categories && canEdit && (
                    <button onClick={() => setManaging(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        <Tags className="w-4 h-4" />จัดการหมวดหมู่
                    </button>
                )}
                {canEdit && (
                    <button onClick={() => setEditing("new")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-900/20">
                        <Plus className="w-4 h-4" />เพิ่ม{cfg.noun}
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-400">กำลังโหลด…</p></div>
                ) : shown.length === 0 ? (
                    <div className="py-16 text-center">
                        <p className="text-sm font-semibold text-slate-400">{items.length ? "ไม่พบรายการที่ค้นหา" : `ยังไม่มี${cfg.noun}`}</p>
                        {!items.length && cfg.emptyHint && <p className="text-xs text-slate-400 mt-1">{cfg.emptyHint}</p>}
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {shown.map(i => {
                            const index = items.indexOf(i);
                            const path = cfg.publicPath?.(i);
                            return (
                                <li key={i.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80">
                                    {canReorder && (
                                        <div className="flex flex-col">
                                            <button onClick={() => move(index, -1)} disabled={index === 0} aria-label={`เลื่อน ${i.title} ขึ้น`} className="p-1 rounded text-slate-300 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label={`เลื่อน ${i.title} ลง`} className="p-1 rounded text-slate-300 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                                        </div>
                                    )}
                                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        {i.coverUrl ? <img src={i.coverUrl} alt="" className="w-full h-full object-cover" />
                                            : <span className="w-full h-full bg-blue-50 text-blue-600 flex items-center justify-center">{(() => { const Icon = TYPE_ICON[cfg.type] ?? FileText; return <Icon className="w-6 h-6" />; })()}</span>}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-slate-800 truncate">{i.title}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">{cfg.subtitle(i)}</p>
                                    </div>
                                    {i.date && <span className="hidden md:block text-xs text-slate-400 shrink-0">{formatThaiDate(i.date)}</span>}
                                    <StatusPill on={i.isPublished} onLabel="แสดง" offLabel="ซ่อน" />
                                    <div className="flex items-center gap-1">
                                        {path && i.isPublished && (
                                            <a href={`${PUBLIC_SITE_URL}${path}`} target="_blank" rel="noreferrer" aria-label={`เปิด ${i.title} บนเว็บ`} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><ExternalLink className="w-4 h-4" /></a>
                                        )}
                                        {canEdit && <>
                                            <button onClick={() => setEditing(i)} aria-label={`แก้ไข ${i.title}`} className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => setDeleting(i)} aria-label={`ลบ ${i.title}`} className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                                        </>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
            {cfg.sortable && canEdit && <p className="text-[11px] text-slate-400">ลำดับในรายการนี้คือลำดับที่แสดงบนเว็บไซต์ · ใช้ลูกศร ↑↓ เพื่อจัดลำดับ</p>}

            {managing && cfg.categories && <CategoryManager type={cfg.categories.type} title={cfg.categories.label} onClose={() => setManaging(false)} onChanged={load} />}
            {editing && <ContentModal cfg={cfg} item={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={msg => { setEditing(null); toast(msg); load(); }} />}
            {deleting && <ConfirmDelete text={`ลบ "${deleting.title}" ออกจากเว็บไซต์? ไฟล์และรูปที่แนบไว้จะถูกลบด้วย`} onCancel={() => setDeleting(null)}
                onConfirm={async () => { try { await deleteSiteContent(deleting.id); toast("ลบแล้ว"); load(); } catch { toast("ลบไม่สำเร็จ", "error"); } setDeleting(null); }} />}
        </div>
    );
}
