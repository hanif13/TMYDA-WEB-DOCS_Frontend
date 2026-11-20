"use client";
// ปฏิทินโพสต์ — every scheduled media post (pending / approved / published) by month, week or day.
// Week and day views have an hourly timeline; a post sits at its publish time. Posts on the same
// channel less than 2 hours apart are marked. Click an empty hour to submit a post for that time.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import { apiErrorMessage, fetchMediaCalendar, fetchMediaPost, type MediaCalendarItem, type MediaPost } from "@/lib/api";
import { PostDetail, PostForm, STATUS, timeOnly, useMediaAccess, useMediaChannels } from "../_components";

type View = "month" | "week" | "day";
const HOUR_PX = 56;
const CLASH_MIN = 120;
const WEEKDAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7)); // Monday
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const thMonth = (d: Date) => d.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
const thDay = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString("th-TH", opts);

/** First and last moment shown by a view. */
function rangeOf(view: View, anchor: Date): [Date, Date] {
    if (view === "day") return [startOfDay(anchor), addDays(startOfDay(anchor), 1)];
    if (view === "week") { const s = startOfWeek(anchor); return [s, addDays(s, 7)]; }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const s = startOfWeek(first);
    return [s, addDays(s, 42)];
}

/** ids of posts that share a channel with another post less than 2 hours away */
function clashIds(items: MediaCalendarItem[]) {
    const out = new Set<string>();
    const sorted = [...items].sort((a, b) => a.publishAt.localeCompare(b.publishAt));
    for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
            const gap = (new Date(sorted[j].publishAt).getTime() - new Date(sorted[i].publishAt).getTime()) / 60_000;
            if (gap >= CLASH_MIN) break;
            if (sorted[i].channels.some(c => sorted[j].channels.includes(c))) { out.add(sorted[i].id); out.add(sorted[j].id); }
        }
    }
    return out;
}

function PostChip({ p, clash, mine, compact, onOpen }: { p: MediaCalendarItem; clash: boolean; mine: boolean; compact?: boolean; onOpen: () => void }) {
    return (
        <button onClick={e => { e.stopPropagation(); onOpen(); }} title={`${timeOnly(p.publishAt)} ${p.title} · ${p.department} · ${p.channels.join(", ")}`}
            className={`w-full text-left rounded-md border px-1.5 py-0.5 text-[11px] leading-tight overflow-hidden ${STATUS[p.status].cls} ${clash ? "ring-2 ring-amber-400" : ""}`}>
            <span className="font-bold">{timeOnly(p.publishAt)}</span> {p.title}
            {!compact && <span className="block truncate opacity-75">{p.channels.join(" · ")}{mine ? " · ของฉัน" : ""}</span>}
        </button>
    );
}

export default function MediaCalendarPage() {
    const { me, reviewer, submitter, deptOptions } = useMediaAccess();
    const channelGroups = useMediaChannels();
    const [view, setView] = useState<View>("week");
    const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
    const [channel, setChannel] = useState("");
    const [loaded, setLoaded] = useState<{ key: string; items: MediaCalendarItem[] } | null>(null);
    const [reload, setReload] = useState(0);
    const [open, setOpen] = useState<MediaPost | null>(null);
    const [summary, setSummary] = useState<MediaCalendarItem | null>(null);
    const [creating, setCreating] = useState<Date | null>(null);
    const [editing, setEditing] = useState<MediaPost | null>(null);
    const [now, setNow] = useState(() => new Date());
    const scroller = useRef<HTMLDivElement>(null);

    const [from, to] = useMemo(() => rangeOf(view, anchor), [view, anchor]);
    const key = `${from.toISOString()}|${to.toISOString()}|${reload}`;
    const items = useMemo(() => (loaded?.key === key ? loaded.items : null), [loaded, key]);
    useEffect(() => {
        fetchMediaCalendar(from.toISOString(), to.toISOString())
            .then(list => setLoaded({ key, items: list }))
            .catch(e => { toast.error(apiErrorMessage(e, "โหลดปฏิทินไม่สำเร็จ")); setLoaded({ key, items: [] }); });
    }, [from, to, key]);
    useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
    // start the timeline at 07:00
    useEffect(() => { if (view !== "month" && scroller.current) scroller.current.scrollTop = HOUR_PX * 7; }, [view]);

    const shown = useMemo(() => (items ?? []).filter(p => !channel || p.channels.includes(channel)), [items, channel]);
    const clashes = useMemo(() => clashIds(items ?? []), [items]);
    const onDay = useCallback((d: Date) => shown.filter(p => sameDay(new Date(p.publishAt), d)), [shown]);

    const step = (n: number) => setAnchor(a => view === "day" ? addDays(a, n) : view === "week" ? addDays(a, 7 * n) : new Date(a.getFullYear(), a.getMonth() + n, 1));
    const openPost = async (p: MediaCalendarItem) => {
        // the full post is visible to its writer and to reviewers; others see the summary
        if (p.requestedById === me || reviewer) {
            try { setOpen(await fetchMediaPost(p.id)); return; } catch { /* fall back to summary */ }
        }
        setSummary(p);
    };
    const createAt = (d: Date) => { if (submitter) setCreating(d); };
    const afterChange = () => { setOpen(null); setEditing(null); setCreating(null); setReload(n => n + 1); };

    const title = view === "month" ? thMonth(anchor)
        : view === "week" ? `${thDay(from, { day: "numeric", month: "short" })} – ${thDay(addDays(to, -1), { day: "numeric", month: "short", year: "numeric" })}`
            : thDay(anchor, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const days = view === "day" ? [anchor] : view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(from, i)) : [];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Link href="/media-review" className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" />ตรวจงานสื่อประชาสัมพันธ์</Link>
                    <h1 className="text-2xl font-bold text-slate-800 mt-1">ปฏิทินโพสต์</h1>
                    <p className="text-sm text-slate-500">ตารางลงสื่อของทุกหน่วยงาน · กรอบสีส้ม = ช่องทางเดียวกันห่างกันไม่ถึง 2 ชม.{submitter ? " · กดช่องเวลาว่างเพื่อส่งตรวจงานในเวลานั้น" : ""}</p>
                </div>
                {submitter && (
                    <button onClick={() => { const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); setCreating(d); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"><Plus className="w-4 h-4" />ส่งตรวจงานใหม่</button>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 px-3 py-3 border-b border-slate-100">
                    <button onClick={() => setAnchor(startOfDay(new Date()))} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">วันนี้</button>
                    <button onClick={() => step(-1)} aria-label="ก่อนหน้า" className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={() => step(1)} aria-label="ถัดไป" className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight className="w-5 h-5" /></button>
                    <h2 className="font-bold text-slate-800 mr-auto">{title}</h2>
                    {!items && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                    <select aria-label="ช่องทาง" value={channel} onChange={e => setChannel(e.target.value)} className="text-sm rounded-lg border border-slate-200 px-2 py-1.5 bg-white">
                        <option value="">ทุกช่องทาง</option>
                        {(channelGroups ?? []).map(g => (
                            <optgroup key={g.page} label={g.page}>{g.channels.map(ch => <option key={ch.id} value={ch.id}>{ch.platform} · {g.page}</option>)}</optgroup>
                        ))}
                    </select>
                    <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5" role="tablist" aria-label="มุมมอง">
                        {([["month", "เดือน"], ["week", "สัปดาห์"], ["day", "วัน"]] as const).map(([v, l]) => (
                            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${view === v ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>{l}</button>
                        ))}
                    </div>
                </div>

                {view === "month" ? (
                    <div>
                        <div className="grid grid-cols-7 border-b border-slate-100">
                            {WEEKDAYS.map(w => <div key={w} className="px-2 py-1.5 text-xs font-semibold text-slate-500 text-center">{w}</div>)}
                        </div>
                        <div className="grid grid-cols-7">
                            {Array.from({ length: 42 }, (_, i) => addDays(from, i)).map(d => {
                                const list = onDay(d);
                                const other = d.getMonth() !== anchor.getMonth();
                                const today = sameDay(d, now);
                                return (
                                    <div key={d.toISOString()} onClick={() => { setAnchor(d); setView("day"); }}
                                        className={`min-h-24 sm:min-h-28 border-b border-r border-slate-100 p-1 cursor-pointer hover:bg-slate-50 ${other ? "bg-slate-50/60" : ""}`}>
                                        <p className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${today ? "bg-blue-600 text-white" : other ? "text-slate-300" : "text-slate-600"}`}>{d.getDate()}</p>
                                        <div className="space-y-0.5">
                                            {list.slice(0, 3).map(p => <PostChip key={p.id} p={p} compact clash={clashes.has(p.id)} mine={p.requestedById === me} onOpen={() => openPost(p)} />)}
                                            {list.length > 3 && <p className="text-[11px] font-semibold text-slate-500 px-1">+{list.length - 3} โพสต์</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* day headers */}
                        <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
                            <div />
                            {days.map(d => (
                                <button key={d.toISOString()} onClick={() => { setAnchor(d); setView("day"); }} className={`py-2 text-center ${sameDay(d, now) ? "text-blue-600" : "text-slate-600"}`}>
                                    <span className="block text-[11px] font-semibold">{thDay(d, { weekday: "short" })}</span>
                                    <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-bold ${sameDay(d, now) ? "bg-blue-600 text-white" : ""}`}>{d.getDate()}</span>
                                </button>
                            ))}
                        </div>
                        {/* hourly timeline */}
                        <div ref={scroller} className="overflow-y-auto max-h-[70vh] relative">
                            <div className="grid relative" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))`, height: HOUR_PX * 24 }}>
                                <div className="relative">
                                    {Array.from({ length: 24 }, (_, h) => (
                                        <span key={h} className="absolute right-2 text-[11px] text-slate-400 -translate-y-1/2" style={{ top: h * HOUR_PX }}>{h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}</span>
                                    ))}
                                </div>
                                {days.map(d => {
                                    const list = onDay(d);
                                    // posts in the same hour sit side by side
                                    const byHour = new Map<number, MediaCalendarItem[]>();
                                    for (const p of list) { const h = new Date(p.publishAt).getHours(); byHour.set(h, [...(byHour.get(h) ?? []), p]); }
                                    return (
                                        <div key={d.toISOString()} className="relative border-l border-slate-100">
                                            {Array.from({ length: 24 }, (_, h) => (
                                                <div key={h} onClick={() => { const t = new Date(d); t.setHours(h, 0, 0, 0); createAt(t); }}
                                                    className={`border-t border-slate-100 ${submitter ? "hover:bg-blue-50/50 cursor-pointer" : ""}`} style={{ height: HOUR_PX }} />
                                            ))}
                                            {[...byHour.entries()].map(([h, ps]) => ps.map((p, i) => {
                                                const t = new Date(p.publishAt);
                                                return (
                                                    <div key={p.id} className="absolute px-0.5" style={{ top: h * HOUR_PX + (t.getMinutes() / 60) * HOUR_PX + 1, height: HOUR_PX - 4, left: `${(i / ps.length) * 100}%`, width: `${100 / ps.length}%` }}>
                                                        <PostChip p={p} compact={view === "week" && ps.length > 1} clash={clashes.has(p.id)} mine={p.requestedById === me} onOpen={() => openPost(p)} />
                                                    </div>
                                                );
                                            }))}
                                            {sameDay(d, now) && (
                                                <div className="absolute left-0 right-0 border-t-2 border-rose-500 pointer-events-none" style={{ top: (now.getHours() + now.getMinutes() / 60) * HOUR_PX }}>
                                                    <span className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-rose-500" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-3 px-3 py-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                    {(["pending", "approved", "published"] as const).map(s => <span key={s} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded border ${STATUS[s].cls}`} />{STATUS[s].label}</span>)}
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-2 ring-amber-400" />ช่วงเวลาใกล้กันในช่องทางเดียวกัน</span>
                    <span className="ml-auto">{shown.length} โพสต์ในช่วงนี้</span>
                </div>
            </div>

            {summary && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => setSummary(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-2" onClick={e => e.stopPropagation()}>
                        <p className={`inline-block px-2.5 py-0.5 rounded-full border text-xs font-semibold ${STATUS[summary.status].cls}`}>{STATUS[summary.status].label}</p>
                        <h3 className="font-bold text-slate-800">{summary.title}</h3>
                        <p className="text-sm text-slate-600">{new Date(summary.publishAt).toLocaleString("th-TH", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {summary.format}</p>
                        <p className="text-sm text-slate-600">{summary.department}</p>
                        <p className="text-sm text-slate-600">{summary.channels.join(", ")}</p>
                        {clashes.has(summary.id) && <p className="text-xs text-amber-700 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />มีโพสต์อื่นในช่องทางเดียวกันใกล้เวลานี้</p>}
                        <button onClick={() => setSummary(null)} className="w-full mt-2 py-2 rounded-xl border text-sm font-semibold text-slate-600">ปิด</button>
                    </div>
                </div>
            )}
            {creating && <PostForm post={null} initialAt={creating} departments={deptOptions} onClose={() => setCreating(null)} onSaved={afterChange} />}
            {editing && <PostForm post={editing} departments={deptOptions} onClose={() => setEditing(null)} onSaved={afterChange} />}
            {open && !editing && <PostDetail post={open} me={me} reviewer={reviewer} onClose={() => setOpen(null)} onEdit={() => setEditing(open)} onChanged={afterChange} />}
        </div>
    );
}
