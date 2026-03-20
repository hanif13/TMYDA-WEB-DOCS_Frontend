"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
    Users, ShieldCheck, User, Plus, MoreHorizontal, 
    Loader, X, Check, Trash2, Key, Mail, Building2,
    ShieldAlert, Eye, UserCog
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { 
    fetchUsers, createUser, updateUser, deleteUser,
    fetchDepartments 
} from "@/lib/api";
import { DEPARTMENTS } from "@/lib/constants";

const ROLES = ["SUPER_ADMIN", "ADMIN", "VIEWER"];

const PERMISSIONS = [
    { id: 'ACCESS_DASHBOARD', label: 'หน้าหลัก (Dashboard)' },
    { id: 'ACCESS_COMPLETED_PROJECTS', label: 'โครงการที่เสร็จสิ้น' },
    { id: 'ACCESS_COMMITTEE', label: 'คณะกรรมการ' },
    { id: 'ACCESS_DOCUMENTS', label: 'การจัดการเอกสาร' },
    { id: 'ACCESS_REGISTRY', label: 'ทะเบียนเอกสาร' },
    { id: 'ACCESS_INCOME_EXPENSE', label: 'รายรับ-รายจ่าย' },
    { id: 'ACCESS_ANNUAL_PROJECTS', label: 'โครงการประจำปี' },
    { id: 'ACCESS_PROJECTS', label: 'จัดการโครงการ' },
    { id: 'ACCESS_USERS', label: 'จัดการผู้ใช้งาน' },
    { id: 'ACCESS_YEARS', label: 'จัดการปีการทำงาน' },
];

const roleColors: Record<string, string> = {
    "SUPER_ADMIN": "bg-purple-100 text-purple-700 border-purple-200",
    "ADMIN": "bg-blue-100 text-blue-700 border-blue-200",
    "VIEWER": "bg-slate-100 text-slate-600 border-slate-200",
};

export default function UsersPage() {
    const { data: session } = useSession();
    const isSuperAdmin = (session?.user as any)?.role === "SUPER_ADMIN";

    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [deptFilter, setDeptFilter] = useState("all");

    // Form state
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        name: "",
        role: "VIEWER",
        departmentId: "",
        permissions: [] as string[]
    });

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await fetchUsers();
            setUsers(data);
        } catch (error) {
            toast.error("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

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
                permissions: user.permissions || []
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: "",
                password: "",
                name: "",
                role: "VIEWER",
                departmentId: DEPARTMENTS[0].id,
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
                    <button 
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-bold px-6 py-3.5 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> เพิ่มผู้ใช้งานใหม่
                    </button>
                )}
            </div>

            {/* Role Summary Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {ROLES.map((role) => {
                    const count = users.filter(u => u.role === role).length;
                    return (
                        <div key={role} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{role}</p>
                            <div className="flex items-end justify-between">
                                <h3 className="text-2xl font-black text-slate-800">{count}</h3>
                                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", roleColors[role])}>
                                    <UserCog className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between bg-white gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">รายชื่อสมาชิกทั้งหมด ({filteredUsers.length})</h3>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select 
                                className="pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                                value={deptFilter}
                                onChange={e => setDeptFilter(e.target.value)}
                            >
                                <option value="all">ทุกหน่วยงาน</option>
                                {DEPARTMENTS.map(d => (
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
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold mt-0.5">
                                                        <Mail className="w-3 h-3" /> @{user.username}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-5">
                                            <span className={cn(
                                                "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border",
                                                roleColors[user.role]
                                            )}>
                                                {user.role}
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
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
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
                                        {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">หน่วยงาน *</label>
                                <select required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })}>
                                    <option value="">เลือกหน่วยงาน...</option>
                                    {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>

                            {/* Permissions Grid */}
                            <div>
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" /> กำหนดสิทธิ์การเข้าถึงหน้าต่าง ๆ
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {PERMISSIONS.map(perm => (
                                        <button 
                                            key={perm.id} 
                                            type="button"
                                            onClick={() => togglePermission(perm.id)}
                                            className={cn(
                                                "flex items-center justify-between p-4 rounded-2xl border-2 transition-all group",
                                                formData.permissions.includes(perm.id) 
                                                    ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" 
                                                    : "bg-white border-slate-50 text-slate-400 hover:border-slate-100"
                                            )}
                                        >
                                            <span className="text-xs font-bold">{perm.label}</span>
                                            {formData.permissions.includes(perm.id) ? (
                                                <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            ) : (
                                                <div className="h-5 w-5 rounded-full border border-slate-200 group-hover:border-slate-300" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all">ยกเลิก</button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="flex-[2] bg-blue-600 text-white py-4 rounded-[1.5rem] text-sm font-black shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                    {editingUser ? "อัปเดตข้อมูลผู้ใช้" : "สร้างและยืนยันสิทธิ์"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
