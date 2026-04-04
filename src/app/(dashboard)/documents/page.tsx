"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import {
    Clock,
    ChevronDown, Loader,
    Send, Inbox, Plus, Trash2, ArrowLeft, ArrowRight,
    Eye, X, CheckCircle2, Edit, Copy, Check, FileDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DocRequest } from "@/lib/types";
import { fetchDocumentRequests, createDocumentRequest, updateDocumentRequest, deleteDocumentRequest, fetchDepartments } from "@/lib/api";
import { useYear } from "@/context/YearContext";

type FieldDef = { key: string; label: string; type?: string; placeholder: string; isTextarea?: boolean };

// ── Form fields per document type ─────────
const REQUEST_FIELDS: Record<string, FieldDef[]> = {
    project_doc: [
        { key: "projectName", label: "ชื่อโครงการ", placeholder: "เช่น ค่ายร็อบบานีย์ หรือ ค่าย Stand up" },
        { key: "departmentOrg", label: "หน่วยงาน/สังกัด", placeholder: "เช่น สำนักบริหารโครงการ" },
        { key: "leaderName", label: "ผู้รับผิดชอบโครงการ", placeholder: "ชื่อ-นามสกุล และตำแหน่ง" },
        { key: "advisorName", label: "ที่ปรึกษาโครงการ", placeholder: "รายการชื่อที่ปรึกษา" },
        { key: "reason", label: "หลักการและเหตุผล", placeholder: "บรรยายที่มาของปัญหา...", isTextarea: true },
        { key: "objective", label: "วัตถุประสงค์", placeholder: "รายการเป้าหมายของโครงการ...", isTextarea: true },
        { key: "timeline", label: "แผนการดำเนินงาน", placeholder: "ตารางกิจกรรมและระยะเวลาในแต่ละเดือน...", isTextarea: true },
        { key: "targetGroup", label: "สถานที่และกลุ่มเป้าหมาย", placeholder: "ระบุสถานที่จัดและจำนวนผู้เข้าร่วม..." },
        { key: "budgetDetail", label: "งบประมาณที่ใช้", placeholder: "ตารางแยกประเภทค่าใช้จ่าย เช่น ค่าอาหาร, ค่าวิทยากร, ค่าเสื้อ...", isTextarea: true },
        { key: "expectedResult", label: "ผลที่คาดว่าจะได้รับ", placeholder: "รายการสิ่งที่คาดว่าจะเกิดหลังจบโครงการ...", isTextarea: true }
    ],
    final_report: [
        { key: "summary", label: "สรุปผลการดำเนินงาน", placeholder: "เนื้อหาภาพรวมการจัดกิจกรรม...", isTextarea: true },
        { key: "processEvaluation", label: "การประเมินผลด้านกระบวนการ", placeholder: "ตารางให้คะแนน 1-5 ในหัวข้อ การประชุม, การดำเนินงาน, การติดตาม...", isTextarea: true },
        { key: "resourceEvaluation", label: "การประเมินผลด้านทรัพยากร", placeholder: "ตารางให้คะแนนความเหมาะสมของ งบประมาณ, สถานที่, สภาพแวดล้อม...", isTextarea: true },
        { key: "highlight", label: "จุดเด่นของโครงการ", placeholder: "เช่น ความเป็นพี่น้อง...", isTextarea: true },
        { key: "obstacles", label: "ปัญหาและอุปสรรค", placeholder: "เช่น การสื่อสารระหว่างฝ่าย...", isTextarea: true },
        { key: "suggestion", label: "ข้อเสนอแนะ", placeholder: "ข้อเสนอแนะในการจัดกิจกรรมครั้งต่อไป...", isTextarea: true },
        { key: "budgetUsedDetail", label: "สรุปค่าใช้จ่ายจริง", placeholder: "ตารางรายการจ่ายจริงเปรียบเทียบกับงบที่ได้รับ...", isTextarea: true },
        { key: "attachments", label: "ภาคผนวก (แนบลิงก์รูปภาพ)", placeholder: "เช่น วางลิงก์ Google Drive รวบรวมรูปภาพกิจกรรม" }
    ],
    announcement: [
        { key: "subject", label: "เรื่อง", placeholder: "หัวข้อประกาศ" },
        { key: "detail", label: "เนื้อหาประกาศ", placeholder: "รายละเอียดสิ่งที่ต้องการแจ้งให้ทราบ...", isTextarea: true },
        { key: "effectiveDate", label: "ประกาศ ณ วันที่", type: "date", placeholder: "" }
    ],
    appointment: [
        { key: "position", label: "ตำแหน่งที่แต่งตั้ง", placeholder: "เช่น ผู้อำนวยการสำนักงบประมาณ" },
        { key: "appointeeName", label: "ชื่อผู้ได้รับแต่งตั้ง", placeholder: "ชื่อ-นามสกุล บุคคลหรือคณะกรรมการ" },
        { key: "responsibilities", label: "หน้าที่และความรับผิดชอบ", placeholder: "รายละเอียดภาระงานที่มอบหมาย...", isTextarea: true },
        { key: "effectiveDate", label: "วันที่มีผลบังคับใช้", type: "date", placeholder: "" }
    ],
    budget_claim: [
        { key: "subject", label: "เรื่อง", placeholder: "ขออนุมัติเบิกเงินเพื่อจัดกิจกรรม..." },
        { key: "totalAmountStr", label: "ยอดเงินที่ขอเบิก", placeholder: "ระบุเป็นตัวเลขและตัวอักษร (เช่น 5,000 บาท ห้าพันบาทถ้วน)" },
        { key: "expenseDetail", label: "รายละเอียดค่าใช้จ่ายเบื้องต้น", placeholder: "ตารางประมาณการจ่าย...", isTextarea: true },
        { key: "accountDetail", label: "ช่องทางการรับเงิน", placeholder: "เลขบัญชี/พร้อมเพย์ ธนาคาร และชื่อเจ้าของบัญชี" }
    ],
    budget_report: [
        { key: "realExpenseDetail", label: "รายละเอียดการใช้จ่ายตามจริง", placeholder: "ตารางสรุปยอดจ่ายทั้งหมด...", isTextarea: true },
        { key: "remainingAmount", label: "ยอดเงินคงเหลือ", placeholder: "คำนวณยอดเงินที่ต้องคืนสมาคม (บาท)" },
        { key: "receiptReplacement", label: "ใบรับรองแทนใบเสร็จ", placeholder: "ระบุยอดเงินกรณีไม่มีใบเสร็จรับเงินจากร้านค้า...", isTextarea: true },
        { key: "returnSlip", label: "หลักฐานการโอนคืน", placeholder: "แนบลิงก์ภาพสลิปการโอนเงินคืนงบประมาณที่เหลือ" }
    ],
    invite_committee: [
        { key: "recipientName", label: "ชื่อผู้รับ", placeholder: "ชื่อกรรมการ/ตำแหน่งภายในสมาคม" },
        { key: "objective", label: "วัตถุประสงค์การเชิญ", placeholder: "เช่น เพื่อวางแผนงานประจำปี หรือพิจารณางบประมาณ" },
        { key: "schedule", label: "กำหนดการ", placeholder: "วัน เวลา และสถานที่ประชุม...", isTextarea: true }
    ],
    cert_conduct: [
        { key: "personName", label: "ชื่อ-นามสกุล ผู้ได้รับการรับรอง", placeholder: "ชื่อ-นามสกุล" },
        { key: "position", label: "สังกัด/ตำแหน่ง", placeholder: "ตำแหน่งในองค์กร" },
        { key: "certificationText", label: "ข้อความรับรอง", placeholder: "การยืนยันสถานะความเป็นสมาชิกและความประพฤติ...", isTextarea: true }
    ],
    invite_external: [
        { key: "toPerson", label: "เรียน", placeholder: "ระบุชื่อบุคคล หรือหัวหน้าหน่วยงานภายนอก" },
        { key: "projectDetail", label: "ชื่อโครงการและรายละเอียดกิจกรรม", placeholder: "รายละเอียดกิจกรรมสังเขป...", isTextarea: true },
        { key: "benefitsAndRoles", label: "สิทธิประโยชน์/บทบาทของผู้เข้าร่วม", placeholder: "คำอธิบายบทบาทและสิทธิประโยชน์...", isTextarea: true }
    ],
    invite_speaker: [
        { key: "toPerson", label: "เรียน", placeholder: "ชื่อวิทยากร" },
        { key: "topic", label: "หัวข้อบรรยาย", placeholder: "เช่น เทคนิคการบริหารโครงการ" },
        { key: "dateTime", label: "วันและเวลา", placeholder: "เช่น 12 มีนาคม 2569 เวลา 09.00 - 12.00 น." },
        { key: "targetGroup", label: "กลุ่มเป้าหมาย", placeholder: "จำนวนและระดับการศึกษาของผู้ฟัง" }
    ],
    permission_parent: [
        { key: "activityName", label: "ชื่อกิจกรรม", placeholder: "ชื่อค่าย/โครงการ" },
        { key: "travelAndHotel", label: "รายละเอียดการเดินทางและที่พัก", placeholder: "กำหนดการเดินทางและสถานที่พัก...", isTextarea: true },
        { key: "consentText", label: "ส่วนยินยอม", placeholder: "ข้าพเจ้า... ผู้ปกครองของ... อนุญาตให้เข้าร่วมกิจกรรม...", isTextarea: true }
    ],
    permission_school: [
        { key: "toPerson", label: "เรียน", placeholder: "เช่น อธิการบดี หรือ ผู้อำนวยการโรงเรียน" },
        { key: "studentName", label: "ชื่อนักเรียน/นักศึกษาที่เชิญ", placeholder: "ชื่อ-นามสกุลผู้เข้าร่วม" },
        { key: "reason", label: "เหตุผลที่ต้องใช้ตัวบุคคล", placeholder: "เพื่อเข้าร่วมโครงการพัฒนาศักยภาพ/ทักษะชีวิต...", isTextarea: true }
    ],
    request_support: [
        { key: "toPerson", label: "เรียน", placeholder: "ชื่อผู้ให้การสนับสนุน หรือห้างร้าน" },
        { key: "requestItem", label: "สิ่งที่ต้องการขอ", placeholder: "เช่น งบประมาณสนับสนุน, วัสดุอุปกรณ์, หรือสถานที่...", isTextarea: true },
        { key: "benefits", label: "ประโยชน์ที่จะได้รับ", placeholder: "เช่น การส่งเสริมเยาวชนมุสลิม การโฆษณาสนับสนุน...", isTextarea: true }
    ]
};

const REQUEST_CATEGORIES = [
    {
        title: "ประเภทเอกสารโครงการ",
        types: [
            { id: "project_doc", label: "ใบโครงการ", icon: "📁", color: "bg-slate-50 border-slate-200 text-slate-700" }
        ]
    },
    {
        title: "ประเภทเอกสารรายงานผลการดำเนินโครงการ",
        types: [
            { id: "final_report", label: "รายงานผลการดำเนินโครงการ", icon: "📊", color: "bg-indigo-50 border-indigo-200 text-indigo-700" }
        ]
    },
    {
        title: "ประเภทเอกสารประกาศหรือคำสั่ง",
        types: [
            { id: "announcement", label: "เอกสารประกาศต่าง ๆ", icon: "📢", color: "bg-rose-50 border-rose-200 text-rose-700" },
            { id: "appointment", label: "เอกสารคำสั่งแต่งตั้ง", icon: "📜", color: "bg-amber-50 border-amber-200 text-amber-700" }
        ]
    },
    {
        title: "ประเภทเอกสารภายใน",
        types: [
            { id: "budget_claim", label: "เอกสารเบิกงบประมาณ", icon: "💰", color: "bg-amber-50 border-amber-200 text-amber-700" },
            { id: "budget_report", label: "เอกสารรายงานงบประมาณ", icon: "📋", color: "bg-amber-50 border-amber-200 text-amber-700" },
            { id: "invite_committee", label: "เอกสารเชิญเข้าร่วมโครงการสำหรับคณะกรรมการ", icon: "✉️", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
            { id: "cert_conduct", label: "เอกสารรับรองความประพฤติ", icon: "🛡️", color: "bg-emerald-50 border-emerald-200 text-emerald-700" }
        ]
    },
    {
        title: "ประเภทเอกสารภายนอก",
        types: [
            { id: "invite_external", label: "เอกสารเชิญเข้าร่วมโครงการสำหรับบุคคลภายนอกองค์กร", icon: "🗳️", color: "bg-blue-50 border-blue-200 text-blue-700" },
            { id: "invite_speaker", label: "เอกสารเชิญเป็นวิทยากร", icon: "🎤", color: "bg-purple-50 border-purple-200 text-purple-700" },
            { id: "permission_parent", label: "เอกสารขออนุญาตผู้ปกครอง", icon: "📝", color: "bg-cyan-50 border-cyan-200 text-cyan-700" },
            { id: "permission_school", label: "เอกสารขออนุญาตโรงเรียน/มหาวิทยาลัย", icon: "🏫", color: "bg-cyan-50 border-cyan-200 text-cyan-700" },
            { id: "request_support", label: "เอกสารขอความอนุเคราะห์", icon: "🤝", color: "bg-pink-50 border-pink-200 text-pink-700" }
        ]
    }
];

const ALL_REQUEST_TYPES = REQUEST_CATEGORIES.flatMap(c => c.types);



// ── Status configs ─────────────────────────────────────────────────────────
const requestStatusConfig: Record<string, { className: string }> = {
    "รอดำเนินการ": { className: "bg-amber-100 text-amber-700" },
    "กำลังดำเนินการ": { className: "bg-blue-100 text-blue-700" },
    "เสร็จสิ้น": { className: "bg-green-100 text-green-700" },
};

type Tab = "request" | "pending";

export default function DocumentsPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || "VIEWER";
    // Everyone can request documents, but only SUPER_ADMIN/ADMIN can manage (edit/delete/change status)
    const isManager = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
    const isViewer = !isManager;
    const { selectedYear } = useYear();
    const [tab, setTab] = useState<Tab>("request");
    const [requests, setRequests] = useState<DocRequest[]>([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<DocRequest | null>(null);
    const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
    const [dbDepartments, setDbDepartments] = useState<any[]>([]);

    const refreshRequests = async () => {
        setIsLoadingRequests(true);
        try {
            const data = await fetchDocumentRequests(selectedYear || undefined);
            // Map backend data to DocRequest type
            const mapped: DocRequest[] = data.map((r: any) => ({
                id: r.id,
                requestType: r.requestType,
                department: r.department,
                requestedBy: r.requestedBy,
                requestedAt: new Date(r.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }),
                status: r.status as any,
                fields: r.fields as Record<string, string>,
                pdfPath: r.pdfPath,
            }));
            setRequests(mapped);
        } catch (error) {
            console.error("Failed to fetch requests:", error);
            // toast.error("ไม่สามารถโหลดข้อมูลคำขอได้");
        } finally {
            setIsLoadingRequests(false);
        }
    };

    useEffect(() => {
        fetchDepartments().then(setDbDepartments).catch(() => []);
    }, []);

    const handleUpdateStatus = async (id: string, status: "รอดำเนินการ" | "กำลังดำเนินการ" | "เสร็จสิ้น") => {
        try {
            await updateDocumentRequest(id, { status });
            toast.success(`อัปเดตสถานะเป็น '${status}' เรียบร้อย`);
            refreshRequests();
            if (selectedRequest?.id === id) {
                setSelectedRequest(prev => prev ? { ...prev, status } : null);
            }
        } catch (error) {
            console.error("Failed to update status:", error);
            toast.error("ไม่สามารถอัปเดตสถานะได้");
        }
    };

    const handleDeleteRequest = async (id: string, type: string) => {
        if (!confirm(`คุณต้องการลบคำขอ "${type}" ใช่หรือไม่?`)) return;
        
        try {
            await deleteDocumentRequest(id);
            toast.success("ลบคำขอสำเร็จ");
            refreshRequests();
            if (selectedRequest?.id === id) setSelectedRequest(null);
        } catch (error) {
            console.error("Failed to delete request:", error);
            toast.error("ไม่สามารถลบคำขอได้");
        }
    };

    const handleEditRequest = (req: DocRequest) => {
        setEditingRequestId(req.id);
        
        // Parse department
        const orgMatch = dbDepartments.find(d => req.department.startsWith(d.name));
        if (orgMatch) {
            setRequesterOrg(orgMatch.name);
            const sub = req.department.replace(orgMatch.name, "").replace(/^\s*\(|\)\s*$/g, "").trim();
            setRequesterSubDept(sub);
        }

        setRequesterName(req.requestedBy);
        
        // Find internal ID for requestType
        const typeMatch = ALL_REQUEST_TYPES.find(t => t.label === req.requestType);
        setSelectedRequestType(typeMatch?.id || null);
        
        // Fields
        const fields = { ...req.fields };
        setRequestFields(fields);
        
        setStep(1);
        setTab("request");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        if (selectedYear) {
            refreshRequests();
        }
    }, [selectedYear]);

    // Flow State
    const [step, setStep] = useState<number>(1);
    
    // Requester Data (Step 1)
    const [requesterOrg, setRequesterOrg] = useState("");
    const [requesterSubDept, setRequesterSubDept] = useState("");
    const [requesterName, setRequesterName] = useState("");

    // Selected Doc Type (Step 2)
    const [selectedRequestType, setSelectedRequestType] = useState<string | null>(null);

    // Form Fields (Step 3)
    const [requestFields, setRequestFields] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sub-departments derived from selected Org
    const selectedOrgDef = dbDepartments.find(d => d.name === requesterOrg);
    const subDeptsOptions = selectedOrgDef?.subDepts || [];

    function setField(key: string, val: string) {
        setRequestFields(p => ({ ...p, [key]: val }));
    }

    function resetRequestForm() {
        setStep(1);
        setRequesterOrg("");
        setRequesterSubDept("");
        setRequesterName("");
        setSelectedRequestType(null);
        setRequestFields({});
        setEditingRequestId(null);
    }

    const handleNextStep1 = () => {
        if (!requesterOrg || !requesterSubDept || !requesterName) {
            toast.error("กรุณากรอกข้อมูลผู้ขอให้ครบถ้วน");
            return;
        }
        setStep(2);
    };

    const handleNextStep2 = (typeId: string) => {
        setSelectedRequestType(typeId);
        setStep(3);
    };

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const rt = ALL_REQUEST_TYPES.find(r => r.id === selectedRequestType);
            const finalFields = { ...requestFields };
            
            const fullDept = `${requesterOrg}${requesterSubDept ? ` (${requesterSubDept})` : ""}`;
            
            if (editingRequestId) {
                await updateDocumentRequest(editingRequestId, {
                    requestType: rt?.label ?? "",
                    department: fullDept,
                    requestedBy: requesterName,
                    fields: finalFields,
                });
                toast.success(`แก้ไขคำขอ '${rt?.label}' สำเร็จ`);
            } else {
                await createDocumentRequest({
                    requestType: rt?.label ?? "",
                    department: fullDept,
                    requestedBy: requesterName,
                    fields: finalFields,
                    thaiYear: selectedYear || undefined,
                });
                toast.success(`ส่งคำขอ '${rt?.label}' สำเร็จ! เลขาจะดำเนินการให้ต่อไป`, { icon: "✅", duration: 5000 });
            }
            
            resetRequestForm();
            refreshRequests();
            setTab("pending");
        } catch (error) {
            console.error("Failed to save request:", error);
            toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setIsSubmitting(false);
        }
    };

    const pendingRequests = requests.filter(r => r.status !== "เสร็จสิ้น");
    const pendingCount = pendingRequests.length;

    return (
        <>
            <div className="space-y-5 animate-fade-in-up pb-12">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ขอจัดทำเอกสาร</h1>
                <p className="text-sm text-slate-500 mt-0.5">ระบบจัดการและจัดทำเอกสารแบบฟอร์มให้เป็นรูปแบบมาตรฐาน</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {[
                    { id: "request", label: "ขอจัดทำเอกสารใหม่", icon: Send },
                    { id: "pending", label: `คำขอทั้งหมด${pendingCount > 0 ? ` · ${pendingCount} รอ` : ""}`, icon: Inbox },
                ].map(t => (
                    <button key={t.id} onClick={() => {
                        setTab(t.id as Tab);
                        if(t.id === "request" && step === 3) setStep(1); // reset to step 1 if navigating back from pending
                    }}
                        className={cn("flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                            tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ─── TAB: REQUEST ─── */}
            {tab === "request" && (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8">
                    {/* Stepper Header */}
                    <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto">
                        <div className={cn("text-xs font-semibold flex flex-col items-center gap-2", step >= 1 ? "text-blue-600" : "text-slate-400")}>
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm", step >= 1 ? "bg-blue-600 text-white" : "bg-slate-100")}>1</div>
                            <span>ข้อมูลผู้ขอ</span>
                        </div>
                        <div className={cn("h-0.5 w-16 md:w-24 mt-[-1rem]", step >= 2 ? "bg-blue-600" : "bg-slate-100")} />
                        <div className={cn("text-xs font-semibold flex flex-col items-center gap-2", step >= 2 ? "text-blue-600" : "text-slate-400")}>
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm", step >= 2 ? "bg-blue-600 text-white" : "bg-slate-100")}>2</div>
                            <span>เลือกประเภท</span>
                        </div>
                        <div className={cn("h-0.5 w-16 md:w-24 mt-[-1rem]", step >= 3 ? "bg-blue-600" : "bg-slate-100")} />
                        <div className={cn("text-xs font-semibold flex flex-col items-center gap-2", step >= 3 ? "text-blue-600" : "text-slate-400")}>
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm", step >= 3 ? "bg-blue-600 text-white" : "bg-slate-100")}>3</div>
                            <span>กรอกรายละเอียด</span>
                        </div>
                    </div>

                    {/* Step 1: Requester Info */}
                    {step === 1 && (
                        <div className="max-w-xl mx-auto animate-fade-in-up">
                            <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">ระบุข้อมูลผู้ขอจัดทำเอกสาร</h2>
                            
                            <div className="space-y-5">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">หน่วยงาน *</label>
                                    <div className="relative">
                                        <select value={requesterOrg} onChange={e => { setRequesterOrg(e.target.value); setRequesterSubDept(""); }}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 outline-none appearance-none focus:border-blue-400 focus:bg-white transition-colors">
                                            <option value="" disabled>เลือกหน่วยงาน...</option>
                                            {dbDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">ฝ่าย / ตำแหน่ง *</label>
                                    <div className="relative">
                                        <select value={requesterSubDept} onChange={e => setRequesterSubDept(e.target.value)} disabled={!requesterOrg}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 outline-none appearance-none focus:border-blue-400 focus:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                            <option value="" disabled>เลือกฝ่ายที่เป็นสังกัด...</option>
                                            {subDeptsOptions.map((sd: string, i: number) => <option key={i} value={sd}>{sd}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                    {!requesterOrg && <p className="text-xs text-slate-400 mt-1">กรุณาเลือกหน่วยงานก่อน</p>}
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">ชื่อ-นามสกุล ผู้ขอ *</label>
                                    <input type="text" value={requesterName} onChange={e => setRequesterName(e.target.value)}
                                        placeholder="เช่น นายอับดุลเลาะห์ สมาน"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 outline-none focus:border-blue-400 focus:bg-white transition-colors" />
                                </div>

                                <div className="pt-4 text-right">
                                    <button onClick={handleNextStep1}
                                        className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all">
                                        เลือกลำดับถัดไป <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Document Categorization */}
                    {step === 2 && (
                        <div className="max-w-4xl mx-auto animate-fade-in-up">
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={() => setStep(1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                                </button>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">เลือกประเภทเอกสารที่ต้องการ</h2>
                                    <p className="text-sm text-slate-500">สำหรับคุณ {requesterName} ({requesterOrg})</p>
                                </div>
                            </div>

                            <div className="space-y-8 mt-6">
                                {REQUEST_CATEGORIES.map((cat, idx) => (
                                    <div key={idx}>
                                        <h3 className="text-base font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">{cat.title}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {cat.types.map(rt => (
                                                <button key={rt.id} onClick={() => handleNextStep2(rt.id)}
                                                    className={cn("flex items-start text-left gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-md hover:-translate-y-0.5", rt.color, "bg-white")}>
                                                    <span className="text-2xl mt-0.5">{rt.icon}</span>
                                                    <div>
                                                        <span className="font-semibold text-sm block leading-tight text-slate-800">{rt.label}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Form Details */}
                    {step === 3 && (
                        <div className="max-w-2xl mx-auto animate-fade-in-up">
                            {(() => {
                                const rt = ALL_REQUEST_TYPES.find(r => r.id === selectedRequestType);
                                const fields = REQUEST_FIELDS[selectedRequestType!] ?? [];
                                const normalFields = fields;

                                return (
                                    <>
                                        <div className="flex items-center gap-4 mb-6">
                                            <button onClick={() => setStep(2)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
                                                <ArrowLeft className="w-5 h-5" />
                                            </button>
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl">{rt?.icon}</span>
                                                <div>
                                                    <h2 className="text-xl font-bold text-slate-800">กรอกข้อมูล {rt?.label}</h2>
                                                    <p className="text-sm text-slate-500">ข้อมูลของคุณจะถูกใช้สร้างแบบฟอร์มเอกสารมาตรฐาน</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 flex gap-3 text-sm">
                                            <div className="w-1 bg-blue-500 rounded-full" />
                                            <div className="flex-1">
                                                <p className="text-slate-500 font-medium">ข้อมูลผู้ขอจัดทำ:</p>
                                                <p className="font-bold text-slate-800">{requesterName} <span className="font-normal text-slate-500 ml-1">({requesterOrg} — {requesterSubDept})</span></p>
                                            </div>
                                        </div>

                                        <form onSubmit={handleSubmitRequest} className="space-y-5">
                                            {normalFields.map(f => (
                                                <div key={f.key}>
                                                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">{f.label} *</label>
                                                    {f.type === "date" ? (
                                                        <input type="date" required value={requestFields[f.key] ?? ""}
                                                            onChange={e => setField(f.key, e.target.value)}
                                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 outline-none focus:border-blue-400 focus:bg-white" />
                                                    ) : f.isTextarea ? (
                                                        <textarea rows={3} required value={requestFields[f.key] ?? ""}
                                                            onChange={e => setField(f.key, e.target.value)}
                                                            placeholder={f.placeholder}
                                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 outline-none focus:border-blue-400 focus:bg-white resize-none" />
                                                    ) : (
                                                        <input type={f.type ?? "text"} required value={requestFields[f.key] ?? ""}
                                                            onChange={e => setField(f.key, e.target.value)}
                                                            placeholder={f.placeholder}
                                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 outline-none focus:border-blue-400 focus:bg-white" />
                                                    )}
                                                </div>
                                            ))}



                                            <div className="bg-blue-50/50 rounded-xl p-4 text-sm text-blue-800 border-l-4 border-blue-500 mt-8 font-medium">
                                                เมื่อส่งคำขอแล้ว ฝ่ายเลขาธิการจะรับทราบและนำข้อมูลนี้ไปจัดทำเอกสารแบบฟอร์มมาตรฐานให้คุณ
                                            </div>

                                            <div className="flex gap-4 pt-6 mt-4 border-t border-slate-100">
                                                <button type="submit" disabled={isSubmitting}
                                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white text-base font-semibold px-6 py-3.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 shadow-sm shadow-blue-200 hover:shadow transition-all">
                                                    {isSubmitting ? <><Loader className="w-5 h-5 animate-spin" /> กำลังส่งคำขอ...</> : <><Send className="w-5 h-5" /> ส่งคำขอจัดทำเอกสาร</>}
                                                </button>
                                            </div>
                                        </form>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}

            {/* ─── TAB: PENDING REQUESTS ─── */}
            {tab === "pending" && (
                <div className="space-y-4">
                    {pendingRequests.map(req => {
                        const rt = ALL_REQUEST_TYPES.find(r => r.label === req.requestType);
                        const statusCls = requestStatusConfig[req.status]?.className ?? "bg-slate-100 text-slate-600";
                        const displayFields = Object.entries(req.fields).filter(([k]) => !k.startsWith("_"));

                        return (
                            <div key={req.id} className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-2xl flex-shrink-0", rt?.color?.split(" ")[0] || "bg-slate-50")}>
                                        {rt?.icon ?? "📄"}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-800 text-sm truncate">{req.requestType}</h3>
                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                                            <span className="font-semibold text-slate-700">โดย: {req.requestedBy}</span>
                                            <span className="hidden md:inline text-slate-300">•</span>
                                            <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{req.department}</span>
                                            <span className="hidden md:inline text-slate-300">•</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ส่งคำขอเมื่อ {req.requestedAt}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-4 flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-50">
                                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", statusCls, statusCls.replace('bg-', 'border-'))}>{req.status}</span>
                                    <div className="flex gap-1.5">
                                        <button onClick={() => setSelectedRequest(req)} title="ดูรายละเอียด"
                                            className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        {!isViewer && (
                                            <>
                                                <button onClick={() => handleEditRequest(req)} title="แก้ไข"
                                                    className="p-2 bg-blue-50 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteRequest(req.id, req.requestType)} title="ลบ"
                                                    className="p-2 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleUpdateStatus(req.id, "เสร็จสิ้น")} title="เสร็จสิ้น"
                                                    className="p-2 bg-green-50 text-green-400 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>



                            </div>
                        );
                    }) }
                    {pendingRequests.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
                            <Inbox className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                            <p className="text-lg font-bold text-slate-700 mb-1">ยังไม่มีคำขอเอกสาร</p>
                            <p className="text-sm text-slate-500">คุณสามารถเริ่มขอจัดทำเอกสารโดยเลือกแท็บ &quot;ขอจัดทำเอกสารใหม่&quot;</p>
                        </div>
                    )}
                </div>
            )}
        </div>

            {/* ─── REQUEST DETAIL MODAL ─── */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto" onClick={() => setSelectedRequest(null)}>
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh] animate-in zoom-in-95 duration-300 pointer-events-auto select-text" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm">{ALL_REQUEST_TYPES.find(r => r.label === selectedRequest.requestType)?.icon || "📄"}</span>
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">
                                        {selectedRequest.requestType}
                                    </span>
                                </div>
                                <h2 className="text-xl font-black text-slate-900 leading-tight">รายละเอียดคำขอจัดทำเอกสาร</h2>
                                <p className="text-xs font-bold text-slate-400 mt-0.5">ส่งคำขอเมื่อ {selectedRequest.requestedAt}</p>
                            </div>
                            <button onClick={() => setSelectedRequest(null)} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                            {/* Requester Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">ผู้ขอจัดทำ</p>
                                    <p className="font-bold text-slate-800">{selectedRequest.requestedBy}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">หน่วยงาน/สังกัด</p>
                                    <p className="font-bold text-slate-800">{selectedRequest.department}</p>
                                </div>
                            </div>

                            {/* Status Section */}
                            {!isViewer && (
                                <div className="mb-8">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">สถานะปัจจุบัน</p>
                                    <div className="flex items-center gap-3">
                                        {["รอดำเนินการ", "กำลังดำเนินการ", "เสร็จสิ้น"].map((s) => (
                                            <button key={s} onClick={() => handleUpdateStatus(selectedRequest.id, s as any)}
                                                className={cn("flex-1 py-3 rounded-xl text-xs font-bold transition-all border",
                                                    selectedRequest.status === s 
                                                        ? (s === "เสร็จสิ้น" ? "bg-green-600 border-green-600 text-white shadow-md shadow-green-100" : 
                                                           s === "กำลังดำเนินการ" ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100" :
                                                           "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-100")
                                                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300")}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Dynamic Fields Section */}
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">ข้อมูลรายละเอียดเอกสาร</p>
                                <div className="space-y-4">
                                    {(() => {
                                        const displayFields = Object.entries(selectedRequest.fields).filter(([k]) => !k.startsWith("_"));

                                        return (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {displayFields.map(([k, v]) => {
                                                        const allFields = Object.values(REQUEST_FIELDS).flat();
                                                        const fieldDef = allFields.find(f => f.key === k);
                                                        return (
                                                            <div key={k} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm group/field relative">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{fieldDef?.label || k}</p>
                                                                    <button 
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(v || "");
                                                                            toast.success(`คัดลอก ${fieldDef?.label || k} แล้ว`);
                                                                        }}
                                                                        className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover/field:opacity-100"
                                                                        title="คัดลอกข้อมููล"
                                                                    >
                                                                        <Copy className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                                <p className="text-sm font-semibold text-slate-800 break-words whitespace-pre-wrap selection:bg-blue-100">{v || "—"}</p>
                                                            </div>
                                                        );
                                                    }) }
                                                </div>

                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setSelectedRequest(null)}
                                className="flex-1 py-3 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors">
                                ปิดหน้าต่าง
                            </button>
                            {selectedRequest.status !== "เสร็จสิ้น" && (
                                <button onClick={() => { handleUpdateStatus(selectedRequest.id, "เสร็จสิ้น"); setSelectedRequest(null); }}
                                    className="flex-[2] bg-green-600 text-white py-3 rounded-2xl text-sm font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" /> ยืนยันว่าดำเนินการเสร็จสิ้น
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
