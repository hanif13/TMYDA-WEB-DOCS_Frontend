// ============================================================
// API CLIENT — Centralized data fetching for Fityatulhak Portal
// ============================================================

import { getSession } from "next-auth/react";
import imageCompression from 'browser-image-compression';

// Build API base URL - ensure it always has /api path
const getAPIBase = () => {
    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    // Make sure it ends with /api if not already there
    if (!url.includes("/api")) {
        return `${url}/api`;
    }
    return url;
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const API_BASE = `${API_BASE_URL}/api`;

export const getMediaUrl = (path: string | undefined): string => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${API_BASE_URL}${path}`;
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const session = await getSession();
    const token = (session as any)?.accessToken;

    const url = `${API_BASE}${path}`;

    const res = await fetch(url, {
        ...options,
        headers: {
            ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            ...(options?.headers || {})
        },
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API error ${res.status}: ${errorText}`);
    }

    // Handle 204 No Content or empty bodies
    if (res.status === 204) {
        return {} as T;
    }

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return await res.json();
    }

    // Fallback for non-json or empty-but-not-204
    const text = await res.text();
    return (text ? JSON.parse(text) : {}) as T;
}

// ─── DOCUMENTS ────────────────────────────────────────────
export async function fetchDocuments(year?: number) {
    const query = year ? `?year=${year}` : "";
    return apiFetch<any[]>(`/documents${query}`);
}

export async function createDocument(formData: FormData) {
    const session = await getSession();
    const token = (session as any)?.accessToken;

    const res = await fetch(`${API_BASE}/documents`, {
        method: "POST",
        headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: formData,
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API error ${res.status}: ${errorText}`);
    }

    return res.json();
}

export async function updateDocument(id: string, formData: FormData) {
    const session = await getSession();
    const token = (session as any)?.accessToken;

    const res = await fetch(`${API_BASE}/documents/${id}`, {
        method: "PATCH",
        headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: formData,
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API error ${res.status}: ${errorText}`);
    }

    return res.json();
}

export async function deleteDocument(id: string) {
    return apiFetch<any>(`/documents/${id}`, {
        method: "DELETE",
    });
}

export async function linkDocumentToProject(documentId: string, projectId: string | null) {
    return apiFetch<any>(`/documents/${documentId}/link`, {
        method: "PATCH",
        body: JSON.stringify({ projectId }),
    });
}


// ─── DOCUMENT REQUESTS (Form submissions) ──────────────────
export async function fetchDocumentRequests(year?: number) {
    const query = year ? `?year=${year}` : "";
    return apiFetch<any[]>(`/document-requests${query}`);
}

export async function createDocumentRequest(data: {
    requestType: string;
    department: string;
    requestedBy: string;
    fields: any;
    thaiYear?: number;
}) {
    return apiFetch<any>("/document-requests", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function updateDocumentRequest(id: string, data: Partial<{
    requestType: string;
    department: string;
    requestedBy: string;
    fields: any;
    status: string;
    resultDocId: string;
}>) {
    return apiFetch<any>(`/document-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export async function deleteDocumentRequest(id: string) {
    return apiFetch<any>(`/document-requests/${id}`, {
        method: "DELETE",
    });
}

// ─── PROJECTS & ANNUAL PLANS ──────────────────────────────
export async function fetchAnnualPlans(year?: number) {
    const query = year ? `?year=${year}` : "";
    return apiFetch<any[]>(`/projects/plans${query}`);
}

export async function fetchAnnualYears() {
    return apiFetch<any[]>("/projects/plans/years");
}

export async function createAnnualPlan(data: { year: number; thaiYear: number; label: string }) {
    return apiFetch<any>("/projects/plans", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function updateAnnualPlan(id: string, data: Partial<{ year: number; thaiYear: number; label: string }>) {
    return apiFetch<any>(`/projects/plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export async function deleteAnnualPlan(id: string) {
    return apiFetch<any>(`/projects/plans/${id}`, {
        method: "DELETE",
    });
}

export async function createProject(data: {
    name: string;
    departmentId: string;
    subDepartment?: string;
    projectType: string;
    lead: string;
    budget: number;
    quarter: number;
    annualPlanId: string;
    months: number[];
    isUnplanned?: boolean;
    status?: string;
    thaiYear: number;
}) {
    return apiFetch<any>("/projects", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function createProjectBulk(data: { projects: any[]; annualPlanId: string; }) {
    return apiFetch<any>("/projects/bulk", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function updateProject(id: string, data: FormData | Partial<{
    name: string;
    departmentId: string;
    subDepartment?: string;
    projectType: string;
    lead: string;
    budget: number;
    quarter: number;
    months: number[];
    isStarted: boolean;
    status: string;
    budgetUsed: number;
    description: string;
    kpi: string;
    targetPax: number;
    actualPax: number;
    actualBudget?: number;
    actualBudgetExternal?: number;
    isUnplanned?: boolean;
    completedMonths?: number[];
}>) {
    return apiFetch<any>(`/projects/${id}`, {
        method: "PATCH",
        body: data instanceof FormData ? data : JSON.stringify(data),
    });
}

export async function deleteProject(id: string) {
    return apiFetch<any>(`/projects/${id}`, {
        method: "DELETE",
    });
}


// ─── FINANCE / TRANSACTIONS ──────────────────────────────
export async function fetchTransactions(year?: number) {
    const query = year ? `?year=${year}` : "";
    return apiFetch<any[]>(`/finance${query}`);
}

export async function createTransaction(data: FormData | {
    date: string;
    title: string;
    type: string;
    amount: number;
    category?: string;
    docRef?: string;
    slipUrl?: string;
    months?: number[];
    departmentId: string;
    projectId?: string;
}) {
    return apiFetch<any>("/finance", {
        method: "POST",
        body: data instanceof FormData ? data : JSON.stringify(data),
    });
}

export async function deleteTransaction(id: string) {
    return apiFetch<any>(`/finance/${id}`, {
        method: "DELETE",
    });
}

export async function updateTransaction(id: string, data: FormData | Partial<{
    date: string;
    title: string;
    type: string;
    amount: number;
    category?: string;
    docRef?: string;
    months?: number[];
    departmentId: string;
    projectId?: string;
    note?: string;
    thaiYear?: number;
}>) {
    return apiFetch<any>(`/finance/${id}`, {
        method: "PATCH",
        body: data instanceof FormData ? data : JSON.stringify(data),
    });
}

export async function fetchCommitteeMembers(year?: number) {
    const query = year ? `?year=${year}` : "";
    return apiFetch<any[]>(`/committee${query}`);
}

export async function createCommitteeMember(data: FormData | any) {
    return apiFetch<any>("/committee", {
        method: "POST",
        body: data instanceof FormData ? data : JSON.stringify(data),
    });
}

export async function createCommitteeBulk(data: any[]) {
    return apiFetch<any>("/committee/bulk", {
        method: "POST",
        body: JSON.stringify({ committees: data }),
    });
}

export async function updateCommitteeMember(id: string, data: FormData | any) {
    return apiFetch<any>(`/committee/${id}`, {
        method: "PATCH",
        body: data instanceof FormData ? data : JSON.stringify(data),
    });
}

export async function deleteCommitteeMember(id: string) {
    return apiFetch<any>(`/committee/${id}`, {
        method: "DELETE",
    });
}

// ─── DEPARTMENTS ──────────────────────────────────────────
export async function fetchDepartments(year?: number | string, scope?: 'global' | 'committee') {
    let url = "/departments?";
    const params = new URLSearchParams();
    if (year) params.append("year", year.toString());
    if (scope) params.append("scope", scope);
    
    return apiFetch<any[]>(url + params.toString());
}

export async function createDepartment(data: any, year?: number, isCommitteeOnly?: boolean) {
    const body = year ? { ...data, thaiYear: year, isCommitteeOnly } : { ...data, isCommitteeOnly };
    return apiFetch<any>("/departments", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export async function updateDepartment(id: string, data: any) {
    return apiFetch<any>(`/departments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export async function deleteDepartment(id: string, year?: number) {
    const query = year ? `?year=${year}` : '';
    return apiFetch<any>(`/departments/${id}${query}`, {
        method: "DELETE",
    });
}

export async function reorderDepartments(orders: { id: string, order: number }[]) {
    return apiFetch<any>("/departments/reorder", {
        method: "PUT",
        body: JSON.stringify({ orders }),
    });
}

export async function reorderCommitteeMembers(orders: { id: string, order: number, departmentId?: string }[]) {
    return apiFetch<any>("/committee/reorder", {
        method: "PUT",
        body: JSON.stringify({ orders }),
    });
}

export async function fetchCategories() {
    return apiFetch<any[]>("/documents/categories");
}

// ─── USERS ────────────────────────────────────────────────
export async function fetchUsers() {
    return apiFetch<any[]>("/users");
}

export async function createUser(data: any) {
    return apiFetch<any>("/users", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function updateUser(id: string, data: any) {
    return apiFetch<any>(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export async function updateUserPermissions(id: string, data: { permissions: string[], role: string }) {
    return apiFetch<any>(`/users/${id}/permissions`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export async function deleteUser(id: string) {
    return apiFetch<any>(`/users/${id}`, {
        method: "DELETE",
    });
}

// Self-service: Change own password
export async function changePassword(data: { currentPassword: string; newPassword: string }) {
    return apiFetch<any>(`/users/me/password`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

// Self-service: Get own profile
export async function getMyProfile() {
    return apiFetch<any>(`/users/me`);
}

// Self-service: Update own profile
export async function updateMyProfile(data: { 
    name?: string; 
    email?: string; 
    phoneNumber?: string; 
    facebook?: string; 
    departmentId?: string;
    subDepartment?: string;
}) {
    return apiFetch<any>(`/users/me`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

// Admin: Bulk upload users via CSV
export async function uploadUsersCsv(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiFetch<any>(`/users/upload`, {
        method: "POST",
        body: formData,
        // Let the browser set the boundary for FormData
        headers: {
            'Accept': 'application/json',
        }
    });
}

// ─── UPLOADS ──────────────────────────────────────────────
export async function uploadImages(files: File[]) {
    const formData = new FormData();
    
    // Compression options
    const options = {
      maxSizeMB: 0.5, // 500KB Max
      maxWidthOrHeight: 1920,
      useWebWorker: true
    };

    for (const file of files) {
        try {
            // Only compress if it's an image
            if (file.type.startsWith('image/')) {
                const compressedFile = await imageCompression(file, options);
                // Keep the original name and type
                const finalFile = new File([compressedFile], file.name, { type: file.type });
                formData.append('files', finalFile);
            } else {
                formData.append('files', file);
            }
        } catch (error) {
            console.error('Error compressing image:', error);
            // Fallback to original file
            formData.append('files', file);
        }
    }
    
    return apiFetch<{ urls: string[] }>("/upload", {
        method: "POST",
        body: formData,
    });
}
