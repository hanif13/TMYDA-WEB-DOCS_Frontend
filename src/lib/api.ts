// ============================================================
// API CLIENT — Centralized data fetching for Fityatulhak Portal
// ============================================================

import { getSession } from "next-auth/react";

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

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const session = await getSession();
    const token = (session as any)?.accessToken;

    const url = `${API_BASE}${path}`;

    const res = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        ...options,
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
export async function fetchDocuments() {
    return apiFetch<any[]>("/documents");
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
export async function fetchDocumentRequests() {
    return apiFetch<any[]>("/document-requests");
}

export async function createDocumentRequest(data: {
    requestType: string;
    department: string;
    requestedBy: string;
    fields: any;
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
export async function fetchAnnualPlans() {
    return apiFetch<any[]>("/projects/plans");
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
}) {
    return apiFetch<any>("/projects", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function updateProject(id: string, data: Partial<{
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
    isUnplanned?: boolean;
    completedMonths?: number[];
}>) {
    return apiFetch<any>(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export async function deleteProject(id: string) {
    return apiFetch<any>(`/projects/${id}`, {
        method: "DELETE",
    });
}

export async function createAnnualPlan(data: {
    year: number;
    thaiYear: number;
    label: string;
}) {
    return apiFetch<any>("/projects/plans", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function deleteAnnualPlan(id: string): Promise<any> {
    return apiFetch<any>(`/projects/plans/${id}`, {
        method: "DELETE",
    });
}

// ─── FINANCE / TRANSACTIONS ──────────────────────────────
export async function fetchTransactions() {
    return apiFetch<any[]>("/finance");
}

export async function createTransaction(data: {
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
        body: JSON.stringify(data),
    });
}

export async function deleteTransaction(id: string) {
    return apiFetch<any>(`/finance/${id}`, {
        method: "DELETE",
    });
}

// ─── DEPARTMENTS ──────────────────────────────────────────
export async function fetchDepartments() {
    return apiFetch<any[]>("/departments");
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

