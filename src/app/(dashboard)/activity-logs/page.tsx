"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Activity, Search, Filter, Loader, 
    Calendar, User as UserIcon, Database, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { getActivityLogs } from "@/lib/api";

const ACTION_MAP: Record<string, { label: string; color: string }> = {
    CREATE: { label: 'เพิ่มข้อมูล', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    UPDATE: { label: 'แก้ไขข้อมูล', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    DELETE: { label: 'ลบข้อมูล', color: 'bg-red-100 text-red-700 border-red-200' },
};

const RESOURCE_MAP: Record<string, string> = {
    Document: 'เอกสาร',
    DocumentRequest: 'คำขอเอกสาร',
    Project: 'โครงการ',
    Transaction: 'รายรับ-รายจ่าย',
    User: 'ผู้ใช้งาน',
    Department: 'หน่วยงาน',
    CommitteeMember: 'คณะกรรมการ',
    TransliterationWord: 'คำทับศัพท์',
};

export default function ActivityLogsPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const userPermissions: string[] = (session?.user as any)?.permissions || [];
    const canViewLogs = userRole === "SUPER_ADMIN" || userPermissions.includes('activity_logs.view');

    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filterAction, setFilterAction] = useState("");
    const [filterResource, setFilterResource] = useState("");
    
    const fetchLogs = async () => {
        try {
            setIsLoading(true);
            const res = await getActivityLogs({
                page,
                limit: 20,
                action: filterAction || undefined,
                resource: filterResource || undefined
            });
            setLogs(res.data);
            setTotalPages(res.pagination.totalPages);
        } catch (error: any) {
            toast.error(error.message || "ดึงข้อมูลประวัติล้มเหลว");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (canViewLogs) {
            fetchLogs();
        }
    }, [page, filterAction, filterResource, canViewLogs]);

    if (!canViewLogs) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 space-y-4">
                <Activity className="w-16 h-16 text-slate-300" />
                <p className="text-xl font-bold">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                            <Activity className="w-6 h-6" />
                        </div>
                        ประวัติการใช้งาน
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        ตรวจสอบการเปลี่ยนแปลงข้อมูลทั้งหมดในระบบ
                    </p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select
                        value={filterAction}
                        onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full md:w-40"
                    >
                        <option value="">ทุกการกระทำ</option>
                        <option value="CREATE">เพิ่มข้อมูล (CREATE)</option>
                        <option value="UPDATE">แก้ไขข้อมูล (UPDATE)</option>
                        <option value="DELETE">ลบข้อมูล (DELETE)</option>
                    </select>

                    <select
                        value={filterResource}
                        onChange={(e) => { setFilterResource(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full md:w-48"
                    >
                        <option value="">ทุกประเภทข้อมูล</option>
                        {Object.entries(RESOURCE_MAP).map(([key, label]) => (
                            <option key={key} value={key}>{label} ({key})</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-sm">
                                <th className="px-6 py-4 font-semibold w-48">เวลา</th>
                                <th className="px-6 py-4 font-semibold">ผู้ใช้งาน</th>
                                <th className="px-6 py-4 font-semibold w-40">การกระทำ</th>
                                <th className="px-6 py-4 font-semibold w-48">ประเภทข้อมูล</th>
                                <th className="px-6 py-4 font-semibold">รายละเอียด (JSON)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <Loader className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-3" />
                                        กำลังโหลดประวัติ...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <Database className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                                        ไม่พบประวัติการใช้งาน
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                {new Date(log.createdAt).toLocaleString('th-TH', { 
                                                    year: 'numeric', month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.user ? (
                                                <div>
                                                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                                                        <UserIcon className="w-4 h-4 text-slate-400" />
                                                        {log.user.name}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        @{log.user.username} {log.user.subDepartment ? `· ${log.user.subDepartment}` : ''}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm">System / อัตโนมัติ</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={cn(
                                                "px-2.5 py-1 text-xs font-bold rounded-md border",
                                                ACTION_MAP[log.action]?.color || "bg-slate-100 text-slate-700 border-slate-200"
                                            )}>
                                                {ACTION_MAP[log.action]?.label || log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                                            {RESOURCE_MAP[log.resource] || log.resource}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-mono text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 max-w-sm overflow-auto max-h-32 group-hover:bg-white transition-colors">
                                                {log.details ? JSON.stringify(log.details) : '-'}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                {!isLoading && totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
                        <span className="text-sm text-slate-500 font-medium">
                            หน้า {page} จาก {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
