"use client";

import { useEffect, useState } from 'react';
import { 
    UserPlus, Search, Filter, ChevronLeft, ChevronRight, 
    Eye, CheckCircle2, XCircle, Trash2, X, Clock, Users,
    Phone, Mail, MapPin, Briefcase, CalendarDays, Hash,
    AlertCircle, TrendingUp, Loader, GraduationCap, Heart, Activity, FileImage
} from 'lucide-react';
import { fetchMembers, fetchMemberStats, updateMemberStatus, deleteMember } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { MemberFeePanel, MEMBER_TYPE_LABEL } from './_fees';

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    'รอตรวจสอบ': { label: 'รอตรวจสอบ', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', icon: Clock },
    'อนุมัติ': { label: 'อนุมัติ', color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
    'ไม่อนุมัติ': { label: 'ไม่อนุมัติ', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', icon: XCircle },
};

function StatCard({ title, value, icon: Icon, color, bgColor }: any) {
    return (
        <div className={cn("rounded-2xl border p-5 transition-all hover:shadow-md", bgColor)}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
                    <p className={cn("text-3xl font-black mt-1", color)}>{value}</p>
                </div>
                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", color, "bg-white/60")}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}

export default function MembersPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const userPermissions: string[] = (session?.user as any)?.permissions || [];
    const canManage = userRole === 'SUPER_ADMIN' || userPermissions.includes('members.edit');

    const [members, setMembers] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>(null);
    const limit = 15;

    // Detail Modal
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Status Update Modal
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [statusMember, setStatusMember] = useState<any>(null);
    const [newStatus, setNewStatus] = useState('');
    const [statusNote, setStatusNote] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const [membersData, statsData] = await Promise.all([
                fetchMembers({ search: search || undefined, status: statusFilter && statusFilter !== 'slips' ? statusFilter : undefined, slips: statusFilter === 'slips' ? 'pending' : undefined, page, limit }),
                fetchMemberStats()
            ]);
            setMembers(membersData.members);
            setPagination(membersData.pagination);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading members:', error);
            toast.error('ไม่สามารถโหลดข้อมูลสมาชิกได้');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, statusFilter]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            loadData();
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Body scroll lock
    useEffect(() => {
        if (isDetailOpen || isStatusModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isDetailOpen, isStatusModalOpen]);

    const handleViewDetail = (member: any) => {
        setSelectedMember(member);
        setIsDetailOpen(true);
    };

    const handleOpenStatusModal = (member: any) => {
        setStatusMember(member);
        setNewStatus(member.status);
        setStatusNote(member.note || '');
        setIsStatusModalOpen(true);
    };

    const handleUpdateStatus = async () => {
        if (!statusMember) return;
        setIsUpdating(true);
        try {
            await updateMemberStatus(statusMember.id, { status: newStatus, note: statusNote });
            toast.success('อัปเดตสถานะสำเร็จ');
            setIsStatusModalOpen(false);
            loadData();
        } catch (error) {
            toast.error('ไม่สามารถอัปเดตสถานะได้');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`ยืนยันการลบข้อมูลสมาชิก "${name}"?`)) return;
        try {
            await deleteMember(id);
            toast.success('ลบข้อมูลสมาชิกสำเร็จ');
            loadData();
        } catch (error) {
            toast.error('ไม่สามารถลบข้อมูลได้');
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('th-TH', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('th-TH', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading && members.length === 0) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <UserPlus className="w-8 h-8 text-blue-600" />
                        ข้อมูลสมาชิก
                    </h1>
                    <p className="text-slate-500">จัดการข้อมูลผู้สมัครสมาชิกจากฟอร์มสาธารณะ</p>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatCard 
                        title="ทั้งหมด" 
                        value={stats.total} 
                        icon={Users} 
                        color="text-blue-600" 
                        bgColor="bg-blue-50 border border-blue-100" 
                    />
                    <StatCard 
                        title="รอตรวจสอบ" 
                        value={stats.pending} 
                        icon={Clock} 
                        color="text-amber-600" 
                        bgColor="bg-amber-50 border border-amber-100" 
                    />
                    <StatCard 
                        title="อนุมัติแล้ว" 
                        value={stats.approved} 
                        icon={CheckCircle2} 
                        color="text-emerald-600" 
                        bgColor="bg-emerald-50 border border-emerald-100" 
                    />
                    <StatCard 
                        title="ไม่อนุมัติ" 
                        value={stats.rejected} 
                        icon={XCircle} 
                        color="text-red-600" 
                        bgColor="bg-red-50 border border-red-100" 
                    />
                    <button type="button" onClick={() => { setStatusFilter('slips'); setPage(1); }} className="text-left" title="ดูสมาชิกที่ส่งสลิปค่าบำรุงรอตรวจ">
                        <StatCard 
                            title="สลิปค่าบำรุงรอตรวจ" 
                            value={stats.pendingSlips ?? 0} 
                            icon={FileImage} 
                            color="text-orange-600" 
                            bgColor="bg-orange-50 border border-orange-100" 
                        />
                    </button>
                </div>
            )}

            {/* Search & Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ค้นหาชื่อ, เบอร์โทร, อีเมล..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-w-[140px]"
                    >
                        <option value="">ทุกสถานะ</option>
                        <option value="รอตรวจสอบ">รอตรวจสอบ</option>
                        <option value="อนุมัติ">อนุมัติ</option>
                        <option value="ไม่อนุมัติ">ไม่อนุมัติ</option>
                        <option value="slips">มีสลิปค่าบำรุงรอตรวจ</option>
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="text-left py-3.5 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider">ชื่อ-นามสกุล</th>
                                <th className="text-left py-3.5 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider hidden md:table-cell">เบอร์โทร</th>
                                <th className="text-left py-3.5 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider hidden lg:table-cell">จังหวัด</th>
                                <th className="text-left py-3.5 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider hidden lg:table-cell">วันที่สมัคร</th>
                                <th className="text-left py-3.5 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider hidden md:table-cell">ค่าบำรุง</th>
                                <th className="text-center py-3.5 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider hidden md:table-cell" title="บัญชีเข้าเว็บไซต์หลัก">บัญชีเว็บ</th>
                                <th className="text-center py-3.5 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider">สถานะ</th>
                                <th className="text-center py-3.5 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-16">
                                        <div className="flex flex-col items-center gap-3">
                                            <Users className="w-12 h-12 text-slate-200" />
                                            <p className="text-slate-400 font-medium">ยังไม่มีข้อมูลสมาชิก</p>
                                            <p className="text-xs text-slate-300">ข้อมูลจะแสดงเมื่อมีคนสมัครผ่านฟอร์มสาธารณะ</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                members.map((member, idx) => {
                                    const statusConfig = STATUS_CONFIG[member.status] || STATUS_CONFIG['รอตรวจสอบ'];
                                    const StatusIcon = statusConfig.icon;
                                    return (
                                        <tr 
                                            key={member.id} 
                                            className={cn(
                                                "border-b border-slate-50 hover:bg-blue-50/30 transition-colors cursor-pointer",
                                                idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                                            )}
                                            onClick={() => handleViewDetail(member)}
                                        >
                                            <td className="py-3.5 px-4">
                                                <div>
                                                    <p className="font-bold text-slate-900">{member.fullName}</p>
                                                    {member.nickname && (
                                                        <p className="text-xs text-slate-400 mt-0.5">({member.nickname})</p>
                                                    )}
                                                    {member._count?.payments > 0 && (
                                                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[11px] font-bold text-orange-700"><FileImage className="w-3 h-3" />สลิปรอตรวจ {member._count.payments}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600 hidden md:table-cell">{member.phoneNumber}</td>
                                            <td className="py-3.5 px-4 text-slate-600 hidden lg:table-cell">{member.workProvince || '-'}</td>
                                            <td className="py-3.5 px-4 text-slate-500 text-xs hidden lg:table-cell">{formatDateTime(member.createdAt)}</td>
                                            <td className="py-3.5 px-4 hidden md:table-cell">
                                                {member.monthlyFee ? (
                                                    <div><p className="font-semibold text-slate-800">{member.monthlyFee.toLocaleString('th-TH')} บาท/ด.</p><p className="text-[11px] text-slate-400">{MEMBER_TYPE_LABEL[member.memberType] ?? ''}</p></div>
                                                ) : <span className="text-xs text-slate-300">ยังไม่ระบุ</span>}
                                            </td>
                                            <td className="py-3.5 px-4 text-center hidden md:table-cell">
                                                {member.account
                                                    ? <span title={member.account.mustChangePassword ? 'มีบัญชี · ยังใช้รหัสเริ่มต้น' : 'มีบัญชีเข้าเว็บไซต์'} className={cn("inline-block w-2.5 h-2.5 rounded-full", member.account.mustChangePassword ? "bg-amber-400" : "bg-emerald-500")} />
                                                    : <span title="ยังไม่มีบัญชี" className="inline-block w-2.5 h-2.5 rounded-full bg-slate-200" />}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                                                    statusConfig.bgColor, statusConfig.color
                                                )}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusConfig.label}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <button 
                                                        onClick={() => handleViewDetail(member)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="ดูรายละเอียด"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {canManage && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleOpenStatusModal(member)}
                                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                title="เปลี่ยนสถานะ"
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(member.id, member.fullName)}
                                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="ลบ"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500">
                            แสดง {((page - 1) * limit) + 1} - {Math.min(page * limit, pagination.total)} จาก {pagination.total} รายการ
                        </p>
                        <div className="flex items-center gap-1">
                            <button 
                                disabled={page <= 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={cn(
                                            "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                                            page === pageNum 
                                                ? "bg-blue-600 text-white shadow-sm" 
                                                : "text-slate-500 hover:bg-slate-100"
                                        )}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button 
                                disabled={page >= pagination.totalPages}
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════ Detail Modal ═══════ */}
            {isDetailOpen && selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDetailOpen(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
                        {/* Header */}
                        <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">รายละเอียดสมาชิก</h2>
                                <p className="text-xs text-slate-400 mt-0.5">สมัครเมื่อ {formatDateTime(selectedMember.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const sc = STATUS_CONFIG[selectedMember.status] || STATUS_CONFIG['รอตรวจสอบ'];
                                    const SIcon = sc.icon;
                                    return (
                                        <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border", sc.bgColor, sc.color)}>
                                            <SIcon className="w-3 h-3" />
                                            {sc.label}
                                        </span>
                                    );
                                })()}
                                <button 
                                    onClick={() => setIsDetailOpen(false)}
                                    className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* 1. Personal Info */}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-500" />
                                    1. ข้อมูลส่วนตัว
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InfoRow label="ชื่อ-นามสกุล" value={selectedMember.fullName} />
                                    <InfoRow label="ชื่อเล่น" value={selectedMember.nickname} />
                                    <InfoRow label="วันเกิด" value={selectedMember.birthDate ? formatDate(selectedMember.birthDate) : null} icon={CalendarDays} />
                                    <InfoRow label="อายุ" value={
                                        selectedMember.age ? `${selectedMember.age} ปี` : 
                                        (selectedMember.birthDate ? `${new Date().getFullYear() - new Date(selectedMember.birthDate).getFullYear()} ปี` : null)
                                    } />
                                    <InfoRow label="กรุ๊ปเลือด" value={selectedMember.bloodType} />
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* 2. Contact */}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-emerald-500" />
                                    2. ข้อมูลติดต่อ
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InfoRow label="ที่อยู่ตามทะเบียนบ้าน" value={selectedMember.address} icon={MapPin} className="sm:col-span-2" />
                                    <InfoRow label="เบอร์โทรศัพท์" value={selectedMember.phoneNumber} icon={Phone} />
                                    <InfoRow label="อีเมล" value={selectedMember.email} icon={Mail} />
                                    <InfoRow label="Facebook" value={selectedMember.facebook} />
                                    <InfoRow label="ID Line" value={selectedMember.lineId} />
                                    <InfoRow label="ผู้ติดต่อยามฉุกเฉิน" value={selectedMember.emergencyContact} className="sm:col-span-2" />
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* 3. Education */}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4 text-violet-500" />
                                    3. การศึกษา
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InfoRow label="ระดับการศึกษา" value={selectedMember.education} />
                                    <InfoRow label="สถานศึกษา/สถาบัน" value={selectedMember.institution} />
                                    <InfoRow label="สาขาวิชา/คณะ" value={selectedMember.fieldOfStudy} className="sm:col-span-2" />
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* 4. Career & Family */}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-amber-500" />
                                    4. อาชีพและครอบครัว
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InfoRow label="อาชีพ" value={selectedMember.occupation} icon={Briefcase} />
                                    <InfoRow label="สถานที่ทำงาน/สถานศึกษา" value={selectedMember.workplace} />
                                    <InfoRow label="จังหวัด" value={selectedMember.workProvince} icon={MapPin} />
                                    <InfoRow label="สถานะครอบครัว" value={selectedMember.maritalStatus} icon={Heart} />
                                    
                                    {['แต่งงานแล้ว', 'หย่าร้าง'].includes(selectedMember.maritalStatus) && (
                                        <div className="sm:col-span-2 bg-amber-50/50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border border-amber-100">
                                            <InfoRow label="ลูกชาย" value={selectedMember.childrenBoys != null ? `${selectedMember.childrenBoys} คน` : null} />
                                            <InfoRow label="ลูกสาว" value={selectedMember.childrenGirls != null ? `${selectedMember.childrenGirls} คน` : null} />
                                            <InfoRow label="อายุลูก" value={selectedMember.childrenAges} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* 5. Organization */}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-sky-500" />
                                    5. ความเกี่ยวข้องกับกลุ่ม
                                </h3>
                                <div className="space-y-4">
                                    <InfoRow label="รู้จักกลุ่มจาก" value={selectedMember.knowFrom} />
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">กิจกรรมที่เคยเข้าร่วม</p>
                                        <div className="flex flex-wrap gap-2">
                                            {!selectedMember.activities || Object.keys(selectedMember.activities).length === 0 ? (
                                                <span className="text-sm text-slate-300">ไม่ได้ระบุ</span>
                                            ) : (
                                                Object.entries(selectedMember.activities).map(([key, val]: [string, any]) => {
                                                    const labels: Record<string, string> = {
                                                        fityatulhak: "ฟิตยะตุลฮัก", fityatulhaq: "ฟิตยะตุลฮัก", robbani: "ร็อบบานีย์", robbanee: "ร็อบบานีย์", 
                                                        camp: "ค่ายดอกไม้แห่งอิสลาม", standup: "Stand Up",
                                                        pobpa: "พบปะ", halaqah: "หัลเกาะฮฺ", seminar: "สัมมนา",
                                                        other: "อื่นๆ"
                                                    };
                                                    let detailStr = val.detail ? ` (${val.detail})` : "";
                                                    return (
                                                        <span key={key} className="px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-xs font-medium border border-sky-100">
                                                            {labels[key] || key}{detailStr}
                                                        </span>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* 6. Skills */}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-pink-500" />
                                    6. ข้อมูลเพิ่มเติม
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <InfoRow label="ทักษะ/ความสามารถพิเศษ" value={selectedMember.skills} />
                                    <InfoRow label="ความสนใจพิเศษ" value={selectedMember.interests} />
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />
                            <MemberFeePanel memberId={selectedMember.id} canManage={canManage} onChanged={loadData} />

                            {/* Admin Note */}
                            {selectedMember.note && (
                                <>
                                    <div className="h-px bg-slate-100" />
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">หมายเหตุจากแอดมิน</p>
                                        <p className="text-sm text-amber-900">{selectedMember.note}</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Actions */}
                        {canManage && (
                            <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2 rounded-b-3xl">
                                <button
                                    onClick={() => {
                                        setIsDetailOpen(false);
                                        handleOpenStatusModal(selectedMember);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    เปลี่ยนสถานะ
                                </button>
                                <button
                                    onClick={() => {
                                        setIsDetailOpen(false);
                                        handleDelete(selectedMember.id, selectedMember.fullName);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm transition-colors border border-red-200"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    ลบ
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════ Status Update Modal ═══════ */}
            {isStatusModalOpen && statusMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsStatusModalOpen(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-900">เปลี่ยนสถานะสมาชิก</h2>
                            <button 
                                onClick={() => setIsStatusModalOpen(false)}
                                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-sm font-bold text-slate-900">{statusMember.fullName}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{statusMember.phoneNumber}</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">สถานะ</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                                        const SIcon = config.icon;
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => setNewStatus(key)}
                                                className={cn(
                                                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-xs font-bold",
                                                    newStatus === key 
                                                        ? `${config.bgColor} ${config.color} border-current shadow-sm` 
                                                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                                                )}
                                            >
                                                <SIcon className="w-5 h-5" />
                                                {config.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">หมายเหตุ (ไม่จำเป็น)</label>
                                <textarea
                                    value={statusNote}
                                    onChange={(e) => setStatusNote(e.target.value)}
                                    placeholder="เพิ่มหมายเหตุ..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setIsStatusModalOpen(false)}
                                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleUpdateStatus}
                                disabled={isUpdating}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-70"
                            >
                                {isUpdating ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper component for detail modal
function InfoRow({ label, value, icon: Icon, className }: { label: string; value: string | null | undefined; icon?: any; className?: string }) {
    return (
        <div className={cn("space-y-1", className)}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            <div className="flex items-center gap-2">
                {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                <p className={cn("text-sm font-medium", value ? "text-slate-800" : "text-slate-300")}>
                    {value || 'ไม่ได้ระบุ'}
                </p>
            </div>
        </div>
    );
}
