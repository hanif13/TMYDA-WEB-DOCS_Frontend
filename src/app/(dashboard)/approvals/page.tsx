"use client";
// เอกสารรอพิจารณา: documents waiting for my signature / approval.
// Each item opens a popup with the PDF to read before approving or sending it back.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileSignature, ImagePlus, Inbox, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { apiErrorMessage, approveStep, fetchApprovalInbox, fetchRequestPdf, returnStep, uploadImages, type ApprovalItem } from "@/lib/api";

const ROLE_LABEL: Record<string, string> = {
    signer: "ลงนาม", unit_head: "หัวหน้าหน่วย", secretary: "เลขาสำนักอำนวยการ", finance: "การเงินสำนักอำนวยการ",
    office_director: "ผอ.สำนักอำนวยการ", director: "ผอ.กลุ่มฟิตยะตุลฮัก", transfer: "โอนเงินและแนบสลิป",
};
const when = (s: string) => new Date(s).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });

function ReviewModal({ item, onClose, onDone }: { item: ApprovalItem; onClose: () => void; onDone: () => void }) {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [mode, setMode] = useState<"view" | "return">("view");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [slips, setSlips] = useState<string[]>([]);
    const [restart, setRestart] = useState(false);
    const [uploading, setUploading] = useState(false);
    const isTransfer = item.role === "transfer";
    const isLast = item.step === item.totalSteps;

    useEffect(() => {
        let url: string | null = null;
        fetchRequestPdf(item.request.id)
            .then(b => { url = URL.createObjectURL(b); setPdfUrl(url); })
            .catch(e => setError(apiErrorMessage(e, "เปิดเอกสารไม่สำเร็จ")));
        return () => { if (url) URL.revokeObjectURL(url); };
    }, [item.request.id]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [busy, onClose]);

    const approve = async () => {
        setBusy(true);
        try {
            const r = await approveStep(item.id, undefined, isTransfer ? slips : undefined);
            toast.success(r.docNo ? `เสร็จสิ้น · ออกเลข ${r.docNo} และเก็บเข้าทะเบียนเอกสารแล้ว` : `อนุมัติแล้ว · ส่งต่อให้ ${ROLE_LABEL[r.next ?? ""] ?? "ขั้นถัดไป"}`, { duration: 6000 });
            onDone();
        } catch (e) {
            const msg = apiErrorMessage(e, "ลงนามไม่สำเร็จ");
            toast.error(msg, { duration: 6000 });
        } finally { setBusy(false); }
    };
    const sendBack = async () => {
        if (!note.trim()) { toast.error("กรุณาระบุสิ่งที่ต้องแก้ไข"); return; }
        setBusy(true);
        try {
            await returnStep(item.id, note.trim(), restart);
            toast.success(restart ? "ส่งกลับแก้ไขแล้ว · เมื่อแก้เสร็จจะเริ่มอนุมัติใหม่ตั้งแต่ขั้นแรก" : "ส่งกลับแก้ไขแล้ว · เมื่อแก้เสร็จจะกลับมาที่คุณ", { duration: 5000 });
            onDone();
        }
        catch (e) { toast.error(apiErrorMessage(e, "ส่งกลับไม่สำเร็จ")); }
        finally { setBusy(false); }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" onClick={() => !busy && onClose()}>
            <div role="dialog" aria-modal="true" aria-label={item.request.title} className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col lg:flex-row overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex-1 min-h-0 bg-slate-100 flex items-center justify-center">
                    {error ? <p className="text-sm text-rose-600 p-6">{error}</p>
                        : pdfUrl ? <iframe src={`${pdfUrl}#view=FitH`} title="เอกสาร" className="w-full h-full border-0" />
                            : <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin" />กำลังสร้างเอกสาร…</p>}
                </div>
                <div className="w-full lg:w-[340px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col">
                    <div className="flex items-start justify-between gap-2 p-5 border-b">
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-blue-600">{item.request.requestType}</p>
                            <h2 className="font-bold text-slate-800 leading-snug mt-0.5">{item.request.title}</h2>
                        </div>
                        <button onClick={onClose} disabled={busy} aria-label="ปิด" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
                    </div>
                    <dl className="p-5 space-y-3 text-sm flex-1 overflow-auto">
                        <div><dt className="text-xs text-slate-500">ผู้ขอ</dt><dd className="font-semibold text-slate-800">{item.request.requestedBy}</dd></div>
                        <div><dt className="text-xs text-slate-500">หน่วยงาน</dt><dd className="text-slate-800">{item.request.department}</dd></div>
                        <div><dt className="text-xs text-slate-500">ส่งเมื่อ</dt><dd className="text-slate-800">{when(item.createdAt)}</dd></div>
                        <div><dt className="text-xs text-slate-500">ขั้นตอนของคุณ</dt><dd className="text-slate-800">{ROLE_LABEL[item.role] ?? item.role}{item.totalSteps > 1 && <span className="text-slate-500"> · ขั้นที่ {item.step}/{item.totalSteps}</span>}</dd></div>
                        <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
                            {isTransfer ? "โอนเงินตามเอกสารแล้วแนบสลิป เมื่อยืนยัน ระบบจะออกเลขที่ และเก็บเอกสารพร้อมลายเซ็นทุกขั้นและสลิปเข้าทะเบียนเอกสาร"
                                : isLast ? "เอกสารด้านซ้ายเป็นฉบับร่าง เมื่อกดอนุมัติ ระบบจะใส่ลายเซ็นจากโปรไฟล์ของคุณ ออกเลขที่ และเก็บเข้าทะเบียนเอกสารให้อัตโนมัติ"
                                    : "เอกสารด้านซ้ายเป็นฉบับร่าง เมื่อกดอนุมัติ ระบบจะใส่ลายเซ็นจากโปรไฟล์ของคุณ แล้วส่งต่อให้ขั้นถัดไป"}
                        </p>
                        {isTransfer && (
                            <div>
                                <p className="text-xs font-semibold text-slate-600 mb-2">สลิปการโอนเงิน *</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {slips.map((u, i) => (
                                        <div key={u} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={u} alt={`สลิป ${i + 1}`} className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => setSlips(s => s.filter(x => x !== u))} aria-label="ลบสลิปนี้" className="absolute top-1 right-1 p-1 rounded bg-white/90 text-rose-600"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                    <label className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 cursor-pointer text-xs font-semibold">
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}{uploading ? "กำลังอัปโหลด" : "เพิ่มสลิป"}
                                        <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={async e => {
                                            const files = Array.from(e.target.files ?? []);
                                            e.target.value = "";
                                            if (!files.length) return;
                                            setUploading(true);
                                            try { const { urls } = await uploadImages(files); setSlips(s => [...s, ...urls]); }
                                            catch { toast.error("อัปโหลดสลิปไม่สำเร็จ"); }
                                            finally { setUploading(false); }
                                        }} />
                                    </label>
                                </div>
                            </div>
                        )}
                    </dl>
                    <div className="p-5 border-t space-y-2">
                        {mode === "view" ? <>
                            <button onClick={approve} disabled={busy || !pdfUrl || (isTransfer && !slips.length) || uploading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}{isTransfer ? "ยืนยันโอนเงินแล้ว" : item.role === "signer" ? "อนุมัติและลงนาม" : "อนุมัติ"}
                            </button>
                            <button onClick={() => setMode("return")} disabled={busy} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-rose-200 text-rose-700 font-semibold hover:bg-rose-50">
                                <RotateCcw className="w-4 h-4" />ส่งกลับแก้ไข
                            </button>
                        </> : <>
                            <label htmlFor="return-note" className="text-xs font-semibold text-slate-600">สิ่งที่ต้องแก้ไข (ผู้ขอจะเห็นข้อความนี้)</label>
                            <textarea id="return-note" rows={4} value={note} onChange={e => setNote(e.target.value)} autoFocus
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none" />
                            {item.step > 1 && (
                                <fieldset className="space-y-1.5">
                                    <legend className="text-xs font-semibold text-slate-600 mb-1">หลังผู้ขอแก้ไขเสร็จ</legend>
                                    {[
                                        { v: false, t: "ส่งกลับมาที่ฉัน", d: "แก้เล็กน้อย เช่น คำผิด ข้อความ — ลายเซ็นขั้นก่อนหน้ายังอยู่" },
                                        { v: true, t: "เริ่มอนุมัติใหม่ตั้งแต่ขั้นแรก", d: "แก้สาระสำคัญ เช่น งบประมาณ กิจกรรม — ทุกขั้นต้องลงนามใหม่" },
                                    ].map(o => (
                                        <label key={String(o.v)} className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer text-sm ${restart === o.v ? "border-rose-300 bg-rose-50" : "border-slate-200"}`}>
                                            <input type="radio" name="restart" checked={restart === o.v} onChange={() => setRestart(o.v)} className="mt-1 accent-rose-600" />
                                            <span><span className="font-semibold text-slate-800">{o.t}</span><span className="block text-xs text-slate-500">{o.d}</span></span>
                                        </label>
                                    ))}
                                </fieldset>
                            )}
                            <div className="flex gap-2">
                                <button onClick={() => setMode("view")} disabled={busy} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-slate-600">ยกเลิก</button>
                                <button onClick={sendBack} disabled={busy || !note.trim()} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-50">
                                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}ส่งกลับ
                                </button>
                            </div>
                        </>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ApprovalsPage() {
    const [items, setItems] = useState<ApprovalItem[] | null>(null);
    const [open, setOpen] = useState<ApprovalItem | null>(null);
    const load = useCallback(() => {
        fetchApprovalInbox().then(setItems).catch(e => { toast.error(apiErrorMessage(e, "โหลดรายการไม่สำเร็จ")); setItems([]); });
    }, []);
    useEffect(() => { load(); }, [load]);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg"><FileSignature className="w-5 h-5 text-white" /></div>
                <div>
                    <h1 className="text-xl font-black text-slate-800">เอกสารรอพิจารณา</h1>
                    <p className="text-xs text-slate-500">เอกสารที่รอคุณลงนามหรืออนุมัติ · เปิดอ่านก่อนตัดสินใจ</p>
                </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {!items ? <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></div>
                    : !items.length ? (
                        <div className="py-16 text-center">
                            <Inbox className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm font-semibold text-slate-400">ไม่มีเอกสารรอพิจารณา</p>
                            <p className="text-xs text-slate-400 mt-1">ตรวจว่าได้อัปโหลดลายเซ็นไว้ใน <Link href="/profile" className="text-blue-600 hover:underline">โปรไฟล์</Link> แล้ว</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {items.map(it => (
                                <li key={it.id}>
                                    <button onClick={() => setOpen(it)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50">
                                        <FileSignature className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-xs font-bold text-blue-600">{it.request.requestType}</span>
                                            <span className="block font-semibold text-slate-800 truncate">{it.request.title}</span>
                                            <span className="block text-xs text-slate-500">{it.request.requestedBy} · {it.request.department} · {when(it.createdAt)}</span>
                                        </span>
                                        <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">{ROLE_LABEL[it.role] ?? it.role}{it.totalSteps > 1 ? ` · ${it.step}/${it.totalSteps}` : ""}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
            </div>
            {open && <ReviewModal item={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); load(); }} />}
        </div>
    );
}
