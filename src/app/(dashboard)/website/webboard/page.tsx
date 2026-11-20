"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, MessageSquare, MessagesSquare, Pencil, Pin, Plus, Search, Send, ShieldCheck, Trash2,
} from "lucide-react";
import {
    createSiteThread, deleteSiteComment, deleteSiteThread, fetchSiteThread, fetchSiteThreads, replySiteThread,
    updateSiteComment, updateSiteThread, type SiteThread, type ThreadStatus,
} from "@/lib/api";
import { ConfirmDelete, Modal, PageHeader, PUBLIC_SITE_URL, inputCls, labelCls, useCanEditWebsite, useToast } from "../_shared";
import { Field, LinesInput, SaveBar, SectionTitle, Tabs, TagsInput, errMsg, sectionCls, useHashTab, useSiteSetting } from "../_editors";

type Board = SiteThread["board"];
type Toast = (m: string, t?: "success" | "error") => void;
const BOARD_NAME: Record<Board, string> = { "youth-care": "กระดานปรึกษา Youth Care", general: "พูดคุยทั่วไป" };
const STATUS: Record<ThreadStatus, { label: string; cls: string }> = {
    pending: { label: "รอตรวจสอบ", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    published: { label: "เผยแพร่", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    hidden: { label: "ซ่อน", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};
const when = (s: string) => new Date(s).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });

const TABS = ["pending", "youth-care", "general", "settings"] as const;
type Key = (typeof TABS)[number];

// ─── Thread detail: edit, moderate comments, reply ───────────
function ThreadModal({ id, board, onClose, onChanged, toast }: { id: string | "new"; board: Board; onClose: () => void; onChanged: () => void; toast: Toast }) {
    const canEdit = useCanEditWebsite();
    const [thread, setThread] = useState<SiteThread | null>(null);
    const [form, setForm] = useState({ title: "", body: "", tag: "", authorName: "", status: "published" as ThreadStatus, isPinned: false, answered: false });
    const [reply, setReply] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        if (id === "new") return;
        const t = await fetchSiteThread(id);
        setThread(t);
        setForm({ title: t.title, body: t.body, tag: t.tag ?? "", authorName: t.authorName, status: t.status, isPinned: t.isPinned, answered: t.answered });
    }, [id]);
    useEffect(() => { load().catch(() => setError("โหลดกระทู้ไม่สำเร็จ")); }, [load]);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true); setError("");
        try {
            if (id === "new") await createSiteThread({ ...form, board });
            else await updateSiteThread(id, form);
            toast(id === "new" ? "ตั้งกระทู้แล้ว" : "บันทึกกระทู้แล้ว");
            onChanged();
            if (id === "new") onClose(); else await load();
        } catch (err) { setError(errMsg(err, "บันทึกไม่สำเร็จ")); }
        finally { setBusy(false); }
    };
    const sendReply = async () => {
        if (!reply.trim() || id === "new") return;
        setBusy(true);
        try { await replySiteThread(id, reply.trim()); setReply(""); toast("ตอบกลับแล้ว"); await load(); onChanged(); }
        catch (err) { toast(errMsg(err, "ตอบกลับไม่สำเร็จ"), "error"); }
        finally { setBusy(false); }
    };
    const commentAction = async (fn: () => Promise<unknown>, msg: string) => {
        try { await fn(); toast(msg); await load(); onChanged(); } catch { toast("ทำรายการไม่สำเร็จ", "error"); }
    };
    const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }));

    if (id !== "new" && !thread) {
        return <Modal title="กระทู้" onClose={onClose}><div className="p-10 text-center">{error ? <p className="text-sm text-rose-600">{error}</p> : <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" />}</div></Modal>;
    }
    return (
        <Modal title={id === "new" ? `ตั้งกระทู้ใหม่ · ${BOARD_NAME[board]}` : `กระทู้ · ${BOARD_NAME[thread!.board]}`} onClose={onClose} wide>
            <form onSubmit={save} className="p-6 space-y-4 border-b">
                <fieldset disabled={!canEdit} className="space-y-4">
                    <Field label="หัวข้อ" required><input required value={form.title} onChange={e => set("title", e.target.value)} className={inputCls} /></Field>
                    <Field label="เนื้อหา" required><textarea required rows={5} value={form.body} onChange={e => set("body", e.target.value)} className={`${inputCls} resize-y leading-relaxed`} /></Field>
                    <div className="grid sm:grid-cols-3 gap-4">
                        <Field label="ผู้ตั้งกระทู้" hint={board === "youth-care" ? "กระดาน Youth Care ควรแสดงเป็นผู้ใช้นิรนาม" : undefined}>
                            <input value={form.authorName} onChange={e => set("authorName", e.target.value)} placeholder="ทีมงานฟิตยะตุลฮัก" className={inputCls} />
                        </Field>
                        <Field label="แท็ก"><input value={form.tag} onChange={e => set("tag", e.target.value)} className={inputCls} /></Field>
                        <Field label="สถานะ">
                            <select value={form.status} onChange={e => set("status", e.target.value as ThreadStatus)} className={inputCls}>
                                {(Object.keys(STATUS) as ThreadStatus[]).map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
                            </select>
                        </Field>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={form.isPinned} onChange={e => set("isPinned", e.target.checked)} className="w-4 h-4 accent-blue-600" />ปักหมุดไว้บนสุด
                        </label>
                        {board === "youth-care" && (
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={form.answered} onChange={e => set("answered", e.target.checked)} className="w-4 h-4 accent-blue-600" />ทีมงานตอบแล้ว
                            </label>
                        )}
                    </div>
                    {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
                    {canEdit && (
                        <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                            {busy && <Loader2 className="w-4 h-4 animate-spin" />}{id === "new" ? "ตั้งกระทู้" : "บันทึกกระทู้"}
                        </button>
                    )}
                </fieldset>
            </form>

            {thread && (
                <div className="p-6 space-y-3">
                    <h3 className="text-sm font-bold text-slate-700">ความคิดเห็น ({thread.comments?.length ?? 0})</h3>
                    {!thread.comments?.length && <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-4 text-center">ยังไม่มีความคิดเห็น</p>}
                    <ul className="space-y-2">
                        {thread.comments?.map(c => (
                            <li key={c.id} className={`rounded-xl border px-4 py-3 ${c.isHidden ? "bg-slate-50 border-dashed opacity-70" : c.isStaff ? "bg-blue-50/60 border-blue-100" : "border-slate-200"}`}>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="font-bold text-slate-700">{c.authorName}</span>
                                    {c.isStaff && <span className="px-1.5 rounded bg-blue-600 text-white font-semibold">ทีมงาน</span>}
                                    {c.isHidden && <span className="px-1.5 rounded bg-slate-200 text-slate-600 font-semibold">ซ่อนอยู่</span>}
                                    <span className="text-slate-400 ml-auto">{when(c.createdAt)}</span>
                                </div>
                                <p className="text-sm text-slate-700 mt-1.5 whitespace-pre-line">{c.body}</p>
                                {canEdit && (
                                    <div className="flex gap-1 mt-2">
                                        <button type="button" onClick={() => commentAction(() => updateSiteComment(c.id, { isHidden: !c.isHidden }), c.isHidden ? "แสดงความคิดเห็นแล้ว" : "ซ่อนความคิดเห็นแล้ว")}
                                            className="flex items-center gap-1 text-xs font-semibold text-slate-500 px-2 py-1 rounded-lg hover:bg-white">
                                            {c.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}{c.isHidden ? "แสดง" : "ซ่อน"}
                                        </button>
                                        <button type="button" onClick={() => { if (confirm("ลบความคิดเห็นนี้ถาวร?")) commentAction(() => deleteSiteComment(c.id), "ลบความคิดเห็นแล้ว"); }}
                                            className="flex items-center gap-1 text-xs font-semibold text-rose-500 px-2 py-1 rounded-lg hover:bg-white"><Trash2 className="w-3.5 h-3.5" />ลบ</button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                    {canEdit && (
                        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                            <label htmlFor="reply" className={labelCls}>ตอบกลับในนามทีมงาน</label>
                            <textarea id="reply" rows={3} value={reply} onChange={e => setReply(e.target.value)} className={`${inputCls} resize-y`}
                                placeholder={thread.board === "youth-care" ? "คำตอบจะแสดงในชื่อ ทีม Youth Care" : "คำตอบจะแสดงในชื่อ ทีมงานฟิตยะตุลฮัก"} />
                            <button type="button" onClick={sendReply} disabled={busy || !reply.trim()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                                <Send className="w-4 h-4" />ส่งคำตอบ
                            </button>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}

// ─── Thread list ──────────────────────────────────────────────
function ThreadList({ items, showBoard, onOpen, onAction, canEdit }: {
    items: SiteThread[]; showBoard?: boolean; onOpen: (t: SiteThread) => void; canEdit: boolean;
    onAction: (t: SiteThread, action: "publish" | "hide" | "pin" | "delete") => void;
}) {
    if (!items.length) return <div className="py-16 text-center text-sm font-semibold text-slate-400">ไม่มีกระทู้</div>;
    return (
        <ul className="divide-y divide-slate-100">
            {items.map(t => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80">
                    <button onClick={() => onOpen(t)} className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                            {t.isPinned && <Pin aria-label="ปักหมุด" className="w-3.5 h-3.5 text-amber-500" />}
                            <span className="font-semibold text-slate-800 hover:text-blue-600">{t.title}</span>
                            {t.board === "youth-care" && t.status === "published" && (
                                <span className={`text-[11px] px-1.5 rounded font-semibold ${t.answered ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{t.answered ? "ตอบแล้ว" : "รอคำตอบ"}</span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {showBoard && <>{BOARD_NAME[t.board]} · </>}{t.authorName}{t.tag && <> · #{t.tag}</>} · {when(t.createdAt)} · <MessageSquare className="inline w-3 h-3" /> {t._count?.comments ?? 0}
                        </p>
                        {t.status === "pending" && <p className="text-sm text-slate-600 mt-1.5 line-clamp-2">{t.body}</p>}
                    </button>
                    <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS[t.status].cls}`}>{STATUS[t.status].label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                        {t.status === "published" && <a href={`${PUBLIC_SITE_URL}/webboard/${t.board}/${t.id}`} target="_blank" rel="noreferrer" aria-label={`เปิด ${t.title} บนเว็บ`} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><ExternalLink className="w-4 h-4" /></a>}
                        {canEdit && <>
                            {t.status !== "published"
                                ? <button onClick={() => onAction(t, "publish")} aria-label={`อนุมัติ ${t.title}`} title="อนุมัติ/เผยแพร่" className="p-2 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"><CheckCircle2 className="w-4 h-4" /></button>
                                : <button onClick={() => onAction(t, "hide")} aria-label={`ซ่อน ${t.title}`} title="ซ่อน" className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><EyeOff className="w-4 h-4" /></button>}
                            {t.status === "pending" && <button onClick={() => onAction(t, "hide")} aria-label={`ไม่อนุมัติ ${t.title}`} title="ไม่อนุมัติ (ซ่อน)" className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><EyeOff className="w-4 h-4" /></button>}
                            {t.status === "published" && <button onClick={() => onAction(t, "pin")} aria-label={t.isPinned ? `เลิกปักหมุด ${t.title}` : `ปักหมุด ${t.title}`} title={t.isPinned ? "เลิกปักหมุด" : "ปักหมุด"} className={`p-2 rounded-lg hover:bg-amber-50 ${t.isPinned ? "text-amber-500" : "text-slate-400"} hover:text-amber-600`}><Pin className="w-4 h-4" /></button>}
                            <button onClick={() => onOpen(t)} aria-label={`แก้ไข ${t.title}`} className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => onAction(t, "delete")} aria-label={`ลบ ${t.title}`} className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                        </>}
                    </div>
                </li>
            ))}
        </ul>
    );
}

// ─── Board settings ───────────────────────────────────────────
function BoardSettings({ toast }: { toast: Toast }) {
    const canEdit = useCanEditWebsite();
    const { value: w, set, save, saving, dirty } = useSiteSetting("webboard", toast);
    if (!w) return <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></div>;
    const board = (key: "youthCare" | "general", title: string) => (
        <section className={sectionCls}>
            <SectionTitle title={title} />
            <Field label="ชื่อกระดาน"><input value={w[key].name} onChange={e => set({ [key]: { ...w[key], name: e.target.value } })} className={inputCls} /></Field>
            <Field label="คำอธิบาย"><textarea rows={2} value={w[key].description} onChange={e => set({ [key]: { ...w[key], description: e.target.value } })} className={`${inputCls} resize-y`} /></Field>
            <TagsInput label="แท็กที่ให้เลือกตอนตั้งกระทู้" value={w[key].tags} onChange={tags => set({ [key]: { ...w[key], tags } })} />
        </section>
    );
    return (
        <div className="space-y-5">
            <fieldset disabled={!canEdit} className="space-y-5">
                {board("youthCare", "กระดานปรึกษา Youth Care")}
                {board("general", "พูดคุยทั่วไป")}
                <section className={sectionCls}>
                    <SectionTitle title="กติกาการใช้งาน" hint="แสดงด้านข้างของทุกกระดาน" />
                    <LinesInput label="กติกา" value={w.rules} onChange={rules => set({ rules })} rows={5} />
                </section>
            </fieldset>
            <SaveBar dirty={dirty} saving={saving} onSave={save} canEdit={canEdit} />
        </div>
    );
}

export default function WebsiteWebboardPage() {
    const canEdit = useCanEditWebsite();
    const toast = useToast();
    const { show } = toast;
    const [tab, setTab] = useHashTab<Key>(TABS, "pending");
    const [items, setItems] = useState<SiteThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"" | ThreadStatus>("");
    const [open, setOpen] = useState<{ id: string | "new"; board: Board } | null>(null);
    const [deleting, setDeleting] = useState<SiteThread | null>(null);

    const load = useCallback(async () => {
        try { setItems((await fetchSiteThreads()).items); } catch { show("โหลดกระทู้ไม่สำเร็จ", "error"); } finally { setLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => { load(); }, [load]);

    const pending = items.filter(t => t.status === "pending");
    const shown = useMemo(() => {
        const list = tab === "pending" ? pending : items.filter(t => t.board === tab && (!status || t.status === status));
        const q = search.toLowerCase();
        return q ? list.filter(t => `${t.title} ${t.body} ${t.authorName}`.toLowerCase().includes(q)) : list;
    }, [items, pending, tab, status, search]);

    const action = async (t: SiteThread, a: "publish" | "hide" | "pin" | "delete") => {
        if (a === "delete") { setDeleting(t); return; }
        const patch = a === "publish" ? { status: "published" as const } : a === "hide" ? { status: "hidden" as const } : { isPinned: !t.isPinned };
        try {
            await updateSiteThread(t.id, patch);
            show(a === "publish" ? "เผยแพร่กระทู้แล้ว" : a === "hide" ? "ซ่อนกระทู้แล้ว" : t.isPinned ? "เลิกปักหมุดแล้ว" : "ปักหมุดแล้ว");
            load();
        } catch (e) { show(errMsg(e, "ทำรายการไม่สำเร็จ"), "error"); }
    };

    const count = (b: Board) => items.filter(t => t.board === b).length;
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <PageHeader icon={MessagesSquare} title="เว็บบอร์ด" subtitle="ตรวจสอบกระทู้ใหม่ ตอบคำถาม ซ่อน/ลบเนื้อหาไม่เหมาะสม และตั้งค่ากระดาน" previewPath="/webboard" />
            <Tabs tabs={[
                { key: "pending", label: "รอตรวจสอบ", count: pending.length },
                { key: "youth-care", label: "Youth Care", count: count("youth-care") },
                { key: "general", label: "พูดคุยทั่วไป", count: count("general") },
                { key: "settings", label: "ตั้งค่ากระดาน" },
            ]} value={tab} onChange={k => { setTab(k); setStatus(""); setSearch(""); }} />

            {tab === "settings" ? <BoardSettings toast={show} /> : <>
                {tab === "pending" && (
                    <p className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                        กระทู้ที่สมาชิกตั้งใหม่จะรออยู่ที่นี่ และยังไม่แสดงบนเว็บจนกว่าจะกดอนุมัติ ✓
                    </p>
                )}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input aria-label="ค้นหากระทู้" value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาหัวข้อ เนื้อหา หรือผู้ตั้ง…" className={`${inputCls} pl-9 bg-slate-50/50`} />
                    </div>
                    {tab !== "pending" && <>
                        <select aria-label="กรองตามสถานะ" value={status} onChange={e => setStatus(e.target.value as ThreadStatus | "")} className={`${inputCls} w-auto bg-slate-50/50`}>
                            <option value="">ทุกสถานะ</option>
                            {(Object.keys(STATUS) as ThreadStatus[]).map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
                        </select>
                        {canEdit && (
                            <button onClick={() => setOpen({ id: "new", board: tab })} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-900/20">
                                <Plus className="w-4 h-4" />ตั้งกระทู้
                            </button>
                        )}
                    </>}
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {loading ? <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></div>
                        : <ThreadList items={shown} showBoard={tab === "pending"} canEdit={canEdit} onOpen={t => setOpen({ id: t.id, board: t.board })} onAction={action} />}
                </div>
            </>}

            {open && <ThreadModal id={open.id} board={open.board} onClose={() => setOpen(null)} onChanged={load} toast={show} />}
            {deleting && <ConfirmDelete text={`ลบกระทู้ "${deleting.title}" และความคิดเห็นทั้งหมดถาวร?`} onCancel={() => setDeleting(null)}
                onConfirm={async () => { try { await deleteSiteThread(deleting.id); show("ลบกระทู้แล้ว"); load(); } catch { show("ลบไม่สำเร็จ", "error"); } setDeleting(null); }} />}
            {toast.node}
        </div>
    );
}
