"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import {
    CalendarDays, Users, Banknote, Target, ChevronRight, ChevronDown,
    CheckCircle2, Clock, Circle, XCircle, Eye, X, TrendingUp,
    BarChart3, Layers, Filter, Plus, Loader, Edit, Trash2, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { annualPlanStatusLabels, annualPlanStatusStyles, DEPARTMENTS } from "@/lib/constants";
import { AnnualProject, AnnualPlan, Department } from "@/lib/types";
import { fetchAnnualPlans, createProject, createAnnualPlan, fetchDepartments, updateProject, deleteProject, deleteAnnualPlan } from "@/lib/api";

const quarterLabels = ["Q1 (ม.ค. – มี.ค.)", "Q2 (เม.ย. – มิ.ย.)", "Q3 (ก.ค. – ก.ย.)", "Q4 (ต.ค. – ธ.ค.)"];
const quarterColors = [
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-purple-500 to-violet-500",
];

const statusIcons: Record<string, typeof CheckCircle2> = {
    planned: Circle,
    in_progress: Clock,
    completed: CheckCircle2,
    cancelled: XCircle,
};

const THAI_MONTHS_SHORT = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];
const PROJECT_TYPE_OPTIONS = [
    "ประชุม/สัมมนา",
    "โครงการต่อเนื่อง",
    "โครงการใหญ่",
    "รายการออนไลน์",
    "จัดซื้อพัสดุ อุปกรณ์ เครื่องมือ",
    "อื่น ๆ"
];

const formatMonths = (months: number[]) => {
    if (!months || months.length === 0) return "-";
    return months.sort((a, b) => a - b).map(m => THAI_MONTHS_SHORT[m - 1]).join(", ");
};

const deptColors: Record<string, { bg: string; text: string; dot: string }> = {
    "สำนักอำนวยการ": { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-400" },
    "สมาคมพัฒนาเยาวชนมุสลิมไทย": { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-400" },
    "สำนักกิจการสตรี สมาคมฯ": { bg: "bg-pink-100", text: "text-pink-800", dot: "bg-pink-400" },
    "ครอบครัวฟิตยะตุลฮัก": { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-400" },
};

type ViewMode = "quarter" | "department" | "list";

export default function AnnualProjectsPage() {
    const { data: session } = useSession();
    const isViewer = (session?.user as any)?.role === "VIEWER";
    const [plans, setPlans] = useState<AnnualPlan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("quarter");
    const [filterDept, setFilterDept] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [selectedProject, setSelectedProject] = useState<AnnualProject | null>(null);
    const [expandedQuarters, setExpandedQuarters] = useState<number[]>([1, 2, 3, 4]);
    const [isLoading, setIsLoading] = useState(true);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const refreshData = () => {
        setIsLoading(true);
        console.log("[DEBUG] Starting refreshData...");
        Promise.all([fetchAnnualPlans(), fetchDepartments()])
            .then(([plansData, deptsData]) => {
                const plansArr = Array.isArray(plansData) ? plansData : [];
                const deptsArr = Array.isArray(deptsData) ? deptsData : [];

                console.log("[DEBUG] Data received:", { plansCount: plansArr.length, deptsCount: deptsArr.length });

                const mapped: AnnualPlan[] = plansArr.map((p: any) => ({
                    id: p.id,
                    thaiYear: p.thaiYear,
                    label: p.label,
                    totalBudget: p.totalBudget,
                    totalUsed: p.totalUsed,
                    projects: (p.projects || []).map((proj: any) => ({
                        id: proj.id,
                        name: proj.name,
                        department: proj.department?.name || "",
                        quarter: (proj.quarter || 1) as 1 | 2 | 3 | 4,
                        budget: proj.budget || 0,
                        budgetUsed: proj.budgetUsed || 0,
                        status: proj.status || "planned",
                        lead: proj.lead || "",
                        projectType: proj.projectType || "",
                        startDate: proj.startDate || "",
                        endDate: proj.endDate || "",
                        description: proj.description || "",
                        participantTarget: proj.targetPax,
                        participantActual: proj.actualPax,
                        months: proj.months || [],
                        isStarted: proj.isStarted || false,
                        isUnplanned: proj.isUnplanned || false,
                    })),
                }));
                console.log("[DEBUG] Mapped plans:", mapped);
                setPlans(mapped);
                setDepartments(deptsArr);

                if (mapped.length > 0) {
                    setSelectedPlanId(prev => prev || mapped[0].id);
                }
            })
            .catch((err) => {
                console.error("[DEBUG] Fetch error:", err);
                toast.error("ไม่สามารถโหลดข้อมูลได้");
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    useEffect(() => {
        refreshData();
    }, []);

    const [showAddProject, setShowAddProject] = useState(false);
    const [editingProject, setEditingProject] = useState<AnnualProject | null>(null);
    const [addFormData, setAddFormData] = useState({
        name: "",
        department: DEPARTMENTS[0].name,
        subDepartment: DEPARTMENTS[0].subDepts[0] || "",
        projectType: PROJECT_TYPE_OPTIONS[0],
        lead: "",
        budget: 0,
        quarter: 1,
        months: [] as number[]
    });

    const openAddProjectModal = (defaults?: Partial<typeof addFormData>) => {
        if (defaults) {
            setAddFormData(prev => ({ ...prev, ...defaults }));
        } else {
            setAddFormData({
                name: "",
                department: DEPARTMENTS[0].name,
                subDepartment: DEPARTMENTS[0].subDepts[0] || "",
                projectType: PROJECT_TYPE_OPTIONS[0],
                lead: "",
                budget: 0,
                quarter: 1,
                months: [] as number[]
            });
        }
        setShowAddProject(true);
    };

    const toggleMonth = (m: number) => {
        setAddFormData(prev => {
            const newMonths = prev.months.includes(m)
                ? prev.months.filter(x => x !== m)
                : [...prev.months, m].sort((a, b) => a - b);

            let newQuarter = prev.quarter;
            if (newMonths.length > 0) {
                newQuarter = Math.ceil(newMonths[0] / 3);
            }

            return { ...prev, months: newMonths, quarter: newQuarter };
        });
    };

    const [showAddYear, setShowAddYear] = useState(false);
    const [yearFormData, setYearFormData] = useState({
        thaiYear: (new Date().getFullYear() + 543) + 1,
        label: `ปีงบประมาณ ${(new Date().getFullYear() + 543) + 1}`
    });

    const handleAddProject = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPlanId) {
            toast.error("กรุณาเลือกหรือสร้างปีงบประมาณก่อน");
            return;
        }

        if (!addFormData.name.trim() || !addFormData.projectType.trim() || !addFormData.lead.trim()) {
            toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }

        if (addFormData.budget <= 0) {
            toast.error("กรุณากรอกงบประมาณที่มากกว่า 0");
            return;
        }

        if (addFormData.months.length === 0) {
            toast.error("กรุณาเลือกอย่างน้อย 1 เดือน");
            return;
        }

        const dept = departments.find(d => d.name === addFormData.department);
        if (!dept) {
            toast.error(`ไม่พบข้อมูลหน่วยงาน: ${addFormData.department}`);
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingProject) {
                await updateProject(editingProject.id, {
                    name: addFormData.name,
                    departmentId: dept.id,
                    subDepartment: addFormData.subDepartment,
                    projectType: addFormData.projectType,
                    lead: addFormData.lead,
                    budget: addFormData.budget,
                    quarter: addFormData.quarter,
                    months: addFormData.months
                });
                toast.success("อัปเดตโครงการสำเร็จ");
            } else {
                await createProject({
                    name: addFormData.name,
                    departmentId: dept.id,
                    subDepartment: addFormData.subDepartment,
                    projectType: addFormData.projectType,
                    lead: addFormData.lead,
                    budget: addFormData.budget,
                    quarter: addFormData.quarter,
                    annualPlanId: selectedPlanId,
                    months: addFormData.months
                });
                toast.success("บันทึกโครงการสำเร็จ");
            }

            setShowAddProject(false);
            setEditingProject(null);
            setAddFormData({
                name: "",
                department: DEPARTMENTS[0].name,
                subDepartment: DEPARTMENTS[0].subDepts[0] || "",
                projectType: PROJECT_TYPE_OPTIONS[0],
                lead: "",
                budget: 0,
                quarter: 1,
                months: []
            });
            refreshData();
        } catch (error) {
            console.error("Save project error:", error);
            toast.error("ไม่สามารถบันทึกข้อมูลได้");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProject = async (id: string, name: string) => {
        if (!confirm(`คุณต้องการลบโครงการ "${name}" ใช่หรือไม่?`)) return;

        try {
            await deleteProject(id);
            toast.success("ลบโครงการสำเร็จ");
            setSelectedProject(null);
            refreshData();
        } catch (error) {
            console.error("Delete project error:", error);
            toast.error("ไม่สามารถลบโครงการได้");
        }
    };

    const handleDeleteYear = async () => {
        if (!selectedPlanId) return;
        const currentPlan = plans.find(p => p.id === selectedPlanId);
        if (!currentPlan) return;

        if (!confirm(`คุณต้องการลบปีงบประมาณ ${currentPlan.thaiYear} และโครงการทั้งหมดในบัญชีนี้ใช่หรือไม่?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) return;

        setIsSubmitting(true);
        try {
            await deleteAnnualPlan(selectedPlanId);
            toast.success(`ลบปีงบประมาณ ${currentPlan.thaiYear} สำเร็จ`);
            setSelectedPlanId(""); // Reset to trigger auto-select first available
            refreshData();
        } catch (error) {
            console.error("Delete year error:", error);
            toast.error("ไม่สามารถลบปีงบประมาณได้");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (p: AnnualProject) => {
        setEditingProject(p);
        setAddFormData({
            name: p.name,
            department: p.department,
            subDepartment: p.subDepartment || "",
            projectType: p.projectType,
            lead: p.lead,
            budget: p.budget,
            quarter: p.quarter,
            months: p.months
        });
        setShowAddProject(true);
    };

    const handleAddYear = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!yearFormData.label.trim()) {
            toast.error("กรุณากรอกชื่อแผนงาน");
            return;
        }

        setIsSubmitting(true);
        try {
            await createAnnualPlan({
                year: yearFormData.thaiYear - 543,
                thaiYear: yearFormData.thaiYear,
                label: yearFormData.label
            });
            toast.success("เพิ่มปีงบประมาณสำเร็จ");
            setShowAddYear(false);
            refreshData();
        } catch (error) {
            console.error("Add year error:", error);
            toast.error("ไม่สามารถเพิ่มปีงบประมาณได้");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredProjects = useMemo(() => {
        let currentPlan = plans.find(p => p.id === selectedPlanId);
        if (!currentPlan && plans.length > 0) {
            currentPlan = plans[0];
        }

        if (!currentPlan) return [];
        return currentPlan.projects.filter(p => {
            if (filterDept !== "all" && p.department !== filterDept) return false;
            if (filterStatus !== "all" && p.status !== filterStatus) return false;
            return true;
        });
    }, [plans, selectedPlanId, filterDept, filterStatus]);

    const stats = useMemo(() => {
        let currentPlan = plans.find(p => p.id === selectedPlanId);
        if (!currentPlan && plans.length > 0) {
            currentPlan = plans[0];
        }

        if (!currentPlan) return { total: 0, completed: 0, inProgress: 0, planned: 0, unplannedCount: 0, plannedProjectsCount: 0, usedPercent: 0 };
        const total = currentPlan.projects.length;
        const completed = currentPlan.projects.filter(p => p.status === "completed").length;
        const inProgress = currentPlan.projects.filter(p => p.status === "in_progress").length;
        const plannedInPlanCount = currentPlan.projects.filter(p => !p.isUnplanned && p.status === "planned").length;
        const unplannedCount = currentPlan.projects.filter(p => p.isUnplanned).length;
        const plannedProjectsCount = total - unplannedCount;
        const usedPercent = currentPlan.totalBudget > 0 ? Math.round((currentPlan.totalUsed / currentPlan.totalBudget) * 100) : 0;
        return { total, completed, inProgress, planned: plannedInPlanCount, unplannedCount, plannedProjectsCount, usedPercent };
    }, [plans, selectedPlanId]);

    const deptStats = useMemo(() => {
        const result: Record<string, { count: number, budget: number, used: number }> = {};
        DEPARTMENTS.forEach(d => {
            result[d.name] = { count: 0, budget: 0, used: 0 };
        });

        let currentPlan = plans.find(p => p.id === selectedPlanId);
        if (!currentPlan && plans.length > 0) currentPlan = plans[0];

        if (currentPlan) {
            currentPlan.projects.forEach(p => {
                if (result[p.department]) {
                    result[p.department].count++;
                    result[p.department].budget += p.budget;
                    result[p.department].used += p.budgetUsed;
                }
            });
        }
        return result;
    }, [plans, selectedPlanId]);

    const byQuarter = useMemo(() => {
        const groups: Record<number, AnnualProject[]> = { 1: [], 2: [], 3: [], 4: [] };
        filteredProjects.forEach(p => {
            const currentQuarters = new Set<number>();
            if (p.months && p.months.length > 0) {
                p.months.forEach(m => {
                    if (m >= 1 && m <= 3) currentQuarters.add(1);
                    else if (m >= 4 && m <= 6) currentQuarters.add(2);
                    else if (m >= 7 && m <= 9) currentQuarters.add(3);
                    else if (m >= 10 && m <= 12) currentQuarters.add(4);
                });
            } else {
                currentQuarters.add(p.quarter);
            }
            currentQuarters.forEach(q => groups[q].push(p));
        });
        return groups;
    }, [filteredProjects]);

    const byDept = useMemo(() => {
        const groups: Record<string, AnnualProject[]> = {};
        DEPARTMENTS.forEach(d => { groups[d.name] = []; });
        filteredProjects.forEach(p => {
            if (!groups[p.department]) groups[p.department] = [];
            groups[p.department].push(p);
        });
        return groups;
    }, [filteredProjects]);

    const toggleQuarter = (q: number) => {
        setExpandedQuarters(prev =>
            prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q]
        );
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
            <Loader className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p>กำลังโหลดข้อมูลแผนงาน...</p>
        </div>
    );

    const plan = plans.find(p => p.id === selectedPlanId) || (plans.length > 0 ? plans[0] : null);

    return (
        <div className="animate-fade-in relative pb-12">
            {plans.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[450px] text-slate-500 py-12 px-4 text-center">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-blue-500/10 blur-[60px] rounded-full" />
                        <div className="relative h-24 w-24 bg-gradient-to-br from-blue-50 to-white rounded-[2rem] border border-blue-100 flex items-center justify-center shadow-xl shadow-blue-900/5 transition-transform hover:scale-105 duration-500">
                            <Layers className="w-10 h-10 text-blue-500" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center animate-bounce">
                            <Plus className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">ยังไม่มีแผนงานประจำปี</h3>
                    <p className="text-sm text-slate-500 mb-10 max-w-xs leading-relaxed font-medium">
                        ดูเหมือนว่าคุณยังไม่ได้เพิ่มแผนงานประจำปีใดๆ เริ่มต้นจัดระเบียบโครงการโดยการเพิ่มปีงบประมาณแรก
                    </p>
                    {!isViewer && (
                        <button
                            onClick={() => setShowAddYear(true)}
                            className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-8 py-4 rounded-2xl text-sm font-bold transition-all shadow-xl shadow-blue-500/25 active:scale-95 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
                            <Plus className="w-5 h-5" />
                            เพิ่มปีงบประมาณแรก
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in-up">
                    {/* Header Section */}
                    <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0f172a] p-8 text-white shadow-2xl">
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/20 to-transparent" />
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />

                        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-6 w-1 bg-blue-500 rounded-full" />
                                    <span className="text-blue-400 text-xs font-bold uppercase tracking-[0.2em]">การวางแผน ฟิตยะตุลฮัก</span>
                                </div>
                                <h1 className="text-3xl font-extrabold tracking-tight mb-2">แผนงานโครงการประจำปี</h1>
                                <p className="text-slate-400 text-sm font-medium max-w-md">บริหารจัดการงบประมาณและติดตามความคืบหน้าโครงการทั้งหมดแยกตามปีงบประมาณ</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl flex items-center gap-1">
                                    {plans.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelectedPlanId(p.id)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                                selectedPlanId === p.id
                                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                    ปี {p.thaiYear}
                                        </button>
                                    ))}
                                </div>
                                {!isViewer && (
                                    <>
                                        <button
                                            onClick={() => setShowAddYear(true)}
                                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all active:scale-95"
                                            title="เพิ่มปีงบประมาณใหม่"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                        {plan && (
                                            <button
                                                onClick={handleDeleteYear}
                                                disabled={isSubmitting}
                                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                                                title="ลบปีงบประมาณนี้"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openAddProjectModal()}
                                            className="flex items-center gap-2 bg-white text-slate-900 px-5 py-2.5 rounded-2xl text-xs font-extrabold hover:bg-blue-50 transition-all shadow-xl shadow-white/5 active:scale-95"
                                        >
                                            <Plus className="w-4 h-4" />
                                            เพิ่มโครงการ พ.ศ. {plan?.thaiYear}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                            {[
                                { label: "โครงการทั้งหมด", value: stats.total, icon: Layers, color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" },
                                { label: "โครงการตามแผนงาน", value: stats.plannedProjectsCount, icon: Target, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100/50" },
                                { label: "โครงการนอกแผนงาน", value: stats.unplannedCount, icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100/50" },
                                { label: "กำลังดำเนินการ", value: stats.inProgress, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100/50" },
                                { label: "ดำเนินการเสร็จสิ้น", value: stats.completed, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100/50" },
                                { label: "แผนงานใหม่", value: stats.planned, icon: Circle, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100/50" },
                            ].map((s, idx) => (
                                <div key={idx} className={cn("bg-white p-5 rounded-[2rem] border shadow-sm transition-all hover:shadow-md hover:-translate-y-1 duration-300", s.border)}>
                                    <div className="flex items-center gap-4">
                                        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner", s.bg)}>
                                            <s.icon className={cn("h-7 w-7", s.color)} />
                                        </div>
                                        <div>
                                            <p className="text-3xl font-black text-slate-900 leading-none mb-1">{s.value}</p>
                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">ภาพรวมงบประมาณ</h3>
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                        stats.usedPercent > 85 ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                                    )}>
                                        ใช้ไป {stats.usedPercent}%
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-end justify-between">
                                        <p className="text-2xl font-black text-slate-900">฿{plan?.totalUsed.toLocaleString()}</p>
                                        <p className="text-xs font-bold text-slate-400 mb-1">/ {plan?.totalBudget.toLocaleString()}</p>
                                    </div>
                                    <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${stats.usedPercent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">งบประมาณที่ใช้ได้</p>
                                </div>
                                <p className="text-sm font-extrabold text-slate-700 mt-1">฿{(Number(plan?.totalBudget || 0) - Number(plan?.totalUsed || 0)).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Department Breakdown Summary */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">สรุปแยกตามหน่วยงาน</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">สัดส่วนโครงการและงบประมาณ</p>
                            </div>
                            <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {DEPARTMENTS.map(dept => {
                                const dStat = deptStats[dept.name] || { count: 0, budget: 0, used: 0 };
                                const percent = dStat.budget > 0 ? Math.round((dStat.used / dStat.budget) * 100) : 0;

                                return (
                                    <div key={dept.id} className="relative group">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase", dept.color)}>
                                                {dept.id}
                                            </span>
                                            <span className="text-xs font-bold text-slate-400">{dStat.count} โครงการ</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 mb-3 truncate" title={dept.name}>{dept.name}</p>

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-slate-400 uppercase">งบประมาณ</span>
                                                <span className="text-slate-700">฿{dStat.budget.toLocaleString()}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className={cn("h-full rounded-full transition-all duration-500", dept.dot)} style={{ width: `${percent}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Controls & Views */}
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                            <div className="flex gap-1 bg-slate-100/50 p-1 rounded-2xl">
                                {([
                                    { id: "quarter", label: "ไตรมาส", icon: BarChart3 },
                                    { id: "department", label: "หน่วยงาน", icon: Users },
                                    { id: "list", label: "รายการ", icon: Layers },
                                ] as { id: ViewMode; label: string; icon: typeof BarChart3 }[]).map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => setViewMode(v.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all",
                                            viewMode === v.id ? "bg-[#0f172a] text-white shadow-lg shadow-slate-900/10" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        <v.icon className="w-3.5 h-3.5" />
                                        {v.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="relative group">
                                    <select
                                        value={filterDept}
                                        onChange={e => setFilterDept(e.target.value)}
                                        className="appearance-none pl-10 pr-10 py-2.5 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all hover:border-slate-300"
                                    >
                                        <option value="all">ทุกหน่วยงาน</option>
                                        {DEPARTMENTS.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                </div>
                                <div className="relative group">
                                    <select
                                        value={filterStatus}
                                        onChange={e => setFilterStatus(e.target.value)}
                                        className="appearance-none pl-10 pr-10 py-2.5 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all hover:border-slate-300"
                                    >
                                        <option value="all">ทุกสถานะ</option>
                                        {Object.entries(annualPlanStatusLabels).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                        ))}
                                    </select>
                                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Rendering Views */}
                        {viewMode === "quarter" && (
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map(q => {
                                    const projects = byQuarter[q];
                                    const isExpanded = expandedQuarters.includes(q);
                                    const qBudget = projects.reduce((total, p) => {
                                        const projectTotalMonths = p.months?.length || 1;
                                        const avgMonthlyBudget = p.budget / projectTotalMonths;
                                        const monthsInThisQuarter = (p.months || []).filter(m => {
                                            if (q === 1) return m >= 1 && m <= 3;
                                            if (q === 2) return m >= 4 && m <= 6;
                                            if (q === 3) return m >= 7 && m <= 9;
                                            if (q === 4) return m >= 10 && m <= 12;
                                            return false;
                                        }).length || (p.quarter === q ? 1 : 0);
                                        return total + (avgMonthlyBudget * monthsInThisQuarter);
                                    }, 0);

                                    return (
                                        <div key={q} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                                            <div
                                                onClick={() => toggleQuarter(q)}
                                                className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50/50 transition-colors cursor-pointer"
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleQuarter(q); }}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("h-12 w-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-extrabold text-sm shadow-lg", quarterColors[q - 1])}>
                                                        Q{q}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-black text-slate-900 uppercase tracking-wide">{quarterLabels[q - 1]}</p>
                                                        <p className="text-xs font-bold text-slate-400 mt-0.5">
                                                            {projects.length} โครงการ · งบประมาณ ฿{qBudget.toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {!isViewer && (
                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); openAddProjectModal({ quarter: q as 1 | 2 | 3 | 4 }); }}
                                                            className="h-8 w-8 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-300 group/btn shadow-sm"
                                                        >
                                                            <Plus className="w-4 h-4 group-hover/btn:scale-110" />
                                                        </div>
                                                    )}
                                                    <ChevronDown className={cn("w-5 h-5 text-slate-300 transition-transform duration-500", isExpanded && "rotate-180 text-blue-500")} />
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="divide-y divide-slate-50 border-t border-slate-50 animate-fade-in">
                                                    {projects.length > 0 ? (
                                                        projects.map(p => {
                                                            const projectTotalMonths = p.months?.length || 1;
                                                            const monthsInThisQuarter = (p.months || []).filter(m => {
                                                                if (q === 1) return m >= 1 && m <= 3;
                                                                if (q === 2) return m >= 4 && m <= 6;
                                                                if (q === 3) return m >= 7 && m <= 9;
                                                                if (q === 4) return m >= 10 && m <= 12;
                                                                return false;
                                                            }).length || (p.quarter === q ? 1 : 0);
                                                            return (
                                                                <ProjectRow
                                                                    key={p.id}
                                                                    project={p}
                                                                    onClick={() => setSelectedProject(p)}
                                                                    onEdit={handleEditClick}
                                                                    allocatedBudget={(p.budget / projectTotalMonths) * monthsInThisQuarter}
                                                                    isViewer={isViewer}
                                                                />
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">ยังไม่มีการเตรียมโครงการสำหรับไตรมาสนี้</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {viewMode === "department" && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {DEPARTMENTS.map(dept => {
                                    const projects = byDept[dept.name] || [];
                                    const dc = deptColors[dept.name];
                                    const deptBudget = projects.reduce((s, p) => s + p.budget, 0);
                                    return (
                                        <div key={dept.id} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                                            <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("h-3 w-3 rounded-full shadow-sm", dc?.dot)} />
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{dept.name}</p>
                                                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">{projects.length} โครงการ · ฿{deptBudget.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                {!isViewer && (
                                                    <button
                                                        onClick={() => openAddProjectModal({ department: dept.name })}
                                                        className="h-8 w-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="divide-y divide-slate-50">
                                                {projects.length > 0 ? (
                                                    projects.map(p => (
                                                        <ProjectRow key={p.id} project={p} onClick={() => setSelectedProject(p)} onEdit={handleEditClick} showDept={false} isViewer={isViewer} />
                                                    ))
                                                ) : (
                                                    <div className="py-8 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-loose">ยังไม่มีโครงการที่ลงทะเบียนในหน่วยงานนี้</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {viewMode === "list" && (
                            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">โครงการ / กิจกรรม</th>
                                                <th className="text-left px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">ช่วงเวลา</th>
                                                <th className="text-right px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">งบประมาณ</th>
                                                <th className="text-left px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">ผู้รับผิดชอบ</th>
                                                <th className="text-left px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">สถานะ</th>
                                                <th className="px-4 py-4 w-12 text-center text-slate-300">#</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredProjects.length > 0 ? (
                                                filteredProjects.map(p => {
                                                    const StatusIcon = statusIcons[p.status];
                                                    return (
                                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedProject(p)}>
                                                            <td className="px-6 py-4">
                                                                <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.name}</p>
                                                            </td>
                                                            <td className="px-4 py-4 text-[11px] font-bold text-slate-500">
                                                                {formatMonths(p.months)}
                                                            </td>
                                                            <td className="px-4 py-4 text-right font-black text-slate-700">
                                                                ฿{p.budget.toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <span className="text-xs font-semibold text-slate-600">{p.lead}</span>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <span className={cn("inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg border", annualPlanStatusStyles[p.status])}>
                                                                    <StatusIcon className="w-3 h-3" />
                                                                    {annualPlanStatusLabels[p.status]}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center text-slate-300 group-hover:text-blue-400">
                                                                <Eye className="w-4 h-4 mx-auto" />
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">ไม่พบข้อมุลที่ตรงกับการค้นหา</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Selected Project Modal */}
            {selectedProject && (
                <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setSelectedProject(null)}>
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className={cn("p-8 relative text-white", quarterColors[selectedProject.quarter - 1])}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                            <div className="relative z-10 flex items-start justify-between">
                                <div className="flex-1">
                                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest">Q{selectedProject.quarter} · {quarterLabels[selectedProject.quarter - 1]}</span>
                                    <h2 className="text-2xl font-black mt-4 leading-tight">{selectedProject.name}</h2>
                                    <div className="flex items-center gap-2 mt-2 opacity-80">
                                        <Users className="w-3.5 h-3.5" />
                                        <p className="text-sm font-bold uppercase tracking-wider">{selectedProject.department}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedProject(null)} className="h-10 w-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                            <div className="flex items-center justify-between">
                                <span className={cn("inline-flex items-center gap-2 text-xs font-black px-4 py-2 rounded-2xl border shadow-sm", annualPlanStatusStyles[selectedProject.status])}>
                                    {(() => { const Icon = statusIcons[selectedProject.status]; return <Icon className="w-4 h-4" />; })()}
                                    {annualPlanStatusLabels[selectedProject.status]}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { handleEditClick(selectedProject); setSelectedProject(null); }}
                                        className="h-10 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition-all"
                                    >
                                        แก้ไข
                                    </button>
                                    <button
                                        onClick={() => handleDeleteProject(selectedProject.id, selectedProject.name)}
                                        className="h-10 px-4 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-100 transition-all"
                                    >
                                        ลบ
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="h-px flex-1 bg-slate-100" /> รายละเอียดโครงการ <div className="h-px flex-1 bg-slate-100" />
                                </div>
                                <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200">{selectedProject.description || "โครงการนี้ไม่มีรายละเอียดระบุไว้"}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50/50 p-5 rounded-[2rem] border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">เป้าหมายงบประมาณ</p>
                                    <p className="text-xl font-black text-slate-900">฿{selectedProject.budget.toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-50/50 p-5 rounded-[2rem] border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ผู้รับผิดชอบโครงการ</p>
                                    <p className="text-xl font-black text-slate-900 truncate">{selectedProject.lead}</p>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                    <span>สถานะการคลัง</span>
                                    <span>ใช้ไป {Math.round((selectedProject.budgetUsed / (selectedProject.budget || 1)) * 100)}%</span>
                                </div>
                                <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-white">
                                    <div
                                        className="absolute top-0 left-0 h-full bg-blue-600/90 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${Math.min(100, (selectedProject.budgetUsed / (selectedProject.budget || 1)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals for Add Project / Year */}
            {showAddProject && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <h3 className="text-xl font-black text-slate-900">{editingProject ? "แก้ไขโครงการ" : "เพิ่มโครงการประจำปีใหม่"}</h3>
                            <button onClick={() => setShowAddProject(false)} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddProject} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">ชื่อโครงการ</label>
                                    <input
                                        required
                                        value={addFormData.name}
                                        onChange={e => setAddFormData({ ...addFormData, name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                                        placeholder="ระบุชื่อโครงการ..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">หน่วยงาน</label>
                                        <select
                                            value={addFormData.department}
                                            onChange={e => {
                                                const deptName = e.target.value;
                                                const deptObj = DEPARTMENTS.find(d => d.name === deptName);
                                                setAddFormData({
                                                    ...addFormData,
                                                    department: deptName,
                                                    subDepartment: deptObj?.subDepts[0] || ""
                                                });
                                            }}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold outline-none cursor-pointer"
                                        >
                                            {DEPARTMENTS.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">สังกัด</label>
                                        <select
                                            value={addFormData.subDepartment}
                                            onChange={e => setAddFormData({ ...addFormData, subDepartment: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold outline-none cursor-pointer"
                                        >
                                            {DEPARTMENTS.find(d => d.name === addFormData.department)?.subDepts.map(sd => (
                                                <option key={sd} value={sd}>{sd}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">ประเภทโครงการ</label>
                                        <select
                                            value={addFormData.projectType}
                                            onChange={e => setAddFormData({ ...addFormData, projectType: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold outline-none cursor-pointer"
                                        >
                                            {PROJECT_TYPE_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">ผู้รับผิดชอบ</label>
                                        <input
                                            required
                                            value={addFormData.lead}
                                            onChange={e => setAddFormData({ ...addFormData, lead: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold outline-none"
                                            placeholder="ระบุชื่อหัวหน้าโครงการ..."
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">งบประมาณจัดสรร (฿)</label>
                                    <input
                                        type="number"
                                        required
                                        value={addFormData.budget || ""}
                                        onChange={e => setAddFormData({ ...addFormData, budget: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold outline-none"
                                        placeholder="ระบุงบประมาณ..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center">ระยะเวลาดำเนินงาน</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => toggleMonth(m)}
                                                className={cn(
                                                    "h-12 rounded-xl text-xs font-black transition-all border-2",
                                                    addFormData.months.includes(m) ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-white border-slate-50 text-slate-400 hover:border-slate-200"
                                                )}
                                            >
                                                {THAI_MONTHS_SHORT[m - 1]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-bold text-sm shadow-xl shadow-slate-900/10 hover:bg-black transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                            >
                                {isSubmitting && <Loader className="w-4 h-4 animate-spin" />}
                                {editingProject ? "ยืนยันการแก้ไข" : "สร้างโครงการ"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showAddYear && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center border-b border-slate-100 bg-slate-50/10">
                            <h3 className="text-xl font-black text-slate-900">เพิ่มปีงบประมาณใหม่</h3>
                            <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">เริ่มต้นปีงบประมาณใหม่</p>
                        </div>
                        <form onSubmit={handleAddYear} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Buddhist Calendar (พ.ศ.)</label>
                                <input
                                    type="number"
                                    required
                                    value={yearFormData.thaiYear}
                                    onChange={e => {
                                        const val = parseInt(e.target.value) || 0;
                                        setYearFormData({ ...yearFormData, thaiYear: val, label: `ปีงบประมาณ ${val}` });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-center text-2xl font-black text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowAddYear(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all">ยกเลิก</button>
                                <button type="submit" disabled={isSubmitting} className="flex-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50">สร้างปีงบประมาณ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Premium Reusable Project Row ─── */
function ProjectRow({
    project: p,
    onClick,
    onEdit,
    showDept = true,
    allocatedBudget,
    isViewer
}: {
    project: AnnualProject;
    onClick: () => void;
    onEdit?: (p: AnnualProject) => void;
    showDept?: boolean;
    allocatedBudget?: number;
    isViewer?: boolean;
}) {
    const dc = deptColors[p.department];
    const StatusIcon = statusIcons[p.status];
    const displayBudget = allocatedBudget ?? p.budget;
    const pct = p.budget > 0 ? Math.round((p.budgetUsed / p.budget) * 100) : 0;

    return (
        <div className="group relative">
            <div
                onClick={onClick}
                className="w-full flex items-center gap-6 px-6 py-4 hover:bg-slate-50/80 transition-all text-left relative z-10 cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-slate-800 truncate transition-colors group-hover:text-blue-600 group-hover:translate-x-1 duration-300">{p.name}</p>
                        {p.isUnplanned && (
                            <span className="shrink-0 text-[9px] font-black px-2 py-0.5 bg-orange-100 text-orange-700 border border-orange-200 rounded-md uppercase tracking-tight">โครงการนอกแผนงาน</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {showDept && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-slate-100 bg-white shadow-sm">
                                <div className={cn("h-1.5 w-1.5 rounded-full", dc?.dot)} />
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{p.department}</span>
                            </div>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">
                            <CalendarDays className="w-3 h-3" /> {formatMonths(p.months)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">
                            <Users className="w-3 h-3" /> {p.lead}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-black text-slate-900 leading-none">฿{displayBudget.toLocaleString()}</p>
                        <div className="w-16 bg-slate-100 rounded-full h-1 mt-2.5 overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all duration-1000", pct >= 80 ? "bg-rose-500" : pct >= 50 ? "bg-amber-500" : "bg-blue-500")}
                                style={{ width: `${Math.min(100, pct)}%` }}
                            />
                        </div>
                    </div>
                    <span className={cn("hidden lg:inline-flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-xl border-2 uppercase tracking-widest shadow-sm", annualPlanStatusStyles[p.status])}>
                        <StatusIcon className="w-3 h-3" />
                        {annualPlanStatusLabels[p.status]}
                    </span>
                    {!isViewer && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(p); }}
                            className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-blue-300 group-hover:translate-x-1 transition-all duration-300" />
                </div>
            </div>
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300" />
        </div>
    );
}
