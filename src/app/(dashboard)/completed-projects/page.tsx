
"use client";

import { useEffect, useState } from 'react';
import { FolderCheck, Calendar, Users, Banknote, ExternalLink, Image as ImageIcon, Search, X, ChevronRight, Hash, Target, ClipboardCheck } from 'lucide-react';
import { fetchAnnualPlans, API_BASE_URL, fetchDepartments } from '@/lib/api';
import { AnnualProject, ProjectDocument } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useYear } from '@/context/YearContext';

export default function CompletedProjectsPage() {
    const { selectedYear } = useYear();
    const [projects, setProjects] = useState<AnnualProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDept, setSelectedDept] = useState("");
    const [selectedSubDept, setSelectedSubDept] = useState("");
    const [selectedProject, setSelectedProject] = useState<AnnualProject | null>(null);
    const [dbDepartments, setDbDepartments] = useState<any[]>([]);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const [plans, depts] = await Promise.all([
                    fetchAnnualPlans(),
                    fetchDepartments()
                ]);
                setDbDepartments(depts || []);
                const allProjects = plans.flatMap((p: any) => p.projects || []);
                const completed = allProjects
                    .filter((p: any) => p.status === 'completed')
                    .map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        department: p.department?.name || "",
                        budget: p.budget,
                        budgetUsed: p.budgetUsed,
                        status: p.status,
                        lead: p.lead,
                        projectType: p.projectType,
                        description: p.description || "",
                        summaryImages: p.summaryImages || [],
                        actualDate: p.actualDate,
                        actualBudget: p.actualBudget,
                        subDepartment: p.subDepartment || "",
                        thaiYear: plans.find((pl: any) => pl.id === p.annualPlanId)?.thaiYear
                    } as unknown as AnnualProject));
                setProjects(completed);
            } catch (error) {
                console.error("Error loading completed projects:", error);
            } finally {
                setLoading(false);
            }
        };
        loadProjects();
    }, []);

    const filteredProjects = projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.department.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesYear = selectedYear ? p.thaiYear === selectedYear : true;
        const matchesDept = selectedDept ? p.department === selectedDept : true;
        const matchesSubDept = selectedSubDept ? p.subDepartment === selectedSubDept : true;
        return matchesSearch && matchesYear && matchesDept && matchesSubDept;
    });

    const subDepartments = selectedDept 
        ? dbDepartments.find(d => d.name === selectedDept)?.subDepts || []
        : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <FolderCheck className="w-8 h-8 text-purple-600" />
                            โครงการที่เสร็จสิ้น
                        </h1>
                        <p className="text-slate-500 mt-1 uppercase text-[10px] font-black tracking-widest leading-relaxed">
                            สรุปผลการดำเนินงานและภาพบรรยากาศโครงการที่ปิดสมบูรณ์แล้ว
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="ค้นหาชื่อโครงการ..." 
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Department Filter */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                        <Users className="w-4 h-4 text-slate-400" />
                        <select 
                            className="w-full bg-transparent text-xs font-bold text-slate-600 outline-none appearance-none"
                            value={selectedDept}
                            onChange={(e) => {
                                setSelectedDept(e.target.value);
                                setSelectedSubDept("");
                            }}
                        >
                            <option value="">ทุกหน่วยงาน</option>
                            {dbDepartments.map((d: any) => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sub-department Filter */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                        <Target className="w-4 h-4 text-slate-400" />
                        <select 
                            className="w-full bg-transparent text-xs font-bold text-slate-600 outline-none appearance-none disabled:opacity-50"
                            value={selectedSubDept}
                            onChange={(e) => setSelectedSubDept(e.target.value)}
                            disabled={!selectedDept}
                        >
                            <option value="">ทุกส่วนงาน/สังกัด</option>
                            {subDepartments.map((s: string) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Results Count */}
                    <div className="flex items-center justify-end px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        พบ {filteredProjects.length} รายการ
                    </div>
                </div>
            </div>

            {filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <ImageIcon className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-slate-400 font-medium italic">ไม่พบโครงการที่เสร็จสิ้น</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                        <div 
                            key={project.id} 
                            onClick={() => setSelectedProject(project)}
                            className="group bg-white rounded-3xl border border-slate-100 p-5 hover:shadow-xl hover:shadow-purple-500/5 hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
                            
                            <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="px-2.5 py-1 bg-purple-50 text-purple-600 text-[10px] font-black uppercase rounded-lg tracking-wider">
                                        YEAR {project.thaiYear}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <ImageIcon className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold">{project.summaryImages?.length || 0}</span>
                                    </div>
                                </div>

                                <h2 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors line-clamp-1">{project.name}</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-4 flex items-center gap-1.5">
                                    <Target className="w-3 h-3" /> {project.department} {project.subDepartment && ` • ${project.subDepartment}`}
                                </p>

                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">วันที่จัด</p>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
                                            <Calendar className="w-3 h-3 text-slate-400" />
                                            {project.actualDate || "-"}
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">งบประมาณที่ใช้</p>
                                        <div className="flex items-center justify-end gap-1.5 text-[10px] font-black text-purple-700">
                                            <Banknote className="w-3 h-3" />
                                            ฿{(project.actualBudget || project.budgetUsed || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                                            <Users className="w-3 h-3 text-slate-400" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500">{project.lead || "-"}</span>
                                    </div>
                                    <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                                        <ChevronRight className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Image Gallery Modal */}
            {selectedProject && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedProject(null)} />
                    
                    <div className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <button 
                            onClick={() => setSelectedProject(null)}
                            className="absolute top-6 right-6 z-10 p-2 bg-white/80 hover:bg-white rounded-full text-slate-400 hover:text-slate-900 transition-all border border-slate-100 shadow-sm"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col lg:flex-row h-full">
                            {/* Details (Left/Top) */}
                            <div className="lg:w-1/3 p-10 border-b lg:border-b-0 lg:border-r border-slate-50 overflow-y-auto">
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[10px] font-black uppercase rounded-lg tracking-wider">
                                        Year {selectedProject.thaiYear}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{selectedProject.department}</span>
                                </div>

                                <h2 className="text-2xl font-bold text-slate-900 mb-6 leading-tight">{selectedProject.name}</h2>
                                
                                <div className="space-y-6">
                                    <div className="p-5 bg-slate-50 rounded-3xl">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                            <ClipboardCheck className="w-3.5 h-3.5" /> สรุปผลงาน
                                        </h4>
                                        <p className="text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-line">
                                            {selectedProject.description || "ไม่มีข้อมูลสรุปผล"}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="flex items-center gap-3 p-4 bg-purple-50/50 rounded-2xl">
                                            <Calendar className="w-4 h-4 text-purple-600" />
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">วันที่จัดโครงการจริง</p>
                                                <p className="text-xs font-bold text-slate-700">{selectedProject.actualDate || "-"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl">
                                            <Banknote className="w-4 h-4 text-blue-600" />
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">งบประมาณที่ใช้จริง</p>
                                                <p className="text-xs font-black text-slate-700">฿{(selectedProject.actualBudget || selectedProject.budgetUsed || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                                            <Users className="w-4 h-4 text-slate-400" />
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">โครงการรับผิดชอบโดย</p>
                                                <p className="text-xs font-bold text-slate-700">{selectedProject.lead || "-"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Gallery (Right/Bottom) */}
                            <div className="lg:w-2/3 p-10 bg-slate-50/30 overflow-y-auto">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                    <ImageIcon className="w-3.5 h-3.5" /> ภาพบรรยากาศโครงการ ({selectedProject.summaryImages?.length || 0})
                                </h3>
                                
                                {selectedProject.summaryImages && selectedProject.summaryImages.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-4 pb-20">
                                        {selectedProject.summaryImages.map((img, idx) => {
                                            const imageUrl = img.startsWith('http') ? img : `${API_BASE_URL}${img}`;
                                            return (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => setFullScreenImage(imageUrl)}
                                                    className="group/img aspect-[4/3] rounded-2xl overflow-hidden border-2 border-white shadow-md hover:shadow-2xl transition-all cursor-zoom-in relative"
                                                >
                                                    <img 
                                                        src={imageUrl} 
                                                        alt={`${selectedProject.name} ${idx + 1}`} 
                                                        className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" 
                                                    />
                                                    <div className="absolute inset-0 bg-slate-900/0 group-hover/img:bg-slate-900/20 transition-all flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                                                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white scale-75 group-hover/img:scale-100 transition-transform">
                                                            <ImageIcon className="w-6 h-6" />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-300 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200 p-8">
                                        <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] italic opacity-50">ไม่พบภาพบรรยากาศ</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Screen Image Viewer */}
            {fullScreenImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setFullScreenImage(null)} />
                    
                    <button 
                        onClick={() => setFullScreenImage(null)}
                        className="absolute top-8 right-8 z-10 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="relative w-full h-full flex items-center justify-center">
                        <img 
                            src={fullScreenImage} 
                            alt="Full Screen View" 
                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
