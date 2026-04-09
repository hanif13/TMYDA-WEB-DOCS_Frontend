"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  FileText, TrendingDown, Users, ArrowUpRight,
  CheckCircle2, Plus, CalendarDays, ChevronRight, 
  Loader, Wallet, Target, Zap, BarChart3, 
  LayoutDashboard, CircleDot, ArrowRight, Banknote, FolderKanban
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { fetchAnnualPlans, fetchTransactions, fetchDocuments, fetchCommitteeMembers, fetchDepartments } from "@/lib/api";
import { Project, StoredDocument, BudgetTransaction, CommitteeMember, Department } from "@/lib/types";
import { useYear } from "@/context/YearContext";
import { getDeptStyle } from "@/lib/dept-styles";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { selectedYear } = useYear();
  const userRole = (session?.user as any)?.role || "VIEWER";
  const isViewer = userRole === "VIEWER" || userRole === "FINANCE";

  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [committees, setCommittees] = useState<CommitteeMember[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedYear) return;

    setLoading(true);
    Promise.all([
      fetchAnnualPlans(selectedYear).catch(() => []),
      fetchDocuments(selectedYear).catch(() => []),
      fetchTransactions(selectedYear).catch(() => []),
      fetchCommitteeMembers(selectedYear).catch(() => []),
      fetchDepartments(selectedYear, 'committee').catch(() => [])
    ]).then(([plansData, docsData, txData, committeeData, deptsData]) => {
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
        step: proj.status as any,
        lead: proj.lead || "-",
        description: proj.description || "-",
        months: proj.months || [],
        completedMonths: proj.completedMonths || [],
        documents: [],
        isUnplanned: proj.isUnplanned,
        actualDate: proj.actualDate,
        actualBudgetExternal: proj.actualBudgetExternal || 0
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
        date: new Date(t.date || t.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }),
        type: t.type === "income" ? "รายรับ" : t.type === "expense" ? "รายจ่าย" : "คืนเงิน",
        description: t.title,
        department: t.department?.name || "",
        projectId: t.projectId || undefined,
        amount: t.amount,
        recordedBy: "ทีมงบประมาณ",
        originalDate: t.date || t.createdAt,
        subType: t.category || "general",
      }));
      setTransactions(mappedTx);
      setCommittees(committeeData || []);
      setDepts(deptsData || []);
    }).finally(() => setLoading(false));
  }, [selectedYear]);

  // --- PROJECT STATS ---
  const totalPlanned = projects.filter(p => !p.isUnplanned).length;
  const totalUnplanned = projects.filter(p => p.isUnplanned).length;
  const totalCompleted = projects.filter(p => p.step === "completed").length;
  const latest3Completed = projects
    .filter(p => p.step === "completed")
    .sort((a,b) => (b.actualDate || "0").localeCompare(a.actualDate || "0"))
    .slice(0, 3);

  // --- FINANCIAL STATS ---
  const totalProjectExpense = transactions.filter(t => t.type === "รายจ่าย" && t.subType === "project").reduce((acc, t) => acc + t.amount, 0);
  const totalReturn = transactions.filter(t => t.type === "คืนเงิน").reduce((acc, t) => acc + t.amount, 0);
  const totalExternalBudget = projects.reduce((acc, p) => acc + (p.actualBudgetExternal || 0), 0);
  const totalActualSpent = (totalProjectExpense - totalReturn) + totalExternalBudget;

  // --- COMMITTEE STATS ---
  const committeeByDept = depts.map(d => ({
    id: d.id,
    name: d.name,
    count: committees.filter(c => c.departmentId === d.id).length,
    style: getDeptStyle(d.name)
  }));

  const stats = [
    {
      name: "โครงการตามแผนงาน", value: totalPlanned.toString(), icon: Target,
      change: `เสร็จแล้ว ${totalCompleted}`, changeType: "success", detail: "โครงการหลักประจำปี",
      bg: "bg-blue-50", text: "text-blue-600"
    },
    {
      name: "โครงการนอกแผนงาน", value: totalUnplanned.toString(), icon: Zap,
      change: "เพิ่มเติม", changeType: "warn", detail: "โครงการเสริมพิเศษ",
      bg: "bg-amber-50", text: "text-amber-600"
    },
    {
      name: "งบประมาณใช้จริงรวม", value: totalActualSpent.toLocaleString(), icon: Banknote,
      change: "฿", changeType: "success", detail: "รวมงบสมทบภายนอก",
      bg: "bg-emerald-50", text: "text-emerald-700"
    },
    {
      name: "เอกสารทั้งหมด", value: documents.length.toString(), icon: FileText,
      change: "รายการ", changeType: "neutral", detail: "ในฐานข้อมูลระบบ",
      bg: "bg-slate-50", text: "text-slate-600"
    },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
      <Loader className="w-8 h-8 animate-spin text-blue-500 mb-4" />
      <p>กำลังโหลดข้อมูลภาพรวม...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
            ภาพรวมองค์กร
          </h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {new Date().toLocaleDateString("th-TH", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {!isViewer && (
          <Link href="/projects" className="flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all active:scale-95 w-full sm:w-fit">
            <Plus className="w-4 h-4" />
            จัดการโครงการ
          </Link>
        )}
      </div>

      {/* Tier 1: Core Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 p-4 sm:p-6 relative overflow-hidden group transition-all duration-500">
            <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-[0.03] transition-transform duration-700", stat.bg)} />
            
            <div className="relative z-10">
              <div className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-sm", stat.bg)}>
                <stat.icon className={cn("w-5 h-5 sm:w-6 sm:h-6", stat.text)} />
              </div>
              
              <div className="space-y-1">
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5 line-clamp-1">{stat.name}</p>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-none truncate max-w-full">{stat.value}</h2>
                  <span className={cn("text-[8px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.5 rounded-md uppercase tracking-tighter flex-shrink-0", stat.bg, stat.text)}>
                    {stat.change}
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                  <CircleDot className="w-2 h-2 sm:w-2.5 sm:h-2.5 opacity-50 flex-shrink-0" />
                  <span className="truncate">{stat.detail}</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier 2: Project Insights & Latest Completed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Analytics Card */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">วิเคราะห์สถานะโครงการ</h3>
                <p className="text-xs text-slate-400 mt-1">สัดส่วนโครงการของปีงบประมาณ {selectedYear}</p>
              </div>
              <div className="h-10 w-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">โครงการตามแผนงาน</span>
                    <span className="text-lg font-black text-blue-600">{totalPlanned}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${projects.length > 0 ? (totalPlanned / projects.length) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">โครงการนอกแผนงาน</span>
                    <span className="text-lg font-black text-amber-600">{totalUnplanned}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${projects.length > 0 ? (totalUnplanned / projects.length) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">ดำเนินการเสร็จสิ้น</span>
                    <span className="text-lg font-black text-emerald-600">{totalCompleted}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${projects.length > 0 ? (totalCompleted / projects.length) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 bg-slate-50/50 rounded-[2rem] p-6 border border-slate-100 flex flex-col justify-center">
                <h4 className="text-xs font-black text-slate-700 mb-4 flex items-center gap-2 uppercase tracking-widest">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  โครงการที่เสร็จสิ้นล่าสุด
                </h4>
                <div className="space-y-3">
                  {latest3Completed.length > 0 ? latest3Completed.map(proj => (
                    <Link 
                      key={proj.id} 
                      href={`/completed-projects?id=${proj.id}`}
                      className="bg-white p-4 rounded-3xl flex items-center justify-between border border-transparent shadow-sm hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xs shadow-inner uppercase", getDeptStyle(proj.department).bg)}>
                          <span className={getDeptStyle(proj.department).text}>
                            {proj.department.substring(0, 2)}
                          </span>
                        </div>
                        <div className="min-w-0 pr-4">
                          <p className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors leading-tight mb-1">{proj.name}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <CalendarDays className="w-3 h-3" />
                            {proj.actualDate || proj.endDate}
                          </div>
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  )) : (
                    <div className="text-center py-8 text-slate-400 text-xs italic">ยังไม่มีโครงการที่บันทึกว่าเสร็จสิ้น</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Committee Breakdown Section */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">บุคลากรแยกตามหน่วยงาน</h3>
                <p className="text-xs text-slate-400 mt-1">สัดส่วนคณะกรรมการใน {depts.length} หน่วยงานหลัก</p>
              </div>
              <div className="h-10 w-10 bg-violet-50 rounded-2xl flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {committeeByDept.map((dept) => (
                <div key={dept.id} className={cn("p-6 rounded-[2rem] border text-center space-y-2 group transition-all duration-300", dept.style.bg.replace('bg-', 'bg-opacity-10 bg-'), "border-slate-100")}>
                  <p className={cn("text-3xl font-black leading-none", dept.style.text)}>{dept.count}</p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 line-clamp-1">{dept.name}</p>
                  <div className="w-8 h-1 mx-auto bg-current opacity-20 rounded-full group-hover:w-12 transition-all duration-300" />
                </div>
              ))}
              {committeeByDept.length === 0 && (
                <div className="col-span-full py-8 text-center text-slate-400 text-xs italic">ไม่พบข้อมูลหน่วยงานคณะกรรมการ</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Recent Documents (Moved back to side) */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm h-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">เอกสารล่าสุดในระบบ</h3>
              <FileText className="w-4 h-4 text-slate-300" />
            </div>
            
            <div className="space-y-5">
              {documents.slice(0, 8).map(doc => (
                <div key={doc.id} className="flex items-start gap-3 group cursor-default">
                  <div className="h-8 w-8 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 transition-colors shadow-sm">
                    <FileText className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 leading-snug mb-1 group-hover:text-blue-600 transition-colors">{doc.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-400 font-medium">{doc.uploadedAt}</span>
                      <span className="w-1 h-1 bg-slate-200 rounded-full" />
                      <span className="text-[9px] text-blue-500 font-black uppercase tracking-tighter">{doc.type}</span>
                    </div>
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-slate-400 text-xs italic">ไม่มีรายการเอกสาร</p>
                </div>
              )}
            </div>
            
            <Link href="/documents" className="mt-8 shadow-sm block text-center py-3 bg-slate-50 hover:bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 rounded-xl transition-all border border-slate-100 active:scale-95">
              ดูเอกสารทั้งหมด
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
