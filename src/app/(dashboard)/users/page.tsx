"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Users, ShieldCheck, User, Plus, MoreHorizontal,
    Loader, X, Check, Trash2, Key, Mail, Building2,
    ShieldAlert, Eye, UserCog, Phone, Facebook,
    FileUp, Download, AlertCircle
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
    fetchUsers, createUser, updateUser, deleteUser,
    fetchDepartments, uploadUsersCsv
} from "@/lib/api";

const ROLES_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
    SUPER_ADMIN: { label: 'ผู้ดูแลระบบ', color: 'bg-amber-100 text-amber-700 border-amber-200', desc: 'ทำได้ทุกอย่าง (สูงสุด 3 คน)' },
    ADMIN: { label: 'ผู้ใช้งาน', color: 'bg-blue-100 text-blue-700 border-blue-200', desc: 'จัดการโครงการ เอกสาร คณะกรรมการ' },
    FINANCE: { label: 'ผู้จัดการการเงิน', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'จัดการรายรับ-รายจ่าย' },
    VIEWER: { label: 'ผู้ใช้ทั่วไป', color: 'bg-slate-100 text-slate-600 border-slate-200', desc: 'ดูข้อมูล ขอเอกสาร ดาวน์โหลด' },
};

const ROLES = Object.keys(ROLES_CONFIG);
const MAX_SUPER_ADMINS = 3;

export default function UsersPage() {
    const { data: session } = useSession();
    const isSuperAdmin = (session?.user as any)?.role === "SUPER_ADMIN";

    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResults, setUploadResults] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [deptFilter, setDeptFilter] = useState("all");
    const [dbDepartments, setDbDepartments] = useState<any[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        name: "",
        role: "VIEWER",
        departmentId: "",
        email: "",
        phoneNumber: "",
        facebook: "",
        permissions: [] as string[]
    });

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [usersData, deptsData] = await Promise.all([
                fetchUsers(),
                fetchDepartments()
            ]);
            setUsers(usersData);
            setDbDepartments(deptsData);
        } catch (error) {
            toast.error("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Body Scroll Lock
    useEffect(() => {
        if (showModal || showUploadModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showModal, showUploadModal]);

    if (session && !isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 bg-white rounded-[3rem] border border-slate-100 p-10">
                <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
                <h2 className="text-2xl font-black text-slate-800 mb-2">เข้าถึงไม่ได้</h2>
                <p className="text-center max-w-md font-medium">คุณไม่ได้รับสิทธิ์ในการเข้าถึงการจัดการผู้ใช้งาน กรุณาติดต่อ Super Admin เพื่อขอสิทธิ์การใช้งาน</p>
            </div>
        );
    }

    const handleOpenModal = (user?: any) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                password: "", // Don't show password
                name: user.name,
                role: user.role,
                departmentId: user.departmentId || "",
                email: user.email || "",
                phoneNumber: user.phoneNumber || "",
                facebook: user.facebook || "",
                permissions: user.permissions || []
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: "",
                password: "",
                name: "",
                role: "VIEWER",
                departmentId: dbDepartments.length > 0 ? dbDepartments[0].id : "",
                email: "",
                phoneNumber: "",
                facebook: "",
                permissions: ["ACCESS_DASHBOARD"]
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingUser) {
                await updateUser(editingUser.id, formData);
                toast.success("อัปเดตข้อมูลผู้ใช้สำเร็จ");
            } else {
                await createUser(formData);
                toast.success("สร้างผู้ใช้งานใหม่สำเร็จ");
            }
            setShowModal(false);
            loadData();
        } catch (error: any) {
            toast.error(error.message || "เกิดข้อผิดพลาด");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`ยืนยันการลบผู้ใช้ "${name}"?`)) return;
        try {
            await deleteUser(id);
            toast.success("ลบผู้ใช้สำเร็จ");
            loadData();
        } catch (error) {
            toast.error("ไม่สามารถลบผู้ใช้ได้");
        }
    };

    const handleUploadCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadResults(null);
        try {
            const res = await uploadUsersCsv(file);
            setUploadResults(res);
            toast.success(`นำเข้าข้อมูลสมาชิกสำเร็จ (${res.success}/${res.total})`);
            loadData();
        } catch (error: any) {
            toast.error(error.message || "การอัปโหลดล้มเหลว");
        } finally {
            setIsUploading(false);
            // Clear file input
            e.target.value = '';
        }
    };

    const downloadTemplate = () => {
        const headers = ["username", "password", "name", "department", "role"];
        const rows = [
            ["user01", "123456", "สมชาย ใจดี", "สมาคมฯ", "ผู้ใช้งาน"],
            ["user02", "password123", "สมหญิง รักเรียน", "กอฮา", "ผู้ใช้ทั่วไป"]
        ];

        const csvContent = "\ufeff" + // UTF-8 BOM for Excel
            [headers, ...rows].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "user_import_template.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const togglePermission = (permId: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permId)
                ? prev.permissions.filter(p => p !== permId)
                : [...prev.permissions, permId]
        }));
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.username.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = deptFilter === "all" || u.departmentId === deptFilter;
        return matchesSearch && matchesDept;
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-blue-600" />
                        ผู้ใช้งานระบบ
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">จัดการบัญชีผู้ใช้และกำหนดสิทธิ์การเข้าถึงรายบุคคล</p>
                </div>
                {isSuperAdmin && (
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => {
                                setUploadResults(null);
                                setShowUploadModal(true);
                            }}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-slate-600 text-[11px] sm:text-sm font-bold px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
                        >
                            <FileUp className="w-4 h-4 sm:w-5 sm:h-5" /> นำเข้า CSV
                        </button>
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white text-[11px] sm:text-sm font-bold px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> เพิ่มผู้ใช้งาน
                        </button>
                    </div>
                )}
            </div>

            {/* Role Summary Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {ROLES.map((role) => {
                    const count = users.filter(u => u.role === role).length;
                    const cfg = ROLES_CONFIG[role];
                    return (
                        <div key={role} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg"></span>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{cfg.label}</p>
                            </div>
                            <div className="flex items-end justify-between">
                                <h3 className="text-2xl font-black text-slate-800">{count}</h3>
                                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", cfg.color)}>
                                    <UserCog className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">{cfg.desc}</p>
                        </div>
                    );
                })}
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl sm:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between bg-white gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-50 rounded-xl sm:rounded-2xl flex items-center justify-center">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-800">รายชื่อสมาชิกทั้งหมด ({filteredUsers.length})</h3>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                            <select
                                className="w-full pl-9 pr-8 py-2 sm:py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] sm:text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                                value={deptFilter}
                                onChange={e => setDeptFilter(e.target.value)}
                            >
                                <option value="all">ทุกหน่วยงาน</option>
                                {dbDepartments.map((d: any) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ข้อมูลผู้ใช้</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ระดับสิทธิ์</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">หน่วยงาน</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">วันที่สร้าง</th>
                                <th className="px-8 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-slate-400">กำลังโหลดข้อมูล...</p>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <ShieldAlert className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">ยังไม่มีผู้ใช้งานในระบบ</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-lg shadow-inner group-hover:from-blue-500 group-hover:to-blue-600 group-hover:text-white transition-all duration-300">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-bold mt-0.5">
                                                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> @{user.username}</span>
                                                        {user.email && <span className="flex items-center gap-1 text-blue-500/60"><Mail className="w-3 h-3" /> {user.email}</span>}
                                                        {user.phoneNumber && <span className="flex items-center gap-1 text-emerald-500/60"><Phone className="w-3 h-3" /> {user.phoneNumber}</span>}
                                                        {user.facebook && <span className="flex items-center gap-1 text-indigo-500/60"><Facebook className="w-3 h-3" /> {user.facebook}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-5">
                                            <span className={cn(
                                                "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border",
                                                ROLES_CONFIG[user.role]?.color || "bg-slate-100 text-slate-600 border-slate-200"
                                            )}>
                                                {ROLES_CONFIG[user.role]?.label || user.role}
                                            </span>
                                        </td>
                                        <td className="px-5 py-5">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase">
                                                <Building2 className="w-3.5 h-3.5 text-slate-300" />
                                                {user.department?.name || "ไม่ระบุ"}
                                            </div>
                                        </td>
                                        <td className="px-5 py-5">
                                            <p className="text-[11px] font-bold text-slate-400">
                                                {new Date(user.createdAt).toLocaleDateString("th-TH")}
                                            </p>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            {isSuperAdmin && (
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleOpenModal(user)}
                                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"
                                                        title="แก้ไขผู้ใช้งาน"
                                                    >
                                                        <UserCog className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.id, user.name)}
                                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all"
                                                        title="ลบผู้ใช้งาน"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Form Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-none sm:rounded-[3rem] w-full max-w-2xl h-screen sm:h-auto sm:max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center">
                                    <UserCog className="w-7 h-7 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black">{editingUser ? "แก้ไขคุณสมบัติผู้ใช้" : "เพิ่มผู้ใช้งานใหม่"}</h3>
                                    <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">User Access Management</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="h-12 w-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ชื่อ - นามสกุล *</label>
                                    <input required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" placeholder="ระบุชื่อจริง..." value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ชื่อผู้ใช้ (Username) *</label>
                                    <input required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" placeholder="เช่น sumali_j..." value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{editingUser ? "เปลี่ยนรหัสผ่าน (ปล่อยว่างถ้าไม่ต้องการเปลี่ยน)" : "รหัสผ่าน *"}</label>
                                    <input required={!editingUser} type="password" name="password" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" placeholder="••••••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ระดับสิทธิ์ *</label>
                                    <select required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                        {ROLES.map(role => {
                                            const cfg = ROLES_CONFIG[role];
                                            const isDisabled = role === 'SUPER_ADMIN' && users.filter(u => u.role === 'SUPER_ADMIN').length >= MAX_SUPER_ADMINS && formData.role !== 'SUPER_ADMIN';
                                            return <option key={role} value={role} disabled={isDisabled}> {cfg.label}{isDisabled ? ' (เต็มแล้ว)' : ''}</option>;
                                        })}
                                    </select>
                                    {formData.role && <p className="text-[10px] text-slate-400 mt-1.5">{ROLES_CONFIG[formData.role]?.desc}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">หน่วยงาน *</label>
                                    <select required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })}>
                                        <option value="">เลือกหน่วยงาน...</option>
                                        {dbDepartments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">อีเมล</label>
                                    <input type="email" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" placeholder="example@email.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">เบอร์โทรศัพท์</label>
                                    <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" placeholder="08x-xxx-xxxx" value={formData.phoneNumber} onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Facebook (ชื่อโปรไฟล์)</label>
                                    <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" placeholder="ชื่อ Facebook..." value={formData.facebook} onChange={e => setFormData({ ...formData, facebook: e.target.value })} />
                                </div>
                            </div>

                            {/* Role Description */}
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" /> สิทธิ์ของ {ROLES_CONFIG[formData.role]?.label || formData.role}
                                </h4>
                                <p className="text-sm text-slate-600 font-medium">
                                    {formData.role === 'SUPER_ADMIN' && 'ทำได้ทุกอย่าง — จัดการผู้ใช้, แก้ไขทุกหน้า, ตั้งค่าระบบ, ดูรายรับ-รายจ่าย'}
                                    {formData.role === 'ADMIN' && 'จัดการโครงการ, เพิ่มเอกสาร, จัดการคณะกรรมการ, ดูรายรับ-รายจ่าย (อ่านอย่างเดียว)'}
                                    {formData.role === 'FINANCE' && 'จัดการรายรับ-รายจ่ายทั้งหมด, ดูหน้าอื่นได้ (อ่านอย่างเดียว), ขอเอกสารได้'}
                                    {formData.role === 'VIEWER' && 'ดูข้อมูลทุกหน้า, ขอเอกสาร, ดาวน์โหลดเอกสาร — ไม่สามารถแก้ไขข้อมูลใดๆ'}
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="py-3.5 sm:py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all order-2 sm:order-1">ยกเลิก</button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] bg-blue-600 text-white py-3.5 sm:py-4 rounded-xl sm:rounded-[1.5rem] text-sm font-black shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 order-1 sm:order-2"
                                >
                                    {isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                    {editingUser ? "อัปเดตข้อมูล" : "สร้างและยืนยันสิทธิ์"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Bulk Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-none sm:rounded-[3rem] w-full max-w-xl h-screen sm:h-auto shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-8 bg-blue-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center">
                                    <FileUp className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black">นำเข้าข้อมูลสมาชิก (CSV)</h3>
                                    <p className="text-blue-100 text-xs font-bold mt-1 uppercase tracking-widest">Bulk User Import</p>
                                </div>
                            </div>
                            <button onClick={() => setShowUploadModal(false)} className="h-12 w-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            {!uploadResults ? (
                                <>
                                    <div className="space-y-4">
                                        <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-center group hover:border-blue-500 transition-all">
                                            <input
                                                type="file"
                                                accept=".csv"
                                                onChange={handleUploadCsv}
                                                className="hidden"
                                                id="csv-upload"
                                                disabled={isUploading}
                                            />
                                            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                                                {isUploading ? (
                                                    <>
                                                        <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                                                        <p className="text-lg font-black text-slate-800">กำลังประมวลผลข้อมูล...</p>
                                                        <p className="text-sm text-slate-500 font-medium mt-1">กรุณารอสักครู่ ระบบกำลังนำเข้าข้อมูลสมาชิก</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="h-16 w-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                            <FileUp className="w-8 h-8 text-blue-600" />
                                                        </div>
                                                        <p className="text-lg font-black text-slate-800">เลือกไฟล์ CSV</p>
                                                        <p className="text-sm text-slate-500 font-medium mt-1">ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์จากเครื่อง</p>
                                                    </>
                                                )}
                                            </label>
                                        </div>

                                        <div className="flex items-start gap-4 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                                            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="text-xs font-black text-blue-900 uppercase tracking-widest">คำแนะนำการใช้งาน</p>
                                                <ul className="text-[11px] text-blue-700/80 font-bold space-y-1 mt-2 list-disc pl-4">
                                                    <li>ไฟล์ต้องเป็นรูปแบบ CSV (UTF-8) เท่านั้น</li>
                                                    <li>หัวตารางต้องมี: username, password, name, department, role</li>
                                                    <li>ระดับสิทธิ์ระบุเป็น: ผู้ดูแลระบบ, ผู้ใช้งาน, ผู้จัดการการเงิน, ผู้ใช้ทั่วไป</li>
                                                    <li>หากมี username เดิมในระบบ ระบบจะทำการ "อัปเดตทับ" ข้อมูลเดิม</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={downloadTemplate}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                                    >
                                        <Download className="w-5 h-5" /> ดาวน์โหลดไฟล์ตัวอย่าง (.csv)
                                    </button>
                                </>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-3xl text-center">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">สำเร็จ</p>
                                            <h4 className="text-3xl font-black text-emerald-700">{uploadResults.success}</h4>
                                            <p className="text-[10px] text-emerald-600/60 font-bold mt-1">รายการ ({uploadResults.updated} อัปเดต)</p>
                                        </div>
                                        <div className="bg-rose-50 border border-rose-100 p-5 rounded-3xl text-center">
                                            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">ล้มเหลว</p>
                                            <h4 className="text-3xl font-black text-rose-700">{uploadResults.failed}</h4>
                                            <p className="text-[10px] text-rose-600/60 font-bold mt-1">รายการ</p>
                                        </div>
                                    </div>

                                    {uploadResults.errors.length > 0 && (
                                        <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                                            {uploadResults.errors.map((err: any, i: number) => (
                                                <div key={i} className="flex items-center gap-2 text-[11px] font-bold text-rose-600">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    <span>แถวที่ {err.row}: {err.error}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            setUploadResults(null);
                                            setShowUploadModal(false);
                                        }}
                                        className="w-full py-4 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-500/20"
                                    >
                                        ตกลง
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
