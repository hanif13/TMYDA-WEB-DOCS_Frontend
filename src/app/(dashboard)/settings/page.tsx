"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { Save, Building2, Users, FileText, ShieldCheck, Bell, Database } from "lucide-react";

import { DEPARTMENTS } from "@/lib/constants";

export default function SettingsPage() {
    const { data: session } = useSession();
    const isViewer = (session?.user as any)?.role === "VIEWER";

    const [orgName, setOrgName] = useState("ฟิตยะตุลฮัก");
    const [orgNameEn, setOrgNameEn] = useState("Fityatulhak");
    const [fiscalYear, setFiscalYear] = useState("2568-2569");
    const [totalBudget, setTotalBudget] = useState("75000");
    const [phone, setPhone] = useState("089-513-5667");
    const [address, setAddress] = useState("185 ถ.รามคำแหง แขวงราษฎร์พัฒนา เขตสะพานสูง กรุงเทพฯ 10240");
    const [docApprover, setDocApprover] = useState("นายอานัส จิตหลัง");
    const [docReviewer, setDocReviewer] = useState("นายอนีฟ ต่วนมีเด่น");
    const [secretary, setSecretary] = useState("นายซอลีอีน ฮะอุรา");
    const [notifyNewRequest, setNotifyNewRequest] = useState(true);
    const [notifyBudget, setNotifyBudget] = useState(true);
    const [notifyProject, setNotifyProject] = useState(false);

    const handleSave = () => {
        toast.success("บันทึกการตั้งค่าสำเร็จ!", { icon: "⚙️" });
    };

    return (
        <div className="space-y-6 animate-fade-in-up max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ตั้งค่าระบบ</h1>
                    <p className="text-sm text-slate-500 mt-0.5">ข้อมูลองค์กร ผู้รับผิดชอบ และการแจ้งเตือน</p>
                </div>
                {!isViewer && (
                    <button onClick={handleSave}
                        className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-200 transition-colors">
                        <Save className="w-4 h-4" /> บันทึกการตั้งค่า
                    </button>
                )}
            </div>

            {/* System Status */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-400" /> สถานะระบบ
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "ระบบเอกสาร", status: "ใช้งานได้", color: "bg-green-50 text-green-700 border-green-100" },
                        { label: "ระบบงบประมาณ", status: "ใช้งานได้", color: "bg-green-50 text-green-700 border-green-100" },
                        { label: "ระบบโครงการ", status: "ใช้งานได้", color: "bg-green-50 text-green-700 border-green-100" },
                    ].map(s => (
                        <div key={s.label} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium ${s.color}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">{s.label}</p>
                                <p className="opacity-70">{s.status}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-3">ระบบใช้ Mock Data (ข้อมูลจำลอง) — รองรับทุก Feature แบบ Offline</p>
            </div>

            {/* Organization Info */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" /> ข้อมูลองค์กร
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ชื่อองค์กร (ภาษาไทย)</label>
                        <input value={orgName} onChange={e => !isViewer && setOrgName(e.target.value)} readOnly={isViewer}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none focus:border-blue-400 transition-all" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ชื่อองค์กร (ภาษาอังกฤษ)</label>
                        <input value={orgNameEn} onChange={e => !isViewer && setOrgNameEn(e.target.value)} readOnly={isViewer}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none focus:border-blue-400 transition-all" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ปีงบประมาณ</label>
                        <input value={fiscalYear} onChange={e => !isViewer && setFiscalYear(e.target.value)} readOnly={isViewer}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none focus:border-blue-400 transition-all" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">งบประมาณรวม (บาท)</label>
                        <input type="number" value={totalBudget} onChange={e => !isViewer && setTotalBudget(e.target.value)} readOnly={isViewer}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none focus:border-blue-400 transition-all" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">เบอร์โทรศัพท์</label>
                        <input value={phone} onChange={e => !isViewer && setPhone(e.target.value)} readOnly={isViewer}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none focus:border-blue-400 transition-all" />
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ที่อยู่</label>
                        <input value={address} onChange={e => !isViewer && setAddress(e.target.value)} readOnly={isViewer}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none focus:border-blue-400 transition-all" />
                    </div>
                </div>
            </div>

            {/* Organization Structure */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" /> โครงสร้างองค์กร (หน่วยงานและสำนัก/หน่วยงาน)
                </h2>
                <div className="space-y-4">
                    {DEPARTMENTS.map(dept => (
                        <div key={dept.id} className="border border-slate-100 rounded-xl overflow-hidden">
                            <div className={`px-4 py-3 font-semibold text-sm ${dept.color.replace('text-', '').replace('800', '').replace('bg-', 'bg-').replace('100', '50')} border-b border-slate-100 flex items-center gap-2`}>
                                <span className={`w-2 h-2 rounded-full ${dept.dot}`} />
                                <span className={`text-${dept.color.split('text-')[1]}`}>{dept.name}</span>
                            </div>
                            <div className="p-4 bg-white">
                                <div className="flex flex-wrap gap-2">
                                    {dept.subDepts?.map(sub => (
                                        <span key={sub} className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-[11px] rounded-lg font-medium">
                                            {sub}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Document Signatories */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-500" /> ผู้ลงนามและผู้รับผิดชอบเอกสาร
                </h2>
                <p className="text-xs text-slate-400 mb-4">ชื่อเหล่านี้จะถูกใช้ในเอกสารที่จัดทำโดยเลขานุการ</p>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ผู้อนุมัติ (นายกสมาคม)</label>
                        <input value={docApprover} onChange={e => !isViewer && setDocApprover(e.target.value)} readOnly={isViewer}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none focus:border-blue-400 transition-all" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ผู้ตรวจสอบ (ผู้อำนวยการสำนักเลขานุการ)</label>
                        <input value={docReviewer} onChange={e => !isViewer && setDocReviewer(e.target.value)} readOnly={isViewer}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none focus:border-blue-400 transition-all" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ผู้จัดทำ / เลขานุการ (ผู้อำนวยการสำนักบริหารงบประมาณ)</label>
                        <input value={secretary} onChange={e => !isViewer && setSecretary(e.target.value)} readOnly={isViewer}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none focus:border-blue-400 transition-all" />
                    </div>
                </div>
            </div>

            {/* Document Types reference */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500" /> สรุประบบเอกสาร
                </h2>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { icon: "📁", label: "เอกสารโครงการ", desc: "ขอจัดทำโครงการใหม่" },
                        { icon: "💰", label: "ขออนุมัติเบิกเงิน", desc: "หนังสือขออนุมัติเบิกเงิน + รายการค่าใช้จ่าย" },
                        { icon: "🧾", label: "รายงานการใช้เงิน", desc: "รายงานหลังจัดกิจกรรม พร้อมคืนเงิน" },
                        { icon: "✉️", label: "หนังสือเชิญ", desc: "เชิญวิทยากรและผู้เข้าร่วม" },
                        { icon: "📤", label: "หนังสือภายนอก", desc: "ติดต่อหน่วยงานภายนอก" },
                        { icon: "📋", label: "หนังสือภายใน", desc: "บันทึกภายในองค์กร" },
                        { icon: "📢", label: "ประกาศ", desc: "ประกาศสมาคมพร้อมเลขที่" },
                        { icon: "📊", label: "รายงานผลโครงการ", desc: "รายงานปิดโครงการ" },
                    ].map(t => (
                        <div key={t.label} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-base flex-shrink-0 mt-0.5">{t.icon}</span>
                            <div>
                                <p className="text-xs font-semibold text-slate-700">{t.label}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{t.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500" /> การแจ้งเตือน
                </h2>
                <div className="space-y-3">
                    {[
                        { label: "แจ้งเตือนเมื่อมีคำขอเอกสารใหม่", value: notifyNewRequest, set: setNotifyNewRequest },
                        { label: "แจ้งเตือนเมื่อมีการเบิกงบประมาณ", value: notifyBudget, set: setNotifyBudget },
                        { label: "แจ้งเตือนการอัปเดตสถานะโครงการ", value: notifyProject, set: setNotifyProject },
                    ].map(n => (
                        <label key={n.label} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                            <span className="text-sm text-slate-700">{n.label}</span>
                            <button type="button" onClick={() => !isViewer && n.set(!n.value)} disabled={isViewer}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${n.value ? "bg-blue-600" : "bg-slate-200"} ${isViewer ? "opacity-60 cursor-not-allowed" : ""}`}>
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${n.value ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                            </button>
                        </label>
                    ))}
                </div>
            </div>

            {/* Users shortcut */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" /> การจัดการผู้ใช้งาน
                </h2>
                <p className="text-xs text-slate-400 mb-3">เพิ่ม/แก้ไข/ลบบัญชีผู้ใช้งานได้ที่หน้าจัดการผู้ใช้</p>
                <a href="/users" className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors">
                    ไปยังหน้าผู้ใช้งาน →
                </a>
            </div>
        </div>
    );
}
