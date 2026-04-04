"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
    KeyRound, Eye, EyeOff, Shield, User, CheckCircle2, 
    AlertCircle, Lock, Loader2, Mail, Phone, Facebook, 
    Building2, Edit3, Save, X, Github, ExternalLink 
} from "lucide-react";
import { changePassword, updateMyProfile, fetchDepartments, getMyProfile } from "@/lib/api";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

const ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: string }> = {
    SUPER_ADMIN: { label: 'ผู้ดูแลระบบ', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', icon: '🛡️' },
    ADMIN: { label: 'ผู้ใช้งาน', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', icon: '👤' },
    FINANCE: { label: 'ผู้จัดการการเงิน', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: '💰' },
    VIEWER: { label: 'ผู้ใช้ทั่วไป', color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200', icon: '👁️' },
};

export default function ProfilePage() {
    const { data: session } = useSession();
    const user = session?.user as any;
    const role = user?.role || "VIEWER";
    const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.VIEWER;

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Profile Info Editing
    const [isEditing, setIsEditing] = useState(false);
    const [profileData, setProfileData] = useState({
        name: "",
        email: "",
        phoneNumber: "",
        facebook: "",
        departmentId: ""
    });
    const [dbDepartments, setDbDepartments] = useState<any[]>([]);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [updatingProfile, setUpdatingProfile] = useState(false);

    useEffect(() => {
        const loadProfileData = async () => {
            try {
                const [fullProfile, depts] = await Promise.all([
                    getMyProfile(),
                    fetchDepartments()
                ]);
                
                setProfileData({
                    name: fullProfile.name || "",
                    email: fullProfile.email || "",
                    phoneNumber: fullProfile.phoneNumber || "",
                    facebook: fullProfile.facebook || "",
                    departmentId: fullProfile.departmentId || ""
                });
                setDbDepartments(depts);
            } catch (error) {
                console.error("Failed to load profile data:", error);
                toast.error("ไม่สามารถโหลดข้อมูลโปรไฟล์ได้");
            } finally {
                setLoadingProfile(false);
            }
        };

        loadProfileData();
    }, []);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdatingProfile(true);
        try {
            await updateMyProfile(profileData);
            toast.success("อัปเดตข้อมูลโปรไฟล์สำเร็จ ✅");
            setIsEditing(false);
            // Optionally reload page or update session if needed
            // For now, the local state is updated
        } catch (error: any) {
            toast.error(error?.message || "ไม่สามารถอัปเดตข้อมูลได้");
        } finally {
            setUpdatingProfile(false);
        }
    };

    const isValidLength = newPassword.length >= 6;
    const isMatching = newPassword === confirmPassword && confirmPassword.length > 0;
    const canSubmit = currentPassword.length > 0 && isValidLength && isMatching && !submitting;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        setSubmitting(true);
        try {
            await changePassword({ currentPassword, newPassword });
            toast.success("เปลี่ยนรหัสผ่านสำเร็จ ✅");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            toast.error(error?.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-8 animate-fade-in-up">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                    <User className="w-7 h-7 text-blue-600" />
                    โปรไฟล์ของฉัน
                </h1>
                <p className="text-sm text-slate-500 mt-1">จัดการข้อมูลบัญชีและเปลี่ยนรหัสผ่าน</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                {/* Profile Header */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-8 py-8 relative overflow-hidden">
                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
                    
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-2xl shadow-indigo-500/30 ring-4 ring-white/10">
                                {profileData.name.charAt(0) || user?.name?.charAt(0) || "U"}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-2xl font-black text-white tracking-tight leading-tight mb-1">{profileData.name || user?.name || "ผู้ใช้งาน"}</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">@{user?.username || "user"}</p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setIsEditing(!isEditing)}
                            className={cn(
                                "flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-black transition-all flex-shrink-0 w-full sm:w-auto",
                                isEditing 
                                    ? "bg-rose-500 text-white shadow-lg shadow-rose-900/40 hover:bg-rose-600" 
                                    : "bg-white text-slate-900 shadow-xl shadow-slate-950/20 hover:bg-blue-50"
                            )}
                        >
                            {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                            {isEditing ? "ยกเลิกการแก้ไข" : "แก้ไขข้อมูลส่วนตัว"}
                        </button>
                    </div>
                </div>

                {/* Profile Info Form / View */}
                <div className="px-8 py-6">
                    {isEditing ? (
                        <form onSubmit={handleProfileUpdate} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Name */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ชื่อ-นามสกุล</label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text"
                                            value={profileData.name}
                                            onChange={e => setProfileData({...profileData, name: e.target.value})}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-blue-500/50"
                                            placeholder="ระบุชื่อ-นามสกุล..."
                                        />
                                    </div>
                                </div>
                                
                                {/* Department */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">หน่วยงาน</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select 
                                            value={profileData.departmentId}
                                            onChange={e => setProfileData({...profileData, departmentId: e.target.value})}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-blue-500/50 appearance-none"
                                        >
                                            <option value="">ไม่ระบุ</option>
                                            {dbDepartments.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">อีเมล</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="email"
                                            value={profileData.email}
                                            onChange={e => setProfileData({...profileData, email: e.target.value})}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-blue-500/50"
                                            placeholder="example@email.com"
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เบอร์โทรศัพท์</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text"
                                            value={profileData.phoneNumber}
                                            onChange={e => setProfileData({...profileData, phoneNumber: e.target.value})}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-blue-500/50"
                                            placeholder="08x-xxx-xxxx"
                                        />
                                    </div>
                                </div>

                                {/* Facebook Handle */}
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facebook (ชื่อโปรไฟล์)</label>
                                    <div className="relative">
                                        <Facebook className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text"
                                            value={profileData.facebook}
                                            onChange={e => setProfileData({...profileData, facebook: e.target.value})}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-blue-500/50"
                                            placeholder="ระบุชื่อ Facebook..."
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-2">
                                <button 
                                    disabled={updatingProfile}
                                    className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group"
                                >
                                    {updatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                                    {updatingProfile ? "กำลังบันทึก..." : "บันทึกข้อมูลส่วนตัว"}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <User className="w-3.5 h-3.5 text-blue-500" /> ชื่อผู้ใช้งาน
                                    </p>
                                    <p className="text-sm font-extrabold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 inline-block">@{user?.username || "—"}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5 text-indigo-500" /> หน่วยงาน
                                    </p>
                                    <p className="text-sm font-extrabold text-slate-800 leading-relaxed">
                                        {dbDepartments.find(d => d.id === profileData.departmentId)?.name || user?.department || "ไม่ระบุ"}
                                    </p>
                                </div>
                                <div className="space-y-2 lg:col-span-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5 text-rose-500" /> อีเมล
                                    </p>
                                    <p className="text-sm font-extrabold text-slate-800 break-all">{profileData.email || "—"}</p>
                                </div>
                                <div className="space-y-2 lg:col-span-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5 text-emerald-500" /> เบอร์โทรศัพท์
                                    </p>
                                    <p className="text-sm font-extrabold text-slate-800">{profileData.phoneNumber || "—"}</p>
                                </div>
                                <div className="space-y-2 col-span-1 sm:col-span-2">
                                    <div className="h-px w-full bg-slate-50 my-2" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Facebook className="w-3.5 h-3.5 text-blue-600" /> Facebook
                                    </p>
                                    <p className="text-sm font-extrabold text-slate-800">{profileData.facebook || "—"}</p>
                                </div>
                            </div>
                            
                            {/* Role Badge */}
                            <div className="pt-2 border-t border-slate-50 mt-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ระดับสิทธิ์</p>
                                <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl border", roleConfig.bgColor, roleConfig.borderColor)}>
                                    <span>{roleConfig.icon}</span>
                                    <span className={cn("text-sm font-bold", roleConfig.color)}>{roleConfig.label}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Password Change */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg">
                            <KeyRound className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">เปลี่ยนรหัสผ่าน</h3>
                            <p className="text-xs text-slate-500">กรุณายืนยันรหัสผ่านเก่าก่อนเปลี่ยน</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
                    {/* Current Password */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">รหัสผ่านปัจจุบัน</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type={showCurrent ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="กรอกรหัสผ่านปัจจุบัน..."
                                className="w-full pl-11 pr-12 py-3 border-2 border-slate-100 rounded-xl text-sm font-medium outline-none focus:border-blue-500/50 bg-slate-50/50 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">รหัสผ่านใหม่</label>
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type={showNew ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="กรอกรหัสผ่านใหม่ (ขั้นต่ำ 6 ตัวอักษร)..."
                                className="w-full pl-11 pr-12 py-3 border-2 border-slate-100 rounded-xl text-sm font-medium outline-none focus:border-blue-500/50 bg-slate-50/50 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {newPassword.length > 0 && (
                            <div className={cn("flex items-center gap-1.5 text-xs font-medium mt-1", isValidLength ? "text-emerald-600" : "text-orange-500")}>
                                {isValidLength ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                {isValidLength ? "ความยาวรหัสผ่านผ่านเกณฑ์" : `ต้องมีอย่างน้อย 6 ตัวอักษร (${newPassword.length}/6)`}
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">ยืนยันรหัสผ่านใหม่</label>
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type={showConfirm ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง..."
                                className="w-full pl-11 pr-12 py-3 border-2 border-slate-100 rounded-xl text-sm font-medium outline-none focus:border-blue-500/50 bg-slate-50/50 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {confirmPassword.length > 0 && (
                            <div className={cn("flex items-center gap-1.5 text-xs font-medium mt-1", isMatching ? "text-emerald-600" : "text-red-500")}>
                                {isMatching ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                {isMatching ? "รหัสผ่านตรงกัน" : "รหัสผ่านไม่ตรงกัน"}
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className={cn(
                                "w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2",
                                canSubmit
                                    ? "bg-slate-900 hover:bg-blue-600 text-white shadow-lg active:scale-[0.98]"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            )}
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <KeyRound className="w-4 h-4" />
                            )}
                            {submitting ? "กำลังเปลี่ยนรหัสผ่าน..." : "เปลี่ยนรหัสผ่าน"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
