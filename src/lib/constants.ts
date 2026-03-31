// ============================================================
// CONSTANTS — UI constants, labels, and utility functions
// ============================================================

export const CURRENT_THAI_YEAR = 2569;

export const ORG_PREFIX_BY_DEPT: Record<string, string> = {
    "ครอบครัวฟิตยะตุลฮัก": "ที่ ฟฮ",
    "สำนักอำนวยการ": "ที่ สอ.ฟฮ",
    "สมาคมพัฒนาเยาวชนมุสลิมไทย": "ที่ สพยท.",
    "สำนักกิจการสตรี สมาคมฯ": "ที่ สพยท.",
};

export const MASTER_CATEGORIES = [
    "ประเภทเอกสารโครงการ",
    "ประเภทเอกสารรายงานผลการดำเนินโครงการ",
    "ประเภทเอกสารประกาศหรือคำสั่ง",
    "ประเภทเอกสารภายใน",
    "ประเภทเอกสารภายนอก"
];

export const CATEGORY_MAP: Record<string, string> = {
    "ใบโครงการ": "ประเภทเอกสารโครงการ",
    "รายงานผลการดำเนินโครงการ": "ประเภทเอกสารรายงานผลการดำเนินโครงการ",
    "เอกสารประกาศต่าง ๆ": "ประเภทเอกสารประกาศหรือคำสั่ง",
    "เอกสารเบิกงบประมาณ": "ประเภทเอกสารภายใน",
    "เอกสารขอความอนุเคราะห์": "ประเภทเอกสารภายนอก"
};


export const DOC_TYPES = MASTER_CATEGORIES;

export const annualPlanStatusLabels: Record<string, string> = {
    planned: "วางแผน",
    in_progress: "กำลังดำเนินการ",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิก",
};

export const annualPlanStatusStyles: Record<string, string> = {
    planned: "bg-blue-50 text-blue-700 border-blue-200",
    in_progress: "bg-amber-50 text-amber-700 border-amber-200",
    completed: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-red-50 text-red-600 border-red-200",
};

// ─── DOCUMENT NUMBERING UTILITIES ──────────────────────────
export function formatDocNo(dept: string, type: string, seq: number, year = CURRENT_THAI_YEAR): string {
    const padSeq = String(seq).padStart(3, "0");
    const cat = CATEGORY_MAP[type] || type;
    
    if (cat === "ประเภทเอกสารโครงการ") {
        return `โครงการที่ ${padSeq}/${year}`;
    }
    if (cat === "ประเภทเอกสารรายงานผลการดำเนินโครงการ") {
        return `รายงานโครงการที่ ${padSeq}/${year}`;
    }
    if (cat === "ประเภทเอกสารประกาศหรือคำสั่ง") {
        return `ประกาศหรือคำสั่งที่ ${padSeq}/${year}`;
    }
    const prefix = ORG_PREFIX_BY_DEPT[dept] || "ที่ ฟฮ";
    return `${prefix} ${padSeq}/${year}`;
}

export function getNextDocNo(
    existingDocs: { docNo?: string, department?: string, type?: string }[],
    dept: string,
    type: string,
    year = CURRENT_THAI_YEAR
): string {
    let used: number[] = [];
    const cat = CATEGORY_MAP[type] || type;

    if (cat === "ประเภทเอกสารโครงการ") {
        used = existingDocs
            .filter(d => d.docNo?.startsWith("โครงการที่ ") && d.docNo?.endsWith(`/${year}`))
            .map(d => parseInt(d.docNo!.replace("โครงการที่ ", "").split("/")[0], 10))
            .filter(n => !isNaN(n));
    } else if (cat === "ประเภทเอกสารรายงานผลการดำเนินโครงการ") {
        used = existingDocs
            .filter(d => d.docNo?.startsWith("รายงานโครงการที่ ") && d.docNo?.endsWith(`/${year}`))
            .map(d => parseInt(d.docNo!.replace("รายงานโครงการที่ ", "").split("/")[0], 10))
            .filter(n => !isNaN(n));
    } else if (cat === "ประเภทเอกสารประกาศหรือคำสั่ง") {
        const isSharedDept = ["สมาคมพัฒนาเยาวชนมุสลิมไทย", "สำนักกิจการสตรี สมาคมฯ"].includes(dept);
        
        used = existingDocs
            .filter(d => {
                const matchDept = isSharedDept 
                    ? ["สมาคมพัฒนาเยาวชนมุสลิมไทย", "สำนักกิจการสตรี สมาคมฯ"].includes(d.department || "")
                    : d.department === dept;
                return matchDept && d.docNo?.startsWith("ประกาศหรือคำสั่งที่ ") && d.docNo?.endsWith(`/${year}`);
            })
            .map(d => parseInt(d.docNo!.replace("ประกาศหรือคำสั่งที่ ", "").split("/")[0], 10))
            .filter(n => !isNaN(n));
    } else {
        const prefix = ORG_PREFIX_BY_DEPT[dept] || "ที่ ฟฮ";
        used = existingDocs
            .filter(d => {
                const docCat = d.type ? (CATEGORY_MAP[d.type] || d.type) : undefined;
                return d.docNo?.startsWith(`${prefix} `) && 
                       d.docNo?.endsWith(`/${year}`) &&
                       docCat === cat;
            })
            .map(d => parseInt(d.docNo!.replace(`${prefix} `, "").split("/")[0], 10))
            .filter(n => !isNaN(n));
    }

    const next = used.length > 0 ? Math.max(...used) + 1 : 1;
    return formatDocNo(dept, type, next, year);
}
