"use client";
// ตรวจงานสื่อประชาสัมพันธ์: units submit content, format, channels and the publish date/time;
// reviewers (media.review) approve or send back. The schedule is on /media-review/calendar.
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarDays, Loader2, Megaphone, Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import { apiErrorMessage, fetchMediaPost, fetchMediaPosts, type MediaPost } from "@/lib/api";
import { Badge, PostDetail, PostForm, timeOnly, useMediaAccess, when } from "./_components";

// ─── Page ──────────────────────────────────────────────────────
export default function MediaReviewPage() {
    const { me, reviewer, submitter, deptOptions } = useMediaAccess();
    const [chosenTab, setTab] = useState<"mine" | "review" | null>(null);
    const tab = chosenTab ?? (submitter ? "mine" : "review");
    const [reload, setReload] = useState(0);
    const [loaded, setLoaded] = useState<{ key: string; posts: MediaPost[] } | null>(null);
    const loadKey = `${tab}:${reload}`;
    const posts = loaded?.key === loadKey ? loaded.posts : null;
    const [editing, setEditing] = useState<MediaPost | null | "new">(null);
    const [open, setOpen] = useState<MediaPost | null>(null);

    useEffect(() => {
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
    ];

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Megaphone className="w-6 h-6 text-blue-600" />ตรวจงานสื่อประชาสัมพันธ์</h1>
                    <p className="text-sm text-slate-500 mt-1">ส่งตรวจเนื้อหา รูปแบบ และวันเวลาลงสื่อ — ระบบแจ้งเตือนถ้าช่วงเวลาชนกับงานอื่นในช่องทางเดียวกัน</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/media-review/calendar" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"><CalendarDays className="w-4 h-4" />ปฏิทินโพสต์</Link>
                    {submitter && (
                        <button onClick={() => setEditing("new")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"><Plus className="w-4 h-4" />ส่งตรวจงานใหม่</button>
                    )}
                </div>
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === t.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {!submitter && !reviewer ? (
                <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">ดูตารางโพสต์ได้ที่ <Link href="/media-review/calendar" className="text-blue-600 font-semibold">ปฏิทินโพสต์</Link></div>
            ) : !posts ? (
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
