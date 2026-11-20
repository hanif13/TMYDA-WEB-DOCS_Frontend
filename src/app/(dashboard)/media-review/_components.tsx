"use client";
// Shared parts of the media work pages (ตรวจงานสื่อ, ปฏิทินโพสต์): post form, detail popup, labels,
// and who may submit / review.
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, CheckCircle2, ExternalLink, ImagePlus, Loader2, Megaphone, Pencil, RotateCcw, Send, Trash2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import {
    apiErrorMessage, approveMediaPost, checkMediaClashes, createMediaPost, deleteMediaPost, fetchDepartments,
    markMediaPublished, returnMediaPost, updateMediaPost, uploadImages,
    type MediaClash, type MediaInput, type MediaPost, type MediaStatus,
} from "@/lib/api";
import { hasPermission } from "@/config/permissions";

/** Who I am on these pages, and the unit list for the form (my own unit first). */
export function useMediaAccess() {
    const { data: session } = useSession();
    const user = session?.user as { id?: string; role?: string; permissions?: string[]; department?: string } | undefined;
    const reviewer = user?.role === "SUPER_ADMIN" || hasPermission(user?.permissions, "media.review");
    const submitter = user?.role === "SUPER_ADMIN" || hasPermission(user?.permissions, "media.submit");
    const [departments, setDepartments] = useState<string[]>([]);
    useEffect(() => {
        fetchDepartments().then(ds => setDepartments(Array.from(new Set(ds.map((d: { name: string }) => d.name))))).catch(() => undefined);
    }, []);
    const deptOptions = useMemo(() => {
        const mine = user?.department;
        return mine && departments.includes(mine) ? [mine, ...departments.filter(d => d !== mine)] : departments;
    }, [departments, user?.department]);
    return { me: user?.id ?? "", reviewer, submitter, deptOptions };
}

export const CHANNELS = ["Facebook กลุ่มฟิตยะตุลฮัก", "Facebook สมาคม TMYDA", "Instagram", "TikTok", "YouTube", "LINE OA", "เว็บไซต์"];
export const FORMATS = ["โพสต์ภาพเดี่ยว", "อัลบั้มภาพ", "อินโฟกราฟิก", "วิดีโอ", "คลิปสั้น / Reels", "Story", "ข่าว / บทความ", "ไลฟ์สด"];
export const STATUS: Record<MediaStatus, { label: string; cls: string }> = {
    draft: { label: "ฉบับร่าง", cls: "bg-slate-100 text-slate-600 border-slate-200" },
    pending: { label: "รอตรวจ", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    approved: { label: "ผ่านการตรวจ", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    returned: { label: "ส่งกลับแก้ไข", cls: "bg-rose-50 text-rose-700 border-rose-200" },
    published: { label: "ลงแล้ว", cls: "bg-blue-50 text-blue-700 border-blue-200" },
};
export const when = (s: string) => new Date(s).toLocaleString("th-TH", { weekday: "short", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
export const timeOnly = (s: string) => new Date(s).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
/** Date → value for <input type="datetime-local"> in local time */
export const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function Badge({ status }: { status: MediaStatus }) {
    const s = STATUS[status];
    return <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.cls}`}>{s.label}</span>;
}

export function ClashList({ clashes, windowMinutes }: { clashes: MediaClash[]; windowMinutes?: number }) {
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
export function PostForm({ post, departments, onClose, onSaved, initialAt }: { post: MediaPost | null; departments: string[]; onClose: () => void; onSaved: () => void; initialAt?: Date }) {
    const [f, setF] = useState<MediaInput>(() => post
        ? { title: post.title, department: post.department, channels: post.channels, format: post.format, content: post.content, attachmentUrls: post.attachmentUrls, link: post.link, publishAt: toLocalInput(new Date(post.publishAt)) }
        : { title: "", department: departments[0] ?? "", channels: [], format: FORMATS[0], content: "", attachmentUrls: [], link: "", publishAt: toLocalInput(initialAt ?? new Date(Date.now() + 86400_000)) });
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
export function PostDetail({ post, me, reviewer, onClose, onEdit, onChanged }: {
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

