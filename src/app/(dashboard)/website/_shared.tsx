"use client";
// Shared UI for the "จัดการเว็บไซต์หลัก" pages
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { AlertCircle, CheckCircle2, ExternalLink, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { uploadImages } from "@/lib/api";

export const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || "http://localhost:3100";

export const SITE_DEPARTMENTS = [
    "สำนักอำนวยการ",
    "สมาคมพัฒนาเยาวชนมุสลิมไทย",
    "สำนักกิจการสตรี สมาคมฯ",
    "ครอบครัวฟิตยะตุลฮัก",
    "กรรมการที่ปรึกษา (ชูรอ)",
];

export const inputCls = "w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
export const labelCls = "block text-xs font-semibold text-slate-600 mb-1.5";

export function useCanEditWebsite() {
    const { data: session } = useSession();
    const user = session?.user as { role?: string; permissions?: string[] } | undefined;
    return user?.role === "SUPER_ADMIN" || (user?.permissions || []).includes("website.edit");
}

export function formatThaiDate(value: string | null | undefined) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

/** yyyy-mm-dd for <input type="date"> in local time */
export function toDateInput(value: string | null | undefined) {
    const d = value ? new Date(value) : new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
    return (
        <div role="status" className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold ${type === "success" ? "bg-emerald-600" : "bg-rose-600"} text-white`}>
            {type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg}
            <button onClick={onClose} aria-label="ปิด" className="ml-2 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
    );
}

export function useToast() {
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const node = toast ? <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} /> : null;
    return { show: (msg: string, type: "success" | "error" = "success") => setToast({ msg, type }), node };
}

export function PageHeader({ icon: Icon, title, subtitle, previewPath, children }: {
    icon: React.ElementType; title: string; subtitle: string; previewPath?: string; children?: React.ReactNode;
}) {
    return (
        <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/20">
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">จัดการเว็บไซต์หลัก</p>
                    <h1 className="text-xl font-black text-slate-800">{title}</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                {previewPath !== undefined && (
                    <a href={`${PUBLIC_SITE_URL}${previewPath}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
                        <ExternalLink className="w-4 h-4" />ดูหน้าเว็บ
                    </a>
                )}
                {children}
            </div>
        </div>
    );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-label={title} className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} my-auto`} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-base font-bold text-slate-800">{title}</h2>
                    <button onClick={onClose} aria-label="ปิด" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function ConfirmDelete({ text, onCancel, onConfirm }: { text: string; onCancel: () => void; onConfirm: () => Promise<void> }) {
    const [busy, setBusy] = useState(false);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div role="alertdialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4"><Trash2 className="w-5 h-5 text-rose-600" /></div>
                <h3 className="text-base font-bold text-slate-800 mb-2">ยืนยันการลบ</h3>
                <p className="text-sm text-slate-500 mb-6">{text}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                    <button disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}
                        className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60 flex items-center justify-center gap-2">
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}ลบ
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Upload images (compressed) and return their URLs. */
export function ImagePicker({ label, multiple, value, onChange, aspect = "aspect-video" }: {
    label: string; multiple?: boolean; value: string[]; onChange: (urls: string[]) => void; aspect?: string;
}) {
    const ref = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const pick = async (files: FileList | null) => {
        if (!files?.length) return;
        setBusy(true); setError("");
        try {
            const { urls } = await uploadImages(Array.from(files));
            onChange(multiple ? [...value, ...urls] : urls.slice(0, 1));
        } catch { setError("อัปโหลดรูปไม่สำเร็จ"); }
        finally { setBusy(false); if (ref.current) ref.current.value = ""; }
    };
    return (
        <div>
            <span className={labelCls}>{label}</span>
            <div className={`grid gap-2 ${multiple ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-1"}`}>
                {value.map((url, i) => (
                    <div key={url} className={`relative ${aspect} rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`รูปที่ ${i + 1}`} className="w-full h-full object-cover" />
                        <button type="button" aria-label="ลบรูปนี้" onClick={() => onChange(value.filter(v => v !== url))}
                            className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-white/90 text-rose-600 shadow hover:bg-white">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
                {(multiple || value.length === 0) && (
                    <button type="button" onClick={() => ref.current?.click()} disabled={busy}
                        className={`${aspect} rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 transition-colors`}>
                        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                        <span className="text-xs font-semibold">{busy ? "กำลังอัปโหลด…" : "เพิ่มรูป"}</span>
                    </button>
                )}
            </div>
            <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple={multiple} className="hidden" onChange={e => pick(e.target.files)} />
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </div>
    );
}

export function StatusPill({ on, onLabel, offLabel }: { on: boolean; onLabel: string; offLabel: string }) {
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${on ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
            {on ? onLabel : offLabel}
        </span>
    );
}
