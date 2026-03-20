
"use client";

import { useEffect, useState } from 'react';
import { FolderCheck, Calendar, Users, Banknote, ExternalLink, Image as ImageIcon, Search } from 'lucide-react';
import { fetchAnnualPlans, API_BASE_URL } from '@/lib/api';
import { AnnualProject } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function CompletedProjectsPage() {
    const [projects, setProjects] = useState<AnnualProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const plans = await fetchAnnualPlans();
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
                        thaiYear: plans.find((pl: any) => pl.id === p.annualPlanId)?.thaiYear
                    }));
                setProjects(completed);
            } catch (error) {
                console.error("Error loading completed projects:", error);
            } finally {
                setLoading(false);
            }
        };
        loadProjects();
    }, []);

    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <FolderCheck className="w-8 h-8 text-purple-600" />
                        โครงการที่เสร็จสิ้น
                    </h1>
                    <p className="text-slate-500 mt-1">สรุปผลการดำเนินงานและภาพบรรยากาศโครงการที่ปิดสมบูรณ์แล้ว</p>
                </div>
                
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="ค้นหาชื่อโครงการ หรือหน่วยงาน..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <ImageIcon className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-slate-400 font-medium italic">ไม่พบโครงการที่เสร็จสิ้น</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {filteredProjects.map((project) => (
                        <div key={project.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="flex flex-col lg:flex-row">
                                {/* Project Info */}
                                <div className="p-8 lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-50">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[10px] font-black uppercase rounded-full tracking-wider">
                                            Year {(project as any).thaiYear}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400">{project.department}</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-3 leading-tight">{project.name}</h2>
                                    <p className="text-sm text-slate-500 mb-6 line-clamp-3 leading-relaxed whitespace-pre-line">
                                        {project.description}
                                    </p>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 text-xs text-slate-600">
                                            <Users className="w-4 h-4 text-slate-400" />
                                            <span className="font-medium">ผู้รับผิดชอบ: {project.lead}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-600">
                                            <Banknote className="w-4 h-4 text-slate-400" />
                                            <span className="font-medium">งบประมาณที่ใช้: ฿{project.budgetUsed?.toLocaleString() || project.budget.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Image Gallery */}
                                <div className="p-8 lg:w-2/3 bg-slate-50/50">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                        <ImageIcon className="w-3.5 h-3.5" /> ภาพบรรยากาศโครงการ
                                    </h3>
                                    {project.summaryImages && project.summaryImages.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {project.summaryImages.map((img, idx) => (
                                                <div key={idx} className="aspect-video rounded-2xl overflow-hidden border border-white shadow-sm hover:scale-[1.02] transition-transform cursor-pointer">
                                                    <img 
                                                        src={img.startsWith('http') ? img : `${API_BASE_URL}${img}`} 
                                                        alt={`${project.name} ${idx + 1}`} 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-40 flex flex-col items-center justify-center text-slate-300 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                                            <p className="text-[10px] font-bold italic">ไม่พบภาพบรรยากาศ</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
