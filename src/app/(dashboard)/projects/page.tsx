"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import {
    CheckCircle2, Clock, UploadCloud, Archive, FileEdit, ChevronRight,
    CalendarDays, Users, Banknote, AlertCircle, Loader, Plus, FileText,
    Download, Eye, X, ChevronDown, Trash2, CalendarHeart, ClipboardList,
    ExternalLink, MapPin, Target, LayoutDashboard, RefreshCcw, Calendar, Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DOC_TYPES } from "@/lib/constants";
import { Project, ProjectDocument, AnnualPlan, ProjectStep, Department } from "@/lib/types";
import { fetchAnnualPlans, updateProject, fetchDocuments, linkDocumentToProject, createProject, fetchDepartments, API_BASE_URL, getMediaUrl } from "@/lib/api";
import { useYear } from "@/context/YearContext";

const PROJECT_TYPE_OPTIONS = [
    "ประชุม/สัมมนา",
    "โครงการต่อเนื่อง",
    "โครงการใหญ่",
    "รายการออนไลน์",
    "จัดซื้อพัสดุ อุปกรณ์ เครื่องมือ",
    "อื่น ๆ (ไม่ต้องระบุ)"
];

const THAI_MONTHS_SHORT = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

const docTypeColors: Record<string, string> = {
    "ประเภทเอกสารโครงการ": "bg-blue-100 text-blue-700",
    "ประเภทเอกสารรายงานผลการดำเนินโครงการ": "bg-green-100 text-green-700",
    "ประเภทเอกสารประกาศหรือคำสั่ง": "bg-rose-100 text-rose-700",
    "ประเภทเอกสารภายใน": "bg-amber-100 text-amber-700",
    "ประเภทเอกสารภายนอก": "bg-pink-100 text-pink-700",
    "อื่นๆ": "bg-slate-100 text-slate-600",
};

export default function ProjectsPage() {
    const { data: session } = useSession();
    const { selectedYear } = useYear();
    const userRole = (session?.user as any)?.role || "VIEWER";
    const isViewer = userRole === "VIEWER" || userRole === "FINANCE";
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [annualPlans, setAnnualPlans] = useState<AnnualPlan[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [allRegistryDocs, setAllRegistryDocs] = useState<any[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    
    // Form & Modal States
    const [showNewProject, setShowNewProject] = useState(false);
    const [showUnplannedForm, setShowUnplannedForm] = useState(false);
    const [showPlannedForm, setShowPlannedForm] = useState(false);
    const [selectedAnnualPlanId, setSelectedAnnualPlanId] = useState("");
    const [isSubmittingPj, setIsSubmittingPj] = useState(false);
    const [filterDept, setFilterDept] = useState("");

    const [unplannedForm, setUnplannedForm] = useState({ 
        name: "", 
        department: "", 
        subDepartment: "",
        projectType: PROJECT_TYPE_OPTIONS[0],
        budget: "", 
        lead: "", 
        reason: "",
        months: [] as number[]
    });

    // Initialize unplanned form when departments are loaded
    useEffect(() => {
        if (departments.length > 0 && !unplannedForm.department) {
            setUnplannedForm(prev => ({
                ...prev,
                department: departments[0].name,
                subDepartment: departments[0].subDepts[0] || ""
            }));
        }
    }, [departments]);

    const refreshData = async () => {
        setIsLoading(true);
        try {
            const [data, deptsData, docsData] = await Promise.all([
                fetchAnnualPlans(),
                fetchDepartments(),
                fetchDocuments(selectedYear || undefined)
            ]);
            
            setDepartments(deptsData);
            setAllRegistryDocs(docsData);

            const mappedPlans: AnnualPlan[] = data.map((p: any) => ({
                id: p.id,
                thaiYear: p.thaiYear,
                label: p.label,
                totalBudget: p.totalBudget,
                totalUsed: p.totalUsed,
                projects: (p.projects || []).map((proj: any) => ({
                    id: proj.id,
                    name: proj.name,
                    department: proj.department?.name || "",
                    quarter: proj.quarter,
                    budget: proj.budget,
                    budgetUsed: proj.budgetUsed,
                    status: proj.status,
                    lead: proj.lead,
                    projectType: proj.projectType,
                    startDate: proj.startDate || "",
                    endDate: proj.endDate || "",
                    description: proj.description || "",
                    kpi: proj.kpi,
                    participantTarget: proj.targetPax,
                    participantActual: proj.actualPax,
                    months: proj.months || [],
                    completedMonths: proj.completedMonths || [],
                    isStarted: proj.isStarted || false,
                    externalBudget: proj.actualBudgetExternal || 0,
                    documents: proj.documents || [],
                })),
            }));
            const filteredPlans = mappedPlans.filter(p => !selectedYear || p.thaiYear === selectedYear);
            setAnnualPlans(filteredPlans);

            const allStarted = filteredPlans.flatMap(plan => 
                plan.projects
                    .filter(proj => proj.isStarted) 
                    .map(proj => ({
                        id: proj.id,
                        name: proj.name,
                        department: proj.department,
                        subDepartment: proj.subDepartment,
                        projectType: proj.projectType,
                        step: proj.status as ProjectStep,
                        budget: proj.budget,
                        budgetUsed: proj.budgetUsed,
                        externalBudget: proj.externalBudget,
                        lead: proj.lead,
                        startDate: proj.startDate,
                        endDate: proj.endDate,
                        description: proj.description,
                        status: proj.status,
                        isUnplanned: proj.isUnplanned,
                        months: proj.months || [],
                        completedMonths: proj.completedMonths || [],
                        documents: (proj.documents || []).map((d: any) => ({
                            id: d.id,
                            docNo: d.docNo,
                            name: d.name,
                            type: d.category?.name || d.type,
                            uploadedBy: d.uploadedBy?.name || "ผู้ใช้งาน",
                            uploadedAt: new Date(d.createdAt).toLocaleDateString("th-TH"),
                            fileUrl: d.filePath || undefined
                        })) 
                    }))
            );
            setProjects(allStarted);
        } catch (err) {
            console.error("Refresh error:", err);
            toast.error("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedYear) {
            refreshData();
        }
    }, [selectedYear]);

    const toggleUnplannedMonth = (m: number) => {
        setUnplannedForm(prev => {
            const newMonths = prev.months.includes(m)
                ? prev.months.filter(x => x !== m)
                : [...prev.months, m];
            return { ...prev, months: newMonths };
        });
    };

    const handleCreateUnplanned = async (e: React.FormEvent) => {
        e.preventDefault();
        if (annualPlans.length === 0) return toast.error("กรุณาสร้างแผนงานประจำปีก่อน");
        const latestPlan = annualPlans[0];
        const dept = departments.find(d => d.name === unplannedForm.department);
        if (!dept) return toast.error("ไม่พบข้อมูลหน่วยงาน");

        setIsSubmittingPj(true);
        try {
            await createProject({
                name: unplannedForm.name,
                departmentId: dept.id,
                subDepartment: unplannedForm.subDepartment,
                projectType: unplannedForm.projectType,
                lead: unplannedForm.lead,
                budget: Number(unplannedForm.budget) || 0,
                quarter: 1,
                annualPlanId: latestPlan.id,
                thaiYear: selectedYear || 2569,
                months: unplannedForm.months,
                isUnplanned: true,
                status: "in_progress"
            });
            toast.success("สร้างโครงการนอกแผนงานสำเร็จ!", { icon: "🚀" });
            setShowUnplannedForm(false);
            setUnplannedForm({ 
                name: "", 
                department: departments.length > 0 ? departments[0].name : "", 
                subDepartment: (departments.length > 0 && departments[0].subDepts.length > 0) ? departments[0].subDepts[0] : "",
                projectType: PROJECT_TYPE_OPTIONS[0], budget: "", lead: "", reason: "", months: []
            });
            refreshData();
        } catch (error) {
            toast.error("ไม่สามารถสร้างโครงการได้");
        } finally {
            setIsSubmittingPj(false);
        }
    };

    const handleCreatePlanned = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!selectedAnnualPlanId) return toast.error("กรุณาเลือกโครงการ");
        setIsSubmittingPj(true);
        try {
            await updateProject(selectedAnnualPlanId, { isStarted: true, status: "in_progress" });
            setShowPlannedForm(false);
            setSelectedAnnualPlanId("");
            toast.success("เริ่มดำเนินงานโครงการตามแผนงานแล้ว!", { icon: "🚀" });
            refreshData();
        } catch (error) {
            toast.error("ไม่สามารถเริ่มโครงการได้");
        } finally {
            setIsSubmittingPj(false);
        }
    };

    const renderStatusColumn = (status: ProjectStep, title: string, color: string, icon: React.ReactNode) => {
        const filteredList = projects.filter(p => p.step === status && (!filterDept || p.department === filterDept));
        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", color)} />
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
                    </div>
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-lg">{filteredList.length}</span>
                </div>
                <div className="space-y-3 min-h-[400px] p-2 rounded-[2rem] bg-slate-50/50 border border-slate-100/50 transition-all">
                    {filteredList.map(p => (
                        <div key={p.id} onClick={() => setSelectedId(p.id)}
                            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group active:scale-[0.98]">
                            <h4 className="text-sm font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">{p.name}</h4>
                            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-400">{p.department}</span>
                                {p.subDepartment && <span className="text-[9px] font-bold text-slate-300 italic">({p.subDepartment})</span>}
                                <span className="text-slate-200">·</span>
                                <span className="text-[10px] font-bold text-blue-600">฿{p.budget.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                    <Users className="w-3 h-3 text-slate-300" /> {p.lead}
                                </span>
                                {p.isUnplanned && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-md">Urgent</span>
                                )}
                                {p.step === "in_progress" && p.months.length > 0 && p.months.every(m => p.completedMonths?.includes(m)) && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded-md flex items-center gap-1 animate-pulse">
                                        <CheckCircle2 className="w-2.5 h-2.5" /> ดำเนินการเสร็จสิ้น
                                    </span>
                                )}
                            </div>
                            {p.months.length > 0 && (
                                <div className="mt-3 flex items-center gap-1.5 bg-blue-50/50 px-2.5 py-1 rounded-xl border border-blue-100/20 shadow-sm transition-all group-hover:bg-blue-50/80">
                                    <CalendarDays className="w-3 h-3 text-blue-400/70" />
                                    <div className="flex items-center gap-0.5 min-w-[60px]">
                                        {p.months.length === 12 ? (
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">ตลอดทั้งปี (12 เดือน)</span>
                                        ) : p.months.length > 4 ? (
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                                                {THAI_MONTHS_SHORT[p.months[0]-1]} - {THAI_MONTHS_SHORT[p.months[p.months.length-1]-1]} ({p.months.length} เดือน)
                                            </span>
                                        ) : (
                                            p.months.map((m, idx) => (
                                                <React.Fragment key={m}>
                                                    <span
                                                        className={cn(
                                                            "text-[9px] font-black px-1.5 py-0.5 rounded-md transition-all",
                                                            p.completedMonths?.includes(m)
                                                                ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-500/50"
                                                                : "text-slate-500 bg-slate-100/50"
                                                        )}
                                                    >
                                                        {THAI_MONTHS_SHORT[m - 1]}
                                                    </span>
                                                    {idx < p.months.length - 1 && <span className="text-[8px] text-slate-200 mx-0.5">•</span>}
                                                </React.Fragment>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredList.length === 0 && (
                        <div className="h-40 flex flex-col items-center justify-center text-slate-300">
                            <Archive className="w-8 h-8 opacity-20 mb-2" />
                            <p className="text-[10px] font-medium italic">ยังไม่มีโครงการในขั้นนี้</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <LayoutDashboard className="w-6 h-6 text-blue-600" />
                        ดำเนินโครงการ
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">จัดการโครงการที่กำลังดำเนินการและสรุปผลตามลำดับขั้นตอน</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group min-w-[180px]">
                        <select 
                            value={filterDept} 
                            onChange={e => setFilterDept(e.target.value)}
                            className="w-full appearance-none bg-white border border-slate-200 rounded-2xl px-5 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all pr-10 cursor-pointer text-slate-700 shadow-sm hover:shadow-md hover:border-blue-200"
                        >
                            <option value="">ทุกหน่วยงาน</option>
                            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-blue-500 transition-colors" />
                    </div>
                    <button onClick={() => refreshData()} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl transition-all group shadow-sm hover:shadow-md" title="รีเฟรชข้อมูล">
                        <RefreshCcw className={cn("w-5 h-5 text-slate-400 group-hover:text-blue-600", isLoading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Main Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Add Project Button Card */}
                {!isViewer && (
                    <button 
                        onClick={() => setShowNewProject(true)}
                        className="group h-[180px] bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center gap-3 active:scale-95 shadow-sm hover:shadow-md mt-6"
                    >
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                            <Plus className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-slate-600 group-hover:text-blue-700">เริ่มโครงการใหม่</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Planned / Unplanned</p>
                        </div>
                    </button>
                )}

                {/* 2. In Progress Projects */}
                {renderStatusColumn("in_progress", "กำลังดำเนินงาน", "bg-green-500", <UploadCloud className="w-4 h-4" />)}

                {/* 3. Waiting Summary Projects */}
                {renderStatusColumn("waiting_summary", "รอสรุปผลดำเนินงาน", "bg-amber-500", <Clock className="w-4 h-4" />)}

                {/* 4. Completed Projects */}
                {renderStatusColumn("completed", "เสร็จสิ้นสมบูรณ์", "bg-purple-500", <CheckCircle2 className="w-4 h-4" />)}
            </div>

            {/* Project Detail Modal */}
            {selectedId && <ProjectDetailModal 
                id={selectedId} 
                onClose={() => setSelectedId("")} 
                onUpdate={() => { setSelectedId(""); refreshData(); }}
                allDocs={allRegistryDocs}
                departments={departments}
            />}

            {/* Selection Modal: Planned vs Unplanned */}
            {showNewProject && (
                <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">เริ่มโครงการใหม่</h3>
                                <p className="text-sm text-slate-500 mt-1">กรุณาเลือกรูปแบบของโครงการที่คุณต้องการดำเนินการ</p>
                            </div>
                            <button onClick={() => setShowNewProject(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button onClick={() => { setShowNewProject(false); setShowPlannedForm(true); }}
                                className="group relative overflow-hidden rounded-[2rem] border-2 border-slate-100 hover:border-blue-400 p-6 text-left transition-all hover:shadow-xl hover:shadow-blue-50 bg-white">
                                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <CalendarHeart className="w-5 h-5 text-blue-600" />
                                </div>
                                <h4 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">โครงการตามแผนงาน</h4>
                                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">โครงการที่บรรจุในแผนปีแล้ว</p>
                            </button>

                            <button onClick={() => { setShowNewProject(false); setShowUnplannedForm(true); }}
                                className="group relative overflow-hidden rounded-[2rem] border-2 border-slate-100 hover:border-amber-400 p-6 text-left transition-all hover:shadow-xl hover:shadow-amber-50 bg-white">
                                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <ClipboardList className="w-5 h-5 text-amber-600" />
                                </div>
                                <h4 className="font-bold text-slate-800 group-hover:text-amber-700 transition-colors">โครงการนอกแผนงาน</h4>
                                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">โครงการเร่งด่วนที่เกิดขึ้นใหม่</p>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unplanned & Planned Forms */}
            {showUnplannedForm && (
                <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl relative animate-in fade-in zoom-in duration-300 my-auto">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 rounded-t-[3rem]">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">สร้างโครงการนอกแผนงาน</h3>
                                <p className="text-slate-400 text-xs mt-1">กรอกข้อมูลโครงการเร่งด่วนเพื่อเริ่มดำเนินการทันที</p>
                            </div>
                            <button onClick={() => setShowUnplannedForm(false)} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUnplanned} className="p-8 space-y-6">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ชื่อโครงการ *</label>
                                    <input 
                                        required 
                                        placeholder="เช่น โครงการช่วยเหลือผู้ประสบภัย..."
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" 
                                        value={unplannedForm.name} 
                                        onChange={e => setUnplannedForm({...unplannedForm, name: e.target.value})} 
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">หน่วยงาน *</label>
                                        <select 
                                            required 
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none cursor-pointer" 
                                            value={unplannedForm.department} 
                                            onChange={e => {
                                                const deptName = e.target.value;
                                                const d = departments.find(x => x.name === deptName);
                                                setUnplannedForm({
                                                    ...unplannedForm, 
                                                    department: deptName, 
                                                    subDepartment: d?.subDepts[0] || ""
                                                });
                                            }}
                                        >
                                            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ฝ่าย/กลุ่มงาน</label>
                                        <select 
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none cursor-pointer" 
                                            value={unplannedForm.subDepartment} 
                                            onChange={e => setUnplannedForm({...unplannedForm, subDepartment: e.target.value})}
                                        >
                                            {departments.find(d => d.name === unplannedForm.department)?.subDepts.map(sd => (
                                                <option key={sd} value={sd}>{sd}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ประเภทโครงการ</label>
                                        <select 
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none cursor-pointer" 
                                            value={unplannedForm.projectType} 
                                            onChange={e => setUnplannedForm({...unplannedForm, projectType: e.target.value})}
                                        >
                                            {PROJECT_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ผู้รับผิดชอบ *</label>
                                        <input 
                                            required 
                                            placeholder="ระบุชื่อผู้รับผิดชอบ..."
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" 
                                            value={unplannedForm.lead} 
                                            onChange={e => setUnplannedForm({...unplannedForm, lead: e.target.value})} 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">งบประมาณจัดสรร (บาท) *</label>
                                    <input 
                                        required 
                                        type="number" 
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" 
                                        value={unplannedForm.budget} 
                                        onChange={e => setUnplannedForm({...unplannedForm, budget: e.target.value})} 
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">คร่อมเดือน (เลือกทุกเดือนที่ดำเนินการ)</label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <button key={m} type="button" onClick={() => toggleUnplannedMonth(m)}
                                                className={cn("h-11 rounded-xl text-[10px] font-black transition-all border-2", unplannedForm.months.includes(m) ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-white border-slate-50 text-slate-400 hover:border-slate-200")}>
                                                {THAI_MONTHS_SHORT[m-1]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowUnplannedForm(false)} className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all">ยกเลิก</button>
                                <button type="submit" disabled={isSubmittingPj} className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl text-sm font-bold shadow-xl shadow-slate-900/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isSubmittingPj ? <Loader className="w-4 h-4 animate-spin" /> : "สร้างโครงการและเริ่มดำเนินการ"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showPlannedForm && (
                <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300 my-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">เลือกโครงการตามแผนปี</h3>
                                <p className="text-sm text-slate-500 mt-1">ค้นหาโครงการที่วางแผนไว้เพื่อเริ่มดำเนินงาน</p>
                            </div>
                            <button onClick={() => setShowPlannedForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleCreatePlanned} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">หน่วยงาน</label>
                                <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" value={filterDept} onChange={e => { setFilterDept(e.target.value); setSelectedAnnualPlanId(""); }}>
                                    <option value="">ทั้งหมด</option>
                                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">โครงการในแผนงาน *</label>
                                <select required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" value={selectedAnnualPlanId} onChange={e => setSelectedAnnualPlanId(e.target.value)}>
                                    <option value="" disabled>เลือกโครงการ...</option>
                                    {annualPlans.map(plan => {
                                        const filteredProj = plan.projects.filter(p => !p.isStarted && (!filterDept || p.department === filterDept));
                                        if (filteredProj.length === 0) return null;
                                        return (
                                            <optgroup key={plan.id} label={`ปีงบประมาณ ${plan.thaiYear}`}>
                                                {filteredProj.map(p => <option key={p.id} value={p.id}>{p.name} (฿{p.budget.toLocaleString()})</option>)}
                                            </optgroup>
                                        );
                                    })}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowPlannedForm(false)} className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all">ยกเลิก</button>
                                <button type="submit" disabled={isSubmittingPj || !selectedAnnualPlanId} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl text-sm font-bold shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isSubmittingPj ? <Loader className="w-4 h-4 animate-spin" /> : "ดึงข้อมูลและเริ่มดำเนินการ"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function ProjectDetailModal({ id, onClose, onUpdate, allDocs, departments }: { id: string, onClose: () => void, onUpdate: () => void, allDocs: any[], departments: Department[] }) {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || "VIEWER";
    const isViewer = userRole === "VIEWER" || userRole === "FINANCE";
    const [project, setProject] = useState<Project | null>(null);
    const [tab, setTab] = useState<"info" | "docs">("info");
    const [isLoading, setIsLoading] = useState(true);
    const [showLinkDoc, setShowLinkDoc] = useState(false);
    const [selectedRegistryDocId, setSelectedRegistryDocId] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [linkFilterDept, setLinkFilterDept] = useState("");
    const [linkFilterCategory, setLinkFilterCategory] = useState("");
    const [reportText, setReportText] = useState("");
    const [actualDateText, setActualDateText] = useState("");
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    
    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: "",
        lead: "",
        projectType: "",
        budget: "",
        subDepartment: "",
        externalBudget: "",
        months: [] as number[]
    });

    const fetchProject = async () => {
        setIsLoading(true);
        try {
            const data = await fetchAnnualPlans();
            const all = data.flatMap((plan: any) => plan.projects);
            const found = all.find((p: any) => p.id === id);
            if (found) {
                setProject({
                    id: found.id,
                    name: found.name,
                    department: found.department?.name || "",
                    subDepartment: found.subDepartment,
                    projectType: found.projectType,
                    step: found.status as ProjectStep,
                    budget: found.budget,
                    lead: found.lead,
                    startDate: found.startDate || "",
                    endDate: found.endDate || "",
                    description: found.description || "",
                    months: found.months || [],
                    completedMonths: found.completedMonths || [],
                    documents: (found.documents || []).map((d: any) => ({
                        id: d.id,
                        docNo: d.docNo,
                        name: d.name,
                        type: d.category?.name || d.type,
                        uploadedBy: d.uploadedBy?.name || "ผู้ใช้งาน",
                        uploadedAt: new Date(d.createdAt).toLocaleDateString("th-TH"),
                        fileUrl: d.filePath || undefined
                    })),
                    actualDate: found.actualDate,
                    actualBudget: found.actualBudget,
                    budgetUsed: found.budgetUsed || 0,
                    externalBudget: found.actualBudgetExternal || 0
                });
                setActualDateText(found.actualDate || "");
                // Populate edit form
                setEditForm({
                    name: found.name,
                    lead: found.lead,
                    projectType: found.projectType,
                    budget: found.budget.toString(),
                    subDepartment: found.subDepartment || "",
                    externalBudget: (found.actualBudgetExternal || 0).toString(),
                    months: found.months || []
                });
            }
        } catch (error) {
            toast.error("ไม่สามารถโหลดข้อมูลโครงการได้");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProject();
    }, [id]);

    const handleToggleMonth = async (m: number) => {
        if (!project) return;
        const newCompleted = project.completedMonths.includes(m)
            ? project.completedMonths.filter(x => x !== m)
            : [...project.completedMonths, m];
        
        try {
            await updateProject(id, { completedMonths: newCompleted });
            setProject({ ...project, completedMonths: newCompleted });
            toast.success("อัปเดตสถานะเดือนสำเร็จ");
            fetchProject();
        } catch (error) {
            toast.error("ไม่สามารถอัปเดตได้");
        }
    };

    const handleLinkDoc = async () => {
        if (!selectedRegistryDocId) return;
        setIsUpdating(true);
        try {
            await linkDocumentToProject(selectedRegistryDocId, id);
            toast.success("เชื่อมโยงเอกสารสำเร็จ");
            setShowLinkDoc(false);
            fetchProject();
        } catch (error) {
            toast.error("ไม่สามารถเชื่อมโยงได้");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUnlinkDoc = async (docId: string) => {
        try {
            await linkDocumentToProject(docId, null);
            toast.success("ยกเลิกการเชื่อมโยงแล้ว");
            fetchProject();
        } catch (error) {
            toast.error("ไม่สามารถดำเนินการได้");
        }
    };

    const handleUpdateStatus = async (newStatus: ProjectStep) => {
        setIsUpdating(true);
        try {
            if (newStatus === "completed") {
                const formData = new FormData();
                formData.append("status", "completed");
                if (actualDateText) formData.append("actualDate", actualDateText);
                // budgetUsed is already calculated from transactions, no need to manually send actualBudget unless they specifically want a manual override, but user said "ไม่ต้องให้มีการกรอก"
                if (reportText) formData.append("description", `${project?.description || ""}\n\n[สรุปรายงาน]: ${reportText}`);
                
                selectedImages.forEach(img => {
                    formData.append("images", img);
                });

                await updateProject(id, formData);
            } else {
                await updateProject(id, { status: newStatus });
            }
            
            toast.success(newStatus === "completed" ? "ปิดโครงการสำเร็จแล้ว!" : "อัปเดตสถานะสำเร็จ");
            onUpdate();
            fetchProject();
        } catch (error) {
            toast.error("ไม่สามารถอัปเดตสถานะได้");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editForm.name || !editForm.lead || !editForm.budget) {
            return toast.error("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
        }
        setIsUpdating(true);
        try {
            const deptId = departments.find(d => d.name === project?.department)?.id;
            await updateProject(id, {
                name: editForm.name,
                lead: editForm.lead,
                projectType: editForm.projectType,
                budget: Number(editForm.budget),
                actualBudgetExternal: Number(editForm.externalBudget),
                subDepartment: editForm.subDepartment,
                months: editForm.months,
                departmentId: deptId
            });
            toast.success("แก้ไขข้อมูลโครงการสำเร็จ!");
            setIsEditing(false);
            onUpdate();
            fetchProject();
        } catch (error) {
            toast.error("ไม่สามารถบันทึกข้อมูลได้");
        } finally {
            setIsUpdating(false);
        }
    };

    const toggleEditMonth = (m: number) => {
        setEditForm(prev => {
            const newMonths = prev.months.includes(m)
                ? prev.months.filter(x => x !== m)
                : [...prev.months, m];
            return { ...prev, months: newMonths };
        });
    };

    if (!project) return (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center backdrop-blur-sm">
            <Loader className="w-8 h-8 animate-spin text-white" />
        </div>
    );

    return (
        <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-white rounded-[3rem] w-full max-w-4xl h-[85vh] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center">
                            <Archive className="w-7 h-7 text-blue-400" />
                        </div>
                        <div>
                            {isEditing ? (
                                <input 
                                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-xl font-bold w-full outline-none focus:bg-white/20"
                                    value={editForm.name}
                                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                                />
                            ) : (
                                <h3 className="text-xl font-bold">{project.name}</h3>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-slate-400">
                                <span className="text-[11px] font-black uppercase tracking-widest">{project.department}</span>
                                <span className="text-slate-600">·</span>
                                <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                                    <Banknote className="w-3.5 h-3.5" /> 
                                    {isEditing ? (
                                        <input 
                                            type="number"
                                            className="bg-transparent border-b border-blue-400/30 text-blue-400 outline-none w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={editForm.budget}
                                            onChange={e => setEditForm({...editForm, budget: e.target.value})}
                                        />
                                    ) : (
                                        `฿${project.budget.toLocaleString()}`
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isViewer && (
                            isEditing ? (
                                <>
                                    <button onClick={() => setIsEditing(false)} className="h-12 px-6 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-xs font-bold">
                                        ยกเลิก
                                    </button>
                                    <button onClick={handleSaveEdit} disabled={isUpdating} className="h-12 px-6 flex items-center justify-center bg-blue-500 hover:bg-blue-600 rounded-2xl transition-all text-xs font-bold gap-2">
                                        {isUpdating ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        บันทึก
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="h-12 w-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all" title="แก้ไขโครงการ">
                                    <FileEdit className="w-5 h-5 text-blue-400" />
                                </button>
                            )
                        )}
                        <button onClick={onClose} className="h-12 w-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Sub Header / Tabs */}
                <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex gap-2">
                        <button onClick={() => setTab("info")} className={cn("px-6 py-2.5 rounded-2xl text-sm font-bold transition-all", tab === "info" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600")}>จัดการสถานะ</button>
                        <button onClick={() => setTab("docs")} className={cn("px-6 py-2.5 rounded-2xl text-sm font-bold transition-all", tab === "docs" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600")}>เอกสาร ({project.documents.length})</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">สถานะปัจจุบัน:</span>
                        <span className={cn("px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider", 
                            project.step === "in_progress" ? "bg-green-100 text-green-700" :
                            project.step === "waiting_summary" ? "bg-amber-100 text-amber-700" :
                            "bg-purple-100 text-purple-700"
                        )}>
                            {project.step === "in_progress" && project.months.length > 0 && project.months.every(m => project.completedMonths?.includes(m))
                                ? "ดำเนินการเสร็จสิ้น"
                                : project.step === "in_progress" ? "กำลังดำเนินโครงการ" : project.step === "waiting_summary" ? "รอสรุปผลงาน" : "เสร็จสิ้นสมบูรณ์"}
                        </span>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
                    {tab === "info" ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* Left: Info & Month Control */}
                            <div className="space-y-8">
                                <section>
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                        <Target className="w-3.5 h-3.5" /> ข้อมูลทั่วไป
                                    </h4>
                                    <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <Users className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">หัวหน้าโครงการ</p>
                                                {isEditing ? (
                                                    <input 
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none mt-1 focus:border-blue-400"
                                                        value={editForm.lead}
                                                        onChange={e => setEditForm({...editForm, lead: e.target.value})}
                                                    />
                                                ) : (
                                                    <p className="text-sm font-bold text-slate-700">{project.lead}</p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
                                            <Target className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">ประเภทโครงการ</p>
                                                {isEditing ? (
                                                    <select 
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none mt-1 cursor-pointer focus:border-blue-400"
                                                        value={editForm.projectType}
                                                        onChange={e => setEditForm({...editForm, projectType: e.target.value})}
                                                    >
                                                        {PROJECT_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                ) : (
                                                    <p className="text-sm font-bold text-slate-700">{project.projectType}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
                                            <LayoutDashboard className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">ฝ่าย/กลุ่มงาน</p>
                                                {isEditing ? (
                                                    <select 
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none mt-1 cursor-pointer focus:border-blue-400"
                                                        value={editForm.subDepartment}
                                                        onChange={e => setEditForm({...editForm, subDepartment: e.target.value})}
                                                    >
                                                        {departments.find(d => d.name === project.department)?.subDepts.map(sd => (
                                                            <option key={sd} value={sd}>{sd}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <p className="text-sm font-bold text-slate-700">{project.subDepartment || "-"}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
                                            <Banknote className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">งบประมาณสบทบภายนอก (บริจาค)</p>
                                                {isEditing ? (
                                                    <input 
                                                        type="number"
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none mt-1 focus:border-blue-400"
                                                        value={editForm.externalBudget}
                                                        onChange={e => setEditForm({...editForm, externalBudget: e.target.value})}
                                                    />
                                                ) : (
                                                    <p className="text-sm font-bold text-slate-700">฿{(project.externalBudget || 0).toLocaleString()}</p>
                                                )}
                                            </div>
                                        </div>

                                        {project.actualDate && (
                                            <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
                                                <Calendar className="w-4 h-4 text-purple-400 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] font-bold text-purple-400 uppercase">เวลาที่จัดจริง</p>
                                                    <p className="text-sm font-bold text-slate-700">{project.actualDate}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
                                            <Banknote className="w-4 h-4 text-blue-400 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-bold text-blue-400 uppercase">งบประมาณที่ใช้ (รายรับ-รายจ่าย)</p>
                                                <p className="text-sm font-bold text-slate-700">฿{project.budgetUsed?.toLocaleString() || "0"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {project.months.length > 0 && (
                                    <section>
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                            <CalendarDays className="w-3.5 h-3.5" /> การดำเนินการรายเดือน
                                        </h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            {isEditing ? (
                                                Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                    <button key={m} type="button" onClick={() => toggleEditMonth(m)}
                                                        className={cn("p-4 rounded-[1.5rem] border-2 transition-all text-left",
                                                            editForm.months.includes(m) ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-white border-slate-100 text-slate-400 hover:border-blue-200")}>
                                                        <p className="text-[10px] font-black uppercase opacity-60 mb-1">{THAI_MONTHS_SHORT[m-1]}</p>
                                                        <p className="text-sm font-bold">{editForm.months.includes(m) ? "เลือกแล้ว" : "ไม่ได้เลือก"}</p>
                                                    </button>
                                                ))
                                            ) : (
                                                project.months.map(m => (
                                                    <button key={m} onClick={() => !isViewer && project.step === "in_progress" && handleToggleMonth(m)}
                                                        className={cn("p-4 rounded-[1.5rem] border-2 transition-all text-left group relative overflow-hidden",
                                                            project.completedMonths.includes(m) ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-white border-slate-100 text-slate-400 hover:border-blue-200",
                                                            isViewer && "cursor-default text-opacity-50"
                                                        )}>
                                                        <p className="text-[10px] font-black uppercase opacity-60 mb-1">{THAI_MONTHS_SHORT[m-1]}</p>
                                                        <p className="text-sm font-bold">{project.completedMonths.includes(m) ? "เสร็จแล้ว" : "รอดำเนินงาน"}</p>
                                                        {project.completedMonths.includes(m) && <CheckCircle2 className="absolute -right-2 -bottom-2 w-10 h-10 opacity-20" />}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-4 leading-relaxed font-medium">หมายเหตุ: สำหรับโครงการต่อเนื่อง คุณสามารถเลือกเดือนที่ดำเนินการเสร็จแล้วได้โดยไม่ต้องปิดโครงการ</p>
                                    </section>
                                )}
                            </div>

                            {/* Right: Actions */}
                            <div className="space-y-8">
                                <section>
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">สถานะและความคืบหน้า</h4>
                                    <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 flex flex-col items-center text-center">
                                        {project.step === "in_progress" ? (
                                            <>
                                                <div className="h-20 w-20 bg-green-100 rounded-[2rem] flex items-center justify-center mb-6 animate-pulse">
                                                    <UploadCloud className="w-10 h-10 text-green-600" />
                                                </div>
                                                <h5 className="text-lg font-bold text-slate-800">อยู่ระหว่างดำเนินการ</h5>
                                                <p className="text-xs text-slate-400 mt-2 px-6">อัปโหลดเอกสารเบี้ยเลี้ยง การใช้จ่าย และหลักฐานโครงการใน Tab เอกสาร</p>
                                                {!isViewer && (
                                                    <button onClick={() => handleUpdateStatus("waiting_summary")} disabled={isUpdating}
                                                        className="w-full mt-8 bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl text-sm font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2">
                                                        {isUpdating ? <Loader className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                                                        เสร็จสิ้นกิจกรรม (รอสรุปผลดำเนินงาน)
                                                    </button>
                                                )}
                                            </>
                                        ) : project.step === "waiting_summary" ? (
                                            <>
                                                <div className="h-20 w-20 bg-amber-100 rounded-[2rem] flex items-center justify-center mb-6">
                                                    <Clock className="w-10 h-10 text-amber-600" />
                                                </div>
                                                <h5 className="text-lg font-bold text-slate-800">รอรายงานผล/ประเมินผล</h5>
                                                
                                                <div className="w-full mt-4 text-left">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">วันที่จัดกิจกรรมจริง</label>
                                                    <input type="text" placeholder="เช่น 15 มีนาคม 2567" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-blue-400" value={actualDateText} onChange={e => setActualDateText(e.target.value)} />
                                                </div>

                                                <textarea placeholder="สรุปผลโครงการเบื้องต้น (ถ้ามี)..." className="w-full mt-4 bg-white border border-slate-200 rounded-2xl p-4 text-xs font-bold outline-none h-32" value={reportText} onChange={e => setReportText(e.target.value)} />
                                                
                                                <div className="w-full mt-6">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">ภาพบรรยากาศโครงการ (อย่างน้อย 6 รูป)</label>
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        {selectedImages.map((img, idx) => (
                                                            <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                                                                <img src={URL.createObjectURL(img)} className="w-full h-full object-cover" />
                                                                <button onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                                                                    className="absolute top-0 right-0 bg-rose-500 text-white p-0.5 rounded-bl-lg">
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {selectedImages.length < 12 && (
                                                            <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                                                                <Plus className="w-4 h-4 text-slate-400" />
                                                                <input type="file" multiple accept="image/*" className="hidden" 
                                                                    onChange={e => {
                                                                        if (e.target.files) {
                                                                            setSelectedImages(prev => [...prev, ...Array.from(e.target.files!)]);
                                                                        }
                                                                    }} 
                                                                />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>

                                                <p className="text-[10px] text-slate-400 mt-2 px-6 italic">** กรุณาแนบไฟล์ &apos;รายงานผลโครงการ&apos; ใน Tab เอกสารก่อนปิดโครงการ **</p>
                                                {!isViewer && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleUpdateStatus("completed")} 
                                                            disabled={isUpdating || selectedImages.length < 6}
                                                            className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl text-sm font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                        >
                                                            {isUpdating ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                            {selectedImages.length < 6 ? `แนบรูปให้ครบ 6 รูป (เหลือ ${6 - selectedImages.length})` : "แนบรายงานและปิดโครงการ"}
                                                        </button>
                                                        <button onClick={() => handleUpdateStatus("in_progress")} className="mt-4 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors">ย้อนกลับไปสถานะดำเนินการ</button>
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="h-20 w-20 bg-purple-100 rounded-[2rem] flex items-center justify-center mb-6">
                                                    <CheckCircle2 className="w-10 h-10 text-purple-600" />
                                                </div>
                                                <h5 className="text-lg font-bold text-slate-800">ดำเนินการเสร็จสิ้น</h5>
                                                <p className="text-xs text-slate-400 mt-2 px-6">โครงการนี้ถูกปิดและจัดเก็บเรียบร้อยแล้ว ท่านสามารถดูประวัติเอกสารได้ตลอดเวลา</p>
                                                <div className="w-full mt-8 p-4 bg-purple-50 border border-purple-100 rounded-2xl space-y-3">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-purple-700">
                                                        <span>วันที่จัดกิจกรรมจริง</span>
                                                        <span className="text-slate-900">{project.actualDate || "-"}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-purple-700 border-t border-purple-100 pt-3">
                                                        <span>งบประมาณที่ใช้รวมจริง</span>
                                                        <span className="text-slate-900 text-xs font-black">
                                                            ฿{( (project.budgetUsed || 0) + (isEditing ? Number(editForm.externalBudget || 0) : (project.externalBudget || 0)) ).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest text-slate-400 px-1">
                                                        <span>(ในระบบ ฿{(project.budgetUsed || 0).toLocaleString()})</span>
                                                        <span>(เงินบริจาค ฿{(isEditing ? Number(editForm.externalBudget || 0) : (project.externalBudget || 0)).toLocaleString()})</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-purple-400 border-t border-purple-100 pt-3 italic">
                                                        <span>สถานะ</span>
                                                        <span>Closed Activity</span>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" /> เอกสารแนบทั้งหมด
                                </h4>
                                {!isViewer && (
                                    <button onClick={() => setShowLinkDoc(true)} 
                                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                                        <Plus className="w-3.5 h-3.5" /> ดึงเอกสารจากทะเบียน
                                    </button>
                                )}
                            </div>

                            {showLinkDoc && (
                                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-xs font-bold text-slate-600 tracking-tight">เลือกเอกสารที่ต้องการเชื่อมโยง</p>
                                        <button onClick={() => { setShowLinkDoc(false); setLinkFilterDept(""); setLinkFilterCategory(""); }} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 tracking-widest uppercase">ยกเลิก</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">หน่วยงาน</label>
                                            <select
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none cursor-pointer focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 transition-all"
                                                value={linkFilterDept}
                                                onChange={e => { setLinkFilterDept(e.target.value); setSelectedRegistryDocId(""); }}
                                            >
                                                <option value="">ทุกหน่วยงาน</option>
                                                {departments.map((d: Department) => <option key={d.id} value={d.name}>{d.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ประเภทเอกสาร</label>
                                            <select
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none cursor-pointer focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 transition-all"
                                                value={linkFilterCategory}
                                                onChange={e => { setLinkFilterCategory(e.target.value); setSelectedRegistryDocId(""); }}
                                            >
                                                <option value="">ทุกประเภท</option>
                                                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <select 
                                            className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none cursor-pointer focus:ring-4 focus:ring-blue-500/5 select-none"
                                            value={selectedRegistryDocId}
                                            onChange={e => setSelectedRegistryDocId(e.target.value)}
                                        >
                                            <option value="">เลือกเอกสาร...</option>
                                            {allDocs
                                                .filter(d => !d.projectId)
                                                .filter(d => !linkFilterDept || d.department?.name === linkFilterDept)
                                                .filter(d => !linkFilterCategory || d.category?.name === linkFilterCategory)
                                                .map(d => (
                                                    <option key={d.id} value={d.id}>[{d.docNo}] {d.name}</option>
                                                ))
                                            }
                                        </select>
                                        <button onClick={handleLinkDoc} disabled={!selectedRegistryDocId || isUpdating}
                                            className="bg-blue-600 text-white px-6 rounded-2xl text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50">
                                            {isUpdating ? <Loader className="w-4 h-4 animate-spin" /> : "เชื่อมโยง"}
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-3 italic">* เฉพาะเอกสารในทะเบียนที่ยังไม่ถูกเชื่อมโยงกับโครงการใด ๆ เท่านั้น</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {project.documents.map(doc => (
                                    <div key={doc.id} className="group bg-white border border-slate-100 p-4 rounded-3xl flex items-center gap-4 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-100 transition-all">
                                        <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 transition-colors">
                                            <FileText className="w-6 h-6 text-slate-300 group-hover:text-blue-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 truncate">{doc.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-lg", docTypeColors[doc.type] || "bg-slate-100 text-slate-500")}>{doc.type}</span>
                                                <span className="text-[9px] font-bold text-slate-400 tracking-tighter">{doc.uploadedAt}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {doc.fileUrl && (
                                                <a href={getMediaUrl(doc.fileUrl)} target="_blank" rel="noreferrer" className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                            {!isViewer && (
                                                <button onClick={() => handleUnlinkDoc(doc.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {project.documents.length === 0 && (
                                    <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
                                        <UploadCloud className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-bold text-slate-300">ยังไม่มีเอกสารที่เชื่อมโยง</p>
                                        <p className="text-[10px] text-slate-200 mt-1 uppercase tracking-widest">Linked Registry Documents</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
