"use client";
// ค่าบำรุงสมาชิก (จำนงจ่ายรายเดือน), ประวัติการจ่าย และบัญชีเข้าเว็บไซต์หลัก (เว็บ 1) ของสมาชิกหนึ่งคน.
// Shown inside the member detail modal; editing needs members.edit.
import { useCallback, useEffect, useState } from "react";
import { Check, FileImage, Globe, HandCoins, KeyRound, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import {
    addMemberPayment, apiErrorMessage, createMemberAccount, deleteMemberPayment, fetchMemberById, fetchMemberSlipUrl, reviewMemberPayment, updateMemberFee,
    type MemberAccount, type MemberPaymentRow,
} from "@/lib/api";

const FEE_MIN: Record<string, number> = { student: 30, working: 100 };
export const MEMBER_TYPE_LABEL: Record<string, string> = { student: "วัยนักเรียน/นักศึกษา", working: "วัยทำงาน" };
const ACCOUNT_STATUS: Record<string, [string, string]> = {
    approved: ["ใช้งานได้", "bg-emerald-50 text-emerald-700 border-emerald-200"],
    pending: ["รอพิจารณา", "bg-amber-50 text-amber-700 border-amber-200"],
    unverified: ["ยังไม่ยืนยันอีเมล", "bg-slate-100 text-slate-600 border-slate-200"],
    rejected: ["ไม่อนุมัติ", "bg-red-50 text-red-700 border-red-200"],
    suspended: ["ถูกระงับ", "bg-slate-100 text-slate-600 border-slate-200"],
};
const PAY_STATUS: Record<string, [string, string]> = {
    confirmed: ["ยืนยันแล้ว", "bg-emerald-50 text-emerald-700 border-emerald-200"],
    pending: ["รอตรวจสลิป", "bg-amber-50 text-amber-700 border-amber-200"],
    rejected: ["ไม่ผ่าน", "bg-red-50 text-red-700 border-red-200"],
};
const inputCls = "w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";
const baht = (n: number) => `${n.toLocaleString("th-TH")} บาท`;
const thDate = (s: string) => new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

type Detail = { id: string; status: string; email: string | null; memberType: string | null; monthlyFee: number | null; payments: MemberPaymentRow[]; account: MemberAccount };

export function MemberFeePanel({ memberId, canManage, onChanged }: { memberId: string; canManage: boolean; onChanged?: () => void }) {
    const [d, setD] = useState<Detail | null>(null);
    const [busy, setBusy] = useState(false);
    const [fee, setFee] = useState({ memberType: "", monthlyFee: "" });
    const [pay, setPay] = useState({ amount: "", months: "1", periodStart: thisMonth(), paidAt: today(), method: "โอน", note: "" });

    const load = useCallback(async () => {
        const m = await fetchMemberById(memberId);
        setD(m);
        setFee({ memberType: m.memberType ?? "", monthlyFee: m.monthlyFee ? String(m.monthlyFee) : "" });
        setPay(p => ({ ...p, amount: m.monthlyFee ? String(m.monthlyFee) : p.amount }));
    }, [memberId]);
    useEffect(() => { load().catch(e => toast.error(apiErrorMessage(e, "โหลดข้อมูลค่าบำรุงไม่สำเร็จ"))); }, [load]);

    const run = async (fn: () => Promise<unknown>, ok: string) => {
        setBusy(true);
        try { await fn(); toast.success(ok); await load(); onChanged?.(); }
        catch (e) { toast.error(apiErrorMessage(e, "ทำรายการไม่สำเร็จ")); }
        finally { setBusy(false); }
    };

    if (!d) return <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>;
    const year = new Date().getFullYear();
    const ok = d.payments.filter(p => p.status === "confirmed");
    const paidYear = ok.filter(p => new Date(p.paidAt).getFullYear() === year).reduce((n, p) => n + p.amount, 0);
    const openSlip = async (pid: string) => {
        const w = window.open("", "_blank"); // open first so pop-up blockers allow it
        try { const { url } = await fetchMemberSlipUrl(d.id, pid); if (w) w.location.href = url; }
        catch (e) { w?.close(); toast.error(apiErrorMessage(e, "เปิดสลิปไม่สำเร็จ")); }
    };
    const min = FEE_MIN[fee.memberType];

    return (
        <div className="space-y-5">
            {/* ค่าบำรุง */}
            <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <HandCoins className="w-4 h-4 text-emerald-500" />7. ค่าบำรุงสมาชิก
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                        ["ประเภท", d.memberType ? MEMBER_TYPE_LABEL[d.memberType] : "ยังไม่ระบุ"],
                        ["จำนงจ่าย/เดือน", d.monthlyFee ? baht(d.monthlyFee) : "ยังไม่ระบุ"],
                        [`จ่ายแล้วปี ${year + 543}`, baht(paidYear)],
                        ["จ่ายแล้วทั้งหมด", baht(ok.reduce((n, p) => n + p.amount, 0))],
                    ].map(([k, v]) => (
                        <div key={k} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{k}</p>
                            <p className="text-sm font-bold text-slate-800">{v}</p>
                        </div>
                    ))}
                </div>
                {canManage && (
                    <div className="flex flex-wrap items-end gap-2 mb-4">
                        <label className="text-xs font-semibold text-slate-500">ประเภท
                            <select value={fee.memberType} onChange={e => setFee(f => ({ ...f, memberType: e.target.value }))} className={`${inputCls} mt-1 w-44`}>
                                <option value="">เลือก…</option>
                                <option value="student">วัยนักเรียน/นักศึกษา</option>
                                <option value="working">วัยทำงาน</option>
                            </select>
                        </label>
                        <label className="text-xs font-semibold text-slate-500">บาท/เดือน{min ? ` (ขั้นต่ำ ${min})` : ""}
                            <input type="number" min={min ?? 0} value={fee.monthlyFee} onChange={e => setFee(f => ({ ...f, monthlyFee: e.target.value }))} className={`${inputCls} mt-1 w-32`} />
                        </label>
                        <button disabled={busy || !fee.memberType || !fee.monthlyFee} onClick={() => run(() => updateMemberFee(d.id, fee.memberType, fee.monthlyFee), "บันทึกค่าบำรุงแล้ว")}
                            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 disabled:opacity-50">บันทึกจำนง</button>
                    </div>
                )}

                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ประวัติการจ่าย</p>
                {d.payments.length ? (
                    <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 mb-4">
                        {d.payments.map(p => (
                            <div key={p.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm ${p.status === "pending" ? "bg-amber-50/60" : ""}`}>
                                <span className="w-28 shrink-0 text-slate-500">{thDate(p.paidAt)}</span>
                                <span className="font-bold text-slate-800 w-24 shrink-0">{baht(p.amount)}</span>
                                <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-bold ${PAY_STATUS[p.status]?.[1] ?? ""}`}>{PAY_STATUS[p.status]?.[0] ?? p.status}</span>
                                <span className="flex-1 min-w-0 truncate text-slate-500">
                                    {p.periodStart ? new Date(p.periodStart).toLocaleDateString("th-TH", { month: "short", year: "numeric" }) : ""}{p.months > 1 ? ` · ${p.months} เดือน` : ""}{p.method ? ` · ${p.method}` : ""}{p.note ? ` · ${p.note}` : ""}{p.recordedBy ? ` · บันทึกโดย ${p.recordedBy}` : ""}
                                </span>
                                {p.slipPath && (
                                    <button onClick={() => openSlip(p.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50"><FileImage className="w-3.5 h-3.5" />ดูสลิป</button>
                                )}
                                {canManage && p.status === "pending" && <>
                                    <button disabled={busy} onClick={() => run(() => reviewMemberPayment(d.id, p.id, "confirm"), "ยืนยันการชำระแล้ว")}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><Check className="w-3.5 h-3.5" />ยืนยัน</button>
                                    <button disabled={busy} onClick={() => { const reason = prompt("เหตุผลที่ไม่ผ่าน (สมาชิกจะเห็นข้อความนี้)"); if (reason?.trim()) run(() => reviewMemberPayment(d.id, p.id, "reject", { reason }), "บันทึกว่าไม่ผ่านแล้ว"); }}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50"><X className="w-3.5 h-3.5" />ไม่ผ่าน</button>
                                </>}
                                {p.status === "rejected" && p.rejectReason && <span className="w-full text-xs text-red-600">เหตุผล: {p.rejectReason}</span>}
                                {canManage && (
                                    <button disabled={busy} onClick={() => { if (confirm(`ลบรายการจ่าย ${baht(p.amount)} วันที่ ${thDate(p.paidAt)}?`)) run(() => deleteMemberPayment(d.id, p.id), "ลบรายการแล้ว"); }}
                                        aria-label="ลบรายการ" className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : <p className="text-sm text-slate-400 mb-4">ยังไม่มีประวัติการจ่าย</p>}

                {canManage && (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                        <p className="text-xs font-bold text-emerald-800 mb-2">บันทึกการรับเงินค่าบำรุง</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <label className="text-xs font-semibold text-slate-500">จำนวนเงิน (บาท)<input type="number" min={1} value={pay.amount} onChange={e => setPay(p => ({ ...p, amount: e.target.value }))} className={`${inputCls} mt-1`} /></label>
                            <label className="text-xs font-semibold text-slate-500">จำนวนเดือน<input type="number" min={1} max={120} value={pay.months} onChange={e => setPay(p => ({ ...p, months: e.target.value }))} className={`${inputCls} mt-1`} /></label>
                            <label className="text-xs font-semibold text-slate-500">เริ่มเดือน<input type="month" value={pay.periodStart} onChange={e => setPay(p => ({ ...p, periodStart: e.target.value }))} className={`${inputCls} mt-1`} /></label>
                            <label className="text-xs font-semibold text-slate-500">วันที่รับเงิน<input type="date" value={pay.paidAt} onChange={e => setPay(p => ({ ...p, paidAt: e.target.value }))} className={`${inputCls} mt-1`} /></label>
                            <label className="text-xs font-semibold text-slate-500">ช่องทาง
                                <select value={pay.method} onChange={e => setPay(p => ({ ...p, method: e.target.value }))} className={`${inputCls} mt-1`}>
                                    <option>โอน</option><option>เงินสด</option><option>อื่น ๆ</option>
                                </select>
                            </label>
                            <label className="text-xs font-semibold text-slate-500">หมายเหตุ<input value={pay.note} onChange={e => setPay(p => ({ ...p, note: e.target.value }))} className={`${inputCls} mt-1`} /></label>
                        </div>
                        <button disabled={busy || !pay.amount} onClick={() => run(() => addMemberPayment(d.id, pay), "บันทึกการรับเงินแล้ว")}
                            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}บันทึกรายการ
                        </button>
                    </div>
                )}
            </div>

            <div className="h-px bg-slate-100" />

            {/* บัญชีเว็บไซต์หลัก */}
            <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />8. บัญชีเข้าเว็บไซต์หลัก
                </h3>
                {d.account ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${ACCOUNT_STATUS[d.account.status]?.[1] ?? ""}`}>{ACCOUNT_STATUS[d.account.status]?.[0] ?? d.account.status}</span>
                        <span className="text-slate-600">{d.account.email}</span>
                        {d.account.mustChangePassword && <span className="flex items-center gap-1 text-xs text-amber-700"><KeyRound className="w-3.5 h-3.5" />ยังใช้รหัสเริ่มต้น (เบอร์โทร)</span>}
                        <span className="text-xs text-slate-400">{d.account.lastLoginAt ? `เข้าใช้ล่าสุด ${thDate(d.account.lastLoginAt)}` : "ยังไม่เคยเข้าสู่ระบบ"}</span>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="text-slate-500">ยังไม่มีบัญชี</span>
                        {canManage && d.status === "อนุมัติ" && (
                            <button disabled={busy} onClick={() => { if (confirm(`สร้างบัญชีเข้าเว็บไซต์ให้สมาชิกคนนี้?\nอีเมล: ${d.email ?? "-"}\nรหัสผ่านเริ่มต้น: เบอร์โทรศัพท์ (ระบบจะให้ตั้งรหัสใหม่เมื่อเข้าสู่ระบบครั้งแรก)`)) run(() => createMemberAccount(d.id), "สร้างบัญชีแล้ว"); }}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 disabled:opacity-50">
                                <KeyRound className="w-3.5 h-3.5" />สร้างบัญชี (อีเมล + เบอร์โทรเป็นรหัสเริ่มต้น)
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
