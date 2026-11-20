"use client";
// Managed category lists for website content (Q&A, recommended, books, videos, partners).
// Categories are created first (จัดการหมวดหมู่), then each item ticks one or more of them.
import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, Loader2, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { deleteSiteCategory, fetchSiteCategories, putSiteCategories, renameSiteCategory } from "@/lib/api";
import { Modal, inputCls, labelCls } from "./_shared";
import { errMsg } from "./_editors";

// ─── Shared store (one fetch for every picker on the page) ─────
let lists: Record<string, string[]> | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
function load(force = false) {
    if (loading && !force) return loading;
    loading = fetchSiteCategories().then(l => { lists = l; emit(); }).catch(() => { lists = lists ?? {}; emit(); });
    return loading;
}
function setList(type: string, list: string[]) { lists = { ...(lists ?? {}), [type]: list }; emit(); }

export function useCategories(type: string): string[] | null {
    const snap = useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => lists, () => null);
    useEffect(() => { if (!lists) load(); }, []);
    return snap ? snap[type] ?? [] : null;
}

/** Tick one or more categories; a new one can be added right here. */
export function CategoryPicker({ type, label, value, onChange, canManage }: {
    type: string; label: string; value: string[]; onChange: (v: string[]) => void; canManage?: boolean;
}) {
    const list = useCategories(type);
    const [adding, setAdding] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const toggle = (c: string) => onChange(value.includes(c) ? value.filter(x => x !== c) : [...value, c]);
    const add = async () => {
        const name = adding.trim();
        if (!name || !list) return;
        setBusy(true); setError("");
        try {
            if (!list.includes(name)) setList(type, await putSiteCategories(type, [...list, name]));
            if (!value.includes(name)) onChange([...value, name]);
            setAdding("");
        } catch (e) { setError(errMsg(e, "เพิ่มหมวดหมู่ไม่สำเร็จ")); }
        finally { setBusy(false); }
    };
    return (
        <div>
            <p className={labelCls}>{label} <span className="font-normal text-slate-400">· เลือกได้หลายหมวด</span></p>
            {!list ? <Loader2 className="w-4 h-4 animate-spin text-slate-300" /> : (
                <div className="flex flex-wrap gap-1.5">
                    {list.map(c => {
                        const on = value.includes(c);
                        return (
                            <button key={c} type="button" onClick={() => toggle(c)} aria-pressed={on}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border ${on ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
                                {on && <Check className="w-3 h-3" />}{c}
                            </button>
                        );
                    })}
                    {!list.length && <span className="text-xs text-slate-400">ยังไม่มีหมวดหมู่ — เพิ่มได้ด้านล่าง</span>}
                </div>
            )}
            {canManage && (
                <div className="mt-2 flex gap-2">
                    <input value={adding} onChange={e => setAdding(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                        placeholder="+ หมวดหมู่ใหม่" maxLength={60} className={`${inputCls} py-1.5 text-xs max-w-[220px]`} />
                    {adding.trim() && (
                        <button type="button" onClick={add} disabled={busy} className="px-3 rounded-lg bg-slate-800 text-white text-xs font-semibold disabled:opacity-50">
                            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "เพิ่ม"}
                        </button>
                    )}
                </div>
            )}
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </div>
    );
}

/** จัดการหมวดหมู่: add, rename (renames on every item), delete (removed from every item), reorder. */
export function CategoryManager({ type, title, onClose, onChanged }: { type: string; title: string; onClose: () => void; onChanged: () => void }) {
    const list = useCategories(type);
    const [name, setName] = useState("");
    const [editing, setEditing] = useState<{ from: string; to: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const run = async (fn: () => Promise<string[]>) => {
        setBusy(true); setError("");
        try { setList(type, await fn()); onChanged(); }
        catch (e) { setError(errMsg(e, "บันทึกไม่สำเร็จ")); }
        finally { setBusy(false); }
    };
    const move = (i: number, d: number) => {
        if (!list) return;
        const next = [...list]; const j = i + d;
        if (j < 0 || j >= next.length) return;
        [next[i], next[j]] = [next[j], next[i]];
        run(() => putSiteCategories(type, next));
    };

    return (
        <Modal title={`จัดการหมวดหมู่ · ${title}`} onClose={onClose}>
            <div className="p-6 space-y-4">
                <form onSubmit={e => { e.preventDefault(); const n = name.trim(); if (n && list && !list.includes(n)) run(() => putSiteCategories(type, [...list, n])); setName(""); }} className="flex gap-2">
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อหมวดหมู่ใหม่" maxLength={60} className={inputCls} aria-label="ชื่อหมวดหมู่ใหม่" />
                    <button type="submit" disabled={!name.trim() || busy} className="shrink-0 flex items-center gap-1.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"><Plus className="w-4 h-4" />เพิ่ม</button>
                </form>
                {!list ? <Loader2 className="w-5 h-5 animate-spin text-slate-300 mx-auto" /> : !list.length ? (
                    <p className="text-sm text-slate-400 text-center py-6">ยังไม่มีหมวดหมู่</p>
                ) : (
                    <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                        {list.map((c, i) => (
                            <li key={c} className="flex items-center gap-2 px-3 py-2">
                                <div className="flex flex-col text-slate-300">
                                    <button onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label={`เลื่อน ${c} ขึ้น`} className="hover:text-slate-700 disabled:opacity-30 leading-none">▲</button>
                                    <button onClick={() => move(i, 1)} disabled={busy || i === list.length - 1} aria-label={`เลื่อน ${c} ลง`} className="hover:text-slate-700 disabled:opacity-30 leading-none">▼</button>
                                </div>
                                {editing?.from === c ? (
                                    <form className="flex-1 flex gap-2" onSubmit={e => { e.preventDefault(); const to = editing.to.trim(); if (to && to !== c) run(() => renameSiteCategory(type, c, to)); setEditing(null); }}>
                                        <input autoFocus value={editing.to} onChange={e => setEditing({ from: c, to: e.target.value })} maxLength={60} className={`${inputCls} py-1.5`} aria-label={`ชื่อใหม่ของ ${c}`} />
                                        <button type="submit" className="px-3 rounded-lg bg-slate-800 text-white text-xs font-semibold">บันทึก</button>
                                        <button type="button" onClick={() => setEditing(null)} aria-label="ยกเลิก" className="p-1.5 text-slate-400"><X className="w-4 h-4" /></button>
                                    </form>
                                ) : <>
                                    <Tags className="w-3.5 h-3.5 text-slate-300" />
                                    <span className="flex-1 text-sm font-semibold text-slate-700">{c}</span>
                                    <button onClick={() => setEditing({ from: c, to: c })} disabled={busy} aria-label={`เปลี่ยนชื่อ ${c}`} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Pencil className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => { if (confirm(`ลบหมวด "${c}"?\nรายการที่อยู่ในหมวดนี้จะยังอยู่ แต่จะไม่อยู่ในหมวดนี้แล้ว`)) run(() => deleteSiteCategory(type, c)); }} disabled={busy} aria-label={`ลบ ${c}`} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
                                </>}
                            </li>
                        ))}
                    </ul>
                )}
                <p className="text-[11px] text-slate-400">เปลี่ยนชื่อหมวด จะเปลี่ยนให้ทุกรายการที่อยู่ในหมวดนั้นด้วย · ลำดับนี้ใช้เป็นลำดับปุ่มกรองบนเว็บไซต์</p>
                {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
                {busy && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />กำลังบันทึก…</p>}
            </div>
        </Modal>
    );
}

export const reloadCategories = () => load(true);
