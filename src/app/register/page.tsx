"use client";

import { useState } from "react";
import {
    UserPlus, User, Phone, Mail, MapPin, Briefcase,
    CalendarDays, Loader, CheckCircle2, ArrowRight,
    GraduationCap, Heart, Users, Building, MessageCircle,
    Droplets, AlertTriangle, Sparkles, Star
} from "lucide-react";
import { motion } from "framer-motion";
import { registerMember } from "@/lib/api";

const PROVINCES = [
    "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร",
    "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท",
    "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง",
    "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม",
    "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส",
    "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์",
    "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พะเยา", "พังงา",
    "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์",
    "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน",
    "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง",
    "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย",
    "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ",
    "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี",
    "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย",
    "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์",
    "อุทัยธานี", "อุบลราชธานี"
];

const BLOOD_TYPES = ["A", "B", "AB", "O", "ไม่ทราบ"];
const MARITAL_STATUSES = ["โสด", "แต่งงานแล้ว", "หย่าร้าง"];
const EDUCATION_LEVELS = [
    "มัธยมศึกษาตอนต้น", "มัธยมศึกษาตอนปลาย / ปวช.",
    "อนุปริญญา / ปวส.", "ปริญญาตรี", "ปริญญาโท", "ปริญญาเอก", "อื่นๆ"
];

const ACTIVITY_LIST = [
    { key: "fityatulhak", label: "ค่ายฟิตยะตุลฮัก", extra: "batch", placeholder: "รุ่นที่" },
    { key: "robbani", label: "ค่ายร็อบบานีย์", extra: "batch", placeholder: "รุ่นที่" },
    { key: "camp", label: "ค่ายดอกไม้แห่งอิสลาม", extra: "batch", placeholder: "รุ่นที่" },
    { key: "standup", label: "ค่าย Stand Up", extra: "batch", placeholder: "รุ่นที่ สาขา" },
    { key: "pobpa", label: "พบปะ", extra: "location", placeholder: "สถานที่" },
    { key: "halaqah", label: "หัลเกาะฮฺ", extra: "location", placeholder: "สถานที่" },
    { key: "seminar", label: "สัมมนา", extra: "year", placeholder: "ปี พ.ศ." },
    { key: "other", label: "อื่นๆ", extra: "detail", placeholder: "โปรดระบุ" },
];

type FormData = {
    // 1. ข้อมูลส่วนตัว
    fullName: string;
    nickname: string;
    birthDate: string;
    age: string;
    bloodType: string;
    // 2. ข้อมูลติดต่อ
    address: string;
    phoneNumber: string;
    email: string;
    facebook: string;
    lineId: string;
    emergencyContact: string;
    // 3. การศึกษา
    education: string;
    institution: string;
    fieldOfStudy: string;
    // 4. อาชีพ/ข้อมูลครอบครัว
    occupation: string;
    workplace: string;
    workProvince: string;
    maritalStatus: string;
    childrenBoys: string;
    childrenGirls: string;
    childrenAges: string;
    // 5. ความเกี่ยวข้องกับกลุ่มองค์กร
    knowFrom: string;
    // 6. ข้อมูลเพิ่มเติม
    skills: string;
    interests: string;
};

const initialFormData: FormData = {
    fullName: "", nickname: "", birthDate: "", age: "", bloodType: "",
    address: "", phoneNumber: "", email: "", facebook: "", lineId: "", emergencyContact: "",
    education: "", institution: "", fieldOfStudy: "",
    occupation: "", workplace: "", workProvince: "", maritalStatus: "",
    childrenBoys: "", childrenGirls: "", childrenAges: "",
    knowFrom: "",
    skills: "", interests: "",
};

const MONTHS_TH = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

type ActivityState = Record<string, { selected: boolean; detail: string }>;

const initialActivities: ActivityState = Object.fromEntries(
    ACTIVITY_LIST.map(a => [a.key, { selected: false, detail: "" }])
);

export default function RegisterPage() {
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [activities, setActivities] = useState<ActivityState>(initialActivities);
    const [bDay, setBDay] = useState("");
    const [bMonth, setBMonth] = useState("");
    const [bYear, setBYear] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

    const handleChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const toggleActivity = (key: string) => {
        setActivities(prev => ({
            ...prev,
            [key]: { ...prev[key], selected: !prev[key].selected, detail: !prev[key].selected ? prev[key].detail : "" }
        }));
    };

    const setActivityDetail = (key: string, detail: string) => {
        setActivities(prev => ({
            ...prev,
            [key]: { ...prev[key], detail }
        }));
    };

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof FormData, string>> = {};

        if (!formData.fullName.trim()) newErrors.fullName = "กรุณากรอกชื่อ-สกุล";
        if (!formData.phoneNumber.trim()) {
            newErrors.phoneNumber = "กรุณากรอกเบอร์โทรศัพท์";
        } else if (!/^[0-9]{9,10}$/.test(formData.phoneNumber.replace(/[-\s]/g, ''))) {
            newErrors.phoneNumber = "เบอร์โทรศัพท์ไม่ถูกต้อง";
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "รูปแบบอีเมลไม่ถูกต้อง";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            // Build activities JSON
            const activitiesJson: any = {};
            Object.entries(activities).forEach(([key, val]) => {
                if (val.selected) {
                    activitiesJson[key] = val.detail ? { selected: true, detail: val.detail } : true;
                }
            });

            // Format Birth Date
            let formattedBirthDate: string | undefined = undefined;
            if (bDay && bMonth && bYear) {
                const yearAD = parseInt(bYear) - 543;
                formattedBirthDate = `${yearAD}-${bMonth.padStart(2, '0')}-${bDay.padStart(2, '0')}`;
            }

            await registerMember({
                fullName: formData.fullName,
                nickname: formData.nickname || undefined,
                birthDate: formattedBirthDate,
                age: undefined,
                bloodType: formData.bloodType || undefined,
                address: formData.address || undefined,
                phoneNumber: formData.phoneNumber,
                email: formData.email || undefined,
                facebook: formData.facebook || undefined,
                lineId: formData.lineId || undefined,
                emergencyContact: formData.emergencyContact || undefined,
                education: formData.education || undefined,
                institution: formData.institution || undefined,
                fieldOfStudy: formData.fieldOfStudy || undefined,
                occupation: formData.occupation || undefined,
                workplace: formData.workplace || undefined,
                workProvince: formData.workProvince || undefined,
                maritalStatus: formData.maritalStatus || undefined,
                childrenBoys: formData.childrenBoys ? parseInt(formData.childrenBoys) : undefined,
                childrenGirls: formData.childrenGirls ? parseInt(formData.childrenGirls) : undefined,
                childrenAges: formData.childrenAges || undefined,
                knowFrom: formData.knowFrom || undefined,
                activities: Object.keys(activitiesJson).length > 0 ? activitiesJson : undefined,
                skills: formData.skills || undefined,
                interests: formData.interests || undefined,
            });
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error("Registration error:", error);
            alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
        }
    };

    // ──────────── SUCCESS STATE ────────────
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-100 blur-[120px] rounded-full" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="relative z-10 text-center max-w-md p-8"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-200"
                    >
                        <CheckCircle2 className="w-12 h-12 text-white" />
                    </motion.div>

                    <h1 className="text-3xl font-black text-slate-900 mb-3">สมัครสมาชิกสำเร็จ!</h1>
                    <p className="text-slate-500 leading-relaxed mb-2">
                        ขอบคุณที่สมัครเป็นสมาชิก<br />
                        <strong className="text-slate-700">สมาคมพัฒนาเยาวชนมุสลิมไทย</strong>
                    </p>
                    <p className="text-sm text-slate-400">ทีมงานจะตรวจสอบข้อมูลและแจ้งผลให้ทราบในภายหลัง</p>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-4"
                    >
                        <p className="text-xs font-bold text-emerald-700">✓ ข้อมูลของคุณได้รับการบันทึกเรียบร้อยแล้ว</p>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    // ──────────── REGISTRATION FORM ────────────
    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-50">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-100 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 blur-[120px] rounded-full" />
            <div className="absolute top-[30%] right-[10%] w-[25%] h-[25%] bg-indigo-100 blur-[100px] rounded-full" />

            <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 sm:py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-8"
                >
                    <div className="w-24 h-24 mx-auto mb-4 overflow-hidden transform hover:scale-110 transition-transform duration-500 cursor-pointer">
                        <img src="/favicon.ico" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">สมัครสมาชิก</h1>
                    <p className="text-sm text-slate-500">สมาคมพัฒนาเยาวชนมุสลิมไทย | Thai Muslim Youth Development Association</p>
                </motion.div>

                {/* Form Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#009EDB] via-[#0072B5] to-[#009EDB]" />

                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* ═══ 1. ข้อมูลส่วนตัว ═══ */}
                        <div>
                            <SectionHeader icon={User} label="1. ข้อมูลส่วนตัว" color="text-blue-500" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <FormInput label="ชื่อ-สกุล" required value={formData.fullName} onChange={(v) => handleChange("fullName", v)} placeholder="เช่น มูฮัมหมัด อะลี" icon={User} error={errors.fullName} className="sm:col-span-2" />
                                <FormInput label="ชื่อเล่น" value={formData.nickname} onChange={(v) => handleChange("nickname", v)} placeholder="เช่น หมัด" />
                                
                                {/* Birth Date (พ.ศ.) */}
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="text-sm font-semibold text-slate-700">วัน/เดือน/ปีเกิด (พ.ศ.)</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <select value={bDay} onChange={(e) => setBDay(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#009EDB]/20 focus:border-[#009EDB] transition-all appearance-none">
                                            <option value="">วัน</option>
                                            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <select value={bMonth} onChange={(e) => setBMonth(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#009EDB]/20 focus:border-[#009EDB] transition-all appearance-none">
                                            <option value="">เดือน</option>
                                            {MONTHS_TH.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                        </select>
                                        <select value={bYear} onChange={(e) => setBYear(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#009EDB]/20 focus:border-[#009EDB] transition-all appearance-none">
                                            <option value="">ปี พ.ศ.</option>
                                            {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() + 543 - i).map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Blood Type */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">กรุ๊ปเลือด</label>
                                    <div className="flex gap-2">
                                        {BLOOD_TYPES.map(bt => (
                                            <button key={bt} type="button" onClick={() => handleChange("bloodType", formData.bloodType === bt ? "" : bt)}
                                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${formData.bloodType === bt
                                                    ? "bg-red-500 text-white border-red-500 shadow-sm"
                                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-red-300"
                                                    }`}
                                            >{bt}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* ═══ 2. ข้อมูลติดต่อ ═══ */}
                        <div>
                            <SectionHeader icon={Phone} label="2. ข้อมูลติดต่อ" color="text-emerald-500" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">ที่อยู่ตามทะเบียนบ้าน</label>
                                    <textarea value={formData.address} onChange={(e) => handleChange("address", e.target.value)}
                                        placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                                        rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#009EDB]/20 focus:border-[#009EDB] transition-all resize-none"
                                    />
                                </div>
                                <FormInput label="เบอร์โทรติดต่อ" required type="tel" value={formData.phoneNumber} onChange={(v) => handleChange("phoneNumber", v)} placeholder="08x-xxx-xxxx" icon={Phone} error={errors.phoneNumber} />
                                <FormInput label="E-mail" type="email" value={formData.email} onChange={(v) => handleChange("email", v)} placeholder="example@email.com" icon={Mail} error={errors.email} />
                                <FormInput label="Facebook" value={formData.facebook} onChange={(v) => handleChange("facebook", v)} placeholder="ชื่อ Facebook" />
                                <FormInput label="ID Line" value={formData.lineId} onChange={(v) => handleChange("lineId", v)} placeholder="ID Line" icon={MessageCircle} />
                                <FormInput label="ข้อมูลคนที่ติดต่อได้ยามฉุกเฉิน" value={formData.emergencyContact} onChange={(v) => handleChange("emergencyContact", v)} placeholder="ชื่อ + เบอร์โทร + ความสัมพันธ์" icon={AlertTriangle} className="sm:col-span-2" />
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* ═══ 3. การศึกษา ═══ */}
                        <div>
                            <SectionHeader icon={GraduationCap} label="3. การศึกษา" color="text-violet-500" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">สำเร็จการศึกษาสูงสุด</label>
                                    <select value={formData.education} onChange={(e) => handleChange("education", e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#009EDB]/20 focus:border-[#009EDB] transition-all appearance-none">
                                        <option value="">เลือกระดับการศึกษา</option>
                                        {EDUCATION_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                                <FormInput label="ชื่อสถานศึกษา/สถาบัน" value={formData.institution} onChange={(v) => handleChange("institution", v)} placeholder="เช่น มหาวิทยาลัย..." icon={Building} />
                                <FormInput label="สายการเรียน/คณะ/สาขาวิชา" value={formData.fieldOfStudy} onChange={(v) => handleChange("fieldOfStudy", v)} placeholder="เช่น วิศวกรรมศาสตร์" />
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* ═══ 4. อาชีพ/ข้อมูลครอบครัว ═══ */}
                        <div>
                            <SectionHeader icon={Briefcase} label="4. อาชีพ/ข้อมูลครอบครัว" color="text-amber-500" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <FormInput label="อาชีพปัจจุบัน" value={formData.occupation} onChange={(v) => handleChange("occupation", v)} placeholder="เช่น นักศึกษา, วิศวกร" icon={Briefcase} />
                                <FormInput label="ชื่อสถานประกอบการ/สถานศึกษา" value={formData.workplace} onChange={(v) => handleChange("workplace", v)} placeholder="ชื่อบริษัท/สถานศึกษา" icon={Building} />
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">จังหวัด สถานศึกษาหรือที่ทำงาน</label>
                                    <select value={formData.workProvince} onChange={(e) => handleChange("workProvince", e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#009EDB]/20 focus:border-[#009EDB] transition-all appearance-none">
                                        <option value="">เลือกจังหวัด</option>
                                        {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>

                                {/* Marital Status */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">สถานะ</label>
                                    <div className="flex gap-2">
                                        {MARITAL_STATUSES.map(s => (
                                            <button key={s} type="button" onClick={() => handleChange("maritalStatus", formData.maritalStatus === s ? "" : s)}
                                                className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border-2 ${formData.maritalStatus === s
                                                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-amber-300"
                                                    }`}
                                            >{s}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Children (conditional) */}
                                {["แต่งงานแล้ว", "หย่าร้าง"].includes(formData.maritalStatus) && (
                                    <div className="sm:col-span-2 bg-amber-50/50 border border-amber-200 rounded-2xl p-4 space-y-4">
                                        <p className="text-sm font-bold text-amber-700 flex items-center gap-2">
                                            <Heart className="w-4 h-4" />
                                            ข้อมูลเรื่องลูก
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormInput label="ลูกชาย (คน)" type="number" value={formData.childrenBoys} onChange={(v) => handleChange("childrenBoys", v)} placeholder="0" />
                                            <FormInput label="ลูกหญิง (คน)" type="number" value={formData.childrenGirls} onChange={(v) => handleChange("childrenGirls", v)} placeholder="0" />
                                        </div>
                                        <FormInput label="อายุปัจจุบันของลูก" value={formData.childrenAges} onChange={(v) => handleChange("childrenAges", v)} placeholder="เช่น 5 ปี, 3 ปี, 1 ปี" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* ═══ 5. ความเกี่ยวข้องกับกลุ่มองค์กร ═══ */}
                        <div>
                            <SectionHeader icon={Users} label="5. ความเกี่ยวข้องกับกลุ่มองค์กร" color="text-sky-500" />
                            <div className="space-y-4 mt-4">
                                <FormInput label="รู้จักกลุ่มองค์กรจากไหน" value={formData.knowFrom} onChange={(v) => handleChange("knowFrom", v)} placeholder="เช่น เพื่อนแนะนำ, โซเชียลมีเดีย" icon={Star} />

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">เคยเข้าร่วมกิจกรรมใดบ้างของกลุ่ม <span className="text-xs text-slate-400 font-normal">(เลือกได้หลายข้อ)</span></label>
                                    <div className="space-y-2">
                                        {ACTIVITY_LIST.map(activity => (
                                            <div key={activity.key} className={`rounded-xl border-2 transition-all ${activities[activity.key].selected
                                                ? "border-sky-400 bg-sky-50/50"
                                                : "border-slate-200 bg-white hover:border-slate-300"
                                                }`}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleActivity(activity.key)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                                                >
                                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${activities[activity.key].selected
                                                        ? "bg-sky-500 border-sky-500"
                                                        : "border-slate-300"
                                                        }`}>
                                                        {activities[activity.key].selected && (
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                        )}
                                                    </div>
                                                    <span className={`text-sm font-medium ${activities[activity.key].selected ? "text-sky-800" : "text-slate-700"
                                                        }`}>{activity.label}</span>
                                                </button>

                                                {/* Extra detail field */}
                                                {activities[activity.key].selected && activity.extra && (
                                                    <div className="px-4 pb-3 pl-12">
                                                        <input
                                                            type={activity.extra === "year" ? "number" : "text"}
                                                            value={activities[activity.key].detail}
                                                            onChange={(e) => setActivityDetail(activity.key, e.target.value)}
                                                            placeholder={activity.placeholder}
                                                            className="w-full px-3 py-2 bg-white border border-sky-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* ═══ 6. ข้อมูลเพิ่มเติม ═══ */}
                        <div>
                            <SectionHeader icon={Sparkles} label="6. ข้อมูลเพิ่มเติม" color="text-pink-500" />
                            <div className="grid grid-cols-1 gap-4 mt-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">ทักษะหรือความสามารถพิเศษ</label>
                                    <textarea value={formData.skills} onChange={(e) => handleChange("skills", e.target.value)}
                                        placeholder="เช่น ออกแบบกราฟิก, พิธีกร, ถ่ายภาพ, ตัดต่อวิดีโอ..."
                                        rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#009EDB]/20 focus:border-[#009EDB] transition-all resize-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">ความสนใจพิเศษ</label>
                                    <textarea value={formData.interests} onChange={(e) => handleChange("interests", e.target.value)}
                                        placeholder="เช่น กีฬา, ดาอฺวะฮฺ, การศึกษาอิสลาม..."
                                        rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#009EDB]/20 focus:border-[#009EDB] transition-all resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-gradient-to-r from-[#009EDB] to-[#0072B5] hover:opacity-90 text-white font-bold rounded-xl shadow-lg shadow-sky-600/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed group text-base"
                        >
                            {loading ? (
                                <Loader className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    สมัครสมาชิก
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                        © 2026 Thai Muslim Youth Development Association. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Helper Components ───────────────────────────────────

function SectionHeader({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
    return (
        <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${color}`} />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">{label}</h2>
        </div>
    );
}

function FormInput({
    label, required, value, onChange, placeholder, error, icon: Icon, type = "text", maxLength, className
}: {
    label: string; required?: boolean; value: string; onChange: (v: string) => void;
    placeholder?: string; error?: string; icon?: any; type?: string; maxLength?: number; className?: string;
}) {
    return (
        <div className={`space-y-1.5 ${className || ''}`}>
            <label className="text-sm font-semibold text-slate-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative group">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Icon className="h-4 w-4 text-slate-400 group-focus-within:text-[#009EDB] transition-colors" />
                    </div>
                )}
                <input
                    type={type} value={value} onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder} maxLength={maxLength}
                    className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#009EDB]/20 focus:border-[#009EDB] transition-all ${error ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
                        }`}
                />
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>
    );
}
