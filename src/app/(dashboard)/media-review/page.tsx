"use client";
// ตรวจงานสื่อประชาสัมพันธ์: units submit content, format, channels and the publish date/time;
// reviewers (media.review) approve or send back, and everyone sees the schedule so posts don't clash.
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, ImagePlus, Loader2, Megaphone, Pencil, Plus, RotateCcw, Send, Trash2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import {
    apiErrorMessage, approveMediaPost, checkMediaClashes, createMediaPost, deleteMediaPost, fetchDepartments, fetchMediaCalendar,
    fetchMediaPost, fetchMediaPosts, markMediaPublished, returnMediaPost, updateMediaPost, uploadImages,
    type MediaCalendarItem, type MediaClash, type MediaInput, type MediaPost, type MediaStatus,
} from "@/lib/api";
import { hasPermission } from "@/config/permissions";

const CHANNELS = ["Facebook กลุ่มฟิตยะตุลฮัก", "Facebook สมาคม TMYDA", "Instagram", "TikTok", "YouTube", "LINE OA", "เว็บไซต์"];
const FORMATS = ["โพสต์ภาพเดี่ยว", "อัลบั้มภาพ", "อินโฟกราฟิก", "วิดีโอ", "คลิปสั้น / Reels", "Story", "ข่าว / บทความ", "ไลฟ์สด"];
const STATUS: Record<MediaStatus, { label: string; cls: string }> = {
    draft: { label: "ฉบับร่าง", cls: "bg-slate-100 text-slate-600 border-slate-200" },
    pending: { label: "รอตรวจ", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    approved: { label: "ผ่านการตรวจ", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    returned: { label: "ส่งกลับแก้ไข", cls: "bg-rose-50 text-rose-700 border-rose-200" },
    published: { label: "ลงแล้ว", cls: "bg-blue-50 text-blue-700 border-blue-200" },
};
const when = (s: string) => new Date(s).toLocaleString("th-TH", { weekday: "short", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const timeOnly = (s: string) => new Date(s).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
/** Date → value for <input type="datetime-local"> in local time */
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function Badge({ status }: { status: MediaStatus }) {
    const s = STATUS[status];
    return <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.cls}`}>{s.label}</span>;
}

function ClashList({ clashes, windowMinutes }: { clashes: MediaClash[]; windowMinutes?: number }) {
    if (!clashes.length) return null;
    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="w-4 h-4" />ช่วงเวลาใกล้กับงานอื่นในช่องทางเดียวกัน{windowMinutes ? ` (ภายใน ${windowMinutes / 60} ชม.)` : ""}</p>
            <ul className="mt-1.5 space-y-1">
                {clashes.map(c => (
                    <li key={c.id} className="text-xs">• {when(c.publishAt)} · {c.title} <span className="text-amber-600">({c.department} · {c.channels.join(", ")} · {STATUS[c.status].label})</span></li>
                ))}
            </ul>
        </div>
    );
}

// ─── Form (create / edit) ───────────────────────────────────────
function PostForm({ post, departments, onClose, onSaved }: { post: MediaPost | null; departments: string[]; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState<MediaInput>(() => post
        ? { title: post.title, department: post.department, channels: post.channels, format: post.format, content: post.content, attachmentUrls: post.attachmentUrls, link: post.link, publishAt: toLocalInput(new Date(post.publishAt)) }
        : { title: "", department: departments[0] ?? "", channels: [], format: FORMATS[0], content: "", attachmentUrls: [], link: "", publishAt: toLocalInput(new Date(Date.now() + 86400_000)) });
    const [clash, setClash] = useState<{ windowMinutes: number; clashes: MediaClash[] }>({ windowMinutes: 120, clashes: [] });
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const set = <K extends keyof MediaInput>(k: K, v: MediaInput[K]) => setF(s => ({ ...s, [k]: v }));

    useEffect(() => { if (!f.department && departments[0]) set("department", departments[0]); }, [departments, f.department]);

    // Live clash check while the channel / time changes
    useEffect(() => {
        if (!f.channels.length || !f.publishAt) { setClash(c => ({ ...c, clashes: [] })); return; }
        const t = setTimeout(() => {
            checkMediaClashes(f.channels, new Date(f.publishAt).toISOString(), post?.id).then(setClash).catch(() => undefined);
        }, 300);
        return () => clearTimeout(t);
    }, [f.channels, f.publishAt, post?.id]);

    const save = async (submit: boolean) => {
        setBusy(true);
        try {
            const data = { ...f, link: f.link || null, publishAt: new Date(f.publishAt).toISOString(), submit };
            if (post) await updateMediaPost(post.id, data); else await createMediaPost(data);
            toast.success(submit ? "ส่งตรวจแล้ว" : "บันทึกฉบับร่างแล้ว");
            onSaved();
        } catch (e) {
            toast.error(apiErrorMessage(e, "บันทึกไม่สำเร็จ"));
        } finally { setBusy(false); }
    };
    const canSubmit = !post || ["draft", "returned"].includes(post.status);

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800">{post ? "แก้ไขงานสื่อ" : "ส่งตรวจงานสื่อใหม่"}</h2>
                    <button onClick={onClose} aria-label="ปิด" className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 space-y-4 overflow-y-auto">
                    {post?.status === "returned" && post.note && (
                        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700"><b>สิ่งที่ต้องแก้ไข:</b> {post.note}</div>
                    )}
                    <label className="block">
                        <span className="text-xs font-semibold text-slate-600">หัวข้อ *</span>
                        <input value={f.title} onChange={e => set("title", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="เช่น ประชาสัมพันธ์ค่ายเยาวชนภาคฤดูร้อน" />
                    </label>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="text-xs font-semibold text-slate-600">หน่วยงาน *</span>
                            <select value={f.department} onChange={e => set("department", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white">
                                {departments.map(d => <option key={d}>{d}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-xs font-semibold text-slate-600">รูปแบบสื่อ *</span>
                            <select value={f.format} onChange={e => set("format", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white">
                                {FORMATS.map(x => <option key={x}>{x}</option>)}
                            </select>
                        </label>
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-slate-600">ช่องทาง *</span>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                            {CHANNELS.map(c => {
                                const on = f.channels.includes(c);
                                return (
                                    <button key={c} type="button" onClick={() => set("channels", on ? f.channels.filter(x => x !== c) : [...f.channels, c])}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${on ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>{c}</button>
                                );
                            })}
                        </div>
                    </div>
                    <label className="block">
                        <span className="text-xs font-semibold text-slate-600">วันเวลาที่ต้องการลง *</span>
                        <input type="datetime-local" value={f.publishAt} onChange={e => set("publishAt", e.target.value)} className="mt-1 w-full sm:w-64 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                    </label>
                    <ClashList clashes={clash.clashes} windowMinutes={clash.windowMinutes} />
                    <label className="block">
                        <span className="text-xs font-semibold text-slate-600">เนื้อหา / แคปชัน *</span>
                        <textarea value={f.content} onChange={e => set("content", e.target.value)} rows={7} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                    </label>
                    <div>
                        <span className="text-xs font-semibold text-slate-600">ภาพ / ไฟล์ตัวอย่างงาน</span>
                        <div className="mt-1.5 grid grid-cols-4 gap-2">
                            {f.attachmentUrls.map((u, i) => (
                                <div key={u} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={u} alt={`ภาพที่ ${i + 1}`} className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => set("attachmentUrls", f.attachmentUrls.filter(x => x !== u))} aria-label="ลบภาพนี้" className="absolute top-1 right-1 p-1 rounded bg-white/90 text-rose-600"><Trash2 className="w-3 h-3" /></button>
                                </div>
                            ))}
                            <label className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-blue-400 hover:text-blue-600 cursor-pointer text-xs font-semibold">
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}{uploading ? "กำลังอัปโหลด" : "เพิ่มภาพ"}
                                <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={async e => {
                                    const files = Array.from(e.target.files ?? []);
                                    e.target.value = "";
                                    if (!files.length) return;
                                    setUploading(true);
                                    try { const { urls } = await uploadImages(files); setF(s => ({ ...s, attachmentUrls: [...s.attachmentUrls, ...urls] })); }
                                    catch { toast.error("อัปโหลดภาพไม่สำเร็จ"); }
                                    finally { setUploading(false); }
                                }} />
                            </label>
                        </div>
                    </div>
                    <label className="block">
                        <span className="text-xs font-semibold text-slate-600">ลิงก์ไฟล์งาน (เช่น Canva / Google Drive สำหรับวิดีโอ)</span>
                        <input value={f.link ?? ""} onChange={e => set("link", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="https://" />
                    </label>
                </div>
                <div className="flex flex-wrap justify-end gap-2 px-5 py-4 border-t border-slate-100">
                    {canSubmit && (
                        <button onClick={() => save(false)} disabled={busy || uploading} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">บันทึกฉบับร่าง</button>
                    )}
                    <button onClick={() => save(canSubmit)} disabled={busy || uploading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{canSubmit ? "ส่งตรวจ" : "บันทึกการแก้ไข"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Detail popup (read, then act) ─────────────────────────────
function PostDetail({ post, me, reviewer, onClose, onEdit, onChanged }: {
    post: MediaPost; me: string; reviewer: boolean; onClose: () => void; onEdit: () => void; onChanged: () => void;
}) {
    const [mode, setMode] = useState<"view" | "return" | "publish">("view");
    const [note, setNote] = useState("");
    const [publishAt, setPublishAt] = useState(toLocalInput(new Date(post.publishAt)));
    const [busy, setBusy] = useState(false);
    const owner = post.requestedById === me;

    const run = async (fn: () => Promise<unknown>, ok: string) => {
        setBusy(true);
        try { await fn(); toast.success(ok); onChanged(); }
        catch (e) { toast.error(apiErrorMessage(e, "ดำเนินการไม่สำเร็จ")); }
        finally { setBusy(false); }
    };
    const rescheduled = new Date(publishAt).getTime() !== new Date(post.publishAt).getTime();

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
                    <div className="min-w-0">
                        <h2 className="font-bold text-slate-800">{post.title}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{post.department} · ส่งโดย {post.requestedBy?.name ?? "-"}</p>
                    </div>
                    <div className="flex items-center gap-2"><Badge status={post.status} /><button onClick={onClose} aria-label="ปิด" className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button></div>
                </div>
                <div className="p-5 space-y-4 overflow-y-auto text-sm">
                    <dl className="grid sm:grid-cols-3 gap-3">
                        <div><dt className="text-xs text-slate-500">วันเวลาลง</dt><dd className="font-semibold text-slate-800">{when(post.publishAt)}</dd></div>
                        <div><dt className="text-xs text-slate-500">รูปแบบ</dt><dd className="text-slate-800">{post.format}</dd></div>
                        <div><dt className="text-xs text-slate-500">ช่องทาง</dt><dd className="text-slate-800">{post.channels.join(", ")}</dd></div>
                    </dl>
                    <ClashList clashes={post.clashes ?? []} />
                    {post.note && (
                        <div className={`rounded-xl p-3 border ${post.status === "returned" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                            <b>{post.status === "returned" ? "สิ่งที่ต้องแก้ไข" : "หมายเหตุผู้ตรวจ"}:</b> {post.note}{post.reviewedBy ? ` — ${post.reviewedBy.name}` : ""}
                        </div>
                    )}
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 whitespace-pre-wrap text-slate-800 leading-relaxed">{post.content}</div>
                    {!!post.attachmentUrls.length && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {post.attachmentUrls.map((u, i) => (
                                <a key={u} href={u} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-slate-200">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={u} alt={`ภาพที่ ${i + 1}`} className="w-full h-full object-cover" />
                                </a>
                            ))}
                        </div>
                    )}
                    {post.link && <a href={post.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 font-semibold hover:underline"><ExternalLink className="w-4 h-4" />เปิดไฟล์งาน</a>}
                    {post.publishedUrl && <a href={post.publishedUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-600 font-semibold hover:underline"><ExternalLink className="w-4 h-4" />ดูโพสต์ที่ลงแล้ว</a>}

                    {reviewer && post.status === "pending" && mode === "view" && (
                        <label className="block">
                            <span className="text-xs font-semibold text-slate-600">วันเวลาลง (ผู้ตรวจปรับได้)</span>
                            <input type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)} className="mt-1 w-full sm:w-64 rounded-xl border border-slate-200 px-3 py-2" />
                        </label>
                    )}
                    {mode !== "view" && (
                        <label className="block">
                            <span className="text-xs font-semibold text-slate-600">{mode === "return" ? "สิ่งที่ต้องแก้ไข *" : "ลิงก์โพสต์ที่ลงแล้ว (ถ้ามี)"}</span>
                            {mode === "return"
                                ? <textarea autoFocus value={note} onChange={e => setNote(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                                : <input autoFocus value={note} onChange={e => setNote(e.target.value)} placeholder="https://" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />}
                        </label>
                    )}
                </div>
                <div className="flex flex-wrap justify-end gap-2 px-5 py-4 border-t border-slate-100">
                    {mode !== "view" ? (<>
                        <button onClick={() => { setMode("view"); setNote(""); }} disabled={busy} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">ยกเลิก</button>
                        {mode === "return"
                            ? <button onClick={() => run(() => returnMediaPost(post.id, note), "ส่งกลับแก้ไขแล้ว")} disabled={busy || !note.trim()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-50"><RotateCcw className="w-4 h-4" />ยืนยันส่งกลับแก้ไข</button>
                            : <button onClick={() => run(() => markMediaPublished(post.id, note.trim() || undefined), "บันทึกว่าลงแล้ว")} disabled={busy} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"><CheckCircle2 className="w-4 h-4" />ยืนยันลงแล้ว</button>}
                    </>) : (<>
                        {(owner || reviewer) && ["draft", "returned", "pending"].includes(post.status) && (
                            <button onClick={() => { if (confirmDelete()) run(() => deleteMediaPost(post.id), "ลบแล้ว"); }} disabled={busy} className="mr-auto flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" />ลบ</button>
                        )}
                        {owner && ["draft", "returned", "pending"].includes(post.status) && (
                            <button onClick={onEdit} disabled={busy} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"><Pencil className="w-4 h-4" />แก้ไข</button>
                        )}
                        {reviewer && ["pending", "approved"].includes(post.status) && (
                            <button onClick={() => setMode("return")} disabled={busy} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 text-sm font-semibold"><RotateCcw className="w-4 h-4" />ส่งกลับแก้ไข</button>
                        )}
                        {reviewer && post.status === "pending" && (
                            <button onClick={() => run(() => approveMediaPost(post.id, undefined, rescheduled ? new Date(publishAt).toISOString() : undefined), "อนุมัติแล้ว")} disabled={busy} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}อนุมัติ{rescheduled ? " (เลื่อนเวลา)" : ""}
                            </button>
                        )}
                        {(owner || reviewer) && post.status === "approved" && (
                            <button onClick={() => setMode("publish")} disabled={busy} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold"><Megaphone className="w-4 h-4" />บันทึกว่าลงแล้ว</button>
                        )}
                    </>)}
                </div>
            </div>
        </div>
    );
}
// Simple native confirm; deleting is rare and reversible only by re-entering the post.
const confirmDelete = () => typeof window !== "undefined" && window.confirm("ลบงานสื่อนี้?");

// ─── Week schedule ─────────────────────────────────────────────
function Schedule({ me, onOpen }: { me: string; onOpen: (id: string) => void }) {
    const [start, setStart] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; });
    const [loaded, setLoaded] = useState<{ week: number; items: MediaCalendarItem[] } | null>(null);
    const items = loaded?.week === start.getTime() ? loaded.items : null;
    const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; }), [start]);
    useEffect(() => {
        const end = new Date(start); end.setDate(end.getDate() + 7);
        const week = start.getTime();
        fetchMediaCalendar(start.toISOString(), end.toISOString())
            .then(list => setLoaded({ week, items: list }))
            .catch(() => setLoaded({ week, items: [] }));
    }, [start]);
    const shift = (n: number) => setStart(s => { const d = new Date(s); d.setDate(d.getDate() + n * 7); return d; });
    const today = dayKey(new Date());

    return (
        <div className="bg-white rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <button onClick={() => shift(-1)} aria-label="สัปดาห์ก่อน" className="p-2 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
                <p className="font-semibold text-slate-700 text-sm">{days[0].toLocaleDateString("th-TH", { day: "numeric", month: "short" })} – {days[6].toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</p>
                <button onClick={() => shift(1)} aria-label="สัปดาห์ถัดไป" className="p-2 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
            </div>
            {!items ? <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div> : (
                <div className="grid md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    {days.map(d => {
                        const list = items.filter(it => dayKey(new Date(it.publishAt)) === dayKey(d));
                        return (
                            <div key={d.toISOString()} className="p-2 md:min-h-56">
                                <p className={`text-xs font-semibold mb-2 ${dayKey(d) === today ? "text-blue-600" : "text-slate-500"}`}>{d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric" })}</p>
                                <div className="space-y-1.5">
                                    {list.map(it => {
                                        const mine = it.requestedById === me;
                                        return (
                                            <button key={it.id} onClick={() => onOpen(it.id)} className={`w-full text-left rounded-lg border px-2 py-1.5 text-xs ${STATUS[it.status].cls}`} title={`${it.title} · ${it.channels.join(", ")}`}>
                                                <span className="font-bold">{timeOnly(it.publishAt)}</span> {it.title}
                                                <span className="block truncate opacity-75">{it.department}{mine ? " · ของฉัน" : ""}</span>
                                            </button>
                                        );
                                    })}
                                    {!list.length && <p className="text-[11px] text-slate-300 md:py-2">ว่าง</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Page ──────────────────────────────────────────────────────
export default function MediaReviewPage() {
    const { data: session } = useSession();
    const user = session?.user as { id?: string; role?: string; permissions?: string[]; department?: string } | undefined;
    const me = user?.id ?? "";
    const reviewer = user?.role === "SUPER_ADMIN" || hasPermission(user?.permissions, "media.review");
    const submitter = user?.role === "SUPER_ADMIN" || hasPermission(user?.permissions, "media.submit");
    const [chosenTab, setTab] = useState<"mine" | "review" | "schedule" | null>(null);
    const tab = chosenTab ?? (submitter ? "mine" : reviewer ? "review" : "schedule");
    const [reload, setReload] = useState(0);
    const [loaded, setLoaded] = useState<{ key: string; posts: MediaPost[] } | null>(null);
    const loadKey = `${tab}:${reload}`;
    const posts = loaded?.key === loadKey ? loaded.posts : null;
    const [departments, setDepartments] = useState<string[]>([]);
    // the user's own unit first, so it is the form's default
    const deptOptions = useMemo(() => {
        const mine = user?.department;
        return mine && departments.includes(mine) ? [mine, ...departments.filter(d => d !== mine)] : departments;
    }, [departments, user?.department]);
    const [editing, setEditing] = useState<MediaPost | null | "new">(null);
    const [open, setOpen] = useState<MediaPost | null>(null);

    useEffect(() => {
        fetchDepartments().then(ds => setDepartments(Array.from(new Set(ds.map((d: { name: string }) => d.name))))).catch(() => undefined);
    }, []);

    useEffect(() => {
        if (tab === "schedule") return;
        const key = loadKey;
        fetchMediaPosts(tab)
            .then(list => setLoaded({ key, posts: list }))
            .catch(e => { toast.error(apiErrorMessage(e, "โหลดไม่สำเร็จ")); setLoaded({ key, posts: [] }); });
    }, [tab, loadKey]);
    const load = () => setReload(n => n + 1);

    const openById = async (id: string) => {
        try {
            setOpen(await fetchMediaPost(id));
        } catch (e) { toast.error(apiErrorMessage(e, "เปิดไม่สำเร็จ")); }
    };
    const afterChange = () => { setOpen(null); setEditing(null); load(); };

    const tabs = [
        ...(submitter ? [{ id: "mine" as const, label: "งานของฉัน" }] : []),
        ...(reviewer ? [{ id: "review" as const, label: "รอตรวจ" }] : []),
        { id: "schedule" as const, label: "ตารางลงสื่อ" },
    ];

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Megaphone className="w-6 h-6 text-blue-600" />ตรวจงานสื่อประชาสัมพันธ์</h1>
                    <p className="text-sm text-slate-500 mt-1">ส่งตรวจเนื้อหา รูปแบบ และวันเวลาลงสื่อ — ระบบแจ้งเตือนถ้าช่วงเวลาชนกับงานอื่นในช่องทางเดียวกัน</p>
                </div>
                {submitter && (
                    <button onClick={() => setEditing("new")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"><Plus className="w-4 h-4" />ส่งตรวจงานใหม่</button>
                )}
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === t.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                        {t.id === "schedule" && <CalendarDays className="w-4 h-4 inline -mt-0.5 mr-1" />}{t.label}
                    </button>
                ))}
            </div>

            {tab === "schedule" ? <Schedule me={me} onOpen={openById} /> : !posts ? (
                <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : !posts.length ? (
                <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-40" />{tab === "review" ? "ไม่มีงานรอตรวจ" : "ยังไม่มีงานสื่อ"}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
                    {posts.map(p => (
                        <button key={p.id} onClick={() => openById(p.id)} className="w-full text-left flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50">
                            <div className="hidden sm:flex w-16 shrink-0 flex-col items-center rounded-xl bg-slate-50 border border-slate-100 py-1.5">
                                <span className="text-[11px] text-slate-500">{new Date(p.publishAt).toLocaleDateString("th-TH", { month: "short" })}</span>
                                <span className="text-lg font-bold text-slate-800 leading-none">{new Date(p.publishAt).getDate()}</span>
                                <span className="text-[11px] text-slate-500">{timeOnly(p.publishAt)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-800 truncate">{p.title}</p>
                                <p className="text-xs text-slate-500 truncate mt-0.5"><span className="sm:hidden">{when(p.publishAt)} · </span>{p.department} · {p.format} · {p.channels.join(", ")}{tab === "review" && p.requestedBy ? ` · ${p.requestedBy.name}` : ""}</p>
                            </div>
                            {!!p.clashes?.length && <span title="ช่วงเวลาชนกับงานอื่น" className="shrink-0 text-amber-600"><AlertTriangle className="w-4 h-4" /></span>}
                            <Badge status={p.status} />
                        </button>
                    ))}
                </div>
            )}

            {editing && <PostForm post={editing === "new" ? null : editing} departments={deptOptions} onClose={() => setEditing(null)} onSaved={afterChange} />}
            {open && !editing && <PostDetail post={open} me={me} reviewer={reviewer} onClose={() => setOpen(null)} onEdit={() => setEditing(open)} onChanged={afterChange} />}
        </div>
    );
}
