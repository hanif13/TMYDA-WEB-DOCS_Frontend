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
import { DEPARTMENTS } from "@/lib/constants";
import { DocRequest } from "@/lib/types";
import { fetchDocumentRequests, createDocumentRequest, updateDocumentRequest, deleteDocumentRequest } from "@/lib/api";
import { useYear } from "@/context/YearContext";

type FieldDef = { key: string; label: string; type?: string; placeholder: string; isTextarea?: boolean };

// ── Form fields per document type ─────────
const REQUEST_FIELDS: Record<string, FieldDef[]> = {
    project_doc: [
        { key: "projectName", label: "ชื่อโครงการ", placeholder: "เช่น อบรมหลักสูตรค่าย STAND UP ครั้งที่ 7" },
        { key: "responsible", label: "ผู้รับผิดชอบโครงการ", placeholder: "ชื่อ-นามสกุล" },
        { key: "advisor", label: "ที่ปรึกษาโครงการ", placeholder: "ชื่อ-นามสกุล (ตำแหน่ง)" },
        { key: "projectType", label: "ลักษณะโครงการ", placeholder: "โครงการใหม่ / โครงการต่อเนื่อง" },
        { key: "startDate", label: "วันที่เริ่มต้น", type: "date", placeholder: "" },
        { key: "endDate", label: "วันที่สิ้นสุด", type: "date", placeholder: "" },
        { key: "venue", label: "สถานที่ดำเนินงาน", placeholder: "เช่น มัสยิดอัลฮุสนา บิน อัฟฮาน" },
        { key: "targetCount", label: "กลุ่มเป้าหมาย (จำนวน คน)", type: "number", placeholder: "เช่น 14" },
        { key: "reason", label: "หลักการและเหตุผล", placeholder: "อธิบายความจำเป็นและความสำคัญ...", isTextarea: true },
        { key: "objective", label: "วัตถุประสงค์", placeholder: "2.1 ...\n2.2 ...\n2.3 ...", isTextarea: true },
        { key: "budget_transport", label: "งบ: ค่าเดินทาง (บาท)", type: "number", placeholder: "0" },
        { key: "budget_meal", label: "งบ: ค่ามื้ออาหาร (บาท)", type: "number", placeholder: "0" },
        { key: "budget_snack", label: "งบ: ค่าอาหารว่าง (บาท)", type: "number", placeholder: "0" },
        { key: "budget_equipment", label: "งบ: ค่าอุปกรณ์ต่าง ๆ (บาท)", type: "number", placeholder: "0" },
        { key: "budget_speaker", label: "งบ: ค่าวิทยากร (บาท)", type: "number", placeholder: "0" },
        { key: "budget_venue", label: "งบ: ค่าห้องประชุม/สถานที่ (บาท)", type: "number", placeholder: "0" },
        { key: "evaluation", label: "แผนการประเมินผล", placeholder: "เช่น ทำแบบสอบถาม, ติดตามผล 3 เดือน...", isTextarea: true },
    ],
    budget_claim: [
        { key: "project", label: "ชื่อโครงการ / กิจกรรม", placeholder: "เช่น TMYDA Muslimah Word and Art Contest" },
        { key: "totalAmount", label: "วงเงินที่ขออนุมัติ (บาท)", type: "number", placeholder: "เช่น 3000" },
        { key: "bankName", label: "ธนาคาร", placeholder: "เช่น ไทยพาณิชย์, กรุงไทย..." },
        { key: "bankAccount", label: "เลขบัญชี", placeholder: "เช่น 6622425860" },
        { key: "bankAccountName", label: "ชื่อบัญชี", placeholder: "ชื่อ-นามสกุล เจ้าของบัญชี" },
    ],
    budget_report: [
        { key: "subject", label: "เรื่อง", placeholder: "เช่น รายงานการใช้เงินเพื่อเข้าร่วมประชุม สมัชชาฯ" },
        { key: "activity", label: "กิจกรรม / วันที่", placeholder: "เช่น เข้าร่วมประชุมคณะกรรมการ วันที่ 24/11/2567" },
        { key: "budgetClaimed", label: "งบที่เบิกไป (บาท)", type: "number", placeholder: "เช่น 2300" },
        { key: "budgetUsed", label: "ใช้จริง (บาท)", type: "number", placeholder: "เช่น 703" },
        { key: "budgetReturned", label: "คืนองค์กร (บาท)", type: "number", placeholder: "เช่น 1597" },
        { key: "expenseDetail", label: "รายละเอียดค่าใช้จ่ายจริง", placeholder: "เช่น ค่าเดินทาง 703 บาท (ตามใบเสร็จที่แนบ)...", isTextarea: true },
    ],
    invite_committee: [
        { key: "recipientName", label: "ชื่อผู้รับเชิญ", placeholder: "เช่น นายสมศักดิ์ วิทยาการ" },
        { key: "role", label: "บทบาท / หน้าที่", placeholder: "เช่น คณะกรรมการบริหาร" },
        { key: "eventDate", label: "วันที่ประชุม/จัดงาน", type: "date", placeholder: "" },
        { key: "eventTime", label: "เวลา", placeholder: "เช่น 09.00 – 17.00 น." },
        { key: "venue", label: "สถานที่จัดงาน", placeholder: "เช่น ศูนย์เยาวชน ฟิตยะตุลฮัก" },
        { key: "projectRef", label: "โครงการที่เกี่ยวข้อง", placeholder: "เช่น ประจำเดือน..." },
    ],
    invite_external: [
        { key: "toOrg", label: "ถึง (หน่วยงานภายนอก)", placeholder: "เช่น มหาวิทยาลัยสงขลานครินทร์" },
        { key: "attn", label: "ถึงบุคคล (ถ้าระบุ)", placeholder: "เช่น ผู้อำนวยการ..." },
        { key: "subject", label: "เรื่อง", placeholder: "หัวข้อหนังสือ..." },
        { key: "eventDate", label: "วันที่จัดกิจกรรม", type: "date", placeholder: "" },
        { key: "detail", label: "รายละเอียด / เนื้อหา", placeholder: "ด้วย... จึงเรียนมาเพื่อ...", isTextarea: true },
        { key: "attachments", label: "สิ่งที่ส่งมาด้วย (ถ้ามี)", placeholder: "เช่น โครงการ 1 ฉบับ" },
    ],
    invite_speaker: [
        { key: "recipientName", label: "ชื่อวิทยากร", placeholder: "เช่น อ.สมศักดิ์" },
        { key: "topic", label: "หัวข้อบรรยาย", placeholder: "เช่น ทักษะความเป็นผู้นำ" },
        { key: "eventDate", label: "วันที่บรรยาย", type: "date", placeholder: "" },
        { key: "eventTime", label: "เวลาที่บรรยาย", placeholder: "เช่น 09.00 – 12.00 น." },
        { key: "venue", label: "สถานที่", placeholder: "เช่น มัสยิด..." },
        { key: "compensation", label: "ค่าตอบแทนวิทยากร", placeholder: "ถ้ามี ระบุเงื่อนไข" },
    ],
    permission_parent: [
        { key: "studentName", label: "ชื่อผู้เข้าร่วม (นักเรียน)", placeholder: "ชื่อ-นามสกุล" },
        { key: "activityDate", label: "ช่วงวันที่จัดกิจกรรม", placeholder: "เช่น 1-3 เมษายน 2569" },
        { key: "venue", label: "สถานที่จัดกิจกรรม", placeholder: "เช่น ค่ายพักแรม..." },
        { key: "emergencyContact", label: "เบอร์ติดต่อฉุกเฉินของผู้จัด", placeholder: "เช่น 081-xxx-xxxx" },
    ],
    permission_school: [
        { key: "schoolName", label: "ชื่อโรงเรียน/มหาวิทยาลัย", placeholder: "เช่น มหาวิทยาลัย..." },
        { key: "studentName", label: "ชื่อนักเรียน/นักศึกษา", placeholder: "นาย/นางสาว..." },
        { key: "activityDate", label: "ช่วงวันที่เข้าร่วม", placeholder: "เช่น 1-3 เมษายน 2569" },
        { key: "reason", label: "เหตุผลที่ขออนุญาตลากิจ", placeholder: "อธิบายสั้นๆ..." },
    ],
    request_support: [
        { key: "toOrg", label: "ถึง (บุคคลหรือหน่วยงาน)", placeholder: "เช่น บริษัท..." },
        { key: "supportType", label: "สิ่งที่ขอความอนุเคราะห์", placeholder: "เช่น สนับสนุนเครื่องดื่ม, สถานที่, งบประมาณ" },
        { key: "projectDetails", label: "รายละเอียดโครงการสั้นๆ", placeholder: "อธิบายเพื่อประกอบการพิจารณา...", isTextarea: true },
    ],
    announcement: [
        { key: "subject", label: "เรื่อง", placeholder: "เช่น ประกาศรับสมัครอาสาสมัคร" },
        { key: "detail", label: "รายละเอียดประกาศ", placeholder: "เนื้อหา...", isTextarea: true },
        { key: "effectiveDate", label: "มีผลตั้งแต่วันที่", type: "date", placeholder: "" },
    ],
    appointment: [
        { key: "subject", label: "เรื่องคำสั่งแต่งตั้ง", placeholder: "เช่น แต่งตั้งคณะกรรมการจัดงาน..." },
        { key: "appointeeInfo", label: "รายชื่อผู้ได้รับการแต่งตั้ง", placeholder: "1. นาย...\n2. นางสาว...", isTextarea: true },
        { key: "effectiveDate", label: "มีผลตั้งแต่วันที่", type: "date", placeholder: "" },
    ],
    cert_conduct: [
        { key: "personName", label: "ชื่อผู้ขอรับรอง", placeholder: "ชื่อ-นามสกุล" },
        { key: "position", label: "ตำแหน่งในองค์กร / หน้าที่", placeholder: "เช่น ฝ่ายกิจกรรม" },
        { key: "reason", label: "วัตถุประสงค์การนำไปใช้", placeholder: "เช่น เพื่อแนบประกอบการสมัครงาน / ทุนการศึกษา" },
    ],
    final_report: [
        { key: "project", label: "ชื่อโครงการที่รายงาน", placeholder: "ชื่อโครงการ..." },
        { key: "venue", label: "สถานที่ดำเนินการ", placeholder: "สถานที่ที่จัดกิจกรรม..." },
        { key: "dateRange", label: "ระยะเวลาดำเนินการ", placeholder: "เช่น 6 – 8 กันยายน 2567" },
        { key: "participantCount", label: "จำนวนผู้เข้าร่วมจริง (คน)", type: "number", placeholder: "เช่น 14" },
        { key: "budgetUsed", label: "งบที่ใช้จริง (บาท)", type: "number", placeholder: "เช่น 11525" },
        { key: "summary", label: "สรุปผลการดำเนินงาน", placeholder: "ผลที่ได้รับ ความสำเร็จตามวัตถุประสงค์...", isTextarea: true },
        { key: "result", label: "ปัญหา/อุปสรรค และข้อเสนอแนะ", placeholder: "ปัญหาที่พบ และสิ่งที่ควรปรับปรุงครั้งต่อไป...", isTextarea: true },
    ],
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

// ── Budget line-item types (for budget_claim richer UX) ──────────────────
type LineItem = { id: number; description: string; amount: string };

function isBudgetKey(k: string) { return k.startsWith("budget_"); }

function calcBudgetTotal(fields: Record<string, string>) {
    return ["budget_transport", "budget_meal", "budget_snack", "budget_equipment", "budget_speaker", "budget_venue", "budget_other"]
        .reduce((s, k) => s + (Number(fields[k]) || 0), 0);
}

// ── Status configs ─────────────────────────────────────────────────────────
const requestStatusConfig: Record<string, { className: string }> = {
    "รอดำเนินการ": { className: "bg-amber-100 text-amber-700" },
    "กำลังดำเนินการ": { className: "bg-blue-100 text-blue-700" },
    "เสร็จสิ้น": { className: "bg-green-100 text-green-700" },
};

type Tab = "request" | "pending";

export default function DocumentsPage() {
    const { data: session } = useSession();
    const isViewer = (session?.user as any)?.role === "VIEWER";
    const { selectedYear } = useYear();
    const [tab, setTab] = useState<Tab>(isViewer ? "pending" : "request");
    const [requests, setRequests] = useState<DocRequest[]>([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<DocRequest | null>(null);
    const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

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
        const orgMatch = DEPARTMENTS.find(d => req.department.startsWith(d.name));
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
        if (fields._lineItems) {
            setLineItems(JSON.parse(fields._lineItems));
        } else {
            setLineItems([{ id: Date.now(), description: "", amount: "" }]);
        }
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
    const [lineItems, setLineItems] = useState<LineItem[]>([{ id: 1, description: "", amount: "" }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sub-departments derived from selected Org
    const selectedOrgDef = DEPARTMENTS.find(d => d.name === requesterOrg);
    const subDeptsOptions = selectedOrgDef?.subDepts || [];

    function setField(key: string, val: string) {
        setRequestFields(p => ({ ...p, [key]: val }));
    }

    function addLineItem() {
        setLineItems(p => [...p, { id: Date.now(), description: "", amount: "" }]);
    }
    function updateLineItem(id: number, field: "description" | "amount", val: string) {
        setLineItems(p => p.map(li => li.id === id ? { ...li, [field]: val } : li));
    }
    function removeLineItem(id: number) {
        setLineItems(p => p.filter(li => li.id !== id));
    }
    const lineItemTotal = lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0);

    function resetRequestForm() {
        setStep(1);
        setRequesterOrg("");
        setRequesterSubDept("");
        setRequesterName("");
        setSelectedRequestType(null);
        setRequestFields({});
        setLineItems([{ id: 1, description: "", amount: "" }]);
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
            
            // Merge line items into fields for budget_claim
            const finalFields = { ...requestFields };
            if (selectedRequestType === "budget_claim") {
                finalFields._lineItems = JSON.stringify(lineItems);
                finalFields._lineTotal = String(lineItemTotal);
            }

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
                    ...(!isViewer ? [{ id: "request", label: "ขอจัดทำเอกสารใหม่", icon: Send }] : []),
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
                                            {DEPARTMENTS.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
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
                                            {subDeptsOptions.map((sd, i) => <option key={i} value={sd}>{sd}</option>)}
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
                                const budgetFields = fields.filter(f => isBudgetKey(f.key));
                                const normalFields = fields.filter(f => !isBudgetKey(f.key));
                                const budgetTotal = calcBudgetTotal(requestFields);
                                const isBudgetClaim = selectedRequestType === "budget_claim";

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

                                            {/* ── budget_claim: free-form line items ── */}
                                            {isBudgetClaim && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-2 mt-8">
                                                        <p className="text-sm font-bold text-slate-800">📋 รายการค่าใช้จ่าย</p>
                                                        <button type="button" onClick={addLineItem}
                                                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg">
                                                            <Plus className="w-3.5 h-3.5" /> เพิ่มรายการเบิก
                                                        </button>
                                                    </div>
                                                    <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                                                        <div className="grid grid-cols-[1.5rem_1fr_8rem_2rem] gap-3 px-4 py-2.5 bg-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                            <span>ที่</span><span>รายการ</span><span className="text-right">จำนวนเงิน (บาท)</span><span></span>
                                                        </div>
                                                        {lineItems.map((li, idx) => (
                                                            <div key={li.id} className="grid grid-cols-[1.5rem_1fr_8rem_2rem] gap-3 items-center px-4 py-3 border-t border-slate-200">
                                                                <span className="text-sm text-slate-400 font-medium">{idx + 1}</span>
                                                                <input value={li.description} onChange={e => updateLineItem(li.id, "description", e.target.value)}
                                                                    placeholder="ระบุชื่อรายการ..."
                                                                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white w-full" />
                                                                <input type="number" min="0" value={li.amount} onChange={e => updateLineItem(li.id, "amount", e.target.value)}
                                                                    placeholder="0"
                                                                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-right outline-none focus:border-blue-400 bg-white w-full" />
                                                                {lineItems.length > 1 ? (
                                                                    <button type="button" onClick={() => removeLineItem(li.id)}
                                                                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                ) : <span />}
                                                            </div>
                                                        ))}
                                                        <div className="flex items-center justify-between px-5 py-3.5 bg-amber-50 border-t border-amber-200">
                                                            <span className="text-sm font-bold text-amber-800">รวมเป็นเงินทั้งสิ้น</span>
                                                            <span className="text-lg font-bold text-amber-700">฿{lineItemTotal.toLocaleString()} บาท</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* budget keys (for project_doc) */}
                                            {budgetFields.length > 0 && !isBudgetClaim && (
                                                <div className="mt-8">
                                                    <p className="text-sm font-bold text-slate-800 mb-3">💰 งบประมาณแยกตามหมวดหมู่</p>
                                                    <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                                                        {budgetFields.map((f, i) => (
                                                            <div key={f.key} className={cn("flex items-center gap-4 px-5 py-3.5", i < budgetFields.length - 1 && "border-b border-slate-200")}>
                                                                <span className="text-sm font-medium text-slate-600 flex-1">{f.label}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-semibold text-slate-400">฿</span>
                                                                    <input type="number" min="0" value={requestFields[f.key] ?? ""}
                                                                        onChange={e => setField(f.key, e.target.value)}
                                                                        placeholder="0"
                                                                        className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm text-right outline-none focus:border-blue-400 bg-white" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div className="flex items-center justify-between px-5 py-4 bg-blue-50 border-t border-blue-200">
                                                            <span className="text-sm font-bold text-blue-800">รวมงบประมาณทั้งสิ้น</span>
                                                            <span className="text-lg font-bold text-blue-700">฿{budgetTotal.toLocaleString()} บาท</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

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
                        const lineItemsData: LineItem[] | null = req.fields._lineItems ? JSON.parse(req.fields._lineItems) as LineItem[] : null;
                        const lineTotal = req.fields._lineTotal ? Number(req.fields._lineTotal) : 0;
                        const displayFields = Object.entries(req.fields).filter(([k]) => !k.startsWith("_") && !isBudgetKey(k));
                        const budgetUsed = req.fields.budgetUsed || req.fields._lineTotal;
                        const budgetReturned = req.fields.budgetReturned;

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
                                        const lineItemsData: LineItem[] | null = selectedRequest.fields._lineItems ? JSON.parse(selectedRequest.fields._lineItems) as LineItem[] : null;
                                        const displayFields = Object.entries(selectedRequest.fields).filter(([k]) => !k.startsWith("_") && !isBudgetKey(k));
                                        const budgetFields = Object.entries(selectedRequest.fields).filter(([k]) => isBudgetKey(k));

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

                                                {/* Line Items for Budget Claim */}
                                                {lineItemsData && (
                                                    <div className="mt-6">
                                                        <p className="text-xs font-bold text-slate-400 mb-3">รายการเบิกงบประมาณ</p>
                                                        <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase">
                                                                    <tr>
                                                                        <th className="px-4 py-2 text-left w-12 text-slate-400">#</th>
                                                                        <th className="px-4 py-2 text-left text-slate-400">รายการ</th>
                                                                        <th className="px-4 py-2 text-right text-slate-400">จำนวนเงิน</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {lineItemsData.map((li, i) => (
                                                                        <tr key={li.id}>
                                                                            <td className="px-4 py-3 text-slate-400">{i+1}</td>
                                                                            <td className="px-4 py-3 font-medium text-slate-700">{li.description}</td>
                                                                            <td className="px-4 py-3 text-right font-bold text-slate-800">฿{Number(li.amount).toLocaleString()}</td>
                                                                        </tr>
                                                                    ))}
                                                                    <tr className="bg-amber-50">
                                                                        <td colSpan={2} className="px-4 py-3 font-bold text-amber-800">รวมทั้งสิ้น</td>
                                                                        <td className="px-4 py-3 text-right font-bold text-amber-800 text-base">฿{Number(selectedRequest.fields._lineTotal).toLocaleString()}</td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Budget breakdown for Project Doc */}
                                                {budgetFields.length > 0 && !lineItemsData && (
                                                    <div className="mt-6 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50 p-4">
                                                        <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">หมวดหมู่งบประมาณ</p>
                                                        <div className="space-y-2">
                                                            {budgetFields.map(([k, v]) => {
                                                                const allFields = Object.values(REQUEST_FIELDS).flat();
                                                                const fieldDef = allFields.find(f => f.key === k);
                                                                if (!v || Number(v) === 0) return null;
                                                                return (
                                                                    <div key={k} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                                                                        <span className="text-xs font-semibold text-slate-600">{fieldDef?.label || k}</span>
                                                                        <span className="text-sm font-bold text-slate-800">฿{Number(v).toLocaleString()}</span>
                                                                    </div>
                                                                );
                                                            }) }
                                                        </div>
                                                    </div>
                                                )}
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
