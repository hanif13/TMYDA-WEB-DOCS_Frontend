"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
    TrendingUp, TrendingDown, RefreshCw, Plus, X, ChevronDown, Loader,
    FileText, BarChart3, Wallet, AlertTriangle, CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useYear } from "@/context/YearContext";
import { BudgetTransaction, TxType, Project } from "@/lib/types";
import { fetchTransactions, fetchAnnualPlans, fetchDepartments } from "@/lib/api";
import { getDeptStyle } from "@/lib/dept-styles";

const txConfig: Record<TxType, { color: string; bg: string; icon: React.ElementType; sign: string }> = {
    "รายรับ": { color: "text-green-600", bg: "bg-green-500", icon: TrendingUp, sign: "+" },
    "รายจ่าย": { color: "text-red-600", bg: "bg-red-500", icon: TrendingDown, sign: "-" },
    "คืนเงิน": { color: "text-blue-600", bg: "bg-blue-500", icon: RefreshCw, sign: "+" },
};

type Tab = "summary" | "transactions" | "add";

export default function BudgetPage() {
    const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
    const [projects, setProjects] = useState<{id: string; name: string; department: string; budget: number}[]>([]);
    const [loading, setLoading] = useState(true);
    const [dbDepartments, setDbDepartments] = useState<any[]>([]);

    useEffect(() => {
        Promise.all([
            fetchTransactions().catch(() => []),
            fetchAnnualPlans().catch(() => []),
            fetchDepartments().catch(() => []),
        ]).then(([txData, plansData, deptsData]) => {
            const mappedTx: BudgetTransaction[] = txData.map((t: any) => ({
                id: t.id,
                date: new Date(t.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }),
                type: t.type === "income" ? "รายรับ" : t.type === "expense" ? "รายจ่าย" : "คืนเงิน",
                description: t.title,
                department: t.department?.name || "",
                projectId: t.projectId || undefined,
                projectName: t.project?.name || undefined,
                amount: t.amount,
                recordedBy: "ทีมงบประมาณ",
                docRef: t.docRef || undefined,
            }));
            setTransactions(mappedTx);
            setDbDepartments(deptsData || []);

            const allProjects = plansData.flatMap((p: any) => p.projects || [])
                .filter((proj: any) => proj.isStarted)
                .map((proj: any) => ({
                id: proj.id,
                name: proj.name,
                department: proj.department?.name || "",
                budget: proj.budget,
            }));
            setProjects(allProjects);
        }).finally(() => setLoading(false));
    }, []);
    const [tab, setTab] = useState<Tab>("summary");
    const [filterDept, setFilterDept] = useState("all");
    const [filterProject, setFilterProject] = useState("all");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState({
        type: "รายจ่าย" as TxType,
        description: "",
        department: "",
        projectId: "",
        amount: "",
        returnedAmount: "",
        claimedBy: "",
        note: "",
        docRef: "",
    });

    // Derived stats
    const totalIncome = transactions.filter(t => t.type === "รายรับ").reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === "รายจ่าย").reduce((s, t) => s + t.amount, 0);
    const totalReturn = transactions.filter(t => t.type === "คืนเงิน").reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense + totalReturn;

    // Per-project summary
    const projectSummary = projects.map(p => {
        const pTx = transactions.filter(t => t.projectId === p.id);
        const expense = pTx.filter(t => t.type === "รายจ่าย").reduce((s, t) => s + t.amount, 0);
        const returned = pTx.filter(t => t.type === "คืนเงิน").reduce((s, t) => s + t.amount, 0);
        return { ...p, expense, returned, net: expense - returned };
    }).filter(p => p.expense > 0);

    // Per-dept breakdown
    const deptSummary = dbDepartments.map(d => {
        const dExp = transactions.filter(t => t.department === d.name && t.type === "รายจ่าย").reduce((s, t) => s + t.amount, 0);
        const dRet = transactions.filter(t => t.department === d.name && t.type === "คืนเงิน").reduce((s, t) => s + t.amount, 0);
        return { ...d, expense: dExp, returned: dRet, net: dExp - dRet };
    }).filter(p => p.expense > 0);

    const filteredTx = transactions.filter(t => {
        const matchDept = filterDept === "all" || t.department === filterDept;
        const matchProject = filterProject === "all" || t.projectId === filterProject;
        return matchDept && matchProject;
    });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await new Promise(r => setTimeout(r, 1200));
        const proj = projects.find(p => p.id === form.projectId);
        const newTx: BudgetTransaction = {
            id: `t${Date.now()}`,
            date: new Date().toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }),
            type: form.type,
            description: form.description,
            department: form.department,
            projectId: form.projectId || undefined,
            projectName: proj?.name,
            amount: Number(form.amount),
            returnedAmount: form.returnedAmount ? Number(form.returnedAmount) : undefined,
            claimedBy: form.claimedBy || undefined,
            recordedBy: "ทีมงบประมาณ",
            note: form.note || undefined,
            docRef: form.docRef || undefined,
        };
        setTransactions(prev => [newTx, ...prev]);
        toast.success(`บันทึก${form.type} ฿${Number(form.amount).toLocaleString()} สำเร็จ!`, { icon: "✅" });
        setForm({ type: "รายจ่าย", description: "", department: "", projectId: "", amount: "", returnedAmount: "", claimedBy: "", note: "", docRef: "" });
        setIsSubmitting(false);
        setTab("transactions");
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
            <Loader className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p>กำลังโหลดข้อมูลงบประมาณ...</p>
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in-up">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">งบประมาณ</h1>
                    <p className="text-sm text-slate-500 mt-0.5">บันทึกรายรับ-รายจ่ายจริงตามโครงการ จัดการโดยทีมงบประมาณ</p>
                </div>
                <button onClick={() => setTab("add")} className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-200 transition-colors">
                    <Plus className="w-4 h-4" /> เพิ่มรายการ
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "รายรับทั้งหมด", value: totalIncome, icon: TrendingUp, bg: "bg-green-50", text: "text-green-600", negative: false },
                    { label: "รายจ่ายทั้งหมด", value: totalExpense, icon: TrendingDown, bg: "bg-red-50", text: "text-red-600", negative: true },
                    { label: "ยอดคืนเงิน", value: totalReturn, icon: RefreshCw, bg: "bg-blue-50", text: "text-blue-600", negative: false },
                    { label: "คงเหลือสุทธิ", value: balance, icon: Wallet, bg: balance > 0 ? "bg-emerald-50" : "bg-rose-50", text: balance > 0 ? "text-emerald-700" : "text-rose-700", negative: false },
                ].map(card => (
                    <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-5 card-hover">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-3", card.bg)}>
                            <card.icon className={cn("w-5 h-5", card.text)} />
                        </div>
                        <p className={cn("text-2xl font-bold", card.text)}>
                            {card.negative ? "-" : ""}฿{card.value.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {[
                    { id: "summary", label: "สรุปผล" },
                    { id: "transactions", label: `รายการ (${filteredTx.length})` },
                    { id: "add", label: "เพิ่มรายการ" },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id as Tab)}
                        className={cn("px-3 py-2 text-sm font-medium rounded-lg transition-all",
                            tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ─── TAB: SUMMARY ─── */}
            {tab === "summary" && (
                <div className="space-y-5">
                    {/* Per-project breakdown */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-600" /> สรุปงบประมาณแยกตามโครงการ
                        </h3>
                        <div className="divide-y divide-slate-50">
                            {projectSummary.map(p => {
                                const pct = Math.min(Math.round((p.net / p.budget) * 100), 100);
                                const deptStyle = getDeptStyle(p.department);
                                const dc = `${deptStyle.bg} ${deptStyle.text}`;
                                return (
                                    <div key={p.id} className="py-4 first:pt-0 last:pb-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                                                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 inline-block", dc)}>{p.department}</span>
                                            </div>
                                            <div className="text-right text-sm">
                                                <p className="font-bold text-red-600">-฿{p.expense.toLocaleString()}</p>
                                                {p.returned > 0 && <p className="text-xs text-blue-600">+฿{p.returned.toLocaleString()} (คืน)</p>}
                                                <p className="text-xs text-slate-400">งบ: ฿{p.budget.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-blue-500")}
                                                style={{ width: `${pct}%` }} />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                            <span>สุทธิ ฿{p.net.toLocaleString()}</span>
                                            <span className={pct >= 100 ? "text-red-600 font-semibold" : ""}>{pct}% ของงบ</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Per-dept */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <h3 className="text-sm font-bold text-slate-800 mb-4">สรุปแยกตามหน่วยงาน</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {deptSummary.map(d => (
                                <div key={d.id} className={cn("p-4 rounded-xl border", d.color.includes("amber") ? "bg-amber-50 border-amber-100" : d.color.includes("blue") ? "bg-blue-50 border-blue-100" : d.color.includes("pink") ? "bg-pink-50 border-pink-100" : "bg-emerald-50 border-emerald-100")}>
                                    <p className="text-xs font-semibold text-slate-600 mb-2">{d.name}</p>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">รายจ่าย</span>
                                            <span className="font-semibold text-red-600">-฿{d.expense.toLocaleString()}</span>
                                        </div>
                                        {d.returned > 0 && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">คืนกลับ</span>
                                                <span className="font-semibold text-blue-600">+฿{d.returned.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-xs border-t border-current/10 pt-1 mt-1">
                                            <span className="text-slate-500 font-medium">สุทธิ</span>
                                            <span className="font-bold text-slate-800">฿{d.net.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB: TRANSACTIONS ─── */}
            {tab === "transactions" && (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-50">
                        <div className="relative">
                            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                                className="text-sm border border-slate-200 rounded-xl px-3 py-2 pr-8 outline-none bg-white text-slate-600 appearance-none">
                                <option value="all">ทุกหน่วยงาน</option>
                                {dbDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                                className="text-sm border border-slate-200 rounded-xl px-3 py-2 pr-8 outline-none bg-white text-slate-600 appearance-none">
                                <option value="all">ทุกโครงการ</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <span className="text-xs text-slate-400 ml-auto">{filteredTx.length} รายการ</span>
                    </div>

                    <div className="divide-y divide-slate-50">
                        {filteredTx.map(tx => {
                            const cfg = txConfig[tx.type];
                            const Icon = cfg.icon;
                            return (
                                <div key={tx.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors">
                                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", cfg.bg === "bg-green-500" ? "bg-green-50" : cfg.bg === "bg-red-500" ? "bg-red-50" : "bg-blue-50")}>
                                        <Icon className={cn("w-4.5 h-4.5", cfg.color)} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800">{tx.description}</p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            {tx.projectName && (
                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{tx.projectName}</span>
                                            )}
                                            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", getDeptStyle(tx.department).bg, getDeptStyle(tx.department).text)}>
                                                {tx.department}
                                            </span>
                                            {tx.claimedBy && <span className="text-[11px] text-slate-400">เบิกโดย: {tx.claimedBy}</span>}
                                        </div>
                                        {tx.note && <p className="text-[11px] text-slate-400 mt-1 italic">{tx.note}</p>}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className={cn("text-base font-bold", cfg.color)}>
                                            {cfg.sign}฿{tx.amount.toLocaleString()}
                                        </p>
                                        {tx.returnedAmount && tx.returnedAmount > 0 && (
                                            <p className="text-xs text-blue-600">คืน ฿{tx.returnedAmount.toLocaleString()}</p>
                                        )}
                                        <p className="text-[11px] text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                                            <CalendarDays className="w-3 h-3" /> {tx.date}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ─── TAB: ADD ─── */}
            {tab === "add" && (
                <div className="max-w-xl">
                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                        <h2 className="text-base font-bold text-slate-800 mb-5">เพิ่มรายการงบประมาณ</h2>
                        <form onSubmit={handleAdd} className="space-y-4">
                            {/* Type selector */}
                            <div className="grid grid-cols-3 gap-2">
                                {(["รายรับ", "รายจ่าย", "คืนเงิน"] as TxType[]).map(t => {
                                    const cfg = txConfig[t];
                                    const Icon = cfg.icon;
                                    return (
                                        <button key={t} type="button" onClick={() => setForm(p => ({ ...p, type: t }))}
                                            className={cn("flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all",
                                                form.type === t
                                                    ? t === "รายรับ" ? "border-green-500 bg-green-50 text-green-700" : t === "รายจ่าย" ? "border-red-500 bg-red-50 text-red-700" : "border-blue-500 bg-blue-50 text-blue-700"
                                                    : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                                            <Icon className="w-4 h-4" /> {t}
                                        </button>
                                    );
                                })}
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">รายละเอียด *</label>
                                <input required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder={form.type === "รายรับ" ? "เช่น งบประมาณ Q3 2569..." : form.type === "รายจ่าย" ? "เช่น อนุมัติค่ายฯ รุ่นที่ 5..." : "เช่น คืนเงินส่วนเกินค่าอาหาร..."}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none focus:border-blue-400 transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">หน่วยงาน *</label>
                                    <div className="relative">
                                        <select required value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none appearance-none focus:border-blue-400">
                                            <option value="" disabled>เลือก...</option>
                                            {dbDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">โครงการที่เกี่ยวข้อง</label>
                                    <div className="relative">
                                        <select value={form.projectId} onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none appearance-none focus:border-blue-400">
                                            <option value="">ไม่ระบุ</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">จำนวนเงิน (บาท) *</label>
                                    <input type="number" step="any" required min="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                                        placeholder="0"
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none focus:border-blue-400 transition-all" />
                                </div>
                                {form.type === "รายจ่าย" && (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">ยอดคืน (ถ้ามี)</label>
                                        <input type="number" step="any" min="0" value={form.returnedAmount} onChange={e => setForm(p => ({ ...p, returnedAmount: e.target.value }))}
                                            placeholder="0"
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none focus:border-blue-400 transition-all" />
                                    </div>
                                )}
                            </div>

                            {form.type === "รายจ่าย" && (
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">เบิกจ่ายโดย</label>
                                    <input value={form.claimedBy} onChange={e => setForm(p => ({ ...p, claimedBy: e.target.value }))}
                                        placeholder="ชื่อผู้รับเงิน..."
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none focus:border-blue-400 transition-all" />
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">เอกสารอ้างอิง / หมายเหตุ</label>
                                <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                                    placeholder="เช่น ใบเสร็จเลขที่ 0001, หมายเหตุเพิ่มเติม..."
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none focus:border-blue-400 transition-all" />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={isSubmitting}
                                    className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 shadow-sm shadow-blue-200">
                                    {isSubmitting ? <><Loader className="w-4 h-4 animate-spin" /> กำลังบันทึก...</> : <><Plus className="w-4 h-4" /> บันทึกรายการ</>}
                                </button>
                                <button type="button" onClick={() => setTab("transactions")} className="px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">ยกเลิก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
