"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
    Clock,
    ChevronDown, Loader,
    Send, Inbox, Plus, Trash2, ArrowLeft, ArrowRight,
    Eye, X, CheckCircle2, Edit, Copy, Check, FileDown, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DocRequest, StoredDocument } from "@/lib/types";
import { fetchDocumentRequests, createDocumentRequest, updateDocumentRequest, deleteDocumentRequest, fetchDepartments, uploadImages, getMediaUrl, fetchDocuments, createDocument } from "@/lib/api";
import { useYear } from "@/context/YearContext";

type FieldDef = {
    key: string;
    label: string;
    type?: "text" | "number" | "date" | "select-org" | "select-sub" | "dynamic-list" | "dynamic-plan" | "dynamic-budget" | "evaluation-table" | "image-upload" | "flexible-content" | "dynamic-appointee-list" | "dynamic-table" | "sum";
    placeholder?: string;
    isTextarea?: boolean;
    subLabel?: string;
    source?: "user";
    readonly?: boolean;
    columns?: { id: string; label: string; type: "text" | "number" }[];
    sumColumn?: string;
    targetKey?: string;
    items?: { id: string; label: string }[];
};

// ── Form fields per document type ─────────
const REQUEST_FIELDS: Record<string, FieldDef[]> = {
    project_doc: [
        { key: "projectName", label: "ชื่อโครงการ", placeholder: "เช่น ค่ายร็อบบานีย์ หรือ ค่าย Stand up" },
        { key: "departmentOrg", label: "หน่วยงาน", type: "select-org", placeholder: "" },
        { key: "departmentSub", label: "สังกัด", type: "select-sub", placeholder: "" },
        { key: "leaderName", label: "ผู้รับผิดชอบโครงการ", placeholder: "ชื่อ-นามสกุล และตำแหน่ง" },
        { key: "advisorNames", label: "ที่ปรึกษาโครงการ", type: "dynamic-list", placeholder: "ระบุรายชื่อที่ปรึกษา", subLabel: "กดเพิ่มเพื่อเพิ่มที่ปรึกษาหลายคน" },
        { key: "period", label: "ระยะเวลาดำเนินโครงการ", placeholder: "เช่น 12 มีนาคม - 15 เมษายน 2569" },
        { key: "reason", label: "หลักการและเหตุผล", placeholder: "บรรยายที่มาของปัญหา...", isTextarea: true },
        { key: "objectives", label: "วัตถุประสงค์", type: "dynamic-list", placeholder: "ระบุวัตถุประสงค์โครงการ...", subLabel: "กดเพิ่มเพื่อแบ่งเป็นข้อๆ" },
        { key: "plan", label: "แผนการดำเนินโครงการ", type: "dynamic-plan", placeholder: "ระบุกิจกรรมและเดือนที่ดำเนินงาน" },
        { key: "location", label: "สถานที่การดำเนินงาน", placeholder: "เช่น ศูนย์เยาวชนฯ" },
        { key: "targetGroups", label: "กลุ่มเป้าหมาย", type: "dynamic-budget", placeholder: "กลุ่มเป้าหมาย", subLabel: "ระบุกลุ่มเป้าหมายและจำนวน" },
        { key: "budgetSources", label: "แหล่งที่มาของงบประมาณ", type: "dynamic-budget", placeholder: "แหล่งทุน", subLabel: "ระบุแหล่งทุนและจำนวนเงิน (บาท)" },
        { key: "budgetItems", label: "งบประมาณที่ใช้ในโครงการ", type: "dynamic-budget", placeholder: "รายการใช้จ่าย", subLabel: "ระบุรายการจ่ายและจำนวนเงิน (บาท)" },
        { key: "evaluation", label: "การประเมินผล", placeholder: "เช่น แบบสอบถาม ความพึงพอใจ" },
        { key: "expectedResult", label: "ผลที่คาดว่าจะได้รับ", placeholder: "ผลลัพธ์ที่คาดหวัง...", isTextarea: true }
    ],
    final_report: [
        { key: "projectName", label: "ชื่อโครงการ", placeholder: "เช่น ค่ายร็อบบานีย์ หรือ ค่าย Stand up" },
        { key: "leaderName", label: "ผู้รับผิดชอบโครงการ", placeholder: "ชื่อ-นามสกุล และตำแหน่ง" },
        { key: "departmentOrg", label: "หน่วยงาน", type: "select-org" },
        { key: "departmentSub", label: "สังกัด", type: "select-sub" },
        { key: "projectDate", label: "วัน เดือน ปี ที่จัดโครงการ", placeholder: "เช่น 15 - 17 มีนาคม 2568" },
        { key: "objectives", label: "วัตถุประสงค์โครงการ", type: "dynamic-list", subLabel: "กดเพิ่มเพื่อเพิ่มวัตถุประสงค์" },
        {
            key: "evalProcess",
            label: "การประเมินผลด้านกระบวนการ (Process Evaluation)",
            type: "evaluation-table",
            items: [
                { id: "p1", label: "การประชุม วางแผนในการดำเนินกิจกรรม" },
                { id: "p2", label: "การดำเนินกิจกรรมที่เป็นไปตามกำหนดขั้นตอน" },
                { id: "p3", label: "การนิเทศติดตามกำกับการดำเนินกิจกรรมตามขั้นตอนที่กำหนด" },
                { id: "p4", label: "การประเมินผลการดำเนินกิจกรรม" },
                { id: "p5", label: "การวิเคราะห์และนำผลประเมินไปใช้ในการพัฒนาอย่างต่อเนื่อง" }
            ]
        },
        {
            key: "evalResource",
            label: "ประเมินผลการจัดหาทรัพยากร (ปัจจัย)",
            type: "evaluation-table",
            items: [
                { id: "r1", label: "ความร่วมมือ/ความมุ่งมั่นของผู้ร่วมงาน" },
                { id: "r2", label: "งบประมาณเหมาะสม" },
                { id: "r3", label: "วัสดุอุปกรณ์ อาคารสถานที่ ที่ใช้ปฏิบัติงานเหมาะสม" },
                { id: "r4", label: "การบริหารจัดการโครงการเหมาะสม" },
                { id: "r5", label: "สารสนเทศในการวางแผน ดำเนินการ และประเมินโครงการ" },
                { id: "r6", label: "สภาพแวดล้อมที่เอื้อในการปฏิบัติงานโครงการ" }
            ]
        },
        { key: "highlights", label: "จุดเด่นของโครงการ/ข้อดี", type: "dynamic-list", subLabel: "กดเพิ่มเพื่อเพิ่มจุดเด่น" },
        { key: "obstacles", label: "ปัญหาและอุปสรรค", type: "dynamic-list", subLabel: "กดเพิ่มเพื่อเพิ่มปัญหา" },
        { key: "suggestions", label: "ข้อเสนอแนะหรือข้อแก้ไข", type: "dynamic-list", subLabel: "กดเพิ่มเพื่อเพิ่มข้อเสนอแนะ" },
        { key: "budgetSummary", label: "สรุปค่าใช้จ่ายทั้งหมด", type: "dynamic-budget", subLabel: "ระบุรายการและจำนวนเงิน (บาท)" },
        { key: "reporterName", label: "ผู้รายงานโครงการ", placeholder: "ระบุชื่อผู้ส่งรายงาน" },
        { key: "photos", label: "รูปภาพกิจกรรม", type: "image-upload", subLabel: "อัปโหลดรูปภาพกิจกรรม (ขั้นต่ำ 6 รูป)" }
    ],
    announcement: [
        { key: "subject", label: "เรื่อง", placeholder: "เช่น ประกาศขยายเวลาการรับสมัคร หรือ ประกาศแต่งตั้งคณะทำงาน" },
        { key: "paragraphs", label: "เนื้อหาย่อหน้า (เริ่มต้น)", type: "dynamic-list", subLabel: "กดเพิ่มเพื่อเพิ่มย่อหน้า" },
        { key: "details", label: "รายละเอียดอื่นๆ", type: "flexible-content", subLabel: "สามารถเลือกเพิ่มได้ทั้ง ข้อความ, รายการ, หรือ งบประมาณ" },
        { key: "conclusion", label: "เนื้อหาย่อหน้า (จบสรุป)", placeholder: "ระบุข้อความสรุปจบประกาศ", isTextarea: true },
        { key: "date", label: "ประกาศ ณ วันที่", type: "date" },
        { key: "signer", label: "ผู้ประกาศ/ผู้ลงนาม", placeholder: "ระบุชื่อและตำแหน่งผู้ประกาศ" }
    ],
    appointment: [
        { key: "subject", label: "เรื่อง", placeholder: "เช่น คำสั่งแต่งตั้งคณะกรรมการดำเนินงาน..." },
        { key: "paragraphs", label: "เนื้อหาย่อหน้า (ความเป็นมา)", type: "dynamic-list", subLabel: "กดเพิ่มเพื่อเพิ่มย่อหน้า" },
        { key: "appointees", label: "รายชื่อผู้ได้รับแต่งตั้ง", type: "dynamic-appointee-list", subLabel: "ระบุชื่อและตำแหน่งที่แต่งตั้ง" },
        { key: "conclusion", label: "เนื้อหาย่อหน้า (จบสรุป)", placeholder: "ระบุข้อความสรุปจบคำสั่ง", isTextarea: true },
        { key: "date", label: "สั่ง ณ วันที่", type: "date" },
        { key: "signer", label: "ผู้ลงนาม (ประธาน/เลขาธิการ)", placeholder: "ระบุชื่อและตำแหน่งผู้ลงนาม" }
    ],
    budget_claim: [
        { key: "subject", label: "เรื่อง", placeholder: "เช่น ขออนุมัติเบิกเงินเพื่อจัดกิจกรรม..." },
        { key: "requesterName", label: "ชื่อผู้ขออนุมัติ", source: "user", readonly: true },
        { key: "requesterSubDept", label: "สังกัด", source: "user", readonly: true },
        { key: "purpose", label: "ขอเบิกเงินเพื่อ", placeholder: "เช่น ค่าวัสดุอุปกรณ์ในการดำเนินกิจกรรมค่าย" },
        { key: "totalAmount", label: "จำนวนเงินรวม (บาท)", type: "number", placeholder: "0" },
        { key: "projectName", label: "กิจกรรม/โครงการ", placeholder: "เช่น โครงการค่ายร็อบบานีย์" },
        { key: "date", label: "วัน เดือน ปี ที่ดำเนินการ", placeholder: "เช่น 15 - 17 มีนาคม 2568" },
        { key: "location", label: "สถานที่ดำเนินการ", placeholder: "เช่น ศูนย์เยาวชนบางขุนเทียน" },
        { key: "accountDetail", label: "ช่องทางการโอนเงิน", placeholder: "เช่น กสิกรไทย 012-3-45678-9 ชื่อ..." },
        { key: "expenses", label: "รายละเอียดค่าใช้จ่าย", type: "dynamic-budget", subLabel: "ระบุรายการจ่ายและจำนวนเงิน (บาท)" },
        { key: "signature", label: "รูปลายเซ็น", type: "image-upload", subLabel: "ความละเอียดสูง พื้นหลังขาวหรือโปร่งใส" }
    ],
    budget_report: [
        { key: "subject", label: "เรื่อง", placeholder: "เช่น รายงานสรุปการใช้จ่ายงบประมาณ..." },
        { key: "requesterName", label: "ชื่อผู้ขออนุมัติ", source: "user", readonly: true },
        { key: "requesterSubDept", label: "สังกัด", source: "user", readonly: true },
        { key: "claimedAmount", label: "ได้ทำการเบิกเงินจำนวน", type: "number", placeholder: "0" },
        { key: "projectName", label: "เพื่อจัดโครงการ", placeholder: "ชื่อโครงการ..." },
        { 
            key: "realExpenses", 
            label: "รายละเอียดการใช้จ่ายจริง", 
            type: "dynamic-table", 
            subLabel: "ระบุรายการ, จำนวนเงิน และเลขอ้างอิงหลักฐาน",
            columns: [
                { id: "item", label: "รายการ", type: "text" },
                { id: "amount", label: "จำนวนเงิน", type: "number" },
                { id: "evidenceRef", label: "หลักฐาน(รูปที่)", type: "text" }
            ],
            sumColumn: "amount"
        },
        { key: "realExpenseTotal", label: "ผลรวมที่ใช้จริง", type: "sum", targetKey: "realExpenses" },
        { 
            key: "budgetSources", 
            label: "แหล่งที่มางบประมาณ", 
            type: "dynamic-table", 
            subLabel: "ระบุแหล่งที่มาและจำนวนงบที่ได้รับ",
            columns: [
                { id: "source", label: "แหล่งที่มา", type: "text" },
                { id: "amount", label: "จำนวนเงิน", type: "number" }
            ],
            sumColumn: "amount"
        },
        { key: "budgetSourceTotal", label: "ผลรวมที่งบที่ได้รับ", type: "sum", targetKey: "budgetSources" },
        { key: "evidencePhotos", label: "อัปโหลดรูปหลักฐาน", type: "image-upload", subLabel: "อัปโหลดใบเสร็จหรือหลักฐานการจ่ายเงิน" },
        { key: "signature", label: "รูปลายเซ็น", type: "image-upload", subLabel: "ลายเซ็นผู้รายงานรายงาน" }
    ],
    invite_committee: [
        { key: "subject", label: "เรื่อง", placeholder: "เช่น ขอเชิญเข้าร่วมประชุมคณะกรรมการ..." },
        { key: "to", label: "เรียน", type: "dynamic-list", subLabel: "ระบุรายชื่อผู้รับเชิญ (เพิ่มได้)" },
        { key: "attachments", label: "สิ่งที่แนบมาด้วย(ถ้ามี)", placeholder: "เช่น กำหนดการ หรือระเบียบวาระ" },
        { key: "paragraphs", label: "เนื้อหาย่อหน้า", type: "dynamic-list", subLabel: "เพิ่มเนื้อความแต่ละย่อหน้า" },
        { key: "conclusion", label: "ย่อหน้าสุดท้าย(สรุป)", placeholder: "ระบุข้อความสรุปจบ...", isTextarea: true },
        { key: "signer", label: "ผู้เชิญลงลายเซ็น", placeholder: "ชื่อ-นามสกุล" },
        { key: "position", label: "ตำแหน่ง", placeholder: "ตำแหน่งในสมาคม" },
        { key: "contact", label: "ติดต่อประสานงาน", placeholder: "ชื่อและเบอร์โทรศัพท์" },
        { key: "signature", label: "รูปลายเซ็น", type: "image-upload" }
    ],
    cert_conduct: [
        { key: "subject", label: "เรื่อง", placeholder: "เช่น หนังสือรับรองความประพฤติ..." },
        { key: "to", label: "เรียน", placeholder: "ระบุผู้รับ หรือหน่วยงานที่เกี่ยวข้อง" },
        { key: "paragraphs", label: "เนื้อหาย่อหน้า", type: "dynamic-list", subLabel: "เพิ่มเนื้อความแต่ละย่อหน้า" },
        { key: "conclusion", label: "สรุปย่อหน้าสุดท้าย", placeholder: "ระบุข้อความสรุปจบ...", isTextarea: true },
        { key: "signer", label: "ผู้รับรอง", placeholder: "ชื่อ-นามสกุล ผู้รับรอง" },
        { key: "position", label: "ตำแหน่ง", placeholder: "ตำแหน่งในองค์กร" },
        { key: "contact", label: "ติดต่อประสานงาน", placeholder: "ชื่อและเบอร์โทรศัพท์" },
        { key: "signature", label: "รูปลายเซ็น", type: "image-upload" }
    ],
    invite_external: [
        { key: "subject", label: "เรื่อง", placeholder: "เช่น ขอเชิญเข้าร่วมโครงการ..." },
        { key: "to", label: "เรียน", type: "dynamic-list", subLabel: "ระบุรายชื่อผู้รับเชิญ (เพิ่มได้)" },
        { key: "attachments", label: "สิ่งที่แนบมาด้วย(ถ้ามี)", placeholder: "เช่น กำหนดการ หรือโครงการ" },
        { key: "paragraphs", label: "เนื้อหาย่อหน้า", type: "dynamic-list", subLabel: "เพิ่มเนื้อความแต่ละย่อหน้า" },
        { key: "conclusion", label: "ย่อหน้าสุดท้าย(สรุป)", placeholder: "ระบุข้อความสรุปจบ...", isTextarea: true },
        { key: "signer", label: "ผู้เชิญลงลายเซ็น", placeholder: "ชื่อ-นามสกุล" },
        { key: "position", label: "ตำแหน่ง", placeholder: "ตำแหน่งในสมาคม/องค์กร" },
        { key: "contact", label: "ติดต่อประสานงาน", placeholder: "ชื่อและเบอร์โทรศัพท์" },
        { key: "signature", label: "รูปลายเซ็น", type: "image-upload" }
    ],
    invite_speaker: [
        { key: "subject", label: "เรื่อง", placeholder: "เช่น ขอเชิญเป็นวิทยากรบรรยาย..." },
        { key: "to", label: "เรียน", placeholder: "ชื่อวิทยากร" },
        { key: "paragraphs", label: "เนื้อหาย่อหน้า", type: "dynamic-list", subLabel: "เพิ่มเนื้อความแต่ละย่อหน้า" },
        { key: "conclusion", label: "ย่อหน้าสุดท้ายสรุป", placeholder: "เชิญใครมา ทำอะไร วัน เวลา สถานที่...", isTextarea: true },
        { key: "signer", label: "ผู้ขอเชิญ", placeholder: "ชื่อ-นามสกุล" },
        { key: "position", label: "ตำแหน่ง", placeholder: "ตำแหน่งในองค์กร" },
        { key: "contact", label: "ติดต่อประสานงาน", placeholder: "ชื่อและเบอร์โทรศัพท์" },
        { key: "signature", label: "รูปลายเซ็น", type: "image-upload" }
    ],
    permission_parent: [
        { key: "subject", label: "เรื่อง", placeholder: "เช่น ขออนุญาตผู้ปกครองให้นักเรียนเข้าร่วมกิจกรรม..." },
        { key: "to", label: "เรียน", placeholder: "ผู้ปกครองนักเรียน" },
        { key: "paragraphs", label: "เนื้อหาย่อหน้า", type: "dynamic-list", subLabel: "เพิ่มเนื้อความแต่ละย่อหน้า" },
        { key: "conclusion", label: "สรุปย่อหน้าสุดท้าย", placeholder: "วัน เวลา และความจำเป็น...", isTextarea: true },
        { key: "signer", label: "ผู้ขอเชิญ", placeholder: "ชื่อ-นามสกุล" },
        { key: "position", label: "ตำแหน่ง", placeholder: "ตำแหน่งในองค์กร" },
        { key: "contact", label: "ติดต่อประสานงาน", placeholder: "ชื่อและเบอร์โทรศัพท์" },
        { key: "signature", label: "รูปลายเซ็น", type: "image-upload" }
    ],
    request_support: [
        { key: "subject", label: "เรื่อง", placeholder: "เช่น ขอความอนุเคราะห์สนับสนุนงบประมาณ..." },
        { key: "to", label: "เรียน", placeholder: "ชื่อผู้รับ/หัวหน้าหน่วยงาน" },
        { key: "paragraphs", label: "เนื้อหาย่อหน้า", type: "dynamic-list", subLabel: "เพิ่มเนื้อความแต่ละย่อหน้า" },
        { key: "conclusion", label: "สรุปเนื้อหาย่อหน้าสุดท้าย", placeholder: "ระบุสิ่งที่ต้องการให้สนับสนุนและผลที่คาดว่าจะได้รับ", isTextarea: true },
        { key: "signer", label: "ผู้ขออนุเคราะห์", placeholder: "ชื่อ-นามสกุล" },
        { key: "position", label: "ตำแหน่ง", placeholder: "ตำแหน่งในองค์กร" },
        { key: "contact", label: "ติดต่อประสานงาน", placeholder: "ชื่อและเบอร์โทรศัพท์" },
        { key: "signature", label: "รูปลายเซ็น", type: "image-upload" }
    ],
    permission_school: [
        { key: "subject", label: "เรื่อง", placeholder: "เช่น ขออนุญาตนักเรียน/นักศึกษาเข้าร่วมกิจกรรม..." },
        { key: "to", label: "เรียน", placeholder: "อธิการบดี / ผู้อำนวยการโรงเรียน" },
        { key: "paragraphs", label: "เนื้อหาย่อหน้า", type: "dynamic-list", subLabel: "เพิ่มเนื้อความแต่ละย่อหน้า" },
        { key: "conclusion", label: "ย่อหน้าสุดท้ายสรุป เชิญใครมา ทำอะไร วัน เวลา สถานที่", placeholder: "เชิญใครมา ทำอะไร วัน เวลา สถานที่...", isTextarea: true },
        { 
            key: "inviteeList", 
            label: "รายชื่อผู้ขออนุญาติเชิญ", 
            type: "dynamic-table",
            subLabel: "ระบุรายชื่อนักเรียน/นักศึกษา และรายละเอียดการศึกษา",
            columns: [
                { id: "name", label: "ชื่อ-นามสกุล", type: "text" },
                { id: "school", label: "รร/มหาลัย", type: "text" },
                { id: "grade", label: "ชั้นการศึกษา", type: "text" }
            ]
        },
        { key: "signer", label: "ผู้ขอเชิญ", placeholder: "ชื่อ-นามสกุล" },
        { key: "position", label: "ตำแหน่ง", placeholder: "ตำแหน่งในองค์กร" },
        { key: "contact", label: "ติดต่อประสานงาน", placeholder: "ชื่อและเบอร์โทรศัพท์" },
        { key: "signature", label: "รูปลายเซ็น", type: "image-upload" }
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

const ImageUploadField = ({
    field,
    value,
    onChange
}: {
    field: FieldDef;
    value: any;
    onChange: (val: string) => void;
}) => {
    const currentUrls = value || [];
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsUploading(true);
        try {
            const { urls } = await uploadImages(files);
            const newUrls = [...currentUrls, ...urls];
            onChange(JSON.stringify(newUrls));
            toast.success(`อัปโหลดรูปภาพ ${files.length} รูปเรียบร้อย`);
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("ไม่สามารถอัปโหลดรูปภาพได้");
        } finally {
            setIsUploading(false);
            e.target.value = ""; // Reset
        }
    };

    const removePhoto = (idx: number) => {
        const newUrls = currentUrls.filter((_: any, i: number) => i !== idx);
        onChange(JSON.stringify(newUrls));
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-blue-50/50 p-2 border-l-4 border-blue-600 rounded-r-lg">
                <label className="text-sm font-bold text-blue-900">{field.label} *</label>
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                    {currentUrls.length} รูป
                </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {currentUrls.map((url: string, idx: number) => (
                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img src={getMediaUrl(url)} alt="Uploaded" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removePhoto(idx)}
                            className="absolute top-1 right-1 bg-white/90 text-rose-500 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white border border-slate-100 shadow-sm">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}

                <label className={cn("relative aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-all", isUploading && "pointer-events-none opacity-60 bg-slate-50")}>
                    <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                    {isUploading ? <Loader className="w-5 h-5 text-blue-500 animate-spin" /> : (
                        <>
                            <Plus className="w-5 h-5 text-slate-400 mb-1" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">เพิ่มรูปภาพ</span>
                        </>
                    )}
                </label>
            </div>
            {field.subLabel && <p className="text-[11px] text-slate-400 font-medium italic">{field.subLabel}</p>}
        </div>
    );
};

// ── Flexible Content Component ────────────────────────────────────────────
const FlexibleContentField = ({ field, value, onChange }: { field: FieldDef; value: any; onChange: (val: string) => void }) => {
    const blocks = Array.isArray(value) ? value : [];

    const addBlock = (type: 'text' | 'list' | 'budget') => {
        let newBlock: any = { type };
        if (type === 'text') newBlock.value = "";
        if (type === 'list') newBlock.items = [""];
        if (type === 'budget') newBlock.items = [{ item: "", amount: "" }];
        onChange(JSON.stringify([...blocks, newBlock]));
    };

    const updateBlock = (idx: number, data: any) => {
        const newBlocks = [...blocks];
        newBlocks[idx] = { ...newBlocks[idx], ...data };
        onChange(JSON.stringify(newBlocks));
    };

    const removeBlock = (idx: number) => {
        onChange(JSON.stringify(blocks.filter((_: any, i: number) => i !== idx)));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-indigo-50/50 p-2 border-l-4 border-indigo-600 rounded-r-lg">
                <label className="text-sm font-bold text-indigo-900">{field.label} *</label>
            </div>

            <div className="space-y-4">
                {blocks.map((block: any, bIdx: number) => (
                    <div key={bIdx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm relative group">
                        <button type="button" onClick={() => removeBlock(bIdx)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <X className="w-3 h-3" />
                        </button>

                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                                {block.type === 'text' ? 'ย่อหน้าข้อความ' : block.type === 'list' ? 'รายการหัวข้อ' : 'ตารางงบประมาณ'}
                            </span>
                        </div>

                        {block.type === 'text' && (
                            <textarea rows={3} value={block.value}
                                onChange={e => updateBlock(bIdx, { value: e.target.value })}
                                placeholder="ระบุเนื้อหาประกอบ..."
                                className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white resize-none" />
                        )}

                        {block.type === 'list' && (
                            <div className="space-y-2">
                                {block.items.map((item: string, iIdx: number) => (
                                    <div key={iIdx} className="flex gap-2">
                                        <div className="w-6 h-8 flex items-center justify-center text-slate-300 font-bold">•</div>
                                        <input type="text" value={item}
                                            onChange={e => {
                                                const newItems = [...block.items];
                                                newItems[iIdx] = e.target.value;
                                                updateBlock(bIdx, { items: newItems });
                                            }}
                                            placeholder="ข้อความรายการ..."
                                            className="flex-1 bg-slate-50/50 border border-slate-100 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
                                        {block.items.length > 1 && (
                                            <button type="button" onClick={() => updateBlock(bIdx, { items: block.items.filter((_: any, i: number) => i !== iIdx) })}
                                                className="text-rose-400 hover:text-rose-600 px-1">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={() => updateBlock(bIdx, { items: [...block.items, ""] })}
                                    className="text-[10px] font-bold text-indigo-600 hover:underline uppercase ml-8 mt-1">
                                    + เพิ่มรายการ
                                </button>
                            </div>
                        )}

                        {block.type === 'budget' && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-[1fr_100px_40px] gap-2 px-2 text-[10px] font-black text-slate-400 uppercase uppercase tracking-tighter">
                                    <span>รายการ</span>
                                    <span className="text-right">จำนวนเงิน</span>
                                    <span></span>
                                </div>
                                {block.items.map((item: any, iIdx: number) => (
                                    <div key={iIdx} className="grid grid-cols-[1fr_100px_40px] gap-2 items-center">
                                        <input type="text" value={item.item}
                                            onChange={e => {
                                                const newItems = [...block.items];
                                                newItems[iIdx] = { ...item, item: e.target.value };
                                                updateBlock(bIdx, { items: newItems });
                                            }}
                                            placeholder="ระบุรายการ..."
                                            className="bg-slate-50/50 border border-slate-100 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
                                        <input type="number" value={item.amount}
                                            onChange={e => {
                                                const newItems = [...block.items];
                                                newItems[iIdx] = { ...item, amount: e.target.value };
                                                updateBlock(bIdx, { items: newItems });
                                            }}
                                            placeholder="0"
                                            className="bg-slate-50/50 border border-slate-100 rounded-lg px-3 py-1.5 text-sm text-right outline-none focus:border-indigo-400 focus:bg-white" />
                                        {block.items.length > 1 ? (
                                            <button type="button" onClick={() => updateBlock(bIdx, { items: block.items.filter((_: any, i: number) => i !== iIdx) })}
                                                className="text-rose-400 hover:text-rose-600 flex justify-center">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        ) : <div></div>}
                                    </div>
                                ))}
                                <button type="button" onClick={() => updateBlock(bIdx, { items: [...block.items, { item: "", amount: "" }] })}
                                    className="text-[10px] font-bold text-indigo-600 hover:underline uppercase px-2 mt-1">
                                    + เพิ่มรายการเงิน
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-dotted border-slate-200">
                <button type="button" onClick={() => addBlock('text')}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm">
                    <Plus className="w-3.5 h-3.5" /> ย่อหน้า
                </button>
                <button type="button" onClick={() => addBlock('list')}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm">
                    <Plus className="w-3.5 h-3.5" /> รายการหัวข้อ
                </button>
                <button type="button" onClick={() => addBlock('budget')}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm">
                    <Plus className="w-3.5 h-3.5" /> ตารางเงิน
                </button>
            </div>
            {field.subLabel && <p className="text-[11px] text-slate-400 font-medium italic">{field.subLabel}</p>}
        </div>
    );
};

// ── Appointment List Component ────────────────────────────────────────────
const AppointeeListField = ({ field, value, onChange }: { field: FieldDef; value: any; onChange: (val: string) => void }) => {
    const list = Array.isArray(value) ? value : [{ name: "", oldPosition: "", newPosition: "" }];

    const updateItem = (idx: number, data: any) => {
        const newList = [...list];
        newList[idx] = { ...newList[idx], ...data };
        onChange(JSON.stringify(newList));
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-emerald-50/50 p-2 border-l-4 border-emerald-600 rounded-r-lg">
                <label className="text-sm font-bold text-emerald-900">{field.label} *</label>
                <button type="button" onClick={() => onChange(JSON.stringify([...list, { name: "", oldPosition: "", newPosition: "" }]))}
                    className="text-emerald-700 hover:text-emerald-800 text-[11px] font-black flex items-center gap-1 uppercase tracking-tighter">
                    <Plus className="w-3 h-3" /> เพิ่มรายชื่อ
                </button>
            </div>

            <div className="space-y-3">
                {list.map((item: any, idx: number) => (
                    <div key={idx} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 relative group">
                        {list.length > 1 && (
                            <button type="button" onClick={() => onChange(JSON.stringify(list.filter((_: any, i: number) => i !== idx)))}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">ชื่อ-นามสกุล</label>
                                <input type="text" value={item.name}
                                    onChange={e => updateItem(idx, { name: e.target.value })}
                                    placeholder="ระบุชื่อผู้ได้รับแต่งตั้ง..."
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-emerald-400" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">ตำแหน่งเดิม (ถ้ามี)</label>
                                    <input type="text" value={item.oldPosition}
                                        onChange={e => updateItem(idx, { oldPosition: e.target.value })}
                                        placeholder="เช่น กรรมการบริหาร..."
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-emerald-400" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">ตำแหน่งที่แต่งตั้ง</label>
                                    <input type="text" value={item.newPosition}
                                        onChange={e => updateItem(idx, { newPosition: e.target.value })}
                                        placeholder="เช่น ประธานโครงการ..."
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-emerald-400 font-bold text-emerald-800" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {field.subLabel && <p className="text-[11px] text-slate-400 font-medium italic">{field.subLabel}</p>}
        </div>
    );
};


// ── Sum Field Sync Component ──────────────────────────────────────────────
const SumFieldSync = ({ field, calculatedSum, currentValue, onChange }: any) => {
    useEffect(() => {
        if (String(currentValue) !== String(calculatedSum)) {
            onChange(String(calculatedSum));
        }
    }, [calculatedSum, currentValue, onChange]);

    return (
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex justify-between items-center mt-2 shadow-sm">
            <span className="text-sm font-bold text-blue-800 tracking-wide">{field.label}</span>
            <span className="text-xl font-black text-blue-700">{calculatedSum.toLocaleString()} <span className="text-sm font-bold ml-1">บาท</span></span>
        </div>
    );
};


// ── Status configs ─────────────────────────────────────────────────────────
const requestStatusConfig: Record<string, { className: string }> = {
    "รอดำเนินการ": { className: "bg-amber-100 text-amber-700" },
    "กำลังดำเนินการ": { className: "bg-blue-100 text-blue-700" },
    "เสร็จสิ้น": { className: "bg-green-100 text-green-700" },
};

type Tab = "request" | "pending";

function DocumentsPageContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryTab = (searchParams.get("tab") as Tab) || "request";
    const currentUserName = (session?.user as any)?.name || "";
    const currentUserId = (session?.user as any)?.id || (session?.user as any)?.userId || "";
    
    const userRole = (session?.user as any)?.role || "VIEWER";
    // Everyone can request documents, but only SUPER_ADMIN/ADMIN can manage (edit/delete/change status)
    const isManager = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
    const isViewer = !isManager;
    const { selectedYear } = useYear();
    const [tab, setTab] = useState<Tab>("request");

    // Important: Handle tab change via URL to sync with sidebar
    const handleTabChange = (newTab: Tab) => {
        setTab(newTab);
        router.push(`/documents?tab=${newTab}`);
    };

    useEffect(() => {
        if (queryTab === "request" || queryTab === "pending") {
            setTab(queryTab);
        }
    }, [queryTab]);

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
                requestedById: r.requestedById,
                requestedAt: new Date(r.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }),
                status: r.status as any,
                fields: r.fields as Record<string, string>,
                pdfPath: r.pdfPath,
                resultDocId: r.resultDocId,
                resultDoc: r.resultDoc,
            }));
            setRequests(mapped);
        } catch (error) {
            console.error("Failed to fetch requests:", error);
            // toast.error("ไม่สามารถโหลดข้อมูลคำขอได้");
        } finally {
            setIsLoadingRequests(false);
        }
    };

    const [allDocs, setAllDocs] = useState<StoredDocument[]>([]);
    const [isUploadingResult, setIsUploadingResult] = useState(false);

    const handleUploadResult = async (requestId: string, file: File) => {
        setIsUploadingResult(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("name", "Document Request Result");
            formData.append("type", "Request Result");
            formData.append("department", "Secretariat Office");
            
            const newDoc = await createDocument(formData);
            await updateDocumentRequest(requestId, { resultDocId: newDoc.id });
            
            toast.success("อัปโหลดไฟล์ผลลัพธ์สำเร็จ");
            refreshRequests();
            
            // Update selected request in modal
            const updated = await fetchDocumentRequests(selectedYear || undefined);
            const req = updated.find((r: any) => r.id === requestId);
            if (req) {
                 const mapped = {
                    id: req.id,
                    requestType: req.requestType,
                    department: req.department,
                    requestedBy: req.requestedBy,
                    requestedAt: new Date(req.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }),
                    status: req.status as any,
                    fields: req.fields as Record<string, string>,
                    pdfPath: req.pdfPath,
                    resultDocId: req.resultDocId,
                    resultDoc: req.resultDoc,
                };
                setSelectedRequest(mapped);
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("ไม่สามารถอัปโหลดไฟล์ผลลัพธ์ได้");
        } finally {
            setIsUploadingResult(false);
        }
    };

    useEffect(() => {
        fetchDepartments().then(setDbDepartments).catch(() => []);
        if (isManager) {
            fetchDocuments().then(setAllDocs).catch(() => []);
        }
    }, [isManager]);

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

        setStep(3);
        handleTabChange("request");
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

    // Auto-fill from session
    useEffect(() => {
        if (session?.user && !editingRequestId) {
            // Fill name if empty
            if (session.user.name && !requesterName) {
                setRequesterName(session.user.name);
            }

            // Fill Org if empty and departments are loaded
            const userDept = (session.user as any).department;
            if (userDept && !requesterOrg && dbDepartments.length > 0) {
                const match = dbDepartments.find(d => d.name === userDept);
                if (match) setRequesterOrg(match.name);
            }

            // Fill Sub-dept if empty
            const userSubDept = (session.user as any).subDepartment;
            if (userSubDept && !requesterSubDept) {
                setRequesterSubDept(userSubDept);
            }
        }
    }, [session, dbDepartments, editingRequestId, requesterName, requesterOrg, requesterSubDept]);

    // Selected Doc Type (Step 2)
    const [selectedRequestType, setSelectedRequestType] = useState<string | null>(null);

    // Form Fields (Step 3)
    const [requestFields, setRequestFields] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sub-departments derived from selected Org
    const selectedOrgDef = dbDepartments.find(d => d.name === requesterOrg);
    const subDeptsOptions = useMemo(() => {
        const baseOptions = selectedOrgDef?.subDepts || [];
        const userSubDept = (session?.user as any)?.subDepartment;
        
        // If user has a specific sub-department that's not in the list, and they are in the selected org
        if (userSubDept && !baseOptions.includes(userSubDept) && selectedOrgDef?.name === (session?.user as any)?.department) {
            return [userSubDept, ...baseOptions];
        }
        return baseOptions;
    }, [selectedOrgDef, session]);

    function setField(key: string, val: string) {
        let parsed = val;
        try {
            // If it's a JSON string (for arrays/objects), parse it to store as real data
            if (val.startsWith("[") || val.startsWith("{")) {
                parsed = JSON.parse(val);
            }
        } catch (e) { }
        setRequestFields(p => ({ ...p, [key]: parsed }));
    }

    function resetRequestForm() {
        setStep(1);
        // Reset to session defaults
        if (session?.user) {
            setRequesterName(session.user.name || "");
            const userDept = (session.user as any).department;
            const match = dbDepartments.find(d => d.name === userDept);
            setRequesterOrg(match?.name || "");
        } else {
            setRequesterOrg("");
            setRequesterName("");
        }
        setRequesterSubDept("");
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
        // Initialize fields with source: user if applicable
        const fields = REQUEST_FIELDS[typeId] || [];
        const initialFields: Record<string, any> = {};
        fields.forEach(f => {
            if (f.source === "user") {
                if (f.key === "requesterName") initialFields[f.key] = requesterName;
                if (f.key === "requesterSubDept") initialFields[f.key] = requesterSubDept;
            }
            
            // Initialize dynamic fields with empty containers
            if (f.type === "dynamic-list" || f.type === "dynamic-plan" || f.type === "dynamic-budget" || f.type === "dynamic-table" || f.type === "dynamic-appointee-list" || f.type === "evaluation-table") {
                if (f.type === "dynamic-table" && f.columns) {
                    const emptyRow: any = {};
                    f.columns.forEach(c => emptyRow[c.id] = "");
                    initialFields[f.key] = [emptyRow];
                } else if (f.type === "dynamic-budget") {
                    initialFields[f.key] = [{ title: "", amount: "" }];
                } else if (f.type === "dynamic-plan") {
                    initialFields[f.key] = [{ activity: "", months: [] }];
                } else if (f.type === "evaluation-table") {
                    initialFields[f.key] = {};
                } else {
                    initialFields[f.key] = [""];
                }
            } else if (f.type === "sum" || f.type === "number") {
                initialFields[f.key] = 0;
            }
        });
        setRequestFields(initialFields);
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
            handleTabChange("pending");
        } catch (error) {
            console.error("Failed to save request:", error);
            toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayRequests = isManager 
        ? requests 
        : requests.filter(r => r.requestedById === currentUserId);

    const listRequests = isManager 
        ? displayRequests.filter(r => r.status !== "เสร็จสิ้น") 
        : displayRequests;

    const tabLabels = isManager 
        ? { request: "สร้างเอกสารใหม่", pending: "จัดการคำขอเอกสาร" }
        : { request: "สร้างคำขอใหม่", pending: "ประวัติคำขอของฉัน" };

    return (
        <>
            <div className="space-y-5 animate-fade-in-up pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">ขอจัดทำเอกสาร</h1>
                    <p className="text-sm text-slate-500 font-medium">ระบบจัดการและจัดทำเอกสารแบบฟอร์มให้เป็นรูปแบบมาตรฐาน</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit self-start md:self-center">
                    {(Object.keys(tabLabels) as Tab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => handleTabChange(t)}
                            className={cn(
                                "px-6 py-2 text-xs font-bold rounded-lg transition-all duration-200",
                                tab === t 
                                    ? "bg-white text-blue-600 shadow-sm" 
                                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                            )}
                        >
                            {tabLabels[t]}
                        </button>
                    ))}
                </div>
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

                                            <form onSubmit={handleSubmitRequest} className="space-y-6">
                                                {normalFields.map(f => {
                                                    const value = requestFields[f.key];

                                                    if (f.type === "select-org") {
                                                        return (
                                                            <div key={f.key}>
                                                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">{f.label} *</label>
                                                                <div className="relative">
                                                                    <select value={value ?? ""}
                                                                        disabled={f.readonly}
                                                                        onChange={e => {
                                                                            const val = e.target.value;
                                                                            setField(f.key, val);
                                                                            // Also reset sub-dept if it belongs to this doc
                                                                            const subField = normalFields.find(sf => sf.type === "select-sub");
                                                                            if (subField) setField(subField.key, "");
                                                                        }}
                                                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 outline-none appearance-none focus:border-blue-400 focus:bg-white transition-colors disabled:opacity-50">
                                                                        <option value="" disabled>เลือกหน่วยงาน...</option>
                                                                        {dbDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                                                    </select>
                                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    if (f.type === "select-sub") {
                                                        const orgField = normalFields.find(of => of.type === "select-org");
                                                        const currentOrg = orgField ? requestFields[orgField.key] : "";
                                                        const orgDef = dbDepartments.find(d => d.name === currentOrg);
                                                        const options = orgDef?.subDepts || [];

                                                        return (
                                                            <div key={f.key}>
                                                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">{f.label} *</label>
                                                                <div className="relative">
                                                                    <select value={value ?? ""} onChange={e => setField(f.key, e.target.value)} disabled={!currentOrg || f.readonly}
                                                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 outline-none appearance-none focus:border-blue-400 focus:bg-white transition-colors disabled:opacity-50">
                                                                        <option value="" disabled>เลือกสังกัด...</option>
                                                                        {options.map((sd: string, i: number) => <option key={i} value={sd}>{sd}</option>)}
                                                                    </select>
                                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    if (f.type === "dynamic-list") {
                                                        const list = Array.isArray(value) ? value : [""];
                                                        return (
                                                            <div key={f.key} className="space-y-2">
                                                                <div className="flex justify-between items-end">
                                                                    <div>
                                                                        <label className="text-sm font-semibold text-slate-700 block">{f.label} *</label>
                                                                        {f.subLabel && <p className="text-[10px] text-slate-400">{f.subLabel}</p>}
                                                                    </div>
                                                                    {!f.readonly && (
                                                                        <button type="button" onClick={() => setField(f.key, JSON.stringify([...list, ""]))}
                                                                            className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1">
                                                                            <Plus className="w-3 h-3" /> เพิ่มรายการ
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {list.map((item: string, idx: number) => (
                                                                        <div key={idx} className="flex gap-2">
                                                                            <input type="text" value={item}
                                                                                disabled={f.readonly}
                                                                                onChange={e => {
                                                                                    const newList = [...list];
                                                                                    newList[idx] = e.target.value;
                                                                                    setField(f.key, JSON.stringify(newList));
                                                                                }}
                                                                                placeholder={f.placeholder}
                                                                                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 outline-none focus:border-blue-400 focus:bg-white disabled:opacity-50" />
                                                                            {!f.readonly && list.length > 1 && (
                                                                                <button type="button" onClick={() => {
                                                                                    const newList = list.filter((_: any, i: number) => i !== idx);
                                                                                    setField(f.key, JSON.stringify(newList));
                                                                                }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    if (f.type === "dynamic-budget") {
                                                        const list = Array.isArray(value) ? value : [{ title: "", amount: "" }];
                                                        const total = list.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
                                                        return (
                                                            <div key={f.key} className="space-y-2">
                                                                <div className="flex justify-between items-end">
                                                                    <div>
                                                                        <label className="text-sm font-semibold text-slate-700 block">{f.label} *</label>
                                                                        {f.subLabel && <p className="text-[10px] text-slate-400">{f.subLabel}</p>}
                                                                    </div>
                                                                    {!f.readonly && (
                                                                        <button type="button" onClick={() => setField(f.key, JSON.stringify([...list, { title: "", amount: "" }]))}
                                                                            className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1">
                                                                            <Plus className="w-3 h-3" /> เพิ่มรายการ
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {list.map((item: any, idx: number) => (
                                                                        <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                                                                            <input type="text" value={item.title}
                                                                                disabled={f.readonly}
                                                                                onChange={e => {
                                                                                    const newList = [...list];
                                                                                    newList[idx] = { ...item, title: e.target.value };
                                                                                    setField(f.key, JSON.stringify(newList));
                                                                                }}
                                                                                placeholder={f.placeholder || "รายการ..."}
                                                                                className="flex-1 border-none bg-transparent outline-none text-sm px-2 disabled:opacity-50" />
                                                                            <div className="w-px h-6 bg-slate-100" />
                                                                            <input type="number" value={item.amount}
                                                                                disabled={f.readonly}
                                                                                onChange={e => {
                                                                                    const newList = [...list];
                                                                                    newList[idx] = { ...item, amount: e.target.value };
                                                                                    setField(f.key, JSON.stringify(newList));
                                                                                }}
                                                                                placeholder="0"
                                                                                className="w-24 border-none bg-transparent outline-none text-sm text-right px-2 font-bold text-blue-600 disabled:opacity-50" />
                                                                            {!f.readonly && list.length > 1 && (
                                                                                <button type="button" onClick={() => {
                                                                                    const newList = list.filter((_: any, i: number) => i !== idx);
                                                                                    setField(f.key, JSON.stringify(newList));
                                                                                }} className="p-1.5 text-rose-400 hover:text-rose-600">
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div className="flex justify-between items-center bg-blue-50/70 p-3 rounded-xl border border-blue-100 mt-2">
                                                                    <span className="text-xs font-black text-blue-700 uppercase tracking-widest">ผลรวมยอดเบิก (บาท)</span>
                                                                    <span className="text-lg font-black text-blue-700">{total.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    if (f.type === "image-upload") {
                                                        return (
                                                            <div key={f.key}>
                                                                <ImageUploadField
                                                                    field={f}
                                                                    value={value}
                                                                    onChange={(val) => setField(f.key, val)}
                                                                />
                                                            </div>
                                                        );
                                                    }

                                                    if (f.type === "flexible-content") {
                                                        return (
                                                            <div key={f.key}>
                                                                <FlexibleContentField
                                                                    field={f}
                                                                    value={value}
                                                                    onChange={(val) => setField(f.key, val)}
                                                                />
                                                            </div>
                                                        );
                                                    }

                                                    if (f.type === "dynamic-appointee-list") {
                                                        return (
                                                            <div key={f.key}>
                                                                <AppointeeListField
                                                                    field={f}
                                                                    value={value}
                                                                    onChange={(val) => setField(f.key, val)}
                                                                />
                                                            </div>
                                                        );
                                                    }

                                                    if (f.type === "evaluation-table") {
                                                        const scores = (value as any) || {};
                                                        const items = f.items || [];
                                                        const labelsTh = ["ดีมาก (5)", "ดี (4)", "พอใช้ (3)", "ปรับปรุง (2)", "ปรับปรุงด่วน (1)"];
                                                        const scoresMap = [5, 4, 3, 2, 1];

                                                        return (
                                                            <div key={f.key} className="space-y-4">
                                                                <label className="text-sm font-bold text-blue-900 block bg-blue-50/50 p-2 border-l-4 border-blue-600 rounded-r-lg">{f.label} *</label>
                                                                <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
                                                                    <table className="w-full text-xs">
                                                                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-black">
                                                                            <tr>
                                                                                <th className="py-3 px-4 text-left font-bold">รายการ</th>
                                                                                {labelsTh.map((l, idx) => <th key={idx} className="py-3 px-2 text-center w-14 font-bold">{l.split(" ")[0]}</th>)}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-50 bg-white">
                                                                            {items.map(item => (
                                                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                                                    <td className="py-4 px-4 text-slate-700 font-medium leading-relaxed">{item.label}</td>
                                                                                    {scoresMap.map(score => (
                                                                                        <td key={score} className="py-4 px-2 text-center">
                                                                                            <button type="button"
                                                                                                disabled={f.readonly}
                                                                                                onClick={() => {
                                                                                                    const newScores = { ...scores, [item.id]: score };
                                                                                                    setField(f.key, JSON.stringify(newScores));
                                                                                                }}
                                                                                                className={cn("w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center",
                                                                                                    scores[item.id] === score ? "border-blue-600 bg-blue-600 text-white shadow-md scale-110" : "border-slate-200 hover:border-slate-300",
                                                                                                    f.readonly && "opacity-50 cursor-not-allowed")}>
                                                                                                {scores[item.id] === score && <Check className="w-3 h-3 stroke-[4]" />}
                                                                                            </button>
                                                                                        </td>
                                                                                    ))}
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    if (f.type === "dynamic-plan") {
                                                        const list = Array.isArray(value) ? value : [{ activity: "", months: [] }];
                                                        const monthsTh = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

                                                        return (
                                                            <div key={f.key} className="space-y-4">
                                                                <div className="flex justify-between items-end pb-1 border-b border-slate-100">
                                                                    <label className="text-sm font-bold text-slate-700">{f.label} *</label>
                                                                    {!f.readonly && (
                                                                        <button type="button" onClick={() => setField(f.key, JSON.stringify([...list, { activity: "", months: [] }]))}
                                                                            className="text-blue-600 hover:text-blue-700 text-xs font-black flex items-center gap-1">
                                                                            <Plus className="w-3 h-3" /> เพิ่มกิจกรรม
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="space-y-4">
                                                                    {list.map((item: any, idx: number) => (
                                                                        <div key={idx} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 relative group">
                                                                            {!f.readonly && list.length > 1 && (
                                                                                <button type="button" onClick={() => {
                                                                                    const newList = list.filter((_: any, i: number) => i !== idx);
                                                                                    setField(f.key, JSON.stringify(newList));
                                                                                }} className="absolute -top-2 -right-2 w-6 h-6 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <X className="w-3 h-3" />
                                                                                </button>
                                                                            )}
                                                                            <div className="space-y-3">
                                                                                <input type="text" value={item.activity}
                                                                                    disabled={f.readonly}
                                                                                    onChange={e => {
                                                                                        const newList = [...list];
                                                                                        newList[idx] = { ...item, activity: e.target.value };
                                                                                        setField(f.key, JSON.stringify(newList));
                                                                                    }}
                                                                                    placeholder="ชื่อกิจกรรมดำเนินงาน..."
                                                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-400 disabled:opacity-50" />
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {monthsTh.map((m, mi) => {
                                                                                        const monthIdx = mi + 1;
                                                                                        const isSelected = item.months.includes(monthIdx);
                                                                                        return (
                                                                                            <button key={mi} type="button"
                                                                                                disabled={f.readonly}
                                                                                                onClick={() => {
                                                                                                    const newList = [...list];
                                                                                                    const currentMonths = item.months;
                                                                                                    const newMonths = isSelected
                                                                                                        ? currentMonths.filter((m: number) => m !== monthIdx)
                                                                                                        : [...currentMonths, monthIdx].sort((a, b) => a - b);
                                                                                                    newList[idx] = { ...item, months: newMonths };
                                                                                                    setField(f.key, JSON.stringify(newList));
                                                                                                }}
                                                                                                className={cn("px-2 py-1 rounded text-[10px] font-bold transition-all border",
                                                                                                    isSelected ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300",
                                                                                                    f.readonly && "opacity-50 cursor-not-allowed")}>
                                                                                                {m}
                                                                                            </button>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    if (f.type === "dynamic-table") {
                                                        const list = Array.isArray(value) && value.length > 0 ? value : [{}];
                                                        return (
                                                            <div key={f.key} className="space-y-4 pt-2">
                                                                <div className="flex justify-between items-end pb-2 border-b border-slate-100">
                                                                    <div>
                                                                        <label className="text-sm font-semibold text-slate-700 block">{f.label} *</label>
                                                                        {f.subLabel && <p className="text-[10px] text-slate-400">{f.subLabel}</p>}
                                                                    </div>
                                                                    {!f.readonly && (
                                                                        <button type="button" onClick={() => {
                                                                            const newItem: any = {};
                                                                            f.columns?.forEach(c => newItem[c.id] = "");
                                                                            setField(f.key, JSON.stringify([...list, newItem]))
                                                                        }}
                                                                            className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1">
                                                                            <Plus className="w-3 h-3" /> เพิ่มรายการ
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="space-y-3">
                                                                    {list.map((item: any, idx: number) => (
                                                                        <div key={idx} className="flex flex-col md:flex-row gap-3 md:gap-2 items-start md:items-end bg-slate-50 p-4 md:p-3 rounded-xl border border-slate-100 relative">
                                                                            <div className="w-full flex-1 grid grid-cols-1 md:flex md:flex-row gap-3">
                                                                                {f.columns?.map(col => (
                                                                                    <div key={col.id} className="flex-1">
                                                                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">{col.label}</label>
                                                                                        <input type={col.type === "number" ? "number" : "text"} 
                                                                                            value={item[col.id] || ""}
                                                                                            onChange={e => {
                                                                                                const newList = [...list];
                                                                                                newList[idx] = { ...item, [col.id]: e.target.value };
                                                                                                setField(f.key, JSON.stringify(newList));
                                                                                            }}
                                                                                            disabled={f.readonly}
                                                                                            placeholder={col.label}
                                                                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:opacity-50" />
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            {!f.readonly && list.length > 1 && (
                                                                                <button type="button" onClick={() => {
                                                                                    const newList = list.filter((_: any, i: number) => i !== idx);
                                                                                    setField(f.key, JSON.stringify(newList));
                                                                                }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg flex-shrink-0 self-end">
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    if (f.type === "sum") {
                                                        const targetListStr = requestFields[f.targetKey || ""];
                                                        const targetFieldDef = normalFields.find(tc => tc.key === f.targetKey);
                                                        const sumCol = targetFieldDef?.sumColumn || "amount";
                                                        
                                                        let calculatedSum = 0;
                                                        try {
                                                            const targetList = Array.isArray(targetListStr) 
                                                                ? targetListStr 
                                                                : (typeof targetListStr === 'string' && targetListStr.startsWith('[') ? JSON.parse(targetListStr) : []);
                                                            
                                                            if (Array.isArray(targetList)) {
                                                                calculatedSum = targetList.reduce((s: number, row: any) => s + (Number(row[sumCol]) || 0), 0);
                                                            }
                                                        } catch(e) {
                                                            console.warn("Sum calculation failed:", e);
                                                        }
                                                        
                                                        return (
                                                            <div key={f.key}>
                                                                <SumFieldSync 
                                                                    field={f} 
                                                                    calculatedSum={calculatedSum} 
                                                                    currentValue={value} 
                                                                    onChange={(val: string) => setField(f.key, val)} 
                                                                />
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div key={f.key}>
                                                            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">{f.label} *</label>
                                                            {f.type === "date" ? (
                                                                <input type="date" required value={value ?? ""}
                                                                    disabled={f.readonly}
                                                                    onChange={e => setField(f.key, e.target.value)}
                                                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 outline-none focus:border-blue-400 focus:bg-white disabled:opacity-50" />
                                                            ) : f.isTextarea ? (
                                                                <textarea rows={3} required value={value ?? ""}
                                                                    disabled={f.readonly}
                                                                    onChange={e => setField(f.key, e.target.value)}
                                                                    placeholder={f.placeholder}
                                                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 outline-none focus:border-blue-400 focus:bg-white resize-none disabled:opacity-50" />
                                                            ) : (
                                                                <input type={f.type ?? "text"} required value={value ?? ""}
                                                                    disabled={f.readonly}
                                                                    onChange={e => setField(f.key, e.target.value)}
                                                                    placeholder={f.placeholder}
                                                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 outline-none focus:border-blue-400 focus:bg-white disabled:opacity-50" />
                                                            )}
                                                        </div>
                                                    );
                                                })}



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
                        {listRequests.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
                                <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 font-medium text-sm">ไม่พบรายการคำขอในขณะนี้</p>
                            </div>
                        )}
                        {listRequests.map(req => {
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
                                        <div className="flex gap-1.5 font-bold">
                                            {req.resultDoc?.filePath && (
                                                <a 
                                                    href={getMediaUrl(req.resultDoc.filePath)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 p-2 px-3 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100"
                                                    title="ดาวน์โหลดเอกสาร"
                                                >
                                                    <FileDown className="w-4 h-4" />
                                                    <span className="text-[11px] hidden sm:inline">ดาวน์โหลด</span>
                                                </a>
                                            )}
                                            <button onClick={() => setSelectedRequest(req)} title="ดูรายละเอียด"
                                                className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {/* Edit/Delete buttons (Owner or Manager) */}
                                            {(req.requestedById === currentUserId || isManager) && (
                                                <>
                                                    {req.status !== "เสร็จสิ้น" && (
                                                        <button onClick={() => handleEditRequest(req)} title="แก้ไข"
                                                            className="p-2 bg-blue-50 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDeleteRequest(req.id, req.requestType)} title="ลบ"
                                                        className="p-2 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>



                                </div>
                            );
                        })}

                    </div>
                )}
            </div>

            {/* ─── REQUEST DETAIL MODAL ─── */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto" onClick={() => setSelectedRequest(null)}>
                    <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] animate-in zoom-in-95 duration-300 pointer-events-auto select-text" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm">{ALL_REQUEST_TYPES.find(r => r.label === selectedRequest?.requestType)?.icon || "📄"}</span>
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">
                                        {selectedRequest?.requestType}
                                    </span>
                                </div>
                                <h2 className="text-xl font-black text-slate-900 leading-tight">รายละเอียดคำขอจัดทำเอกสาร</h2>
                                <p className="text-xs font-bold text-slate-400 mt-0.5">ส่งคำขอเมื่อ {selectedRequest?.requestedAt}</p>
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
                                    <p className="font-bold text-slate-800">{selectedRequest?.requestedBy}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">หน่วยงาน/สังกัด</p>
                                    <p className="font-bold text-slate-800">{selectedRequest?.department}</p>
                                </div>
                            </div>

                            {/* Status Section */}
                            {!isViewer && (
                                <div className="mb-8">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">สถานะปัจจุบัน</p>
                                    <div className="flex items-center gap-3">
                                        {["รอดำเนินการ", "กำลังดำเนินการ", "เสร็จสิ้น"].map((s) => (
                                            <button key={s} onClick={() => handleUpdateStatus(selectedRequest?.id, s as any)}
                                                className={cn("flex-1 py-3 rounded-xl text-xs font-bold transition-all border",
                                                    selectedRequest?.status === s
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
                                {(() => {
                                    const typeDef = ALL_REQUEST_TYPES.find(rt => rt.label === selectedRequest?.requestType);
                                    const typeId = typeDef?.id || "";
                                    const fieldsConfig = REQUEST_FIELDS[typeId] || [];
                                    const monthsShortTh = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

                                    return (
                                        <div className="space-y-6">
                                            {fieldsConfig.map(fieldDef => {
                                                    const k = fieldDef.key;
                                                    const v = (selectedRequest?.fields as any)?.[k];
                                                    if (v === undefined || v === null) return null;
                                                    const isArray = Array.isArray(v);

                                                    return (
                                                        <div key={k} className="group/field">
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{fieldDef.label}</p>
                                                                <button
                                                                    onClick={() => {
                                                                        const val = isArray ? JSON.stringify(v) : String(v);
                                                                        navigator.clipboard.writeText(val);
                                                                        toast.success(`คัดลอก ${fieldDef.label} แล้ว`);
                                                                    }}
                                                                    className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover/field:opacity-100"
                                                                    title="คัดลอกข้อมูล"
                                                                >
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>

                                                            {fieldDef.type === "dynamic-table" ? (
                                                                <div className="overflow-x-auto rounded-xl border border-slate-100">
                                                                    <table className="w-full text-xs">
                                                                        <thead className="bg-slate-50/50">
                                                                            <tr>
                                                                                {fieldDef.columns?.map(col => (
                                                                                    <th key={col.id} className="py-2 px-3 text-left font-bold text-slate-500">{col.label}</th>
                                                                                ))}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-50">
                                                                            {isArray && (v as any[]).map((row, idx) => (
                                                                                <tr key={idx}>
                                                                                    {fieldDef.columns?.map(col => (
                                                                                        <td key={col.id} className="py-2 px-3 text-slate-700">
                                                                                            {col.type === "number" ? Number(row[col.id]).toLocaleString() : String(row[col.id] || "—")}
                                                                                        </td>
                                                                                    ))}
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : fieldDef.type === "sum" ? (
                                                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                                                                    <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">{fieldDef.label}</span>
                                                                    <span className="text-lg font-black text-blue-800">{Number(v || 0).toLocaleString()} <span className="text-xs font-bold ml-1">บาท</span></span>
                                                                </div>
                                                            ) : fieldDef.type === "dynamic-budget" ? (
                                                                    <div className="space-y-2">
                                                                        {isArray && (v as any[]).map((item, idx) => (
                                                                            <div key={idx} className="flex justify-between items-center text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                                                                <span className="text-slate-600 font-medium">{item.title || item.item || item.name}</span>
                                                                                <span className="font-bold text-blue-600">{Number(item.amount).toLocaleString()}</span>
                                                                            </div>
                                                                        ))}
                                                                        {isArray && (v as any[]).length > 0 && (
                                                                            <div className="flex justify-between items-center text-sm p-3 bg-blue-50/50 rounded-xl border border-blue-100 font-black text-blue-700">
                                                                                <span>รวมทั้งหมด</span>
                                                                                <span>{((v as any[]).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)).toLocaleString()} <span className="text-[10px] ml-1">บาท</span></span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                            ) : fieldDef?.type === "dynamic-plan" ? (
                                                                <div className="space-y-2">
                                                                    {isArray && (v as any[]).map((item, idx) => (
                                                                        <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                                            <p className="text-sm font-bold text-slate-800 mb-1.5">{item.activity}</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {monthsShortTh.map((m, mi) => (
                                                                                    <span key={mi} className={cn("text-[9px] px-1.5 py-0.5 rounded border font-bold",
                                                                                        item.months.includes(mi + 1) ? "bg-blue-600 border-blue-600 text-white" : "bg-white text-slate-300 border-slate-100")}>
                                                                                        {m}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : fieldDef.type === "image-upload" ? (
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {isArray ? (v as any[]).map((img, idx) => (
                                                                        <a key={idx} href={getMediaUrl(String(img))} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-slate-100 hover:border-blue-300 transition-all aspect-video bg-slate-50">
                                                                            <img src={getMediaUrl(String(img))} alt="Evidence" className="w-full h-full object-cover" />
                                                                        </a>
                                                                    )) : (
                                                                        <a href={getMediaUrl(String(v))} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-slate-100 hover:border-blue-300 transition-all max-w-[250px] bg-slate-50">
                                                                            <img src={getMediaUrl(String(v))} alt="Preview" className="w-full h-auto" />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ) : fieldDef?.type === "evaluation-table" ? (
                                                                <div className="overflow-x-auto rounded-xl border border-slate-50">
                                                                    <table className="w-full text-[10px]">
                                                                        <thead className="bg-slate-50/50">
                                                                            <tr>
                                                                                <th className="py-2 px-3 text-left">หัวข้อ</th>
                                                                                <th className="py-2 px-1 text-center w-8">5</th>
                                                                                <th className="py-2 px-1 text-center w-8">4</th>
                                                                                <th className="py-2 px-1 text-center w-8">3</th>
                                                                                <th className="py-2 px-1 text-center w-8">2</th>
                                                                                <th className="py-2 px-1 text-center w-8">1</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-50">
                                                                            {fieldDef.items?.map(item => {
                                                                                const score = (v as any)?.[item.id];
                                                                                return (
                                                                                    <tr key={item.id}>
                                                                                        <td className="py-2 px-3 text-slate-600">{item.label}</td>
                                                                                        {[5, 4, 3, 2, 1].map(s => (
                                                                                            <td key={s} className="py-2 px-1 text-center font-bold text-blue-600">
                                                                                                {score === s ? "/" : ""}
                                                                                            </td>
                                                                                        ))}
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                            <tr className="bg-blue-50 font-black text-blue-700">
                                                                                <td className="py-2 px-3">ค่าเฉลี่ย (Average)</td>
                                                                                <td colSpan={5} className="py-2 px-3 text-right">
                                                                                    {(() => {
                                                                                        const scores = Object.values(v as any).filter(s => typeof s === "number") as number[];
                                                                                        if (scores.length === 0) return "0.00";
                                                                                        return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
                                                                                    })()}
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    {isArray ? (v as any[]).map((item, idx) => (
                                                                        <div key={idx} className="flex items-start gap-2 text-sm text-slate-700 p-2 bg-slate-50/50 rounded-xl border border-dotted border-slate-200">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                                                                            <span className="break-all whitespace-pre-wrap">{String(item)}</span>
                                                                        </div>
                                                                    )) : (
                                                                        <p className="text-sm font-semibold text-slate-800 break-words whitespace-pre-wrap">{String(v || "—")}</p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Result Document Section */}
                            {(isManager || selectedRequest?.resultDocId) && (
                                <div className="mt-8 pt-6 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">เอกสารผลลัพธ์ / ผลการดำเนินการ</p>
                                        {isManager && isUploadingResult && <Loader className="w-4 h-4 animate-spin text-blue-500" />}
                                    </div>
                                    
                                    {isManager ? (
                                        <div className="space-y-4">
                                            {selectedRequest?.resultDocId ? (
                                                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between group hover:shadow-md transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                                            <FileText className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">{selectedRequest.resultDoc?.name || "เอกสารผลลัพธ์ที่แนบไว้"}</p>
                                                            <p className="text-[10px] text-blue-600 font-medium">{selectedRequest.resultDoc?.docNo || "—"}</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            if (confirm("ลบไฟล์แนบออกใช่หรือไม่?")) {
                                                                updateDocumentRequest(selectedRequest.id, { resultDocId: null as any });
                                                                setSelectedRequest({ ...selectedRequest, resultDocId: undefined, resultDoc: undefined });
                                                                refreshRequests();
                                                            }
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                        title="ลบไฟล์แนบ"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {/* Option A: Upload New File */}
                                                    <div className="relative">
                                                        <input 
                                                            type="file" 
                                                            id="result-upload" 
                                                            className="hidden" 
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file && selectedRequest) handleUploadResult(selectedRequest.id, file);
                                                            }}
                                                        />
                                                        <label 
                                                            htmlFor="result-upload"
                                                            className="w-full h-full min-h-[50px] flex items-center justify-center gap-2 border-2 border-dashed border-blue-100 bg-blue-50/30 rounded-2xl cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all text-sm font-bold text-blue-600"
                                                        >
                                                            <Plus className="w-5 h-5" /> อัปโหลดไฟล์ผลลัพธ์
                                                        </label>
                                                    </div>

                                                    {/* Option B: Match from Registry */}
                                                    <div className="relative">
                                                        <select 
                                                            className="w-full h-full min-h-[50px] bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm outline-none focus:border-blue-500 transition-all font-bold appearance-none pr-10"
                                                            value={selectedRequest?.resultDocId || ""}
                                                            onChange={async (e) => {
                                                                const docId = e.target.value;
                                                                if (selectedRequest && docId) {
                                                                    try {
                                                                        await updateDocumentRequest(selectedRequest.id, { resultDocId: docId });
                                                                        toast.success("เชื่อมโยงเอกสารเรียบร้อย");
                                                                        refreshRequests();
                                                                        const linkedDoc = allDocs.find(d => d.id === docId);
                                                                        setSelectedRequest({ ...selectedRequest, resultDocId: docId, resultDoc: linkedDoc });
                                                                    } catch (err) {
                                                                        toast.error("ไม่สามารถเชื่อมโยงเอกสารได้");
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <option value="">-- เลือกจากทะเบียน --</option>
                                                            {allDocs.map(doc => (
                                                                <option key={doc.id} value={doc.id}>{doc.docNo} - {doc.name}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                    </div>
                                                </div>
                                            )}
                                            <p className="text-[10px] text-slate-400">แอดมินต้องทำการแนบไฟล์เอกสารผลลัพธ์ (โดยการอัปโหลดใหม่หรือเลือกจากทะเบียน) ก่อนที่จะสามารถปิดงานได้</p>
                                        </div>
                                    ) : (
                                        selectedRequest?.resultDocId && (
                                            <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center justify-between group hover:shadow-md transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-green-600">
                                                        <FileDown className="w-5 h-5 transition-transform group-hover:scale-110" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-green-800">เอกสารดำเนินการเสร็จสิ้นแล้ว</p>
                                                        <p className="text-xs text-green-600 font-medium">{selectedRequest.resultDoc?.docNo || "คลิกปุ่มเพื่อดาวน์โหลด"}</p>
                                                    </div>
                                                </div>
                                                {selectedRequest.resultDoc?.filePath && (
                                                    <a 
                                                        href={getMediaUrl(selectedRequest.resultDoc.filePath)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-rose-200 transition-all flex items-center gap-2"
                                                    >
                                                        <FileDown className="w-4 h-4" />
                                                        ดาวน์โหลดเอกสาร
                                                    </a>
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setSelectedRequest(null)}
                                className="flex-1 py-3 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors">
                                ปิดหน้าต่าง
                            </button>
                            {selectedRequest?.status !== "เสร็จสิ้น" && (
                                isManager ? (
                                    <button 
                                        disabled={!selectedRequest?.resultDocId}
                                        onClick={() => { handleUpdateStatus(selectedRequest?.id || "", "เสร็จสิ้น"); setSelectedRequest(null); }}
                                        className={cn(
                                            "flex-[2] py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                                            selectedRequest?.resultDocId 
                                                ? "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-100" 
                                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                        )}
                                        title={!selectedRequest?.resultDocId ? "กรุณาแนบไฟล์ผลลัพธ์ก่อนกดเสร็จสิ้น" : ""}
                                    >
                                        <CheckCircle2 className="w-5 h-5" /> ยืนยันว่าดำเนินการเสร็จสิ้น
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => { handleEditRequest(selectedRequest); setSelectedRequest(null); }}
                                        className="flex-[2] bg-blue-600 text-white py-3 rounded-2xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Edit className="w-5 h-5" /> แก้ไขคำขอเอกสาร
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function DocumentsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        }>
            <DocumentsPageContent />
        </Suspense>
    );
}
