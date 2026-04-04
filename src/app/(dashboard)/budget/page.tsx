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

const txConfig: Record<TxType, { color: string; bg: string; icon: React.ElementType; sign: string; gradient: string }> = {
    "รายรับ": { color: "text-emerald-600", bg: "bg-emerald-50", icon: TrendingUp, sign: "+", gradient: "from-emerald-500 to-teal-600" },
    "รายจ่าย": { color: "text-rose-600", bg: "bg-rose-50", icon: TrendingDown, sign: "-", gradient: "from-rose-500 to-red-600" },
    "คืนเงิน": { color: "text-blue-600", bg: "bg-blue-50", icon: RefreshCw, sign: "+", gradient: "from-blue-500 to-indigo-600" },
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
                date: new Date(t.date || t.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }),
                type: t.type === "income" ? "รายรับ" : t.type === "expense" ? "รายจ่าย" : "คืนเงิน",
                description: t.title,
                department: t.department?.name || "",
                projectId: t.projectId || undefined,
                projectName: t.project?.name || undefined,
                amount: t.amount,
                recordedBy: "ทีมงบประมาณ",
                docRef: t.docRef || undefined,
                originalDate: t.date || t.createdAt,
                subType: t.category || "general",
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
            originalDate: new Date().toISOString(),
            subType: form.type === "คืนเงิน" ? "refund" : "general",
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
                <button onClick={() => setTab("add")} className="flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all active:scale-95 w-full sm:w-auto">
                    <Plus className="w-4 h-4" /> เพิ่มรายการ
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "รายรับทั้งหมด", value: totalIncome, icon: TrendingUp, bg: "bg-emerald-50", text: "text-emerald-600", gradient: "from-emerald-500/10 to-teal-500/10", border: "border-emerald-100", iconBg: "bg-emerald-500" },
                    { label: "รายจ่ายทั้งหมด", value: totalExpense, icon: TrendingDown, bg: "bg-rose-50", text: "text-rose-600", gradient: "from-rose-500/10 to-red-500/10", border: "border-rose-100", iconBg: "bg-rose-500" },
                    { label: "ยอดคืนเงิน", value: totalReturn, icon: RefreshCw, bg: "bg-blue-50", text: "text-blue-600", gradient: "from-blue-500/10 to-indigo-500/10", border: "border-blue-100", iconBg: "bg-blue-500" },
                    { label: "คงเหลือสุทธิ", value: balance, icon: Wallet, bg: balance >= 0 ? "bg-indigo-50" : "bg-red-50", text: balance >= 0 ? "text-indigo-700" : "text-red-700", gradient: "from-indigo-500/10 to-purple-500/10", border: "border-indigo-100", iconBg: "bg-indigo-600" },
                ].map(card => (
                    <div key={card.label} className={cn("bg-white rounded-[2.5rem] border p-6 relative overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300", card.border)}>
                        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700", card.gradient)} />
                        <div className="relative z-10">
                            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center mb-4 transition-all group-hover:scale-110 group-hover:shadow-lg", card.bg)}>
                                <card.icon className={cn("w-6 h-6", card.text)} />
                            </div>
                            <h2 className={cn("text-3xl font-black tracking-tight", card.text)}>
                                ฿{Math.abs(card.value).toLocaleString()}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                <span className={cn("w-1.5 h-1.5 rounded-full", card.iconBg)} />
                                {card.label}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100/50 p-1.5 rounded-[1.5rem] w-full sm:w-fit backdrop-blur-sm border border-slate-100">
                {[
                    { id: "summary", label: "ภาพรวม" },
                    { id: "transactions", label: `รายการล่าสุด` },
                    { id: "add", label: "เบิกงบใหม่", icon: Plus },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id as Tab)}
                        className={cn("flex-1 sm:flex-none px-6 py-3 text-xs font-black rounded-[1.2rem] transition-all uppercase tracking-widest flex items-center justify-center gap-2",
                            tab === t.id ? "bg-white text-blue-600 shadow-[0_8px_16px_-4px_rgba(37,99,235,0.15)] transform scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50")}>
                        {t.icon && <t.icon className="w-3.5 h-3.5" />}
                        {t.label}
                        {t.id === "transactions" && (
                            <span className="ml-1 bg-slate-200/50 px-1.5 py-0.5 rounded-lg text-[9px] group-hover:bg-blue-100 transition-colors">
                                {filteredTx.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ─── TAB: SUMMARY ─── */}
            {tab === "summary" && (
                <div className="space-y-6">
                    {/* Per-project breakdown */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">วิเคราะห์การเบิกจ่ายโครงการ</h3>
                                <p className="text-xs text-slate-400 mt-1">งบประมาณที่ใช้จริงเทียบกับงบประมาณโครงการที่ตั้งไว้</p>
                            </div>
                            <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                        
                        <div className="space-y-8">
                            {projectSummary.length > 0 ? projectSummary.map(p => {
                                const pct = Math.min(Math.round((p.net / p.budget) * 100), 100);
                                const deptStyle = getDeptStyle(p.department);
                                return (
                                    <div key={p.id} className="relative group">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="min-w-0">
                                                <p className="text-base font-bold text-slate-800 leading-tight mb-1 group-hover:text-blue-600 transition-colors uppercase">{p.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-lg border border-current/10", deptStyle.bg, deptStyle.text)}>{p.department}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">สุทธิ ฿{p.net.toLocaleString()} / ฿{p.budget.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={cn("text-lg font-black tracking-tighter", pct >= 100 ? "text-rose-600" : pct >= 80 ? "text-amber-600" : "text-blue-600")}>
                                                    {pct}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                                            <div 
                                                className={cn("h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(0,0,0,0.1)] relative", 
                                                    pct >= 100 ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-200" : 
                                                    pct >= 80 ? "bg-gradient-to-r from-amber-400 to-orange-500 shadow-amber-200" : 
                                                    "bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-200"
                                                )}
                                                style={{ width: `${pct}%` }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 text-sm italic font-medium">ยังไม่มีข้อมูลการเบิกจ่ายตามโครงการ</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Per-dept breakdown */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">สรุปงบประมาณแยกตามหน่วยงาน</h3>
                                <p className="text-xs text-slate-400 mt-1">สรุปภาพรวมรายรับ-รายจ่าย รายหน่วยงาน</p>
                            </div>
                            <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                                <Wallet className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {deptSummary.length > 0 ? deptSummary.map(d => {
                                const cfg = getDeptStyle(d.name);
                                return (
                                    <div key={d.id} className={cn("p-6 rounded-[2rem] border transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-200 duration-300 relative overflow-hidden group", cfg.bg.replace('bg-', 'bg-opacity-5 bg-'), "border-slate-100")}>
                                        <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 rounded-full opacity-0 group-hover:opacity-10 shadow-inner group-hover:scale-150 transition-all duration-700", cfg.bg)} />
                                        <div className="relative z-10">
                                            <p className={cn("text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2", cfg.text)}>
                                                <span className={cn("w-2 h-2 rounded-full", cfg.bg)} />
                                                {d.name}
                                            </p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">รายจ่าย</p>
                                                    <p className="text-base font-black text-rose-600">-฿{d.expense.toLocaleString()}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">คืนเงิน</p>
                                                    <p className="text-base font-black text-blue-600">฿{d.returned.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-baseline">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">ยอดสุทธิ</span>
                                                <span className="text-xl font-black text-slate-900 tracking-tighter">฿{d.net.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="col-span-full py-12 text-center text-slate-400 text-sm italic">ไม่พบข้อมูลสรุปหน่วยงาน</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB: TRANSACTIONS ─── */}
            {tab === "transactions" && (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 px-6 py-6 border-b border-slate-50 bg-slate-50/30">
                        <div className="relative">
                            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                                className="text-xs font-bold uppercase tracking-widest border border-slate-200 rounded-xl px-4 py-2.5 pr-10 outline-none bg-white text-slate-600 appearance-none shadow-sm focus:border-blue-400 transition-all">
                                <option value="all">ทุกหน่วยงาน</option>
                                {dbDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <div className="relative flex-1 sm:flex-none">
                            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                                className="w-full sm:w-auto text-xs font-bold uppercase tracking-widest border border-slate-200 rounded-xl px-4 py-2.5 pr-10 outline-none bg-white text-slate-600 appearance-none shadow-sm focus:border-blue-400 transition-all">
                                <option value="all">ทุกโครงการ</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    <div className="divide-y divide-slate-50">
                        {filteredTx.length > 0 ? filteredTx.map(tx => {
                            const cfg = txConfig[tx.type];
                            const Icon = cfg.icon;
                            const deptStyle = getDeptStyle(tx.department);
                            return (
                                <div key={tx.id} className="flex items-start sm:items-center gap-4 px-6 py-5 hover:bg-slate-50 transition-all group relative border-l-4 border-transparent hover:border-blue-500">
                                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm", cfg.bg)}>
                                        <Icon className={cn("w-6 h-6", cfg.color)} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-black text-slate-800 leading-snug group-hover:text-blue-600 transition-colors mb-1">{tx.description}</p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-lg border border-current/10", deptStyle.bg, deptStyle.text)}>{tx.department}</span>
                                            {tx.projectName && (
                                                <span className="text-[9px] font-black text-blue-500 bg-blue-50/50 px-2 py-0.5 rounded-lg border border-blue-100 line-clamp-1 max-w-[200px]">
                                                    {tx.projectName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn("text-xl font-black tracking-tighter", cfg.color)}>
                                            {cfg.sign}฿{tx.amount.toLocaleString()}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center justify-end gap-1.5 uppercase tracking-widest">
                                            <CalendarDays className="w-3 h-3" /> {tx.date}
                                        </p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="py-20 text-center">
                                <BarChart3 className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                <p className="text-slate-400 text-sm italic font-medium">ไม่พบรายการที่ตรงตามเงื่อนไข</p>
                            </div>
                        )}
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
