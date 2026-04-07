// ============================================================
// TYPES — Shared TypeScript types for the Fityatulhak Portal
// ============================================================

export type ProjectStep = "planned" | "in_progress" | "waiting_summary" | "completed" | "cancelled";
export type TxType = "รายรับ" | "รายจ่าย" | "คืนเงิน";

// ─── DOCUMENT REPOSITORY ─────────────────────────────────
export interface StoredDocument {
    id: string;
    docNo: string;
    name: string;
    type: string;
    department: string;
    uploadedBy: string;
    uploadedAt: string;
    createdAt?: string; // Raw timestamp for sorting
    fileUrl?: string;
    projectId?: string;
}

// ─── DOCUMENT REQUESTS ────────────────────────────────────
export interface DocRequest {
    id: string;
    requestType: string;
    department: string;
    requestedBy: string;
    requestedById?: string;
    requestedAt: string;
    status: "รอดำเนินการ" | "กำลังดำเนินการ" | "เสร็จสิ้น";
    fields: Record<string, string>;
    pdfPath?: string;
    resultDocId?: string;
    resultDoc?: any;
    note?: string;
}

// ─── PROJECTS ─────────────────────────────────────────────
export interface User {
    id: string;
    username: string;
    name: string;
    role: string;
    departmentId?: string;
    subDepartment?: string;
    email?: string;
    phoneNumber?: string;
    facebook?: string;
    createdAt: string;
    department?: {
        name: string;
    };
}

export interface ProjectDocument {
    id: string;
    docNo: string;
    name: string;
    type: string;
    uploadedBy: string;
    uploadedAt: string;
    fileSize?: string;
    projectId?: string;
    fileUrl?: string;
}

export interface Project {
    id: string;
    name: string;
    department: string;
    subDepartment?: string;
    projectType?: string;
    step: ProjectStep;
    budget: number;
    lead: string;
    startDate: string;
    endDate: string;
    description?: string;
    months: number[];
    completedMonths: number[];
    documents: ProjectDocument[];
    isUnplanned?: boolean;
    actualDate?: string;
    actualBudget?: number;
    actualBudgetExternal?: number;
    budgetUsed?: number;
    targetPax?: number;
    actualPax?: number;
    kpi?: string;
}

// ─── BUDGET TRANSACTIONS ──────────────────────────────────
export interface BudgetTransaction {
    id: string;
    date: string;
    type: TxType;
    description: string;
    department: string;
    projectId?: string;
    projectName?: string;
    amount: number;
    returnedAmount?: number;
    claimedBy?: string;
    recordedBy: string;
    docRef?: string;
    slipUrl?: string;
    note?: string;
    originalDate: string;
    subType: string;
}

// ─── ANNUAL PROJECTS ──────────────────────────────────────
export interface AnnualProject {
    id: string;
    name: string;
    department: string;
    subDepartment?: string;
    quarter: 1 | 2 | 3 | 4;
    budget: number;
    budgetUsed: number;
    status: "planned" | "in_progress" | "waiting_summary" | "completed" | "cancelled";
    lead: string;
    projectType: string;
    startDate: string;
    endDate: string;
    description: string;
    kpi?: string;
    targetPax?: number;
    actualPax?: number;
    months: number[];
    completedMonths: number[];
    isStarted: boolean;
    isUnplanned?: boolean;
    summaryImages?: string[];
    documents: any[];
    actualDate?: string;
    actualBudget?: number;
    actualBudgetExternal?: number;
    thaiYear?: number;
}

export interface CommitteeMember {
    id: string;
    name: string;
    position: string;
    phoneNumber?: string;
    email?: string;
    occupation?: string;
    photoUrl?: string;
    departmentId: string;
    department?: Department;
    order: number;
    thaiYear: number;
}

export interface AnnualPlan {
    id: string;
    thaiYear: number;
    label: string;
    totalBudget: number;
    totalUsed: number;
    projects: AnnualProject[];
}

export interface Department {
    id: string;
    name: string;
    subDepts: string[];
    theme?: string;
}
