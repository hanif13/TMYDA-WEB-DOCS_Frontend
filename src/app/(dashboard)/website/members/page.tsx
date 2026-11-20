"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
    Ban, CheckCircle2, Clock, Loader2, Mail, MailWarning, RotateCcw, Search, Send, Trash2, UserCheck, XCircle,
} from "lucide-react";
import {
    deleteSiteMember, fetchSiteEmail, fetchSiteEmails, fetchSiteMember, fetchSiteMembers, siteMemberAction, updateSiteMemberNote,
    type SiteEmail, type SiteMemberDetail, type SiteMemberRow, type SiteMemberStatus,
} from "@/lib/api";
import { ConfirmDelete, Modal, PageHeader, inputCls, labelCls, useCanEditWebsite, useToast } from "../_shared";
import { Field, LinesInput, RowsEditor, SaveBar, SectionTitle, Tabs, errMsg, sectionCls, useHashTab, useSiteSetting } from "../_editors";

type Toast = (m: string, t?: "success" | "error") => void;
const STATUS: Record<SiteMemberStatus, { label: string; cls: string }> = {
    pending: { label: "รอพิจารณา", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    approved: { label: "อนุมัติแล้ว", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    rejected: { label: "ไม่ผ่าน", cls: "bg-rose-50 text-rose-700 border-rose-100" },
    suspended: { label: "ระงับ", cls: "bg-slate-200 text-slate-700 border-slate-300" },
    unverified: { label: "ยังไม่ยืนยันอีเมล", cls: "bg-slate-50 text-slate-500 border-slate-200" },
};
const EMAIL_STATUS: Record<string, string> = { sent: "ส่งแล้ว", logged: "บันทึก (โหมดทดสอบ)", failed: "ส่งไม่สำเร็จ" };
const when = (s: string | null) => (s ? new Date(s).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
const age = (b: string | null) => {
    if (!b) return null;
    const d = new Date(b), n = new Date();
    let a = n.getFullYear() - d.getFullYear();
    if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
    return a;
};

function useCanReview() {
    const { data } = useSession();
    const u = data?.user as { role?: string; permissions?: string[] } | undefined;
    return u?.role === "SUPER_ADMIN" || (u?.permissions || []).includes("site_members.edit") || (u?.permissions || []).includes("all");
}

const Pill = ({ s }: { s: SiteMemberStatus }) => <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS[s].cls}`}>{STATUS[s].label}</span>;

// ─── Application detail + decisions ──────────────────────────
function MemberModal({ id, onClose, onChanged, toast }: { id: string; onClose: () => void; onChanged: () => void; toast: Toast }) {
    const canReview = useCanReview();
    const [m, setM] = useState<SiteMemberDetail | null>(null);
    const [reasonFor, setReasonFor] = useState<"reject" | "suspend" | null>(null);
    const [reason, setReason] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        const d = await fetchSiteMember(id);
        setM(d); setNote(d.adminNote ?? "");
    }, [id]);
    useEffect(() => { load().catch(() => toast("โหลดข้อมูลไม่สำเร็จ", "error")); }, [load, toast]);

    const act = async (action: "approve" | "reject" | "suspend" | "reactivate" | "resend-verification") => {
        setBusy(true);
        try {
            const r = await siteMemberAction(id, action, reason.trim() || undefined);
            const sent = r.emailStatus === "sent" ? "ส่งอีเมลแจ้งผลแล้ว" : r.emailStatus === "logged" ? "บันทึกอีเมลแล้ว (โหมดทดสอบ ไม่ได้ส่งจริง)" : "แต่ส่งอีเมลไม่สำเร็จ";
            toast(`${{ approve: "อนุมัติแล้ว", reject: "บันทึกว่าไม่ผ่านแล้ว", suspend: "ระงับบัญชีแล้ว", reactivate: "ยกเลิกการระงับแล้ว", "resend-verification": "ส่งลิงก์ยืนยันใหม่แล้ว" }[action]} · ${sent}`, r.emailStatus === "failed" ? "error" : "success");
            setReasonFor(null); setReason("");
            await load(); onChanged();
        } catch (e) { toast(errMsg(e, "ทำรายการไม่สำเร็จ"), "error"); }
        finally { setBusy(false); }
    };

    if (!m) return <Modal title="ใบสมัคร" onClose={onClose}><div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></div></Modal>;
    const a = age(m.birthdate);
    const row = (k: string, v: React.ReactNode) => <div className="grid grid-cols-[130px_1fr] gap-3 py-1.5"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-800 break-words">{v || "—"}</dd></div>;
    return (
        <Modal title={`ใบสมัคร · ${m.name}`} onClose={onClose} wide>
            <div className="p-6 space-y-5">
                <div className="flex items-center gap-3 flex-wrap">
                    <Pill s={m.status} />
                    {m.reviewedAt && <span className="text-xs text-slate-500">พิจารณาเมื่อ {when(m.reviewedAt)} โดย {m.reviewedBy}</span>}
                    {m.lockedUntil && new Date(m.lockedUntil) > new Date() && <span className="text-xs font-semibold text-rose-600">ล็อกชั่วคราวจากการเข้าสู่ระบบผิดหลายครั้ง</span>}
                </div>
                {m.reviewNote && <p className="text-sm bg-rose-50 text-rose-800 rounded-xl px-4 py-3"><strong>เหตุผลที่แจ้งผู้สมัคร:</strong> {m.reviewNote}</p>}

                <section>
                    <h3 className="text-sm font-bold text-slate-700 mb-1">ข้อมูลผู้สมัคร</h3>
                    <dl className="text-sm divide-y divide-slate-100">
                        {row("อีเมล", <>{m.email} {m.emailVerifiedAt ? <span className="text-emerald-600 text-xs">✓ ยืนยันแล้ว</span> : <span className="text-slate-400 text-xs">ยังไม่ยืนยัน</span>}</>)}
                        {row("เบอร์โทร", m.phone)}
                        {row("จังหวัด", m.province)}
                        {row("วันเกิด / อายุ", m.birthdate ? `${new Date(m.birthdate).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })} · ${a} ปี` : null)}
                        {(m.guardianName || m.guardianPhone) && row("ผู้ปกครอง", `${m.guardianName ?? ""} · ${m.guardianPhone ?? ""}`)}
                        {row("สมัคร / ส่งใบสมัคร", `${when(m.createdAt)} / ${when(m.submittedAt)}`)}
                        {row("เข้าสู่ระบบล่าสุด", when(m.lastLoginAt))}
                        {row("กิจกรรมบนเว็บบอร์ด", `${m.threads} กระทู้ · ${m.comments} ความคิดเห็น`)}
                    </dl>
                </section>

                {m.answers.length > 0 && (
                    <section>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">คำตอบในใบสมัคร</h3>
                        <dl className="space-y-2">
                            {m.answers.map((x, i) => <div key={i} className="rounded-xl bg-slate-50 px-4 py-2.5"><dt className="text-xs text-slate-500">{x.question}</dt><dd className="text-sm text-slate-800 whitespace-pre-line">{x.answer || "—"}</dd></div>)}
                        </dl>
                    </section>
                )}
                {m.accepted.length > 0 && (
                    <section>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">เงื่อนไขที่ยอมรับขณะสมัคร</h3>
                        <ul className="space-y-1 text-sm text-slate-700">{m.accepted.map((c, i) => <li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{c}</li>)}</ul>
                    </section>
                )}

                {canReview && (
                    <section className="rounded-2xl border border-slate-200 p-4 space-y-3">
                        <h3 className="text-sm font-bold text-slate-700">การพิจารณา</h3>
                        {reasonFor ? (
                            <div className="space-y-2">
                                <label htmlFor="reason" className={labelCls}>{reasonFor === "reject" ? "เหตุผลที่ไม่ผ่าน" : "เหตุผลที่ระงับ"} (ผู้สมัครจะเห็นในอีเมล) *</label>
                                <textarea id="reason" rows={3} value={reason} onChange={e => setReason(e.target.value)} className={`${inputCls} resize-y`} placeholder={reasonFor === "reject" ? "เช่น ข้อมูลไม่ครบ กรุณาระบุจังหวัดและช่องทางที่รู้จักให้ชัดเจน" : "เช่น โพสต์เนื้อหาไม่เหมาะสมซ้ำหลายครั้ง"} />
                                <div className="flex gap-2">
                                    <button onClick={() => { setReasonFor(null); setReason(""); }} className="px-4 py-2 rounded-xl border text-sm font-semibold text-slate-600">ยกเลิก</button>
                                    <button disabled={busy || !reason.trim()} onClick={() => act(reasonFor)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-50">
                                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}<Send className="w-4 h-4" />{reasonFor === "reject" ? "ยืนยันไม่ผ่าน และแจ้งทางอีเมล" : "ระงับ และแจ้งทางอีเมล"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {(m.status === "pending" || m.status === "rejected") && (
                                    <button disabled={busy} onClick={() => act("approve")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}อนุมัติ และแจ้งทางอีเมล
                                    </button>
                                )}
                                {m.status === "pending" && <button onClick={() => setReasonFor("reject")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 text-sm font-semibold hover:bg-rose-50"><XCircle className="w-4 h-4" />ไม่ผ่าน…</button>}
                                {(m.status === "approved" || m.status === "pending") && <button onClick={() => setReasonFor("suspend")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"><Ban className="w-4 h-4" />ระงับบัญชี…</button>}
                                {m.status === "suspended" && <button disabled={busy} onClick={() => act("reactivate")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"><RotateCcw className="w-4 h-4" />ยกเลิกการระงับ</button>}
                                {m.status === "unverified" && <button disabled={busy} onClick={() => act("resend-verification")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold"><Mail className="w-4 h-4" />ส่งลิงก์ยืนยันอีเมลอีกครั้ง</button>}
                                <button onClick={() => setDeleting(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-rose-600 text-sm font-semibold hover:bg-rose-50 ml-auto"><Trash2 className="w-4 h-4" />ลบบัญชี</button>
                            </div>
                        )}
                        <div className="pt-2 border-t border-slate-100">
                            <label htmlFor="note" className={labelCls}>บันทึกภายใน (ผู้สมัครไม่เห็น)</label>
                            <div className="flex gap-2">
                                <textarea id="note" rows={2} value={note} onChange={e => setNote(e.target.value)} className={`${inputCls} resize-y`} />
                                <button disabled={note === (m.adminNote ?? "")} onClick={async () => { try { await updateSiteMemberNote(id, note); toast("บันทึกแล้ว"); await load(); } catch { toast("บันทึกไม่สำเร็จ", "error"); } }}
                                    className="self-start px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold disabled:opacity-40">บันทึก</button>
                            </div>
                        </div>
                    </section>
                )}

                <section>
                    <h3 className="text-sm font-bold text-slate-700 mb-2">อีเมลที่ระบบส่งถึงผู้สมัคร</h3>
                    {m.emails.length === 0 ? <p className="text-xs text-slate-400">ยังไม่มี</p> : (
                        <ul className="text-sm divide-y divide-slate-100">
                            {m.emails.map(e => <li key={e.id} className="flex justify-between gap-3 py-2"><span className="truncate">{e.subject}</span><span className="text-xs text-slate-500 shrink-0">{EMAIL_STATUS[e.status] ?? e.status} · {when(e.createdAt)}</span></li>)}
                        </ul>
                    )}
                </section>
            </div>
            {deleting && <ConfirmDelete text={`ลบบัญชีของ ${m.name} ถาวร? ผู้สมัครจะต้องสมัครใหม่ (กระทู้ที่เคยตั้งจะยังอยู่)`} onCancel={() => setDeleting(false)}
                onConfirm={async () => { try { await deleteSiteMember(id); toast("ลบบัญชีแล้ว"); onChanged(); onClose(); } catch { toast("ลบไม่สำเร็จ", "error"); } setDeleting(false); }} />}
        </Modal>
    );
}

// ─── Membership conditions ───────────────────────────────────
function ConditionsEditor({ toast }: { toast: Toast }) {
    const canEdit = useCanEditWebsite();
    const { value: r, set, save, saving, dirty } = useSiteSetting("membership", toast);
    if (!r) return <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></div>;
    const num = (v: string) => (v === "" ? null : Math.max(0, Math.min(99, Number(v))));
    const check = (key: "autoApprove" | "requirePhone" | "requireProvince", label: string, hint: string) => (
        <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={r[key]} onChange={e => set({ [key]: e.target.checked })} className="w-4 h-4 mt-0.5 accent-blue-600" />
            <span><span className="block text-sm font-semibold text-slate-700">{label}</span><span className="block text-xs text-slate-500">{hint}</span></span>
        </label>
    );
    return (
        <div className="space-y-5">
            <fieldset disabled={!canEdit} className="space-y-5">
                <section className={sectionCls}>
                    <SectionTitle title="วิธีอนุมัติ" />
                    {check("autoApprove", "อนุมัติอัตโนมัติเมื่อยืนยันอีเมล", "ปิดไว้ = ทีมงานต้องตรวจใบสมัครทุกใบก่อน (แนะนำ)")}
                    <Field label="ข้อความแนะนำบนหน้าสมัครสมาชิก"><textarea rows={2} value={r.intro} onChange={e => set({ intro: e.target.value })} className={`${inputCls} resize-y`} /></Field>
                    <Field label="ข้อความเพิ่มเติมในอีเมลแจ้งอนุมัติ"><textarea rows={2} value={r.approvedMessage} onChange={e => set({ approvedMessage: e.target.value })} className={`${inputCls} resize-y`} /></Field>
                </section>
                <section className={sectionCls}>
                    <SectionTitle title="คุณสมบัติผู้สมัคร" hint="ระบบตรวจให้อัตโนมัติขณะสมัคร" />
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="อายุขั้นต่ำ (ปี)" hint="เว้นว่าง = ไม่จำกัดอายุ"><input type="number" min={0} max={99} value={r.minAge ?? ""} onChange={e => set({ minAge: num(e.target.value) })} className={inputCls} /></Field>
                        <Field label="ต้องมีข้อมูลผู้ปกครอง เมื่ออายุต่ำกว่า (ปี)" hint="เว้นว่าง = ไม่ต้องใช้"><input type="number" min={0} max={99} value={r.guardianUnderAge ?? ""} onChange={e => set({ guardianUnderAge: num(e.target.value) })} className={inputCls} /></Field>
                    </div>
                    {check("requirePhone", "บังคับกรอกเบอร์โทรศัพท์", "")}
                    {check("requireProvince", "บังคับเลือกจังหวัด", "")}
                </section>
                <section className={sectionCls}>
                    <SectionTitle title="เงื่อนไขที่ต้องยอมรับ" hint="ผู้สมัครต้องติ๊กยอมรับทุกข้อ และระบบเก็บข้อความที่ยอมรับไว้กับใบสมัคร" />
                    <LinesInput label="เงื่อนไข" value={r.conditions} onChange={conditions => set({ conditions })} rows={5} />
                </section>
                <section className={sectionCls}>
                    <SectionTitle title="คำถามในใบสมัคร" hint="ช่วยให้ทีมงานพิจารณาได้ง่ายขึ้น" />
                    <RowsEditor label="คำถาม" rows={r.questions as unknown as Record<string, string>[]} onChange={q => set({ questions: q.map(x => ({ label: String(x.label ?? ""), help: String(x.help ?? ""), required: String(x.required) === "true" })) })}
                        addLabel="เพิ่มคำถาม" blank={() => ({ label: "", help: "", required: "false" })}
                        columns={[
                            { key: "label", label: "คำถาม", width: "sm:col-span-5" },
                            { key: "help", label: "คำอธิบาย/ตัวอย่าง", width: "sm:col-span-4" },
                            { key: "required", label: "บังคับตอบ", kind: "select", width: "sm:col-span-3", options: [{ value: "true", label: "บังคับตอบ" }, { value: "false", label: "ไม่บังคับ" }] },
                        ]} />
                </section>
            </fieldset>
            <SaveBar dirty={dirty} saving={saving} onSave={save} canEdit={canEdit} />
        </div>
    );
}

// ─── Email history ───────────────────────────────────────────
function EmailLog({ toast }: { toast: Toast }) {
    const [items, setItems] = useState<SiteEmail[] | null>(null);
    const [q, setQ] = useState("");
    const [open, setOpen] = useState<SiteEmail | null>(null);
    useEffect(() => {
        const t = setTimeout(() => { fetchSiteEmails(q).then(setItems).catch(() => toast("โหลดประวัติอีเมลไม่สำเร็จ", "error")); }, 250);
        return () => clearTimeout(t);
    }, [q, toast]);
    return (
        <div className="space-y-4">
            {items?.some(e => e.status === "logged") && (
                <p className="flex items-start gap-2 text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                    <MailWarning className="w-4 h-4 mt-0.5 shrink-0" />
                    ระบบอยู่ในโหมดทดสอบ (MEMBER_EMAIL_MODE=log): อีเมลถูกบันทึกไว้ที่นี่แต่ยังไม่ได้ส่งจริง เปิดอ่านเนื้อหาและกดลิงก์ในอีเมลได้จากหน้านี้
                </p>
            )}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input aria-label="ค้นหาอีเมล" value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาผู้รับหรือหัวเรื่อง…" className={`${inputCls} pl-9 bg-slate-50/50`} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {!items ? <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></div>
                    : !items.length ? <p className="py-16 text-center text-sm font-semibold text-slate-400">ยังไม่มีอีเมล</p>
                        : <ul className="divide-y divide-slate-100">
                            {items.map(e => (
                                <li key={e.id}>
                                    <button onClick={async () => { try { setOpen(await fetchSiteEmail(e.id)); } catch { toast("เปิดอีเมลไม่สำเร็จ", "error"); } }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-800 truncate">{e.subject}</span><span className="block text-xs text-slate-500 truncate">ถึง {e.to}{e.error ? ` · ${e.error}` : ""}</span></span>
                                        <span className={`text-xs font-semibold shrink-0 ${e.status === "failed" ? "text-rose-600" : e.status === "sent" ? "text-emerald-600" : "text-blue-600"}`}>{EMAIL_STATUS[e.status] ?? e.status}</span>
                                        <span className="hidden sm:block text-xs text-slate-400 shrink-0">{when(e.createdAt)}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>}
            </div>
            {open && (
                <Modal title={open.subject} onClose={() => setOpen(null)} wide>
                    <p className="px-6 pt-4 text-xs text-slate-500">ถึง {open.to} · {when(open.createdAt)} · {EMAIL_STATUS[open.status] ?? open.status}</p>
                    <iframe title="เนื้อหาอีเมล" srcDoc={open.html} sandbox="allow-popups allow-popups-to-escape-sandbox" className="w-full h-[520px] border-0" />
                </Modal>
            )}
        </div>
    );
}

const TABS = ["pending", "approved", "rejected", "suspended", "unverified", "all", "conditions", "emails"] as const;
type Key = (typeof TABS)[number];

export default function WebsiteMembersPage() {
    const toast = useToast();
    const { show } = toast;
    const [tab, setTab] = useHashTab<Key>(TABS, "pending");
    const [q, setQ] = useState("");
    const [data, setData] = useState<{ items: SiteMemberRow[]; counts: Partial<Record<SiteMemberStatus, number>> } | null>(null);
    const [open, setOpen] = useState<string | null>(null);
    const isList = tab !== "conditions" && tab !== "emails";

    const load = useCallback(async () => {
        // Non-list tabs still load so the tab counts stay correct.
        try { setData(await fetchSiteMembers(!isList || tab === "all" ? "" : tab, isList ? q : "")); } catch { show("โหลดรายชื่อไม่สำเร็จ", "error"); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, q, isList]);
    useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

    const c = data?.counts ?? {};
    const total = Object.values(c).reduce((a, b) => a + (b ?? 0), 0);
    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <PageHeader icon={UserCheck} title="สมาชิกเว็บไซต์" subtitle="พิจารณาใบสมัคร แจ้งผลทางอีเมล ตั้งเงื่อนไขการเป็นสมาชิก และดูประวัติอีเมล" previewPath="/register" />
            <Tabs tabs={[
                { key: "pending", label: "รอพิจารณา", count: c.pending ?? 0 },
                { key: "approved", label: "อนุมัติแล้ว", count: c.approved ?? 0 },
                { key: "rejected", label: "ไม่ผ่าน", count: c.rejected ?? 0 },
                { key: "suspended", label: "ระงับ", count: c.suspended ?? 0 },
                { key: "unverified", label: "ยังไม่ยืนยันอีเมล", count: c.unverified ?? 0 },
                { key: "all", label: "ทั้งหมด", count: total },
                { key: "conditions", label: "เงื่อนไขการสมัคร" },
                { key: "emails", label: "ประวัติอีเมล" },
            ] as { key: Key; label: string; count?: number }[]} value={tab} onChange={k => { setTab(k); setQ(""); }} />

            {tab === "conditions" ? <ConditionsEditor toast={show} /> : tab === "emails" ? <EmailLog toast={show} /> : <>
                {tab === "pending" && (
                    <p className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                        <Clock className="w-4 h-4 mt-0.5 shrink-0" />ใบสมัครที่ยืนยันอีเมลแล้วและรอการพิจารณา ผลการพิจารณาจะส่งถึงผู้สมัครทางอีเมลทันที
                    </p>
                )}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative">
                    <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input aria-label="ค้นหาสมาชิก" value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาชื่อหรืออีเมล…" className={`${inputCls} pl-9 bg-slate-50/50`} />
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {!data ? <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></div>
                        : !data.items.length ? <p className="py-16 text-center text-sm font-semibold text-slate-400">ไม่มีรายการ</p>
                            : <ul className="divide-y divide-slate-100">
                                {data.items.map(m => (
                                    <li key={m.id}>
                                        <button onClick={() => setOpen(m.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                                            <span className="h-10 w-10 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0">{m.name.slice(0, 1)}</span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-semibold text-slate-800 truncate">{m.name}</span>
                                                <span className="block text-xs text-slate-500 truncate">{m.email}{m.province && ` · ${m.province}`}{age(m.birthdate) !== null && ` · ${age(m.birthdate)} ปี`}</span>
                                            </span>
                                            <span className="hidden md:block text-xs text-slate-400 shrink-0">{m.status === "pending" ? `ส่งเมื่อ ${when(m.submittedAt)}` : when(m.reviewedAt ?? m.createdAt)}</span>
                                            <Pill s={m.status} />
                                        </button>
                                    </li>
                                ))}
                            </ul>}
                </div>
            </>}
            {open && <MemberModal id={open} onClose={() => setOpen(null)} onChanged={load} toast={show} />}
            {toast.node}
        </div>
    );
}
