"use client";
// Form building blocks for the "จัดการเว็บไซต์หลัก" pages:
// tabs, list editors, PDF picker, tone picker and a hook for single-page settings.
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, FileText, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { fetchSiteSettings, updateSiteSetting, uploadSitePdf, type SiteSettings } from "@/lib/api";
import { inputCls, labelCls } from "./_shared";

/** Pull the Thai message out of "API error 400: {"error":"..."}" */
export function errMsg(err: unknown, fallback: string) {
    const m = err instanceof Error ? err.message : "";
    const json = m.slice(m.indexOf("{"));
    try { return JSON.parse(json).error || fallback; } catch { return fallback; }
}

// ─── Tones (colour of cover blocks on the public site) ───────
export const TONES: { value: string; label: string; cls: string }[] = [
    { value: "blue", label: "น้ำเงิน", cls: "bg-blue-500" },
    { value: "green", label: "เขียว", cls: "bg-emerald-500" },
    { value: "amber", label: "ส้ม", cls: "bg-amber-500" },
    { value: "sky", label: "ฟ้า", cls: "bg-sky-500" },
    { value: "violet", label: "ม่วง", cls: "bg-violet-500" },
    { value: "pink", label: "ชมพู", cls: "bg-pink-500" },
    { value: "red", label: "แดง", cls: "bg-red-500" },
];

export function TonePicker({ value, onChange, label = "สีประจำรายการ" }: { value: string; onChange: (v: string) => void; label?: string }) {
    return (
        <fieldset>
            <legend className={labelCls}>{label}</legend>
            <div className="flex flex-wrap gap-2">
                {TONES.map(t => (
                    <button key={t.value} type="button" onClick={() => onChange(t.value)} aria-pressed={value === t.value} title={t.label}
                        className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold border ${value === t.value ? "border-slate-800 ring-2 ring-slate-800/10" : "border-slate-200"}`}>
                        <span className={`w-3.5 h-3.5 rounded-full ${t.cls}`} />{t.label}
                    </button>
                ))}
            </div>
        </fieldset>
    );
}

// ─── Tabs ─────────────────────────────────────────────────────
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void }) {
    return (
        <div role="tablist" className="flex gap-1 overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5">
            {tabs.map(t => (
                <button key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${value === t.key ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"}`}>
                    {t.label}
                    {t.count !== undefined && <span className={`text-[11px] px-1.5 rounded-full ${value === t.key ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{t.count}</span>}
                </button>
            ))}
        </div>
    );
}

/** Tab state kept in the URL hash so a reload stays on the same tab. */
export function useHashTab<T extends string>(keys: readonly T[], fallback: T) {
    const [tab, setTab] = useState<T>(fallback);
    useEffect(() => {
        const h = window.location.hash.slice(1) as T;
        if (keys.includes(h)) setTab(h);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const change = (k: T) => { setTab(k); history.replaceState(null, "", `#${k}`); };
    return [tab, change] as const;
}

// ─── Inputs ───────────────────────────────────────────────────
export function Field({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
    return (
        <label className="block">
            <span className={labelCls}>{label}{required && <span className="text-rose-500"> *</span>}</span>
            {children}
            {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
        </label>
    );
}

/** One item per line ↔ string[] */
export function LinesInput({ label, value, onChange, rows = 4, hint, placeholder }: {
    label: string; value: string[]; onChange: (v: string[]) => void; rows?: number; hint?: string; placeholder?: string;
}) {
    const [text, setText] = useState(value.join("\n"));
    const last = useRef(value);
    useEffect(() => {
        if (value !== last.current && value.join("\n") !== text.split("\n").filter(l => l.trim()).join("\n")) setText(value.join("\n"));
        last.current = value;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);
    return (
        <Field label={label} hint={hint ?? "หนึ่งรายการต่อหนึ่งบรรทัด"}>
            <textarea rows={rows} value={text} placeholder={placeholder} className={`${inputCls} resize-y leading-relaxed`}
                onChange={e => { setText(e.target.value); const v = e.target.value.split("\n").map(l => l.trim()).filter(Boolean); last.current = v; onChange(v); }} />
        </Field>
    );
}

/** Comma-separated tags ↔ string[] */
export function TagsInput({ label, value, onChange, hint }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: string }) {
    const [text, setText] = useState(value.join(", "));
    return (
        <Field label={label} hint={hint ?? "คั่นด้วยเครื่องหมายจุลภาค ,"}>
            <input value={text} className={inputCls}
                onChange={e => { setText(e.target.value); onChange(e.target.value.split(",").map(t => t.trim()).filter(Boolean)); }} />
        </Field>
    );
}

// ─── Editable list of objects (history, values, funds, schedule …) ──
export type RowCol<R> = {
    key: keyof R & string; label: string; kind?: "text" | "textarea" | "longtext" | "lines" | "select" | "tone";
    options?: { value: string; label: string }[]; width?: string; placeholder?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each column decides how its cell is edited
export function RowsEditor<R extends Record<string, any>>({ label, rows, onChange, columns, blank, addLabel = "เพิ่มรายการ" }: {
    label: string; rows: R[]; onChange: (rows: R[]) => void; columns: RowCol<R>[]; blank: () => R; addLabel?: string;
}) {
    const update = (i: number, key: string, v: unknown) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
    const move = (i: number, d: number) => {
        const j = i + d;
        if (j < 0 || j >= rows.length) return;
        const next = [...rows];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };
    return (
        <fieldset className="space-y-2">
            <legend className={labelCls}>{label}</legend>
            {rows.length === 0 && <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-3 text-center">ยังไม่มีรายการ</p>}
            {rows.map((r, i) => (
                <div key={i} className="flex gap-2 items-start rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                    <span className="text-xs font-bold text-slate-400 w-5 pt-2.5 text-center">{i + 1}</span>
                    <div className="flex-1 grid gap-2 sm:grid-cols-12 min-w-0">
                        {columns.map(c => (
                            <div key={c.key} className={c.width ?? "sm:col-span-12"}>
                                <span className="sr-only">{c.label}</span>
                                {c.kind === "textarea" || c.kind === "longtext" ? (
                                    <textarea aria-label={`${c.label} รายการที่ ${i + 1}`} rows={c.kind === "longtext" ? 6 : 2} value={r[c.key] ?? ""} placeholder={c.placeholder ?? c.label} onChange={e => update(i, c.key, e.target.value)} className={`${inputCls} resize-y`} />
                                ) : c.kind === "lines" ? (
                                    <textarea aria-label={`${c.label} รายการที่ ${i + 1}`} rows={3} value={((r[c.key] as string[] | undefined) ?? []).join("\n")} placeholder={c.placeholder ?? `${c.label} (บรรทัดละ 1 รายการ)`}
                                        onChange={e => update(i, c.key, e.target.value.split("\n"))} onBlur={e => update(i, c.key, e.target.value.split("\n").map(l => l.trim()).filter(Boolean))} className={`${inputCls} resize-y`} />
                                ) : c.kind === "select" || c.kind === "tone" ? (
                                    <select aria-label={`${c.label} รายการที่ ${i + 1}`} value={r[c.key] ?? ""} onChange={e => update(i, c.key, e.target.value)} className={inputCls}>
                                        {(c.kind === "tone" ? TONES : c.options ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                ) : (
                                    <input aria-label={`${c.label} รายการที่ ${i + 1}`} value={r[c.key] ?? ""} placeholder={c.placeholder ?? c.label} onChange={e => update(i, c.key, e.target.value)} className={inputCls} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="เลื่อนขึ้น" className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="เลื่อนลง" className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="ลบรายการนี้" className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            ))}
            <button type="button" onClick={() => onChange([...rows, blank()])}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600 w-full justify-center">
                <Plus className="w-3.5 h-3.5" />{addLabel}
            </button>
        </fieldset>
    );
}

// ─── PDF file ─────────────────────────────────────────────────
export function PdfPicker({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
    const ref = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const pick = async (file?: File) => {
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) { setError("ไฟล์ใหญ่เกิน 20 MB"); return; }
        setBusy(true); setError("");
        try { onChange((await uploadSitePdf(file, "doc")).url); }
        catch (e) { setError(errMsg(e, "อัปโหลดไม่สำเร็จ")); }
        finally { setBusy(false); if (ref.current) ref.current.value = ""; }
    };
    return (
        <div>
            <span className={labelCls}>{label}</span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
                <FileText className={`w-4 h-4 shrink-0 ${value ? "text-rose-500" : "text-slate-300"}`} />
                {value
                    ? <a href={value} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">เปิดไฟล์ที่แนบไว้</a>
                    : <span className="text-sm text-slate-400 flex-1">ยังไม่มีไฟล์</span>}
                <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-100">
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}{value ? "เปลี่ยน" : "อัปโหลด PDF"}
                </button>
                {value && <button type="button" onClick={() => onChange("")} aria-label="นำไฟล์ออก" className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
            <input ref={ref} type="file" accept="application/pdf" className="hidden" onChange={e => pick(e.target.files?.[0])} />
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </div>
    );
}

// ─── Single-page settings (about, donation, privacy …) ───────
export function useSiteSetting<K extends keyof SiteSettings>(key: K, onMessage: (msg: string, type?: "success" | "error") => void) {
    const [value, setValue] = useState<SiteSettings[K] | null>(null);
    const [saved, setSaved] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        fetchSiteSettings()
            .then(s => { setValue(s[key]); setSaved(JSON.stringify(s[key])); })
            .catch(() => onMessage("โหลดข้อมูลไม่สำเร็จ", "error"));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    const set = useCallback((patch: Partial<SiteSettings[K]>) => setValue(v => (v ? { ...v, ...patch } : v)), []);
    const save = async () => {
        if (!value) return;
        setSaving(true);
        try {
            const next = await updateSiteSetting(key, value);
            setValue(next); setSaved(JSON.stringify(next));
            onMessage("บันทึกแล้ว · เว็บไซต์จะอัปเดตภายใน 1 นาที");
        } catch (e) { onMessage(errMsg(e, "บันทึกไม่สำเร็จ"), "error"); }
        finally { setSaving(false); }
    };
    const dirty = value !== null && JSON.stringify(value) !== saved;
    return { value, set, save, saving, dirty };
}

export function SaveBar({ dirty, saving, onSave, canEdit }: { dirty: boolean; saving: boolean; onSave: () => void; canEdit: boolean }) {
    if (!canEdit) return <p className="text-xs text-slate-500 bg-slate-100 rounded-xl px-4 py-3">คุณมีสิทธิ์ดูอย่างเดียว</p>;
    return (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl bg-white/95 backdrop-blur border border-slate-200 shadow-lg px-5 py-3">
            <p className={`text-sm font-semibold ${dirty ? "text-amber-600" : "text-slate-400"}`}>{dirty ? "มีการแก้ไขที่ยังไม่บันทึก" : "บันทึกล่าสุดแล้ว"}</p>
            <button onClick={onSave} disabled={!dirty || saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}บันทึก
            </button>
        </div>
    );
}

export const sectionCls = "bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5";
export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
    return (
        <div>
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
            {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
        </div>
    );
}
