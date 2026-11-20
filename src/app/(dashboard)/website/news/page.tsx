"use client";
// โพสต์ข่าวและความรู้ — one place to post on the website. The writer picks the page:
// ข่าวประชาสัมพันธ์ (/news) or one of the knowledge pages (/knowledge/<category>).
// Posts already on the wrong page can be moved (images, video and source link go along).
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, BookOpen, ExternalLink, Loader2, Newspaper, Pencil, Pin, Plus, Search, Trash2 } from "lucide-react";
import {
    createSiteNews, deleteSiteContent, deleteSiteNews, fetchSiteContent, fetchSiteNews, moveArticleToNews, moveNewsToKnowledge,
    updateSiteContent, updateSiteNews, type SiteContent, type SiteNews,
} from "@/lib/api";
import { ContentModal } from "../_content";
import { ARTICLE_CATEGORIES, articleConfigs } from "../_configs";
import {
    ConfirmDelete, ImagePicker, Modal, PageHeader, PUBLIC_SITE_URL, SITE_DEPARTMENTS, StatusPill,
    formatThaiDate, inputCls, labelCls, toDateInput, useCanEditWebsite, useToast,
} from "../_shared";

type Form = {
    title: string; slug: string; department: string; excerpt: string; content: string;
    coverUrl: string; images: string[]; videoUrl: string; isPublished: boolean; isPinned: boolean; publishedAt: string;
};

const emptyForm = (): Form => ({
    title: "", slug: "", department: SITE_DEPARTMENTS[0], excerpt: "", content: "",
    coverUrl: "", images: [], videoUrl: "", isPublished: false, isPinned: false, publishedAt: toDateInput(null),
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
        coverUrl: item.coverUrl ?? "", images: item.images, videoUrl: item.videoUrl ?? "", isPublished: item.isPublished, isPinned: item.isPinned,
        publishedAt: toDateInput(item.publishedAt),
    } : emptyForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) { setError("กรุณากรอกหัวข้อข่าว"); return; }
        setSaving(true); setError("");
        const payload = { ...form, coverUrl: form.coverUrl || null, videoUrl: form.videoUrl.trim() || null, publishedAt: toPublishedAt(form.publishedAt, item?.publishedAt ?? null) };
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
                <div>
                    <label htmlFor="n-video" className={labelCls}>ลิงก์วิดีโอ (Facebook หรือ YouTube)</label>
                    <input id="n-video" type="url" value={form.videoUrl} onChange={e => set("videoUrl", e.target.value)} className={inputCls} placeholder="https://www.facebook.com/reel/… หรือ https://youtu.be/…" />
                    <p className="text-[11px] text-slate-400 mt-1">แสดงเป็นตัวเล่นวิดีโอบนหน้าข่าว แทนภาพปก (ไม่ต้องอัปโหลดไฟล์)</p>
                </div>
                {item?.sourceUrl && <p className="text-xs text-slate-500">นำเข้าจาก <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">โพสต์ต้นทาง</a></p>}
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

// ─── Destinations ─────────────────────────────────────────────
type Dest = "news" | (typeof ARTICLE_CATEGORIES)[number]["key"];
const DESTS: { key: Dest; label: string; page: string; hint: string; cls: string }[] = [
    { key: "news", label: "ข่าวประชาสัมพันธ์", page: "หน้าข่าว/ประชาสัมพันธ์", hint: "ข่าวกิจกรรม ประกาศรับสมัคร เชิญชวน ประมวลภาพ", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    { key: "academic", label: "ข้อมูลวิชาการ", page: "ศูนย์เนื้อหาวิชาการ", hint: "บทความวิชาการ งานวิจัย (แนบ PDF ฉบับเต็มได้)", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    { key: "encyclopedia", label: "สาระน่ารู้", page: "ศูนย์เนื้อหาวิชาการ", hint: "ข้อคิด นาซีฮัต เกร็ดความรู้ทั่วไป", cls: "bg-sky-50 text-sky-700 border-sky-200" },
    { key: "biography", label: "ชีวประวัติบุคคลสำคัญ", page: "ศูนย์เนื้อหาวิชาการ", hint: "เรื่องราวบุคคลต้นแบบ อุละมาอ์", cls: "bg-violet-50 text-violet-700 border-violet-200" },
    { key: "youth-advice", label: "คำแนะนำด้านเยาวชน", page: "ศูนย์เนื้อหาวิชาการ", hint: "คำแนะนำสำหรับผู้ปกครอง เยาวชน ครู", cls: "bg-pink-50 text-pink-700 border-pink-200" },
];
const destOf = (k: Dest) => DESTS.find(d => d.key === k)!;

type Post =
    | { kind: "news"; dest: Dest; id: string; title: string; dept: string; date: string | null; published: boolean; pinned: boolean; cover: string | null; href: string; raw: SiteNews }
    | { kind: "article"; dest: Dest; id: string; title: string; dept: string; date: string | null; published: boolean; pinned: boolean; cover: string | null; href: string; raw: SiteContent };

const fromNews = (n: SiteNews): Post => ({ kind: "news", dest: "news", id: n.id, title: n.title, dept: n.department, date: n.publishedAt, published: n.isPublished, pinned: n.isPinned, cover: n.coverUrl, href: `/news/${n.slug}`, raw: n });
const fromArticle = (a: SiteContent): Post => ({
    kind: "article", dest: (a.category ?? "encyclopedia") as Dest, id: a.id, title: a.title, dept: a.data?.department || a.data?.author || "",
    date: a.date, published: a.isPublished, pinned: false, cover: a.coverUrl, href: `/knowledge/${a.category}/${a.slug}`, raw: a,
});

/** Step 1 of a new post: which page should it go on? */
function ChooseDest({ onPick, onClose }: { onPick: (d: Dest) => void; onClose: () => void }) {
    return (
        <Modal title="โพสต์ใหม่ — จะลงหน้าไหน?" onClose={onClose}>
            <div className="p-6 space-y-2">
                {DESTS.map(d => (
                    <button key={d.key} onClick={() => onPick(d.key)} className="w-full text-left flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40">
                        {d.key === "news" ? <Newspaper className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" /> : <BookOpen className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />}
                        <span>
                            <span className="block font-semibold text-slate-800">{d.label} <span className="text-xs font-normal text-slate-400">· {d.page}</span></span>
                            <span className="block text-xs text-slate-500 mt-0.5">{d.hint}</span>
                        </span>
                    </button>
                ))}
            </div>
        </Modal>
    );
}

/** Move an existing post to another page. */
function MovePost({ post, onClose, onMoved }: { post: Post; onClose: () => void; onMoved: (msg: string) => void }) {
    const [to, setTo] = useState<Dest | null>(null);
    const [dept, setDept] = useState(SITE_DEPARTMENTS.includes(post.dept) ? post.dept : SITE_DEPARTMENTS[0]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const go = async () => {
        if (!to) return;
        setBusy(true); setError("");
        try {
            if (post.kind === "news") await moveNewsToKnowledge(post.id, to);
            else if (to === "news") await moveArticleToNews(post.id, dept);
            else await updateSiteContentCategory(post.raw, to);
            onMoved(`ย้าย "${post.title}" ไป${destOf(to).label}แล้ว`);
        } catch (e) { setError(e instanceof Error && e.message.includes("400") ? "ข้อมูลไม่ครบ" : "ย้ายไม่สำเร็จ"); }
        finally { setBusy(false); }
    };
    return (
        <Modal title="ย้ายโพสต์ไปหน้าอื่น" onClose={onClose}>
            <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">“{post.title}” <span className="text-slate-400">อยู่ที่ {destOf(post.dest).label}</span></p>
                <div className="space-y-1.5">
                    {DESTS.filter(d => d.key !== post.dest).map(d => (
                        <label key={d.key} className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-sm ${to === d.key ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}>
                            <input type="radio" name="dest" checked={to === d.key} onChange={() => setTo(d.key)} className="accent-blue-600" />
                            <span className="font-semibold text-slate-800">{d.label}</span><span className="text-xs text-slate-400">· {d.page}</span>
                        </label>
                    ))}
                </div>
                {to === "news" && post.kind === "article" && (
                    <div>
                        <label htmlFor="mv-dept" className={labelCls}>หน่วยงานของข่าว</label>
                        <select id="mv-dept" value={dept} onChange={e => setDept(e.target.value)} className={inputCls}>{SITE_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select>
                    </div>
                )}
                <p className="text-[11px] text-slate-400">ภาพปก อัลบั้มภาพ วิดีโอ และเนื้อหาย้ายไปด้วยทั้งหมด · ลิงก์บนเว็บจะเปลี่ยนตามหน้าใหม่</p>
                {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                    <button onClick={go} disabled={!to || busy} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}ย้ายโพสต์
                    </button>
                </div>
            </div>
        </Modal>
    );
}
const updateSiteContentCategory = (a: SiteContent, category: string) => updateSiteContent(a.id, { ...a, category });

export default function WebsitePostsPage() {
    const canEdit = useCanEditWebsite();
    const toast = useToast();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dept, setDept] = useState("");
    const [dest, setDest] = useState<Dest | "">("");
    const [choosing, setChoosing] = useState(false);
    const [editNews, setEditNews] = useState<SiteNews | null | "new">(null);
    const [editArticle, setEditArticle] = useState<{ cat: string; item: SiteContent | null } | null>(null);
    const [moving, setMoving] = useState<Post | null>(null);
    const [deleting, setDeleting] = useState<Post | null>(null);
    const { show } = toast;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [news, articles] = await Promise.all([fetchSiteNews(), fetchSiteContent("article")]);
            setPosts([...news.map(fromNews), ...articles.map(fromArticle)].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")));
        } catch { show("โหลดโพสต์ไม่สำเร็จ", "error"); } finally { setLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => { load(); }, [load]);

    const count = (k: Dest) => posts.filter(p => p.dest === k).length;
    const shown = useMemo(() => posts.filter(p =>
        (!dest || p.dest === dest) && (!dept || p.dept === dept) && (!search || p.title.toLowerCase().includes(search.toLowerCase()))
    ), [posts, dest, dept, search]);
    const done = (msg: string) => { setEditNews(null); setEditArticle(null); setMoving(null); show(msg); load(); };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <PageHeader icon={Newspaper} title="โพสต์ข่าวและความรู้" subtitle={`ข่าวประชาสัมพันธ์ ${count("news")} · ศูนย์เนื้อหาวิชาการ ${posts.length - count("news")} — เลือกได้ว่าจะลงหน้าไหน`} previewPath={dest && dest !== "news" ? `/knowledge/${dest}` : "/news"}>
                {canEdit && (
                    <button onClick={() => setChoosing(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-900/20">
                        <Plus className="w-4 h-4" />โพสต์ใหม่
                    </button>
                )}
            </PageHeader>

            <div className="flex flex-wrap gap-2" role="tablist" aria-label="หน้าที่แสดง">
                {[{ key: "" as const, label: "ทั้งหมด", n: posts.length }, ...DESTS.map(d => ({ key: d.key, label: d.label, n: count(d.key) }))].map(t => (
                    <button key={t.key || "all"} role="tab" aria-selected={dest === t.key} onClick={() => setDest(t.key)}
                        className={`px-3.5 py-2 rounded-full text-sm font-semibold border ${dest === t.key ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                        {t.label} <span className="opacity-60">{t.n}</span>
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input aria-label="ค้นหาโพสต์" value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาหัวข้อ…" className={`${inputCls} pl-9 bg-slate-50/50`} />
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
                        <p className="text-sm font-semibold text-slate-400">{posts.length ? "ไม่พบโพสต์ที่ค้นหา" : "ยังไม่มีโพสต์"}</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {shown.map(p => {
                            const d = destOf(p.dest);
                            return (
                                <li key={`${p.kind}-${p.id}`} className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-slate-50/80">
                                    <div className="w-20 sm:w-24 aspect-video rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        {p.cover ? <img src={p.cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300">{p.kind === "news" ? <Newspaper className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}</div>}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {p.pinned && <Pin aria-label="ปักหมุด" className="w-3.5 h-3.5 text-amber-500" />}
                                            <p className="font-semibold text-slate-800 line-clamp-2 sm:truncate">{p.title}</p>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${d.cls}`}>{d.label}</span>
                                            {p.dept && <span>{p.dept}</span>}<span>{formatThaiDate(p.date)}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                                    <span className="mr-auto sm:mr-2"><StatusPill on={p.published} onLabel="เผยแพร่" offLabel="ฉบับร่าง" /></span>
                                        {p.published && (
                                            <a href={`${PUBLIC_SITE_URL}${p.href}`} target="_blank" rel="noreferrer" aria-label={`เปิด ${p.title} บนเว็บ`} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><ExternalLink className="w-4 h-4" /></a>
                                        )}
                                        {canEdit && <>
                                            <button onClick={() => setMoving(p)} aria-label={`ย้าย ${p.title} ไปหน้าอื่น`} title="ย้ายไปหน้าอื่น" className="p-2 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600"><ArrowRightLeft className="w-4 h-4" /></button>
                                            <button onClick={() => p.kind === "news" ? setEditNews(p.raw) : setEditArticle({ cat: p.dest, item: p.raw })} aria-label={`แก้ไข ${p.title}`} className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => setDeleting(p)} aria-label={`ลบ ${p.title}`} className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                                        </>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {choosing && <ChooseDest onClose={() => setChoosing(false)} onPick={d => { setChoosing(false); if (d === "news") setEditNews("new"); else setEditArticle({ cat: d, item: null }); }} />}
            {editNews && <NewsModal item={editNews === "new" ? null : editNews} onClose={() => setEditNews(null)} onSaved={done} />}
            {editArticle && <ContentModal cfg={articleConfigs[editArticle.cat]} item={editArticle.item} onClose={() => setEditArticle(null)} onSaved={done} />}
            {moving && <MovePost post={moving} onClose={() => setMoving(null)} onMoved={done} />}
            {deleting && <ConfirmDelete text={`ลบ "${deleting.title}" และรูปทั้งหมดของโพสต์นี้?`} onCancel={() => setDeleting(null)}
                onConfirm={async () => {
                    try { await (deleting.kind === "news" ? deleteSiteNews(deleting.id) : deleteSiteContent(deleting.id)); show("ลบแล้ว"); load(); }
                    catch { show("ลบไม่สำเร็จ", "error"); }
                    setDeleting(null);
                }} />}
            {toast.node}
        </div>
    );
}
