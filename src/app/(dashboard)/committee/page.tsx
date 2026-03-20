
"use client";

import { useEffect, useState, useRef } from 'react';
import { Users, Mail, Phone, Briefcase, Plus, Trash2, X, Upload, Camera } from 'lucide-react';
import { fetchCommitteeMembers, createCommitteeMember, deleteCommitteeMember } from '@/lib/api';
import { CommitteeMember } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useYear } from '@/context/YearContext';

export default function CommitteePage() {
    const { data: session } = useSession();
    const { selectedYear } = useYear();
    const userRole = (session?.user as any)?.role;
    const canEdit = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
    
    const [members, setMembers] = useState<CommitteeMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        position: '',
        phoneNumber: '',
        email: '',
        occupation: '',
        departmentId: 'admin',
        order: '0'
    });
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const departments = [
        { id: 'admin', name: 'สำนักอำนวยการ', color: 'bg-blue-600', text: 'text-blue-600' },
        { id: 'family', name: 'ครอบครัวฟิตยะตุลฮัก', color: 'bg-emerald-600', text: 'text-emerald-600' },
        { id: 'tmyda', name: 'สมาคมพัฒนาเยาวชนมุสลิมไทย', color: 'bg-indigo-600', text: 'text-indigo-600' },
        { id: 'women', name: 'สำนักกิจการสตรี สมาคมฯ', color: 'bg-pink-600', text: 'text-pink-600' },
    ];

    const loadMembers = async () => {
        try {
            setLoading(true);
            const data = await fetchCommitteeMembers(selectedYear || undefined);
            setMembers(data);
        } catch (error) {
            console.error("Error loading committee members:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMembers();
    }, [selectedYear]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const data = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                data.append(key, value);
            });
            if (photo) {
                data.append('photo', photo);
            }
            if (selectedYear) {
                data.append('thaiYear', selectedYear.toString());
            }

            await createCommitteeMember(data);
            toast.success("เพิ่มรายชื่อสำเร็จ");
            setIsModalOpen(false);
            setFormData({
                name: '',
                position: '',
                phoneNumber: '',
                email: '',
                occupation: '',
                departmentId: 'admin',
                order: '0'
            });
            setPhoto(null);
            setPhotoPreview(null);
            loadMembers();
        } catch (error) {
            toast.error("ไม่สามารถเพิ่มรายชื่อได้");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`ยืนยันการลบคุณ ${name}?`)) return;
        
        try {
            await deleteCommitteeMember(id);
            toast.success("ลบรายชื่อสำเร็จ");
            loadMembers();
        } catch (error) {
            toast.error("ไม่สามารถลบรายชื่อได้");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Users className="w-8 h-8 text-blue-600" />
                        คณะกรรมการ
                    </h1>
                    <p className="text-slate-500">ทำเนียบคณะกรรมการและเจ้าหน้าที่แต่ละหน่วยงาน</p>
                </div>

                {canEdit && (
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-200"
                    >
                        <Plus className="w-5 h-5" />
                        เพิ่มรายชื่อ
                    </button>
                )}
            </div>

            {departments.map((dept) => {
                const deptMembers = members.filter(m => m.departmentId === dept.id);
                // Only hide if empty AND NOT admin (admin should see all to add)
                if (deptMembers.length === 0 && !canEdit) return null;

                return (
                    <div key={dept.id} className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className={cn("h-8 w-1 rounded-full", dept.color)} />
                            <h2 className="text-xl font-bold text-slate-800">{dept.name}</h2>
                        </div>

                        {deptMembers.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {deptMembers.map((member) => (
                                    <div key={member.id} className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all duration-200 relative">
                                        {canEdit && (
                                            <button 
                                                onClick={() => handleDelete(member.id, member.name)}
                                                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        
                                        <div className="flex gap-4">
                                            <div className="h-24 w-24 rounded-2xl bg-slate-50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-100">
                                                {member.photoUrl ? (
                                                    <img 
                                                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${member.photoUrl}`} 
                                                        alt={member.name} 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                ) : (
                                                    <Users className="w-10 h-10 text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                                    {member.name}
                                                </h3>
                                                <p className="text-sm font-medium text-slate-500 mb-2">
                                                    {member.position}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-50 space-y-2.5">
                                            {member.phoneNumber && (
                                                <div className="flex items-center gap-2.5 text-xs text-slate-600">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{member.phoneNumber}</span>
                                                </div>
                                            )}
                                            {member.email && (
                                                <div className="flex items-center gap-2.5 text-xs text-slate-600">
                                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="truncate">{member.email}</span>
                                                </div>
                                            )}
                                            {member.occupation && (
                                                <div className="flex items-center gap-2.5 text-xs text-slate-600">
                                                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="truncate">{member.occupation}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl py-12 flex flex-col items-center justify-center gap-3">
                                <Users className="w-8 h-8 text-slate-300" />
                                <p className="text-sm text-slate-400 font-medium">ยังไม่มีข้อมูลในส่วนนี้</p>
                                <button 
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, departmentId: dept.id }));
                                        setIsModalOpen(true);
                                    }}
                                    className="text-blue-600 text-sm font-bold hover:underline"
                                >
                                    เพิ่มรายชื่อแรก
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Create Member Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">เพิ่มรายชื่อคณะกรรมการ</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Photo Upload */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="h-32 w-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden group-hover:border-blue-400 transition-all">
                                        {photoPreview ? (
                                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 text-slate-400">
                                                <Camera className="w-8 h-8" />
                                                <span className="text-[10px] font-bold">อัพโหลดรูป</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">ชื่อ-นามสกุล</label>
                                    <input
                                        required
                                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="เช่น นายมานะ ใจดี"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">ตำแหน่ง</label>
                                        <input
                                            required
                                            className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                            placeholder="เช่น ประธานโครงการ"
                                            value={formData.position}
                                            onChange={e => setFormData({ ...formData, position: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">เบอร์โทรศัพท์</label>
                                        <input
                                            className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                            placeholder="Ex. 081-234-5678"
                                            value={formData.phoneNumber}
                                            onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">อีเมล</label>
                                    <input
                                        type="email"
                                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="example@email.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">อาชีพปัจจุบัน</label>
                                    <input
                                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="เช่น ข้าราชการครู"
                                        value={formData.occupation}
                                        onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">หน่วยงาน</label>
                                    <select
                                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                        value={formData.departmentId}
                                        onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                                    >
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button
                                disabled={isSubmitting}
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    "บันทึกข้อมูล"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
