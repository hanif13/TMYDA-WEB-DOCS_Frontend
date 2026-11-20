"use client";
// ส่งอีเมลถึงสมาชิก — write a news email, preview it, send a test to yourself, then send it to
// website members (approved, or approved + pending; optionally only some provinces).
// Members who unsubscribed are never included.
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Loader2, Mail, MailPlus, Pencil, Send, Trash2, Users, X } from "lucide-react";
import {
    countMailingAudience, createMailing, deleteMailing, fetchMailing, fetchMailingMeta, fetchMailings, previewMailingHtml,
    sendMailing, testMailing, updateMailing, type MailingAudience, type MailingInput, type SiteMailing,
} from "@/lib/api";
import { ConfirmDelete, Modal, PageHeader, formatThaiDate, inputCls, labelCls, useCanEditWebsite, useToast } from "../_shared";
import { errMsg } from "../_editors";

const AUDIENCE: Record<MailingAudience, { label: string; hint: string }> = {
    approved: { label: "สมาชิกที่อนุมัติแล้ว", hint: "สมาชิกเต็มตัวทั้งหมด" },
    verified: { label: "อนุมัติแล้ว + รอพิจารณา", hint: "รวมผู้สมัครที่ยืนยันอีเมลแล้วแต่ยังรอทีมงานพิจารณา" },
};
const STATUS: Record<SiteMailing["status"], { label: string; cls: string }> = {
    draft: { label: "ฉบับร่าง", cls: "bg-slate-100 text-slate-600 border-slate-200" },
    sending: { label: "กำลังส่ง", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    sent: { label: "ส่งแล้ว", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};
const empty = (): MailingInput => ({ subject: "", title: "", body: "", buttonLabel: null, buttonUrl: null, audience: "approved", provinces: [] });

// ─── Compose / edit a draft ────────────────────────────────────
function Composer({ item, onClose, onSaved }: { item: SiteMailing | null; onClose: () => void; onSaved: (m: SiteMailing, msg: string) => void }) {
    const [f, setF] = useState<MailingInput>(() => item ? { subject: item.subject, title: item.title, body: item.body, buttonLabel: item.buttonLabel, buttonUrl: item.buttonUrl, audience: item.audience, provinces: item.provinces } : empty());
    const [meta, setMeta] = useState<{ provinces: { name: string; count: number }[]; optedOut: number } | null>(null);
    const [count, setCount] = useState<number | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const set = <K extends keyof MailingInput>(k: K, v: MailingInput[K]) => setF(s => ({ ...s, [k]: v }));

    useEffect(() => { fetchMailingMeta().then(setMeta).catch(() => setMeta({ provinces: [], optedOut: 0 })); }, []);
    useEffect(() => {
        const t = setTimeout(() => countMailingAudience(f.audience, f.provinces).then(r => setCount(r.count)).catch(() => setCount(null)), 250);
        return () => clearTimeout(t);
    }, [f.audience, f.provinces]);
    useEffect(() => {
        const t = setTimeout(() => previewMailingHtml(f).then(setPreview).catch(() => undefined), 400);
        return () => clearTimeout(t);
    }, [f]);

    const save = async () => {
        setSaving(true); setError("");
        try {
            const data = { ...f, buttonLabel: f.buttonLabel || null, buttonUrl: f.buttonUrl || null };
            const m = item ? await updateMailing(item.id, data) : await createMailing(data);
            onSaved(m, "บันทึกฉบับร่างแล้ว");
        } catch (e) { setError(errMsg(e, "บันทึกไม่สำเร็จ")); }
        finally { setSaving(false); }
    };

    return (
        <Modal title={item ? "แก้ไขอีเมล (ฉบับร่าง)" : "เขียนอีเมลถึงสมาชิก"} onClose={onClose} wide>
            <div className="grid lg:grid-cols-2 gap-0">
                <div className="p-6 space-y-4 lg:border-r border-slate-100">
                    <div>
                        <label htmlFor="m-subject" className={labelCls}>หัวเรื่องอีเมล <span className="text-rose-500">*</span></label>
                        <input id="m-subject" value={f.subject} onChange={e => set("subject", e.target.value)} maxLength={200} className={inputCls} placeholder="เช่น เชิญร่วมค่ายเยาวชนภาคฤดูร้อน" />
                    </div>
                    <div>
                        <label htmlFor="m-title" className={labelCls}>หัวข้อในอีเมล (เว้นว่าง = ใช้หัวเรื่อง)</label>
                        <input id="m-title" value={f.title} onChange={e => set("title", e.target.value)} maxLength={200} className={inputCls} />
                    </div>
                    <div>
                        <label htmlFor="m-body" className={labelCls}>เนื้อหา <span className="text-rose-500">*</span></label>
                        <textarea id="m-body" rows={9} value={f.body} onChange={e => set("body", e.target.value)} className={`${inputCls} resize-y leading-relaxed`} placeholder="เว้นบรรทัดว่างเพื่อขึ้นย่อหน้าใหม่ · ระบบใส่ “เรียน คุณ(ชื่อสมาชิก)” ให้อัตโนมัติ" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="m-btn" className={labelCls}>ปุ่ม (ถ้ามี)</label>
                            <input id="m-btn" value={f.buttonLabel ?? ""} onChange={e => set("buttonLabel", e.target.value)} maxLength={60} className={inputCls} placeholder="เช่น สมัครเข้าร่วม" />
                        </div>
                        <div>
                            <label htmlFor="m-url" className={labelCls}>ลิงก์ของปุ่ม</label>
                            <input id="m-url" type="url" value={f.buttonUrl ?? ""} onChange={e => set("buttonUrl", e.target.value)} className={inputCls} placeholder="https://" />
                        </div>
                    </div>
                    <fieldset className="space-y-2">
                        <legend className={labelCls}>ส่งถึง</legend>
                        {(Object.keys(AUDIENCE) as MailingAudience[]).map(a => (
                            <label key={a} className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer text-sm ${f.audience === a ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}>
                                <input type="radio" name="aud" checked={f.audience === a} onChange={() => set("audience", a)} className="mt-1 accent-blue-600" />
                                <span><span className="block font-semibold text-slate-800">{AUDIENCE[a].label}</span><span className="block text-xs text-slate-500">{AUDIENCE[a].hint}</span></span>
                            </label>
                        ))}
                        {!!meta?.provinces.length && (
                            <div>
                                <p className="text-xs font-semibold text-slate-500 mb-1.5">เฉพาะจังหวัด (ไม่เลือก = ทุกจังหวัด)</p>
                                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                    {meta.provinces.map(p => {
                                        const on = f.provinces.includes(p.name);
                                        return (
                                            <button key={p.name} type="button" aria-pressed={on} onClick={() => set("provinces", on ? f.provinces.filter(x => x !== p.name) : [...f.provinces, p.name])}
                                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${on ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200"}`}>
                                                {p.name} <span className="opacity-60">{p.count}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5">
                            <Users className="w-4 h-4 text-blue-600" />ผู้รับ {count === null ? "…" : `${count.toLocaleString("th-TH")} คน`}
                            {!!meta?.optedOut && <span className="text-xs font-normal text-slate-500">· ไม่รวม {meta.optedOut} คนที่ขอไม่รับอีเมล</span>}
                        </p>
                    </fieldset>
                    {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                        <button onClick={save} disabled={saving || !f.subject.trim() || !f.body.trim()} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}บันทึกฉบับร่าง
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-400">บันทึกแล้วจะส่งฉบับทดสอบถึงตัวเอง และกดส่งจริงได้จากรายการ</p>
                </div>
                <div className="bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" />ตัวอย่างที่สมาชิกจะเห็น</p>
                    {preview ? <iframe title="ตัวอย่างอีเมล" srcDoc={preview} sandbox="" className="w-full h-[560px] rounded-xl border border-slate-200 bg-white" />
                        : <div className="h-[560px] flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>}
                </div>
            </div>
        </Modal>
    );
}

// ─── Detail: test, send, progress, recipients ──────────────────
function Detail({ id, onClose, onEdit, onChanged, toast }: { id: string; onClose: () => void; onEdit: (m: SiteMailing) => void; onChanged: () => void; toast: (m: string, t?: "success" | "error") => void }) {
    const canEdit = useCanEditWebsite();
    const [m, setM] = useState<SiteMailing | null>(null);
    const [testTo, setTestTo] = useState("");
    const [busy, setBusy] = useState<"" | "test" | "send">("");
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const load = useCallback(() => fetchMailing(id).then(setM).catch(() => toast("โหลดไม่สำเร็จ", "error")), [id, toast]);
    useEffect(() => { load(); }, [load]);
    // follow progress while sending
    useEffect(() => {
        if (m?.status !== "sending") return;
        const t = setInterval(load, 2000);
        return () => clearInterval(t);
    }, [m?.status, load]);
    useEffect(() => { if (m?.status === "sent") onChanged(); /* refresh list once done */ }, [m?.status, onChanged]);

    if (!m) return <Modal title="อีเมลถึงสมาชิก" onClose={onClose}><div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div></Modal>;
    const done = m.sent + m.failed;
    const pct = m.total ? Math.round((done / m.total) * 100) : 0;

    return (
        <Modal title={m.subject} onClose={onClose} wide>
            <div className="p-6 space-y-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${STATUS[m.status].cls}`}>{STATUS[m.status].label}</span>
                    <span className="text-slate-500">ถึง: {AUDIENCE[m.audience].label}{m.provinces.length ? ` · ${m.provinces.join(", ")}` : ""}</span>
                    {m.sentAt && <span className="text-slate-500">· ส่งเมื่อ {formatThaiDate(m.sentAt)} โดย {m.sentBy}</span>}
                </div>

                {m.status !== "draft" && (
                    <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1"><span>ส่งแล้ว {m.sent} · ไม่สำเร็จ {m.failed}</span><span>{done}/{m.total}</span></div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${m.failed ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} /></div>
                    </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-52 overflow-y-auto">{m.body}</div>

                {m.status === "draft" && canEdit && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2 items-end">
                            <div className="flex-1 min-w-[220px]">
                                <label htmlFor="t-to" className={labelCls}>ส่งฉบับทดสอบถึง</label>
                                <input id="t-to" type="email" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="อีเมลของคุณ" className={inputCls} />
                            </div>
                            <button disabled={!!busy || !testTo} onClick={async () => {
                                setBusy("test");
                                try { const r = await testMailing(m.id, testTo); toast(r.status === "sent" ? "ส่งฉบับทดสอบแล้ว ตรวจกล่องจดหมาย" : r.status === "logged" ? "บันทึกฉบับทดสอบแล้ว (ระบบนี้ยังไม่ได้ตั้งให้ส่งอีเมลจริง)" : "ส่งไม่สำเร็จ", r.status === "failed" ? "error" : "success"); }
                                catch (e) { toast(errMsg(e, "ส่งฉบับทดสอบไม่สำเร็จ"), "error"); }
                                finally { setBusy(""); }
                            }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                                {busy === "test" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}ส่งทดสอบ
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                            <button onClick={() => setDeleting(true)} className="mr-auto flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" />ลบฉบับร่าง</button>
                            <button onClick={() => onEdit(m)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"><Pencil className="w-4 h-4" />แก้ไข</button>
                            <button onClick={() => setConfirming(true)} disabled={!!busy} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"><Send className="w-4 h-4" />ส่งถึงสมาชิก</button>
                        </div>
                    </div>
                )}

                {!!m.log?.length && (
                    <details className="rounded-xl border border-slate-200 px-4 py-3">
                        <summary className="text-sm font-semibold text-slate-700 cursor-pointer">รายชื่อผู้รับ ({m.log.length})</summary>
                        <ul className="mt-3 max-h-64 overflow-y-auto divide-y divide-slate-100 text-sm">
                            {m.log.map(l => (
                                <li key={l.id} className="flex items-center gap-2 py-1.5">
                                    {l.status === "failed" ? <X className="w-3.5 h-3.5 text-rose-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                    <span className="flex-1 truncate text-slate-700">{l.to}</span>
                                    <span className="text-xs text-slate-400">{l.status === "sent" ? "ส่งแล้ว" : l.status === "logged" ? "บันทึก (ไม่ได้ส่งจริง)" : `ไม่สำเร็จ${l.error ? ` · ${l.error.slice(0, 60)}` : ""}`}</span>
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </div>

            {confirming && (
                <Modal title="ยืนยันการส่งอีเมล" onClose={() => setConfirming(false)}>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-slate-700">ส่ง “{m.subject}” ถึง <b>{AUDIENCE[m.audience].label}</b>{m.provinces.length ? ` ในจังหวัด ${m.provinces.join(", ")}` : ""}?</p>
                        <p className="text-xs text-slate-500">ส่งแล้วยกเลิกหรือแก้ไขไม่ได้ · ระบบส่งทีละฉบับ ใช้เวลาสักครู่ตามจำนวนผู้รับ</p>
                        <div className="flex gap-2">
                            <button onClick={() => setConfirming(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-slate-600">ยกเลิก</button>
                            <button disabled={busy === "send"} onClick={async () => {
                                setBusy("send");
                                try { const r = await sendMailing(m.id); toast(`เริ่มส่งถึง ${r.total} คนแล้ว`); setConfirming(false); load(); onChanged(); }
                                catch (e) { toast(errMsg(e, "ส่งไม่สำเร็จ"), "error"); }
                                finally { setBusy(""); }
                            }} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                                {busy === "send" && <Loader2 className="w-4 h-4 animate-spin" />}ยืนยันส่ง
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
            {deleting && <ConfirmDelete text={`ลบฉบับร่าง "${m.subject}"?`} onCancel={() => setDeleting(false)}
                onConfirm={async () => { try { await deleteMailing(m.id); toast("ลบแล้ว"); onChanged(); onClose(); } catch (e) { toast(errMsg(e, "ลบไม่สำเร็จ"), "error"); } }} />}
        </Modal>
    );
}

export default function WebsiteMailingsPage() {
    const canEdit = useCanEditWebsite();
    const toast = useToast();
    const { show } = toast;
    const [items, setItems] = useState<SiteMailing[] | null>(null);
    const [composing, setComposing] = useState<SiteMailing | null | "new">(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const load = useCallback(() => { fetchMailings().then(setItems).catch(() => { show("โหลดไม่สำเร็จ", "error"); setItems([]); }); }, [show]);
    useEffect(() => { load(); }, [load]);
    const sentTotal = useMemo(() => (items ?? []).reduce((n, m) => n + m.sent, 0), [items]);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <PageHeader icon={MailPlus} title="ส่งอีเมลถึงสมาชิก" subtitle={`อีเมลข่าวสารถึงสมาชิกเว็บไซต์ · ส่งไปแล้ว ${sentTotal.toLocaleString("th-TH")} ฉบับ · สมาชิกกดยกเลิกการรับได้ทุกฉบับ`}>
                {canEdit && (
                    <button onClick={() => setComposing("new")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-900/20">
                        <MailPlus className="w-4 h-4" />เขียนอีเมล
                    </button>
                )}
            </PageHeader>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {!items ? <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                    : !items.length ? (
                        <div className="py-16 text-center text-slate-400"><Mail className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm font-semibold">ยังไม่มีอีเมลถึงสมาชิก</p></div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {items.map(m => (
                                <li key={m.id}>
                                    <button onClick={() => setOpenId(m.id)} className="w-full text-left flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-1 px-4 py-3.5 hover:bg-slate-50">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-slate-800 truncate">{m.subject}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{AUDIENCE[m.audience].label}{m.provinces.length ? ` · ${m.provinces.length} จังหวัด` : ""} · {m.sentAt ? `ส่ง ${formatThaiDate(m.sentAt)}` : `สร้าง ${formatThaiDate(m.createdAt)}`}</p>
                                        </div>
                                        {m.status !== "draft" && <span className="text-xs text-slate-500">{m.sent}/{m.total}{m.failed ? ` · ไม่สำเร็จ ${m.failed}` : ""}</span>}
                                        <span className={`shrink-0 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${STATUS[m.status].cls}`}>{STATUS[m.status].label}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
            </div>

            {composing && <Composer item={composing === "new" ? null : composing} onClose={() => setComposing(null)}
                onSaved={(m, msg) => { setComposing(null); show(msg); load(); setOpenId(m.id); }} />}
            {openId && !composing && <Detail id={openId} onClose={() => setOpenId(null)} onEdit={m => setComposing(m)} onChanged={load} toast={show} />}
            {toast.node}
        </div>
    );
}
