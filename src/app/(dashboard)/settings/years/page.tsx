"use client";

import { useYear } from "@/context/YearContext";
import { 
    CalendarDays, Plus, Trash2, X, Check, 
    Loader, ShieldAlert, Settings
} from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { copyIntoYear, createAnnualPlan, deleteAnnualPlan } from "@/lib/api";
import { toast } from "react-hot-toast";
import { useState } from "react";
import { CopyFromYear, type CopySelection } from "@/components/years/CopyFromYear";

export default function YearsPage() {
    const { plans, refreshYears } = useYear();
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const userPermissions: string[] = (session?.user as any)?.permissions || [];
    const canManageSettings = userRole === "SUPER_ADMIN" || userPermissions.includes('settings.edit');

    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({ 
        year: new Date().getFullYear() + 1, 
        thaiYear: new Date().getFullYear() + 544, 
        label: "" 
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copy, setCopy] = useState<CopySelection>({ copyFromYear: null, departmentIds: [], userIds: [] });
    // a new year starts from the latest year (units and people all ticked) — leaving it empty is a choice, not the default
    const latestYear = plans.length ? Math.max(...plans.map(p => p.thaiYear)) : null;
    const openAdd = () => { setCopy({ copyFromYear: latestYear, departmentIds: [], userIds: [] }); setIsAdding(true); };
    // bring units / people into a year that already exists
    const [importInto, setImportInto] = useState<{ id: string; thaiYear: number } | null>(null);
    const [importCopy, setImportCopy] = useState<CopySelection>({ copyFromYear: null, departmentIds: [], userIds: [] });
    const [importing, setImporting] = useState(false);
    const runImport = async () => {
        if (!importInto || !importCopy.copyFromYear) return;
        setImporting(true);
        try {
            const r = await copyIntoYear(importInto.id, { copyFromYear: importCopy.copyFromYear, departmentIds: importCopy.departmentIds, userIds: importCopy.userIds });
            toast.success(`นำเข้าปี ${importInto.thaiYear} แล้ว · ${r.copied.departments} หน่วยงาน ${r.copied.people} คน`);
            setImportInto(null);
            await refreshYears();
        } catch (e) { toast.error(e instanceof Error && e.message.includes("403") ? "ไม่มีสิทธิ์ในปีต้นทางหรือปลายทาง" : "นำเข้าไม่สำเร็จ"); }
        finally { setImporting(false); }
    };

    if (session && !canManageSettings) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 bg-white rounded-[3rem] border border-slate-100 p-10">
                <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
                <h2 className="text-2xl font-black text-slate-800 mb-2">เข้าถึงไม่ได้</h2>
                <p className="text-center max-w-md font-medium">คุณไม่ได้รับสิทธิ์ในการเข้าถึงการจัดการปีการทำงาน กรุณาติดต่อ Super Admin</p>
            </div>
        );
    }

    const handleAdd = async () => {
        if (!formData.label) return toast.error("กรุณาระบุชื่อเรียกโครงการ");
        setIsSubmitting(true);
        try {
            const created = await createAnnualPlan({ ...formData, ...(copy.copyFromYear ? copy : {}) });
            toast.success(copy.copyFromYear
                ? `เพิ่มปี ${formData.thaiYear} แล้ว · คัดลอก ${created.copied?.departments ?? 0} หน่วยงาน ${created.copied?.people ?? 0} คน`
                : "เพิ่มปีการทำงานสำเร็จ");
            setCopy({ copyFromYear: null, departmentIds: [], userIds: [] });
            setIsAdding(false);
            const nextYear = formData.year + 1;
            setFormData({ year: nextYear, thaiYear: nextYear + 543, label: "" });
            await refreshYears();
        } catch (error: any) {
            console.error("Add year error:", error);
            const message = error.message?.includes("exists") 
                ? "ปีการทำงานนี้มีอยู่แล้วในระบบ" 
                : "ไม่สามารถเพิ่มปีการทำงานได้";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, year: number) => {
        if (!window.confirm(`ยืนยันการลบปี ${year}? ข้อมูลโครงการทั้งหมดในปีนี้จะถูกลบด้วย`)) return;
        try {
            await deleteAnnualPlan(id);
            toast.success("ลบปีการทำงานสำเร็จ");
            await refreshYears();
        } catch (error) {
            toast.error("ไม่สามารถลบปีการทำงานได้");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Settings className="w-8 h-8 text-blue-600" />
                        จัดการปีการทำงาน
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">เพิ่มหรือลบปีงบประมาณและโครงการประจำปี สำหรับ Super Admin</p>
                </div>
                <button 
                    onClick={openAdd}
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-bold px-6 py-3.5 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" /> เพิ่มปีการทำงานใหม่
                </button>
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-8 min-h-[400px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.sort((a, b) => b.thaiYear - a.thaiYear).map((plan) => (
                        <div
                            key={plan.id}
                            className="group relative bg-slate-50 p-6 rounded-[2rem] border border-slate-100 transition-all duration-300 hover:shadow-xl hover:shadow-blue-100 hover:-translate-y-1"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                    <CalendarDays className="w-5 h-5 text-blue-600" />
                                </div>
                                <button
                                    onClick={() => { const others = plans.filter(p => p.thaiYear !== plan.thaiYear).map(p => p.thaiYear); setImportCopy({ copyFromYear: others.length ? Math.max(...others) : null, departmentIds: [], userIds: [] }); setImportInto({ id: plan.id, thaiYear: plan.thaiYear }); }}
                                    className="ml-auto mr-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                                    title="นำหน่วยงานและผู้ใช้จากปีอื่นเข้าปีนี้"
                                >
                                    นำเข้าหน่วยงาน/ผู้ใช้
                                </button>
                                <button 
                                    onClick={() => handleDelete(plan.id, plan.thaiYear)}
                                    className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <h3 className="text-2xl font-black text-slate-800">พ.ศ. {plan.thaiYear}</h3>
                            <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{plan.label || `ปีงบประมาณ ${plan.thaiYear}`}</p>
                            
                            <div className="mt-6 flex items-center justify-between py-3 border-t border-slate-200/50">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Christian Era {plan.year}</span>
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Modal Overlay */}
            {isAdding && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center">
                                    <Plus className="w-7 h-7 text-blue-400" />
                                </div>
                                <h3 className="text-xl font-black">เพิ่มปีการทำงานใหม่</h3>
                            </div>
                            <button onClick={() => setIsAdding(false)} className="text-white/50 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-10 space-y-6 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1 font-bold">ปี ค.ศ. (A.D.)</label>
                                    <input 
                                        type="number" 
                                        value={formData.year}
                                        onChange={e => setFormData({...formData, year: Number(e.target.value), thaiYear: Number(e.target.value) + 543})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                                        placeholder="2026"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1 font-bold">ปี พ.ศ. (Thai Year)</label>
                                    <input 
                                        type="number" 
                                        value={formData.thaiYear}
                                        onChange={e => setFormData({...formData, thaiYear: Number(e.target.value)})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                                        placeholder="2569"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1 font-bold">ชื่อเรียก (Label)</label>
                                <input 
                                    type="text" 
                                    value={formData.label}
                                    onChange={e => setFormData({...formData, label: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder="ปีงบประมาณ 2569..."
                                />
                            </div>
                            
                            <CopyFromYear years={plans.map(p => p.thaiYear)} value={copy} onChange={setCopy} />

                            <div className="pt-4 flex gap-4">
                                <button onClick={() => setIsAdding(false)} className="flex-1 py-4 text-sm font-bold text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">ยกเลิก</button>
                                <button 
                                    disabled={isSubmitting}
                                    onClick={handleAdd}
                                    className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all"
                                >
                                    {isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    ยืนยันการเพิ่มปี
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {importInto && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between">
                            <h3 className="text-lg font-black">นำหน่วยงานและผู้ใช้เข้าปี {importInto.thaiYear}</h3>
                            <button onClick={() => setImportInto(null)} aria-label="ปิด" className="text-white/60 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-8 space-y-5 overflow-y-auto">
                            <p className="text-sm text-slate-500">ใช้เมื่อเปิดปีไว้แล้วแต่ยังไม่มีหน่วยงาน หรือมีคนกลับมาทำงานเพิ่ม · ที่มีอยู่แล้วในปี {importInto.thaiYear} จะไม่ถูกเขียนทับ</p>
                            <CopyFromYear years={plans.filter(p => p.thaiYear !== importInto.thaiYear).map(p => p.thaiYear)} value={importCopy} onChange={setImportCopy} />
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setImportInto(null)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl">ยกเลิก</button>
                                <button disabled={importing || !importCopy.copyFromYear || (!importCopy.departmentIds.length && !importCopy.userIds.length)} onClick={runImport}
                                    className="flex-[2] bg-blue-600 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50">
                                    {importing ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}นำเข้า
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
