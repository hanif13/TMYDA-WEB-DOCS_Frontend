"use client";

import { useSession } from "next-auth/react";
import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
    TrendingUp, TrendingDown, RefreshCw, Plus, X, ChevronDown, Loader,
    FileText, BarChart3, Wallet, CalendarDays, Users, Banknote, Eye,
    Link2, FolderKanban, Search, Filter, ChevronRight, ArrowUpDown,
    Receipt, BookOpen, ClipboardList, UploadCloud, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BudgetTransaction, TxType, StoredDocument, Project } from "@/lib/types";
import { fetchTransactions, fetchAnnualPlans, fetchDocuments, createTransaction, deleteTransaction, fetchDepartments, getMediaUrl } from "@/lib/api";
import { useYear } from "@/context/YearContext";
import { getDeptStyle } from "@/lib/dept-styles";

const txConfig: Record<TxType, { color: string; lightBg: string; icon: React.ElementType; sign: string; label: string }> = {
    "รายรับ": { color: "text-green-600", lightBg: "bg-green-50", icon: TrendingUp, sign: "+", label: "รายรับ" },
    "รายจ่าย": { color: "text-red-600", lightBg: "bg-red-50", icon: TrendingDown, sign: "-", label: "รายจ่าย" },
    "คืนเงิน": { color: "text-blue-600", lightBg: "bg-blue-50", icon: RefreshCw, sign: "+", label: "คืนเงิน" },
};

const THAI_MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

type Tab = "overview" | "transactions" | "disbursement" | "add";

export default function IncomeExpensePage() {
    const { data: session } = useSession();
    const { selectedYear } = useYear();
    const isViewer = (session?.user as any)?.role === "VIEWER";

    const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
    const [projects, setProjects] = useState<{
        id: string; 
        name: string; 
        department: string; 
        departmentId: string;
        budget: number; 
        budgetUsed: number;
        lead: string; 
        startDate: string; 
        endDate: string;
        months: number[];
    }[]>([]);
    const [documents, setDocuments] = useState<StoredDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>("overview");
    const [dbDepartments, setDbDepartments] = useState<any[]>([]);
    const [filterDept, setFilterDept] = useState("all");
    const [filterType, setFilterType] = useState("all");
    const [filterProject, setFilterProject] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDetailTx, setShowDetailTx] = useState<BudgetTransaction | null>(null);
    const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        if (selectedYear) {
            refreshData();
        }
    }, [selectedYear]);

    const refreshData = () => {
        setLoading(true);
        Promise.all([
            fetchTransactions(selectedYear || undefined).catch(() => []),
            fetchAnnualPlans().catch(() => []),
            fetchDocuments(selectedYear || undefined).catch(() => []),
            fetchDepartments().catch(() => []),
        ]).then(([txData, plansData, docsData, deptsData]) => {
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
                slipUrl: t.slipUrl || undefined,
            }));
            setTransactions(mappedTx);

            const filteredPlans = (plansData as any[]).filter(p => !selectedYear || p.thaiYear === selectedYear);
            const allProjects = filteredPlans.flatMap((p: any) => p.projects || [])
                .filter((proj: any) => proj.isStarted)
                .map((proj: any) => ({
                id: proj.id,
                name: proj.name,
                department: proj.department?.name || "",
                departmentId: proj.departmentId,
                budget: proj.budget,
                budgetUsed: proj.budgetUsed || 0,
                lead: proj.lead || "",
                startDate: proj.startDate || "",
                endDate: proj.endDate || "",
                months: proj.months || [],
            }));
            setProjects(allProjects);

            const mappedDocs: StoredDocument[] = docsData.map((d: any) => ({
                id: d.id,
                docNo: d.docNo,
                name: d.name,
                type: d.category?.name || "",
                department: d.department?.name || "",
                uploadedBy: d.uploadedBy?.name || "",
                uploadedAt: new Date(d.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }),
            }));
            setDocuments(mappedDocs);
            setDbDepartments(deptsData || []);
        }).finally(() => setLoading(false));
    };

    // Form state
    const [form, setForm] = useState({
        type: "รายจ่าย" as TxType,
        subType: "project" as "central" | "project" | "refund" | "general",
        description: "",
        departmentId: "",
        projectId: "",
        amount: "",
        months: [] as number[],
        slipUrl: "",
        claimedBy: "",
        note: "",
        docRef: "",
    });

    const toggleMonth = (m: number) => {
        setForm(prev => {
            const newMonths = prev.months.includes(m)
                ? prev.months.filter(x => x !== m)
                : [...prev.months, m];
            return { ...prev, months: newMonths };
        });
    };

    /* ─── COMPUTED ─── */
    const totalIncome = transactions.filter(t => t.type === "รายรับ").reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === "รายจ่าย").reduce((s, t) => s + t.amount, 0);
    const totalReturn = transactions.filter(t => t.type === "คืนเงิน").reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense + totalReturn;

    const filteredTx = useMemo(() => {
        return transactions.filter(t => {
            if (filterDept !== "all" && t.department !== filterDept) return false;
            if (filterType !== "all" && t.type !== filterType) return false;
            if (filterProject !== "all" && t.projectId !== filterProject) return false;
            if (searchTerm && !t.description.includes(searchTerm) && !(t.projectName ?? "").includes(searchTerm)) return false;
            return true;
        });
    }, [transactions, filterDept, filterType, filterProject, searchTerm]);

    // Per-project disbursement
    const projectDisbursements = useMemo(() => {
        return projects.map(p => {
            const pTx = transactions.filter(t => t.projectId === p.id);
            const expense = pTx.filter(t => t.type === "รายจ่าย").reduce((s, t) => s + t.amount, 0);
            const returned = pTx.filter(t => t.type === "คืนเงิน").reduce((s, t) => s + t.amount, 0);
            const relatedDocs = documents.filter(d => d.projectId === p.id);
            return { ...p, transactions: pTx, expense, returned, net: expense - returned, relatedDocs };
        });
    }, [transactions, projects, documents]);

    // Dept breakdown
    const deptBreakdown = useMemo(() => {
        return dbDepartments.map(d => {
            const inc = transactions.filter(t => t.department === d.name && t.type === "รายรับ").reduce((s, t) => s + t.amount, 0);
            const exp = transactions.filter(t => t.department === d.name && t.type === "รายจ่าย").reduce((s, t) => s + t.amount, 0);
            const ret = transactions.filter(t => t.department === d.name && t.type === "คืนเงิน").reduce((s, t) => s + t.amount, 0);
            return { ...d, income: inc, expense: exp, returned: ret, net: exp - ret };
        });
    }, [transactions, dbDepartments]);

    /* ─── HANDLERS ─── */
    const handleDelete = async (id: string) => {
        if (!confirm("คุณต้องการลบรายการนี้ใช่หรือไม่?")) return;
        try {
            await deleteTransaction(id);
            setTransactions(prev => prev.filter(t => t.id !== id));
            toast.success("ลบรายการสำเร็จ");
            setShowDetailTx(null);
            
            // Refresh projects to update budget
            fetchAnnualPlans().then(plansData => {
                 const allProjects = plansData.flatMap((p: any) => p.projects || [])
                    .filter((proj: any) => proj.isStarted)
                    .map((proj: any) => ({
                    id: proj.id,
                    name: proj.name,
                    department: proj.department?.name || "",
                    departmentId: proj.departmentId,
                    budget: proj.budget,
                    budgetUsed: proj.budgetUsed || 0,
                    lead: proj.lead || "",
                    startDate: proj.startDate || "",
                    endDate: proj.endDate || "",
                    months: proj.months || [],
                }));
                setProjects(allProjects);
            });
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("ไม่สามารถลบรายการได้");
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.departmentId) return toast.error("กรุณาเลือกหน่วยงาน");
        if ((form.subType === "project" || form.subType === "refund") && !form.projectId) {
            return toast.error("กรุณาเลือกโครงการ");
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("date", new Date().toISOString());
            formData.append("title", form.description);
            formData.append("type", form.type === "รายรับ" ? "income" : form.type === "รายจ่าย" ? "expense" : "refund");
            formData.append("amount", form.amount);
            formData.append("category", form.subType);
            formData.append("docRef", form.docRef);
            formData.append("months", JSON.stringify(form.months));
            formData.append("departmentId", form.departmentId);
            if (form.projectId) formData.append("projectId", form.projectId);
            if (selectedYear) formData.append("thaiYear", selectedYear.toString());
            if (selectedFile) formData.append("file", selectedFile);

            const res = await createTransaction(formData);

            const newTx: BudgetTransaction = {
                id: res.id,
                date: new Date(res.date).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }),
                type: res.type === "income" ? "รายรับ" : res.type === "expense" ? "รายจ่าย" : "คืนเงิน",
                description: res.title,
                department: res.department?.name || "",
                projectId: res.projectId || undefined,
                projectName: res.project?.name,
                amount: res.amount,
                recordedBy: "ทีมงบประมาณ",
                note: res.note || undefined,
                docRef: res.docRef || undefined,
                slipUrl: res.slipUrl || undefined,
            };

            setTransactions(prev => [newTx, ...prev]);
            toast.success(`บันทึกสำเร็จ!`, { icon: "✅" });
            
            // Reset form
            setForm({
                type: "รายจ่าย",
                subType: "project",
                description: "",
                departmentId: "",
                projectId: "",
                amount: "",
                months: [],
                slipUrl: "",
                claimedBy: "",
                note: "",
                docRef: "",
            });
            setSelectedFile(null);
            setTab("transactions");
            
            // Re-fetch projects to update budgetUsed
            fetchAnnualPlans().then(plansData => {
                const updatedProjects = plansData.flatMap((p: any) => p.projects || []).map((proj: any) => ({
                    id: proj.id,
                    name: proj.name,
                    department: proj.department?.name || "",
                    departmentId: proj.departmentId,
                    budget: proj.budget,
                    budgetUsed: proj.budgetUsed || 0,
                    lead: proj.lead || "",
                    startDate: proj.startDate || "",
                    endDate: proj.endDate || "",
                    months: proj.months || [],
                }));
                setProjects(updatedProjects);
            });

        } catch (error) {
            console.error("Add transaction error:", error);
            toast.error("ไม่สามารถบันทึกรายการได้");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Find related document for a transaction by docRef
    const findDoc = (docRef?: string): StoredDocument | undefined => {
        if (!docRef) return undefined;
        return documents.find(d => d.docNo === docRef || d.id === docRef);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
            <Loader className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p>กำลังโหลดข้อมูลรายรับ-รายจ่าย...</p>
        </div>
    );

    return (
        <>
            <div className="space-y-5 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">รายรับ-รายจ่าย</h1>
                    <p className="text-sm text-slate-500 mt-0.5">บันทึกและติดตามรายรับ-รายจ่าย เบิกจ่ายตามโครงการ พร้อมอ้างอิงเอกสาร</p>
                </div>
                {!isViewer && (
                    <button onClick={() => setTab("add")}
                        className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-200 transition-colors">
                        <Plus className="w-4 h-4" /> เพิ่มรายการ
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "รายรับทั้งหมด", value: totalIncome, icon: TrendingUp, bg: "bg-green-50", text: "text-green-600", sign: "+" },
                    { label: "รายจ่ายทั้งหมด", value: totalExpense, icon: TrendingDown, bg: "bg-red-50", text: "text-red-600", sign: "-" },
                    { label: "ยอดคืนเงิน", value: totalReturn, icon: RefreshCw, bg: "bg-blue-50", text: "text-blue-600", sign: "+" },
                    { label: "คงเหลือสุทธิ", value: balance, icon: Wallet, bg: balance > 0 ? "bg-emerald-50" : "bg-rose-50", text: balance > 0 ? "text-emerald-700" : "text-rose-700", sign: "" },
                ].map(c => (
                    <div key={c.label} className="bg-white rounded-2xl border border-slate-100 p-5 card-hover">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-3", c.bg)}>
                            <c.icon className={cn("w-5 h-5", c.text)} />
                        </div>
                        <p className={cn("text-2xl font-bold", c.text)}>
                            {c.sign === "-" ? "-" : ""}฿{c.value.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{c.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {([
                    { id: "overview", label: "ภาพรวม", icon: BarChart3 },
                    { id: "transactions", label: `รายการ (${filteredTx.length})`, icon: ClipboardList },
                    { id: "disbursement", label: "เบิกงบตามโครงการ", icon: FolderKanban },
                    ...(!isViewer ? [{ id: "add", label: "เพิ่มรายการ", icon: Plus } as const] : []),
                ] as { id: Tab; label: string; icon: React.ElementType }[]).map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={cn("flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                            tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ─── TAB: OVERVIEW ─── */}
            {tab === "overview" && (
                <div className="space-y-5">
                    {/* Budget usage bar */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-blue-600" /> สรุปงบประมาณ
                        </h3>
                        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden mb-2">
                            <div className="h-full flex">
                                <div className="bg-red-500 h-full transition-all duration-700" style={{ width: `${totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0}%` }} />
                                <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${totalIncome > 0 ? (totalReturn / totalIncome) * 100 : 0}%` }} />
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> รายรับ ฿{totalIncome.toLocaleString()}</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> รายจ่าย ฿{totalExpense.toLocaleString()}</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> คืนเงิน ฿{totalReturn.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Dept breakdown cards */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <h3 className="text-sm font-bold text-slate-800 mb-4">สรุปแยกตามหน่วยงาน</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {deptBreakdown.map(d => {
                                const deptCfg = dbDepartments.find(db => db.id === d.id);
                                const dotColor = deptCfg?.color ? (deptCfg.color.startsWith('bg-') ? deptCfg.color : `bg-${deptCfg.color}-500`) : "bg-slate-400";
                                return (
                                    <div key={d.id} className="bg-slate-50 rounded-xl p-4 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("w-2.5 h-2.5 rounded-full", dotColor)} />
                                            <span className="text-xs font-semibold text-slate-700">{d.name}</span>
                                        </div>
                                        <div className="space-y-1">
                                            {d.income > 0 && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400">รายรับ</span>
                                                    <span className="font-semibold text-green-600">+฿{d.income.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {d.expense > 0 && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400">รายจ่าย</span>
                                                    <span className="font-semibold text-red-600">-฿{d.expense.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {d.returned > 0 && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400">คืน</span>
                                                    <span className="font-semibold text-blue-600">+฿{d.returned.toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                        {(d.expense > 0 || d.income > 0) && (
                                            <div className="pt-1 border-t border-slate-200">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 font-medium">สุทธิ</span>
                                                    <span className="font-bold text-slate-800">฿{d.net.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent transactions */}
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                            <h3 className="text-sm font-semibold text-slate-800">รายการล่าสุด</h3>
                            <button onClick={() => setTab("transactions")} className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700">
                                ดูทั้งหมด <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {transactions.slice(0, 5).map(tx => (
                                <TxRow key={tx.id} tx={tx} onClick={() => setShowDetailTx(tx)} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB: TRANSACTIONS ─── */}
            {tab === "transactions" && (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-50">
                        <div className="relative flex-1 min-w-[200px] max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                placeholder="ค้นหารายการ..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl outline-none bg-slate-50 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <div className="relative">
                                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                    className="text-sm border border-slate-200 rounded-xl px-3 py-2 pr-8 outline-none bg-white text-slate-600 appearance-none">
                                    <option value="all">ทุกประเภท</option>
                                    <option value="รายรับ">รายรับ</option>
                                    <option value="รายจ่าย">รายจ่าย</option>
                                    <option value="คืนเงิน">คืนเงิน</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
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
                        </div>
                        <span className="text-xs text-slate-400 ml-auto">{filteredTx.length} รายการ</span>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">วันที่</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">รายละเอียด</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">หน่วยงาน / โครงการ</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">เอกสารอ้างอิง</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">จำนวนเงิน</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredTx.map(tx => {
                                    const cfg = txConfig[tx.type];
                                    const Icon = cfg.icon;
                                    const doc = findDoc(tx.docRef);
                                    return (
                                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => setShowDetailTx(tx)}>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <CalendarDays className="w-3 h-3" /> {tx.date}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", cfg.lightBg)}>
                                                        <Icon className={cn("w-4 h-4", cfg.color)} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">{tx.description}</p>
                                                        {tx.claimedBy && <p className="text-[11px] text-slate-400">เบิกโดย: {tx.claimedBy}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", getDeptStyle(tx.department).bg, getDeptStyle(tx.department).text)}>{tx.department}</span>
                                                {tx.projectName && (
                                                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                        <FolderKanban className="w-3 h-3" /> {tx.projectName}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {doc ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2 py-1 rounded-lg font-medium">
                                                        <FileText className="w-3 h-3" /> {doc.docNo}
                                                    </span>
                                                ) : tx.docRef ? (
                                                    <span className="text-[11px] text-slate-400">{tx.docRef}</span>
                                                ) : (
                                                    <span className="text-[11px] text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <span className={cn("text-sm font-bold", cfg.color)}>
                                                    {cfg.sign}฿{tx.amount.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <Eye className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors mx-auto" />
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredTx.length === 0 && (
                                    <tr><td colSpan={6} className="text-center py-12 text-sm text-slate-400">ไม่พบรายการตามเงื่อนไข</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── TAB: DISBURSEMENT ─── */}
            {tab === "disbursement" && (
                <div className="space-y-4">
                    {projectDisbursements.map(p => {
                        const pct = p.budget > 0 ? Math.min(Math.round((p.net / p.budget) * 100), 100) : 0;
                        const deptStyle = getDeptStyle(p.department);
                        const dc = `${deptStyle.bg} ${deptStyle.text}`;
                        const isExpanded = expandedProjectId === p.id;

                        return (
                            <div key={p.id} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden transition-all duration-300">
                                {/* Compact Header shown always */}
                                <button 
                                    onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}
                                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors group"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110", dc)}>
                                            <FolderKanban className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-bold text-slate-800 truncate">{p.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", getDeptStyle(p.department).bg, getDeptStyle(p.department).text)}>{p.department}</span>
                                                <span className="text-[11px] text-slate-400 font-medium hidden sm:flex items-center gap-1.5">
                                                    <Users className="w-3 h-3 text-slate-300" /> {p.lead}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 flex-shrink-0">
                                        <div className="text-right hidden sm:block">
                                            <div className="flex items-baseline justify-end gap-1.5">
                                                <span className="text-sm font-black text-slate-800">฿{p.net.toLocaleString()}</span>
                                                <span className="text-[10px] font-bold text-slate-400">/ ฿{p.budget.toLocaleString()}</span>
                                            </div>
                                            <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                                <div className={cn("h-full transition-all duration-1000", pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-blue-500")}
                                                    style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                        
                                        <div className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all", 
                                            pct >= 100 ? "bg-red-50 text-red-600" : pct >= 80 ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-600"
                                        )}>
                                            {pct}%
                                        </div>

                                        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center bg-slate-50 transition-transform duration-300", isExpanded && "rotate-180 bg-blue-50")}>
                                            <ChevronDown className={cn("w-4 h-4 text-slate-400", isExpanded && "text-blue-500")} />
                                        </div>
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                        >
                                            <div className="px-6 pb-6 pt-2 border-t border-slate-50 space-y-6">
                                                {/* Stats Grid */}
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    {[
                                                        { label: "งบประมาณที่อนุมัติ", value: p.budget, color: "blue", prefix: "฿" },
                                                        { label: "เบิกจ่ายจริง (รายจ่าย)", value: p.expense, color: "red", prefix: "-฿" },
                                                        { label: "ยอดคืนเงินคงเหลือ", value: p.returned, color: p.returned > 0 ? "emerald" : "slate", prefix: p.returned > 0 ? "+฿" : "฿" },
                                                    ].map((stat, i) => (
                                                        <div key={i} className={cn("p-4 rounded-2xl border flex flex-col items-center text-center", 
                                                            stat.color === "blue" ? "bg-blue-50/30 border-blue-100" :
                                                            stat.color === "red" ? "bg-red-50/30 border-red-100" :
                                                            stat.color === "emerald" ? "bg-emerald-50/30 border-emerald-100" : "bg-slate-50/30 border-slate-100"
                                                        )}>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                                                            <p className={cn("text-xl font-black", 
                                                                stat.color === "blue" ? "text-blue-600" :
                                                                stat.color === "red" ? "text-red-600" :
                                                                stat.color === "emerald" ? "text-emerald-700" : "text-slate-500"
                                                            )}>
                                                                {stat.value > 0 ? `${stat.prefix}${stat.value.toLocaleString()}` : "—"}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Project Info Bar */}
                                                <div className="flex flex-wrap items-center gap-6 text-[11px] font-bold text-slate-500 bg-slate-50/50 p-4 rounded-2xl">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarDays className="w-4 h-4 text-slate-300" />
                                                        <span>{p.startDate} — {p.endDate}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-slate-300" />
                                                        <span>หัวหน้าโครงการ: {p.lead}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-auto">
                                                        <span className="text-slate-400">สถานะงบประมาณ:</span>
                                                        <span className={cn("px-2 py-0.5 rounded-lg", pct >= 100 ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600")}>
                                                            {pct >= 100 ? "ใช้งบเกินกำหนด" : pct >= 80 ? "ใกล้ครบวงเงิน" : "ปกติ"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Transactions Section */}
                                                <div>
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                                        <Receipt className="w-3.5 h-3.5" /> รายการเดินบัญชีโครงการ ({p.transactions.length})
                                                    </h4>
                                                    {p.transactions.length > 0 ? (
                                                        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                                                            {p.transactions.map(tx => (
                                                                <TxRow key={tx.id} tx={tx} onClick={() => setShowDetailTx(tx)} compact />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                                            <p className="text-xs font-bold text-slate-300 italic">ยังไม่มีรายการเบิกจ่าย</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Documents Section */}
                                                {p.relatedDocs.length > 0 && (
                                                    <div className="pt-2">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                                            <FileText className="w-3.5 h-3.5" /> เอกสารอ้างอิง ({p.relatedDocs.length})
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {p.relatedDocs.map(d => (
                                                                <div key={d.id} className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:border-blue-400 transition-colors cursor-pointer group/doc">
                                                                    <FileText className="w-4 h-4 text-blue-500 group-hover/doc:scale-110 transition-transform" />
                                                                    <span>{d.docNo}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── TAB: ADD TRANSACTION ─── */}
            {tab === "add" && !isViewer && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    <div className="p-6 lg:p-8">
                        <div className="mb-8">
                            <h2 className="text-xl font-black text-slate-800">เพิ่มรายการบันทึกใหม่</h2>
                            <p className="text-xs text-slate-400 mt-1">กรุณากรอกข้อมูลให้ครบถ้วนเพื่อความถูกต้องของระบบงบประมาณ</p>
                        </div>

                        <form onSubmit={handleAdd} className="space-y-6">
                            {/* Main Type Selector */}
                            <div className="grid grid-cols-2 gap-3">
                                {(["รายรับ", "รายจ่าย"] as TxType[]).map(t => {
                                    const cfg = txConfig[t];
                                    const Icon = cfg.icon;
                                    const isActive = form.type === t;
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => {
                                                const subType = t === "รายรับ" ? "central" : t === "รายจ่าย" ? "project" : "refund";
                                                setForm(p => ({ ...p, type: t, subType }));
                                            }}
                                            className={cn("flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all",
                                                isActive
                                                    ? t === "รายรับ" ? "border-green-500 bg-green-50 text-green-700 shadow-md shadow-green-100" : t === "รายจ่าย" ? "border-red-500 bg-red-50 text-red-700 shadow-md shadow-red-100" : "border-blue-500 bg-blue-50 text-blue-700 shadow-md shadow-blue-100"
                                                    : "border-slate-100 text-slate-400 hover:border-slate-300 bg-white")}>
                                            <Icon className={cn("w-6 h-6", isActive ? "" : "text-slate-300")} />
                                            <span className="text-sm font-bold">{t}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Sub-type / Source Selector */}
                            {form.type === "รายรับ" && (
                                <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">แหล่งที่มาของรายรับ</label>
                                    <div className="flex gap-2">
                                        {[
                                            { id: "central", label: "จากบัญชีกลาง" },
                                            { id: "refund", label: "เงินคืนจากโครงการ" }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setForm(p => ({ ...p, subType: opt.id as any }))}
                                                className={cn("flex-1 py-2.5 px-4 rounded-xl text-sm font-bold border-2 transition-all",
                                                    form.subType === opt.id ? "bg-white border-green-500 text-green-700" : "bg-transparent border-slate-200 text-slate-400")}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {form.type === "รายจ่าย" && (
                                <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">ประเภทการเบิกจ่าย</label>
                                    <div className="flex gap-2">
                                        {[
                                            { id: "project", label: "เบิกตามโครงการ" },
                                            { id: "general", label: "เบิกทั่วไป" }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setForm(p => ({ ...p, subType: opt.id as any }))}
                                                className={cn("flex-1 py-2.5 px-4 rounded-xl text-sm font-bold border-2 transition-all",
                                                    form.subType === opt.id ? "bg-white border-red-500 text-red-700" : "bg-transparent border-slate-200 text-slate-400")}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 pt-2">
                                <div>
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">หน่วยงานที่รับผิดชอบ *</label>
                                    <div className="relative">
                                        <select required value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none appearance-none focus:border-blue-500 focus:bg-white transition-all">
                                            <option value="" disabled>เลือกหน่วยงาน...</option>
                                            {dbDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                {(form.subType === "project" || form.subType === "refund") && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">เลือกโครงการ *</label>
                                        <div className="relative">
                                            <select required value={form.projectId} onChange={e => {
                                                const p = projects.find(proj => proj.id === e.target.value);
                                                setForm(prev => ({ ...prev, projectId: e.target.value, departmentId: p?.departmentId || prev.departmentId }));
                                            }}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none appearance-none focus:border-blue-500 focus:bg-white transition-all">
                                                <option value="" disabled>เลือกโครงการที่เกี่ยวข้อง...</option>
                                                {projects
                                                    .filter(p => !form.departmentId || p.departmentId === form.departmentId)
                                                    .map(p => <option key={p.id} value={p.id}>{p.name} (วงเงิน: ฿{p.budget.toLocaleString()})</option>)
                                                }
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                        {form.projectId && (
                                            <div className="mt-3 bg-blue-50/50 rounded-xl p-3 border border-blue-100/50 flex justify-between items-center">
                                                <p className="text-[11px] font-bold text-blue-600">สถานะงบประมาณโครงการ:</p>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-slate-700">
                                                        เบิกแล้ว ฿{projects.find(p => p.id === form.projectId)?.budgetUsed.toLocaleString() || 0} /
                                                        คงเหลือ ฿{( (projects.find(p => p.id === form.projectId)?.budget || 0) - (projects.find(p => p.id === form.projectId)?.budgetUsed || 0) ).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">รายละเอียดรายการ *</label>
                                    <input required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                        placeholder="เช่น งบประมาณประจำปี, เงินทอนโครงการค่าย..."
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">จำนวนเงิน (บาท) *</label>
                                        <input type="number" required min="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                                            placeholder="0.00"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black text-blue-600 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">ผู้เบิก / ผู้รับเงิน</label>
                                        <input value={form.claimedBy} onChange={e => setForm(p => ({ ...p, claimedBy: e.target.value }))}
                                            placeholder="ชื่อจริง-นามสกุล"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" />
                                    </div>
                                </div>

                                {/* Slip Attachment */}
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn("bg-slate-50 rounded-2xl p-5 border-2 border-dashed transition-all group cursor-pointer",
                                        selectedFile ? "border-blue-500 bg-blue-50/30" : "border-slate-200 hover:border-blue-400"
                                    )}
                                >
                                    <div className="flex flex-col items-center justify-center py-2">
                                        <div className={cn("h-12 w-12 rounded-full flex items-center justify-center mb-3 transition-all shadow-sm",
                                            selectedFile ? "bg-blue-500 scale-110" : "bg-white group-hover:scale-110"
                                        )}>
                                            <UploadCloud className={cn("w-6 h-6", selectedFile ? "text-white" : "text-slate-400 group-hover:text-blue-500")} />
                                        </div>
                                        <p className={cn("text-sm font-bold transition-all", selectedFile ? "text-blue-700" : "text-slate-500 group-hover:text-blue-600")}>
                                            {selectedFile ? selectedFile.name : "แนบหลักฐานการโอน (สลิป)"}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {selectedFile ? "คลิกเพื่อเปลี่ยนไฟล์" : "คลิกเพื่ออัปโหลดไฟล์ หรือวางไฟล์ที่นี่"}
                                        </p>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*,application/pdf"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) setSelectedFile(file);
                                            }}
                                        />
                                    </div>
                                </div>

                                {form.subType === "project" && projects.find(p => p.id === form.projectId)?.months && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block text-center">เบิกจ่ายสำหรับเดือน (ถ้าโครงการมีหลายเดือน)</label>
                                        <div className="grid grid-cols-6 gap-2">
                                            {projects.find(p => p.id === form.projectId)?.months?.map(m => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => toggleMonth(m)}
                                                    className={cn("h-11 rounded-xl text-[10px] font-black border-2 transition-all",
                                                        form.months.includes(m) ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-200" : "bg-white border-slate-50 text-slate-400 hover:border-slate-200")}
                                                >
                                                    {THAI_MONTHS[m-1].substring(0, 3)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}


                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">เลขที่เอกสารอ้างอิง</label>
                                        <div className="relative">
                                            <select value={form.docRef} onChange={e => setForm(p => ({ ...p, docRef: e.target.value }))}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none appearance-none focus:border-blue-500 focus:bg-white transition-all">
                                                <option value="">ไม่มีเอกสารอ้างอิง</option>
                                                {documents.map(d => (
                                                    <option key={d.id} value={d.docNo}>{d.docNo} — {d.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">หมายเหตุ</label>
                                        <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                                            placeholder="ระบุเพิ่มเติม..."
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setTab("transactions")}
                                    className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all">
                                    ยกเลิก
                                </button>
                                <button type="submit" disabled={isSubmitting}
                                    className="flex-[2] py-4 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-60 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                    {isSubmitting ? <Loader className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>

        {/* ─── TRANSACTION DETAIL MODAL ─── */}
        {showDetailTx && (
            <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowDetailTx(null)}>
                <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                    <DetailModal tx={showDetailTx} onClose={() => setShowDetailTx(null)} findDoc={findDoc} onDelete={() => handleDelete(showDetailTx.id)} isViewer={isViewer} />
                </div>
            </div>
        )}
    </>
);
}

/* ─── Transaction Row Component ─── */
function TxRow({ tx, onClick, compact }: { tx: BudgetTransaction; onClick: () => void; compact?: boolean }) {
    const cfg = txConfig[tx.type];
    const Icon = cfg.icon;
    return (
        <button onClick={onClick} className="w-full flex items-start gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors text-left group">
            <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", cfg.lightBg)}>
                <Icon className={cn("w-4 h-4", cfg.color)} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{tx.description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                    {!compact && tx.projectName && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{tx.projectName}</span>
                    )}
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", getDeptStyle(tx.department).bg, getDeptStyle(tx.department).text)}>{tx.department}</span>
                    {tx.claimedBy && <span className="text-[11px] text-slate-400">เบิกโดย: {tx.claimedBy}</span>}
                    {tx.docRef && (
                        <span className="text-[10px] text-blue-500 flex items-center gap-0.5"><FileText className="w-3 h-3" />{tx.docRef}</span>
                    )}
                </div>
                {tx.note && <p className="text-[11px] text-slate-400 mt-1 italic">{tx.note}</p>}
            </div>
            <div className="text-right flex-shrink-0">
                <p className={cn("text-base font-bold", cfg.color)}>
                    {cfg.sign}฿{tx.amount.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                    <CalendarDays className="w-3 h-3" /> {tx.date}
                </p>
            </div>
        </button>
    );
}

/* ─── Detail Modal Component ─── */
function DetailModal({ tx, onClose, findDoc, onDelete, isViewer }: { tx: BudgetTransaction; onClose: () => void; findDoc: (ref?: string) => StoredDocument | undefined; onDelete: () => void; isViewer?: boolean }) {
    const cfg = txConfig[tx.type];
    const Icon = cfg.icon;
    const doc = findDoc(tx.docRef);

    return (
        <>
            {/* Header */}
            <div className={cn("p-5", cfg.lightBg)}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-white/80")}>
                            <Icon className={cn("w-5 h-5", cfg.color)} />
                        </div>
                        <div>
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg", cfg.color, cfg.lightBg === "bg-green-50" ? "bg-green-100" : cfg.lightBg === "bg-red-50" ? "bg-red-100" : "bg-blue-100")}>
                                {cfg.label}
                            </span>
                            <p className={cn("text-xl font-bold mt-1", cfg.color)}>
                                {cfg.sign}฿{tx.amount.toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {!isViewer && (
                            <button onClick={onDelete} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-500">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 hover:bg-white/50 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
                <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">รายละเอียด</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{tx.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400">วันที่</p>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400" /> {tx.date}
                        </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400">หน่วยงาน</p>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">{tx.department}</p>
                    </div>
                    {tx.projectName && (
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-[10px] text-slate-400">โครงการ</p>
                            <p className="text-sm font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
                                <FolderKanban className="w-3.5 h-3.5 text-slate-400" /> {tx.projectName}
                            </p>
                        </div>
                    )}
                    {tx.claimedBy && (
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-[10px] text-slate-400">เบิกจ่ายโดย</p>
                            <p className="text-sm font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-400" /> {tx.claimedBy}
                            </p>
                        </div>
                    )}
                    <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400">บันทึกโดย</p>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">{tx.recordedBy}</p>
                    </div>
                </div>

                {/* Document Reference */}
                {(doc || tx.docRef) && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Link2 className="w-3 h-3" /> เอกสารอ้างอิง
                        </p>
                        {doc ? (
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-blue-800">{doc.docNo}</p>
                                    <p className="text-xs text-blue-600 truncate">{doc.name}</p>
                                    <p className="text-[10px] text-blue-400 mt-0.5">{doc.type} · {doc.department} · {doc.uploadedAt}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-blue-700">{tx.docRef}</p>
                        )}
                    </div>
                )}

                {/* Slip Attachment */}
                {tx.slipUrl && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                        <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <UploadCloud className="w-3 h-3" /> หลักฐานการโอน (สลิป)
                        </p>
                        <a 
                            href={getMediaUrl(tx.slipUrl)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-3 bg-white border border-amber-200 rounded-lg p-2.5 hover:shadow-sm transition-all group/slip"
                        >
                            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover/slip:bg-amber-200 transition-colors">
                                <FileText className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-amber-900 truncate">ดูหลักฐานการโอน</p>
                                <p className="text-[10px] text-amber-600 truncate">คลิกเพื่อเปิดไฟล์ในแท็บใหม่</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-amber-400" />
                        </a>
                    </div>
                )}

                {tx.note && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-1">หมายเหตุ</p>
                        <p className="text-sm text-amber-800">{tx.note}</p>
                    </div>
                )}
            </div>
        </>
    );
}
