"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  FileText, FolderKanban, TrendingDown, Users, ArrowUpRight,
  ArrowDownRight, CheckCircle2, Clock, AlertCircle, Plus,
  MoreHorizontal, CalendarDays, ChevronRight, CircleDot, Loader, Wallet
} from "lucide-react";
import Link from "next/link";
import { fetchAnnualPlans, fetchTransactions, fetchDocuments, fetchUsers } from "@/lib/api";
import { Project, StoredDocument, BudgetTransaction } from "@/lib/types";
import { useYear } from "@/context/YearContext";
import { getDeptStyle } from "@/lib/dept-styles";

const statusConfig: Record<string, { label: string, className: string }> = {
  planning: { label: "Planning", className: "badge-draft" },
  approval: { label: "รออนุมัติ", className: "badge-pending" },
  execution: { label: "ดำเนินการ", className: "badge-approved" },
  evaluation: { label: "ประเมินผล", className: "badge-done" },
  done: { label: "เสร็จสิ้น", className: "bg-slate-100 text-slate-500" },
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const { selectedYear } = useYear();
  const userRole = (session?.user as any)?.role || "VIEWER";
  const isViewer = userRole === "VIEWER" || userRole === "FINANCE";

  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedYear) return;

    setLoading(true);
    Promise.all([
      fetchAnnualPlans(selectedYear).catch(() => []),
      fetchDocuments(selectedYear).catch(() => []),
      fetchTransactions(selectedYear).catch(() => []),
      fetchUsers().catch(() => [])
    ]).then(([plansData, docsData, txData, usersData]) => {
      // Filter projects by the selected year's plan
      const targetPlan = plansData.find((p: any) => p.thaiYear === selectedYear);
      const allProjects: Project[] = (targetPlan?.projects || []).map((proj: any) => ({
        id: proj.id,
        name: proj.name,
        department: proj.department?.name || "",
        budget: proj.budget,
        budgetUsed: proj.budgetUsed || 0,
        status: proj.status || "planning",
        startDate: proj.startDate || "-",
        endDate: proj.endDate || "-",
        step: proj.step || "planning",
        lead: proj.lead || "-",
        description: proj.description || "-",
        months: proj.months || 0,
        completedMonths: proj.completedMonths || [],
        documents: []
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
        projectId: d.projectId
      }));
      setDocuments(mappedDocs);

      const mappedTx: BudgetTransaction[] = txData.map((t: any) => ({
        id: t.id,
        date: new Date(t.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }),
        type: t.type === "income" ? "รายรับ" : t.type === "expense" ? "รายจ่าย" : "คืนเงิน",
        description: t.title,
        department: t.department?.name || "",
        projectId: t.projectId || undefined,
        amount: t.amount,
        recordedBy: "ทีมงบประมาณ",
      }));
      setTransactions(mappedTx);
      setUsersCount(usersData?.length || 0);
    }).finally(() => setLoading(false));
  }, [selectedYear]);

  const totalIncome = transactions.filter(t => t.type === "รายรับ").reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "รายจ่าย").reduce((acc, t) => acc + t.amount, 0);
  const totalReturn = transactions.filter(t => t.type === "คืนเงิน").reduce((acc, t) => acc + t.amount, 0);
  
  const totalBudget = totalIncome;
  const totalUsed = totalExpense - totalReturn;
  const remainingBudget = totalIncome - totalUsed;
  const budgetUsedPct = totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;

  const stats = [
    {
      name: "โครงการทั้งหมด", value: projects.length.toString(), icon: FolderKanban,
      change: "+0", changeType: "up", detail: "โครงการในระบบ",
      color: "from-blue-500 to-blue-600", bg: "bg-blue-50", text: "text-blue-600"
    },
    {
      name: "เอกสารทั้งหมด", value: documents.length.toString(), icon: FileText,
      change: "+0", changeType: "up", detail: "เอกสารในระบบ",
      color: "from-amber-500 to-orange-500", bg: "bg-amber-50", text: "text-amber-600"
    },
    {
      name: "ผู้ใช้งานระบบ", value: usersCount.toString(), icon: Users,
      change: "+0", changeType: "up", detail: "ผู้ใช้งานที่ลงทะเบียน",
      color: "from-violet-500 to-purple-600", bg: "bg-violet-50", text: "text-violet-600"
    },
    {
      name: "งบใช้ไปแล้ว (บาท)", value: totalUsed.toLocaleString(), icon: TrendingDown,
      change: `${budgetUsedPct}%`, changeType: "warn", detail: "ของงบทั้งหมด",
      color: "from-rose-500 to-red-500", bg: "bg-rose-50", text: "text-rose-600"
    },
    {
      name: "งบประมาณคงเหลือ", value: remainingBudget.toLocaleString(), icon: Wallet,
      change: `${100 - budgetUsedPct}%`, changeType: "up", detail: "ของงบทั้งหมด",
      color: "from-emerald-500 to-green-500", bg: "bg-emerald-50", text: "text-emerald-600"
    },
  ];

  const recentProjects = projects.slice(-5).reverse();
  const recentDocs = documents.slice(0, 5);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
      <Loader className="w-8 h-8 animate-spin text-blue-500 mb-4" />
      <p>กำลังโหลดข้อมูลภาพรวม...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ภาพรวมองค์กร</h1>
          <p className="text-sm text-slate-500 mt-0.5">{new Date().toLocaleDateString("th-TH", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {!isViewer && (
          <Link href="/documents">
            <button className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
              <Plus className="w-4 h-4" />
              สร้างเอกสาร
            </button>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat, i) => (
          <div
            key={stat.name}
            className="bg-white rounded-2xl border border-slate-100 p-5 card-hover"
            style={{ animationDelay: `${i * 75}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.text}`} />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold">
                {stat.changeType === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />}
                {stat.changeType === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-green-500" />}
                {stat.changeType === 'warn' && <CircleDot className="w-3.5 h-3.5 text-amber-500" />}
                <span className={stat.changeType === 'warn' ? 'text-amber-600' : 'text-green-600'}>{stat.change}</span>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.name}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-50">
              <p className="text-[11px] text-slate-400">{stat.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Budget Usage Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">การใช้งบประมาณรวม</h3>
            <p className="text-xs text-slate-400">งบรวม ฿{totalBudget.toLocaleString()} · ใช้ไปแล้ว ฿{totalUsed.toLocaleString()} · <span className="text-emerald-600 font-medium">คงเหลือ ฿{remainingBudget.toLocaleString()}</span></p>
          </div>
          <Link href="/budget" className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700">
            รายละเอียด <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000 relative"
            style={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
          </div>
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
          <span>0 บาท</span>
          <span className="text-amber-600 font-medium">ใช้ไปแล้ว {budgetUsedPct}%</span>
          <span>{totalBudget.toLocaleString()} บาท</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Projects Table */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h3 className="text-sm font-semibold text-slate-800">โครงการล่าสุด</h3>
            <Link href="/projects" className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700">
              ดูทั้งหมด <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {recentProjects.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-slate-500">ยังไม่มีโครงการ</li>
            ) : recentProjects.map((project) => {
              const status = statusConfig[project.step] || statusConfig.planning;
              const deptStyle = getDeptStyle(project.department);
              const deptColor = `${deptStyle.bg} ${deptStyle.text}`;
              return (
                <li key={project.id} className="px-5 py-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{project.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${deptColor}`}>
                          {project.department}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" /> {project.startDate}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-semibold text-slate-600">฿{project.budget.toLocaleString()}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Activity Feed / Documents */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h3 className="text-sm font-semibold text-slate-800">เอกสารล่าสุด</h3>
            <Link href="/registry" className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
              <MoreHorizontal className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {recentDocs.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-slate-500">ยังไม่มีเอกสาร</li>
            ) : recentDocs.map((doc, i) => (
              <li key={doc.id} className="px-5 py-3.5 flex items-start gap-3">
                <div className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-blue-500 bg-blue-50">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 leading-snug truncate">{doc.docNo} — {doc.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">ผู้อัปโหลด: {doc.uploadedBy}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
