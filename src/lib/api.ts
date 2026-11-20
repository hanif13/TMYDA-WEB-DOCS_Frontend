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

/** The working year chosen in the sidebar — sent as X-Year so the API applies that year's rights. */
export function workingYearHeader(): Record<string, string> {
    if (typeof window === "undefined") return {};
    try {
        const y = window.localStorage.getItem("workingYear");
        return y ? { "X-Year": y } : {};
    } catch { return {}; }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const session = await getSession();
    const token = (session as any)?.accessToken;

    const url = `${API_BASE}${path}`;

    const res = await fetch(url, {
        ...options,
        headers: {
            ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            ...workingYearHeader(),
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
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            ...workingYearHeader(),
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
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            ...workingYearHeader(),
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

export async function createAnnualPlan(data: { year: number; thaiYear: number; label: string; copyFromYear?: number | null; departmentIds?: string[]; userIds?: string[] }) {
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

/** Take a person out of the working year (account and other years stay). */
export async function deleteUser(id: string) {
    return apiFetch<any>(`/users/${id}`, {
        method: "DELETE",
    });
}

// ─── Per-year access ──────────────────────────────────────────
export type YearCopySource = {
    departments: { id: string; name: string; isCommitteeOnly: boolean }[];
    users: { id: string; name: string; username: string; role: string; position: string | null; department: string | null }[];
};
/** Delete the account itself, in every year (SUPER_ADMIN). */
export const deleteUserAccount = (id: string) => apiFetch<any>(`/users/${id}?everywhere=1`, { method: "DELETE" });
/** Every account, short form — to add someone back into the working year. */
export const fetchAllUsers = () => apiFetch<{ id: string; name: string; username: string; superAdmin: boolean; years: number[] }[]>("/users?scope=all");
export const setUserYear = (id: string, year: number, access: "edit" | "view") =>
    apiFetch<any>(`/users/${id}/years/${year}`, { method: "PUT", body: JSON.stringify({ access }) });
export const removeUserYear = (id: string, year: number) => apiFetch<any>(`/users/${id}/years/${year}`, { method: "DELETE" });
export const fetchYearCopySource = (from: number) => apiFetch<YearCopySource>(`/projects/plans/copy-source?from=${from}`);

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
    position?: string;
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
    videoUrl: string | null; sourceUrl: string | null;
    isPublished: boolean; isPinned: boolean; publishedAt: string | null;
    createdBy: string | null; createdAt: string; updatedAt: string;
};
export type SiteAnnouncement = { id: string; number: string; title: string; date: string; pdfUrl: string | null; isPublished: boolean };
export type SiteBanner = { id: string; title: string | null; imageUrl: string; linkUrl: string | null; order: number; isActive: boolean };
type Doc = { updated: string; intro: string; sections: { title: string; body: string }[] };
type BoardInfo = { name: string; description: string; tags: string[] };
export type SiteSettings = {
    home: { heroBadge: string; heroTitle: string; heroSubtitle: string; highlight: { enabled: boolean; text: string; href: string } };
    contact: { address: string; phone: string; email: string; hours: string; mapUrl: string; facebook: string; youtube: string; tiktok: string; instagram: string; line: string };
    about: {
        intro: string; vision: string; missions: string[];
        values: { title: string; text: string }[]; stats: { label: string; value: string }[];
        history: { year: string; text: string }[]; units: { name: string; children: string[] }[];
    };
    donation: {
        intro: string; bankName: string; branch: string; accountName: string; accountNo: string;
        promptPay: string; qrUrl: string; note: string; funds: { title: string; text: string; tone: string }[];
    };
    webboard: { rules: string[]; youthCare: BoardInfo; general: BoardInfo };
    privacy: Doc;
    terms: Doc;
    membership: {
        intro: string; autoApprove: boolean; minAge: number | null; guardianUnderAge: number | null;
        requirePhone: boolean; requireProvince: boolean; conditions: string[];
        questions: { label: string; help: string; required: boolean }[]; approvedMessage: string;
    };
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

export async function uploadSitePdf(file: File, kind: "ann" | "doc" = "ann") {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<{ url: string }>(`/site/upload-pdf?kind=${kind}`, { method: "POST", body: fd });
}

// Knowledge hub, committee, partners … (one table, type-specific fields in data)
export type SiteContentType = "article" | "course" | "camp" | "book" | "video" | "qa" | "recommended" | "committee" | "partner";
export type SiteContent = {
    id: string; type: SiteContentType; slug: string; category: string | null; title: string;
    coverUrl: string | null; fileUrl: string | null; data: Record<string, any>; date: string | null;
    order: number; isPublished: boolean; createdAt: string; updatedAt: string;
};
export const fetchSiteContent = (type: SiteContentType) => apiFetch<SiteContent[]>(`/site/content?type=${type}`);
export const createSiteContent = (data: Partial<SiteContent>) => apiFetch<SiteContent>("/site/content", jsonBody("POST", data));
export const updateSiteContent = (id: string, data: Partial<SiteContent>) => apiFetch<SiteContent>(`/site/content/${id}`, jsonBody("PUT", data));
export const reorderSiteContent = (ids: string[]) => apiFetch("/site/content/reorder", jsonBody("PUT", { ids }));
export const deleteSiteContent = (id: string) => apiFetch(`/site/content/${id}`, { method: "DELETE" });
/** Managed category lists per content type (qa, recommended, book, video, partner). */
export const fetchSiteCategories = () => apiFetch<Record<string, string[]>>("/site/categories");
export const putSiteCategories = (type: string, items: string[]) => apiFetch<string[]>(`/site/categories/${type}`, jsonBody("PUT", { items }));
export const renameSiteCategory = (type: string, from: string, to: string) => apiFetch<string[]>(`/site/categories/${type}/rename`, jsonBody("POST", { from, to }));
export const deleteSiteCategory = (type: string, name: string) => apiFetch<string[]>(`/site/categories/${type}/delete`, jsonBody("POST", { name }));
/** Move a post between the news page and the knowledge pages (web 1). */
export const moveNewsToKnowledge = (id: string, category: string) =>
    apiFetch<{ ok: true; id: string; slug: string }>(`/site/news/${id}/move`, jsonBody("POST", { category }));
export const moveArticleToNews = (id: string, department: string) =>
    apiFetch<{ ok: true; id: string; slug: string }>(`/site/content/${id}/move-to-news`, jsonBody("POST", { department }));

// Webboard moderation
export type ThreadStatus = "pending" | "published" | "hidden";
export type SiteComment = { id: string; threadId: string; authorName: string; isStaff: boolean; body: string; likes: number; isHidden: boolean; createdAt: string };
export type SiteThread = {
    id: string; board: "youth-care" | "general"; title: string; body: string; tag: string | null; authorName: string;
    status: ThreadStatus; isPinned: boolean; answered: boolean; views: number; likes: number; createdAt: string; updatedAt: string;
    _count?: { comments: number }; comments?: SiteComment[];
};
export const fetchSiteThreads = () =>
    apiFetch<{ items: SiteThread[]; counts: { board: string; status: string; n: number }[] }>("/site/threads");
export const fetchSiteThread = (id: string) => apiFetch<SiteThread>(`/site/threads/${id}`);
export const createSiteThread = (data: Partial<SiteThread>) => apiFetch<SiteThread>("/site/threads", jsonBody("POST", data));
export const updateSiteThread = (id: string, data: Partial<SiteThread>) => apiFetch<SiteThread>(`/site/threads/${id}`, jsonBody("PUT", data));
export const deleteSiteThread = (id: string) => apiFetch(`/site/threads/${id}`, { method: "DELETE" });
export const replySiteThread = (id: string, body: string, authorName?: string) =>
    apiFetch<SiteComment>(`/site/threads/${id}/comments`, jsonBody("POST", { body, authorName }));
export const updateSiteComment = (id: string, data: Partial<SiteComment>) => apiFetch<SiteComment>(`/site/comments/${id}`, jsonBody("PUT", data));
export const deleteSiteComment = (id: string) => apiFetch(`/site/comments/${id}`, { method: "DELETE" });


// ─── สมาชิกเว็บไซต์ (ใบสมัคร/อนุมัติ) ─────────────────────
export type SiteMemberStatus = "unverified" | "pending" | "approved" | "rejected" | "suspended";
export type SiteMemberRow = {
    id: string; email: string; name: string; province: string | null; birthdate: string | null; status: SiteMemberStatus;
    createdAt: string; submittedAt: string | null; reviewedAt: string | null; reviewedBy: string | null; lastLoginAt: string | null;
};
export type SiteMemberDetail = SiteMemberRow & {
    phone: string | null; guardianName: string | null; guardianPhone: string | null;
    answers: { question: string; answer: string }[]; accepted: string[]; emailVerifiedAt: string | null;
    reviewNote: string | null; adminNote: string | null; failedLogins: number; lockedUntil: string | null;
    emails: { id: string; subject: string; kind: string; status: string; createdAt: string }[]; threads: number; comments: number;
};
export type SiteEmail = { id: string; to: string; subject: string; kind: string; status: string; error: string | null; memberId: string | null; createdAt: string; html?: string };

export const fetchSiteMembers = (status: string, q: string) =>
    apiFetch<{ items: SiteMemberRow[]; counts: Partial<Record<SiteMemberStatus, number>> }>(`/site/members?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}`);
export const fetchSiteMember = (id: string) => apiFetch<SiteMemberDetail>(`/site/members/${id}`);
export const siteMemberAction = (id: string, action: "approve" | "reject" | "suspend" | "reactivate" | "resend-verification", reason?: string) =>
    apiFetch<{ status?: string; emailStatus: string }>(`/site/members/${id}/${action}`, jsonBody("POST", { reason }));
export const updateSiteMemberNote = (id: string, adminNote: string) => apiFetch(`/site/members/${id}/note`, jsonBody("PUT", { adminNote }));
export const deleteSiteMember = (id: string) => apiFetch(`/site/members/${id}`, { method: "DELETE" });
export const fetchSiteEmails = (q: string) => apiFetch<SiteEmail[]>(`/site/emails?q=${encodeURIComponent(q)}`);
export const fetchSiteEmail = (id: string) => apiFetch<SiteEmail>(`/site/emails/${id}`);

// ประกาศจากทะเบียนเอกสาร ที่แสดงบนเว็บไซต์หลักอัตโนมัติ
export type RegistryAnnouncement = {
    id: string; docNo: string; name: string; filePath: string; createdAt: string; thaiYear: number;
    hideOnWebsite: boolean; department: { name: string } | null;
};
export const fetchRegistryAnnouncements = () => apiFetch<RegistryAnnouncement[]>("/site/registry-announcements");
export const setRegistryAnnouncementVisibility = (ids: string[], hideOnWebsite: boolean) =>
    apiFetch("/site/registry-announcements", jsonBody("PUT", { ids, hideOnWebsite }));

// ─── เอกสารอัตโนมัติ & การลงนาม ─────────────────────────────
/** Fetch a PDF (or other binary) with the login token. Errors carry the server's Thai message. */
async function apiBlob(path: string, options?: RequestInit): Promise<Blob> {
    const session = await getSession();
    const token = (session as any)?.accessToken;
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { ...(options?.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...workingYearHeader() },
    });
    if (!res.ok) {
        const text = await res.text();
        let msg = "สร้างเอกสารไม่สำเร็จ";
        try { msg = JSON.parse(text).error || msg; } catch { /* not JSON */ }
        throw new Error(msg);
    }
    return res.blob();
}

export type Signer = { id: string; name: string; position: string | null; department: string | null; hasSignature: boolean };
export type ApprovalItem = {
    id: string; step: number; totalSteps: number; role: string; createdAt: string;
    request: { id: string; requestType: string; department: string; requestedBy: string; createdAt: string; status: string; title: string };
};
export type RequestStep = { id: string; step: number; role: string; status: string; assigneeId: string | null; assignee: string | null; actorName: string | null; actorPosition: string | null; note: string | null; restart?: boolean; attachmentUrls: string[]; actedAt: string | null };

export const previewRequestPdf = (data: { requestType: string; department: string; fields: unknown; signerId?: string }) =>
    apiBlob("/document-requests/preview", { method: "POST", body: JSON.stringify(data) });
export const fetchRequestPdf = (id: string) => apiBlob(`/document-requests/${id}/pdf`);
export const fetchRequestSteps = (id: string) => apiFetch<RequestStep[]>(`/document-requests/${id}/steps`);
/** Send to the signer (letters) or start/resume the approval chain (projects, budgets). */
export const submitRequest = (id: string, signerId?: string) =>
    apiFetch<{ ok: boolean; status: string; signer?: { id: string; name: string } }>(`/document-requests/${id}/submit`, { method: "POST", body: JSON.stringify(signerId ? { signerId } : {}) });
export const fetchInboxCount = () => apiFetch<{ count: number }>("/document-requests/inbox/count");
export const issueRequestDocument = (id: string) => apiFetch<{ docNo: string; filePath: string }>(`/document-requests/${id}/issue`, { method: "POST" });
export const fetchApprovalInbox = () => apiFetch<ApprovalItem[]>("/document-requests/inbox");
export const approveStep = (stepId: string, note?: string, attachmentUrls?: string[]) =>
    apiFetch<{ docNo?: string; filePath?: string; next?: string }>(`/document-requests/steps/${stepId}/approve`, { method: "POST", body: JSON.stringify({ note, attachmentUrls }) });
export const returnStep = (stepId: string, note: string, restart = false) =>
    apiFetch(`/document-requests/steps/${stepId}/return`, { method: "POST", body: JSON.stringify({ note, restart }) });
export const fetchReturnedCount = () => apiFetch<{ count: number }>("/document-requests/returned/count");
export const fetchSigners = () => apiFetch<Signer[]>("/users/signers");
export async function uploadMySignature(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<{ signatureUrl: string }>("/users/me/signature", { method: "POST", body: fd });
}
/** Thai message from "API error 400: {...}" */
export function apiErrorMessage(err: unknown, fallback: string) {
    const m = err instanceof Error ? err.message : "";
    try { return JSON.parse(m.slice(m.indexOf("{"))).error || (m && !m.startsWith("API error") ? m : fallback); } catch { return m && !m.startsWith("API error") ? m : fallback; }
}

// ─── งานสื่อประชาสัมพันธ์ ─────────────────────────────────────
export type MediaStatus = "draft" | "pending" | "approved" | "returned" | "published";
export type MediaClash = { id: string; title: string; department: string; channels: string[]; publishAt: string; status: MediaStatus };
export type MediaPost = {
    id: string; title: string; department: string; channels: string[]; format: string; content: string;
    attachmentUrls: string[]; link: string | null; publishAt: string; status: MediaStatus; note: string | null;
    requestedById: string; requestedBy?: { id: string; name: string }; reviewedBy?: { id: string; name: string } | null;
    reviewedAt: string | null; submittedAt: string | null; publishedAt: string | null; publishedUrl: string | null;
    createdAt: string; updatedAt: string; clashes?: MediaClash[];
};
export type MediaInput = Pick<MediaPost, "title" | "department" | "channels" | "format" | "content" | "attachmentUrls" | "link" | "publishAt"> & { submit?: boolean };
export type MediaCalendarItem = Pick<MediaPost, "id" | "title" | "department" | "channels" | "format" | "publishAt" | "status" | "requestedById">;

export const fetchMediaPosts = (scope: "mine" | "review" | "all") => apiFetch<MediaPost[]>(`/media-posts?scope=${scope}`);
export const fetchMediaPost = (id: string) => apiFetch<MediaPost>(`/media-posts/${id}`);
export const fetchMediaCalendar = (from: string, to: string) => apiFetch<MediaCalendarItem[]>(`/media-posts/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
export const checkMediaClashes = (channels: string[], publishAt: string, excludeId?: string) =>
    apiFetch<{ windowMinutes: number; clashes: MediaClash[] }>(`/media-posts/clashes?channels=${encodeURIComponent(channels.join(","))}&publishAt=${encodeURIComponent(publishAt)}${excludeId ? `&excludeId=${excludeId}` : ""}`);
export const fetchMediaReviewCount = () => apiFetch<{ count: number }>("/media-posts/review/count");
export const createMediaPost = (data: MediaInput) => apiFetch<MediaPost>("/media-posts", { method: "POST", body: JSON.stringify(data) });
export const updateMediaPost = (id: string, data: Partial<MediaInput>) => apiFetch<MediaPost>(`/media-posts/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const submitMediaPost = (id: string) => apiFetch<{ ok: true }>(`/media-posts/${id}/submit`, { method: "POST" });
export const approveMediaPost = (id: string, note?: string, publishAt?: string) => apiFetch<{ ok: true }>(`/media-posts/${id}/approve`, { method: "POST", body: JSON.stringify({ note, publishAt }) });
export const returnMediaPost = (id: string, note: string) => apiFetch<{ ok: true }>(`/media-posts/${id}/return`, { method: "POST", body: JSON.stringify({ note }) });
export const markMediaPublished = (id: string, publishedUrl?: string) => apiFetch<{ ok: true }>(`/media-posts/${id}/published`, { method: "POST", body: JSON.stringify({ publishedUrl }) });
export const deleteMediaPost = (id: string) => apiFetch<{ ok: true }>(`/media-posts/${id}`, { method: "DELETE" });

// ─── อีเมลข่าวสารถึงสมาชิกเว็บไซต์ ─────────────────────────────
export type MailingAudience = "approved" | "verified";
export type SiteMailing = {
    id: string; subject: string; title: string; body: string; buttonLabel: string | null; buttonUrl: string | null;
    audience: MailingAudience; provinces: string[]; status: "draft" | "sending" | "sent";
    total: number; sent: number; failed: number; createdBy: string | null; sentBy: string | null; sentAt: string | null; createdAt: string;
    log?: { id: string; to: string; status: string; error: string | null; createdAt: string }[];
};
export type MailingInput = Pick<SiteMailing, "subject" | "title" | "body" | "buttonLabel" | "buttonUrl" | "audience" | "provinces">;
export const fetchMailings = () => apiFetch<SiteMailing[]>("/site/mailings");
export const fetchMailing = (id: string) => apiFetch<SiteMailing>(`/site/mailings/${id}`);
export const fetchMailingMeta = () => apiFetch<{ provinces: { name: string; count: number }[]; optedOut: number }>("/site/mailings/meta");
export const countMailingAudience = (audience: MailingAudience, provinces: string[]) =>
    apiFetch<{ count: number }>("/site/mailings/count", jsonBody("POST", { audience, provinces }));
export const previewMailingHtml = (data: Partial<MailingInput>) =>
    apiBlob("/site/mailings/preview", { method: "POST", body: JSON.stringify(data) }).then(b => b.text());
export const createMailing = (data: MailingInput) => apiFetch<SiteMailing>("/site/mailings", jsonBody("POST", data));
export const updateMailing = (id: string, data: MailingInput) => apiFetch<SiteMailing>(`/site/mailings/${id}`, jsonBody("PUT", data));
export const deleteMailing = (id: string) => apiFetch(`/site/mailings/${id}`, { method: "DELETE" });
export const testMailing = (id: string, to: string) => apiFetch<{ ok: true; status: string }>(`/site/mailings/${id}/test`, jsonBody("POST", { to }));
export const sendMailing = (id: string) => apiFetch<{ ok: true; total: number }>(`/site/mailings/${id}/send`, jsonBody("POST", {}));
