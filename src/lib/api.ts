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
        // Auto sign-out on expired/invalid token
        if (res.status === 401) {
            const { signOut } = await import("next-auth/react");
            signOut({ callbackUrl: "/login" });
            throw new Error("Session expired");
        }
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
        if (res.status === 401) {
            const { signOut } = await import("next-auth/react");
            signOut({ callbackUrl: "/login" });
            throw new Error("Session expired");
        }
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
        if (res.status === 401) {
            const { signOut } = await import("next-auth/react");
            signOut({ callbackUrl: "/login" });
            throw new Error("Session expired");
        }
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
    projectNumber?: string;
    announcementDoc?: string;
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
    projectNumber?: string;
    announcementDoc?: string;
}>) {
    return apiFetch<any>(`/projects/${id}`, {
        method: "PATCH",
        body: data instanceof FormData ? await compressFormDataImages(data) : JSON.stringify(data),
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
        body: data instanceof FormData ? await compressFormDataImages(data) : JSON.stringify(data),
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
        body: data instanceof FormData ? await compressFormDataImages(data) : JSON.stringify(data),
    });
}

export async function fetchCommitteeMembers(year?: number) {
    const query = year ? `?year=${year}` : "";
    return apiFetch<any[]>(`/committee${query}`);
}

export async function createCommitteeMember(data: FormData | any) {
    return apiFetch<any>("/committee", {
        method: "POST",
        body: data instanceof FormData ? await compressFormDataImages(data) : JSON.stringify(data),
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
        body: data instanceof FormData ? await compressFormDataImages(data) : JSON.stringify(data),
    });
}

export async function deleteCommitteeMember(id: string) {
    return apiFetch<any>(`/committee/${id}`, {
        method: "DELETE",
    });
}

// ─── DEPARTMENTS ──────────────────────────────────────────
export async function fetchDepartments(year?: number | string, scope?: 'global' | 'committee', includeAllDeptsName: boolean = false) {
    let url = "/departments?";
    const params = new URLSearchParams();
    if (year) params.append("year", year.toString());
    if (scope) params.append("scope", scope);
    
    return apiFetch<any[]>(url + params.toString()).then(depts => {
        if (!includeAllDeptsName) {
            return depts.filter(d => d.name !== "ทุกหน่วยงาน");
        }
        return depts;
    });
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
// Shrink photos before upload (max ~500KB, 1920px) to save Supabase Storage space.
// Non-image files (PDF etc.) and GIFs are returned unchanged; on any error the original is used.
export async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
    try {
        const compressed = await imageCompression(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
        });
        return compressed.size < file.size ? new File([compressed], file.name, { type: file.type }) : file;
    } catch (error) {
        console.error('Error compressing image:', error);
        return file;
    }
}

// Return a copy of the FormData with every image file compressed.
async function compressFormDataImages(data: FormData): Promise<FormData> {
    const out = new FormData();
    for (const [key, value] of Array.from(data.entries())) {
        if (value instanceof File) out.append(key, await compressImage(value), value.name);
        else out.append(key, value);
    }
    return out;
}

export async function uploadImages(files: File[]) {
    const formData = new FormData();
    for (const file of files) {
        formData.append('files', await compressImage(file));
    }

    return apiFetch<{ urls: string[] }>("/upload", {
        method: "POST",
        body: formData,
    });
}


// ─── TRANSLITERATION (คำทับศัพท์) ──────────────────────────
export async function fetchTransliterations(params?: { search?: string; category?: string }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<any[]>(`/transliteration${qs}`);
}

export async function fetchTransliterationCategories() {
    return apiFetch<string[]>('/transliteration/categories');
}

export async function createTransliteration(data: {
    foreign: string;
    arabic?: string;
    thai: string;
    category?: string;
    note?: string;
}) {
    return apiFetch<any>('/transliteration', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function bulkCreateTransliterations(items: Array<{
    foreign: string;
    arabic?: string;
    thai: string;
    category?: string;
    note?: string;
}>) {
    return apiFetch<any>('/transliteration/bulk', {
        method: 'POST',
        body: JSON.stringify({ items }),
    });
}

export async function updateTransliteration(id: string, data: {
    foreign?: string;
    arabic?: string;
    thai?: string;
    category?: string;
    note?: string;
}) {
    return apiFetch<any>(`/transliteration/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export async function deleteTransliteration(id: string) {
    return apiFetch<any>(`/transliteration/${id}`, {
        method: 'DELETE',
    });
}

export async function bulkDeleteTransliterations(ids: string[]) {
    return apiFetch<any>('/transliteration/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
    });
}

// ==========================================
// ACTIVITY LOGS API
// ==========================================

export const getActivityLogs = async (params: { page?: number; limit?: number; userId?: string; resource?: string; action?: string; }) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.userId) query.append('userId', params.userId);
    if (params.resource) query.append('resource', params.resource);
    if (params.action) query.append('action', params.action);
    return apiFetch<any>(`/logs?${query.toString()}`);
};

// ==========================================
// EVENTS / CALENDAR API
// ==========================================

export async function fetchEvents(params?: { year?: number; departmentId?: string; from?: string; to?: string }) {
    const query = new URLSearchParams();
    if (params?.year) query.append('year', params.year.toString());
    if (params?.departmentId) query.append('departmentId', params.departmentId);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<any[]>(`/events${qs}`);
}

export async function createEvent(data: {
    title: string;
    departmentId: string;
    date: string;
    endDate?: string;
    location?: string;
    description?: string;
    color?: string;
    thaiYear?: number;
}) {
    return apiFetch<any>('/events', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateEvent(id: string, data: Partial<{
    title: string;
    departmentId: string;
    date: string;
    endDate: string;
    location: string;
    description: string;
    color: string;
}>) {
    return apiFetch<any>(`/events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export async function deleteEvent(id: string) {
    return apiFetch<any>(`/events/${id}`, {
        method: 'DELETE',
    });
}

// ==========================================
// MEMBERS (สมาชิก) API
// ==========================================

export async function fetchMembers(params?: { search?: string; status?: string; province?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.province) query.append('province', params.province);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<any>(`/members${qs}`);
}

export async function fetchMemberStats() {
    return apiFetch<any>('/members/stats');
}

export async function fetchMemberById(id: string) {
    return apiFetch<any>(`/members/${id}`);
}

export async function updateMemberStatus(id: string, data: { status: string; note?: string }) {
    return apiFetch<any>(`/members/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export async function deleteMember(id: string) {
    return apiFetch<any>(`/members/${id}`, {
        method: 'DELETE',
    });
}

// Public API (No Auth) — สำหรับหน้า /register
export async function registerMember(data: {
    fullName: string;
    nickname?: string;
    birthDate?: string;
    age?: number;
    bloodType?: string;
    address?: string;
    phoneNumber: string;
    email?: string;
    facebook?: string;
    lineId?: string;
    emergencyContact?: string;
    education?: string;
    institution?: string;
    fieldOfStudy?: string;
    occupation?: string;
    workplace?: string;
    workProvince?: string;
    maritalStatus?: string;
    childrenBoys?: number;
    childrenGirls?: number;
    childrenAges?: string;
    knowFrom?: string;
    activities?: any;
    skills?: string;
    interests?: string;
    photoFile?: File;
}) {
    const url = `${API_BASE}/members/register`;
    
    const formData = new FormData();

    // Append all text fields
    Object.entries(data).forEach(([key, value]) => {
        if (key === 'photoFile' || value === undefined || value === null) return;
        if (key === 'activities') {
            formData.append(key, JSON.stringify(value));
        } else {
            formData.append(key, String(value));
        }
    });

    // Append photo if provided
    if (data.photoFile) {
        formData.append('photo', await compressImage(data.photoFile));
    }

    const res = await fetch(url, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API error ${res.status}: ${errorText}`);
    }
    return res.json();
}



// ─── เว็บไซต์หลัก (จัดการเว็บไซต์หลัก) ─────────────────────
export type SiteNews = {
    id: string; slug: string; title: string; department: string;
    excerpt: string | null; content: string | null; coverUrl: string | null; images: string[];
    isPublished: boolean; isPinned: boolean; publishedAt: string | null;
    createdBy: string | null; createdAt: string; updatedAt: string;
};
export type SiteAnnouncement = { id: string; number: string; title: string; date: string; pdfUrl: string | null; isPublished: boolean };
export type SiteBanner = { id: string; title: string | null; imageUrl: string; linkUrl: string | null; order: number; isActive: boolean };
export type SiteSettings = {
    home: { heroBadge: string; heroTitle: string; heroSubtitle: string; highlight: { enabled: boolean; text: string; href: string } };
    contact: { address: string; phone: string; email: string; facebook: string; youtube: string; tiktok: string; instagram: string; line: string };
};

const jsonBody = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) });

export const fetchSiteSettings = () => apiFetch<SiteSettings>("/site/settings");
export const updateSiteSetting = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    apiFetch<SiteSettings[K]>(`/site/settings/${key}`, jsonBody("PUT", value));

export const fetchSiteNews = () => apiFetch<SiteNews[]>("/site/news");
export const createSiteNews = (data: Partial<SiteNews>) => apiFetch<SiteNews>("/site/news", jsonBody("POST", data));
export const updateSiteNews = (id: string, data: Partial<SiteNews>) => apiFetch<SiteNews>(`/site/news/${id}`, jsonBody("PUT", data));
export const deleteSiteNews = (id: string) => apiFetch(`/site/news/${id}`, { method: "DELETE" });

export const fetchSiteAnnouncements = () => apiFetch<SiteAnnouncement[]>("/site/announcements");
export const createSiteAnnouncement = (data: Partial<SiteAnnouncement>) => apiFetch<SiteAnnouncement>("/site/announcements", jsonBody("POST", data));
export const updateSiteAnnouncement = (id: string, data: Partial<SiteAnnouncement>) => apiFetch<SiteAnnouncement>(`/site/announcements/${id}`, jsonBody("PUT", data));
export const deleteSiteAnnouncement = (id: string) => apiFetch(`/site/announcements/${id}`, { method: "DELETE" });

export const fetchSiteBanners = () => apiFetch<SiteBanner[]>("/site/banners");
export const createSiteBanner = (data: Partial<SiteBanner>) => apiFetch<SiteBanner>("/site/banners", jsonBody("POST", data));
export const updateSiteBanner = (id: string, data: Partial<SiteBanner>) => apiFetch<SiteBanner>(`/site/banners/${id}`, jsonBody("PUT", data));
export const reorderSiteBanners = (ids: string[]) => apiFetch("/site/banners/reorder", jsonBody("PUT", { ids }));
export const deleteSiteBanner = (id: string) => apiFetch(`/site/banners/${id}`, { method: "DELETE" });

export async function uploadSitePdf(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<{ url: string }>("/site/upload-pdf", { method: "POST", body: fd });
}
