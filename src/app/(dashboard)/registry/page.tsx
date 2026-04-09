"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Filter, FileText, ChevronRight, Hash, Plus, X, Loader, Edit3, UploadCloud, FileCheck, ChevronDown, Trash2, Edit, Download, Eye, Calendar, User, Clock, Building, Share2, ArrowUpDown, Layers, Building2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOC_TYPES, CURRENT_THAI_YEAR, MASTER_CATEGORIES, CATEGORY_MAP, getNextDocNo } from "@/lib/constants";
import { StoredDocument } from "@/lib/types";
import { fetchDocuments, createDocument, updateDocument, deleteDocument, API_BASE_URL, fetchDepartments, fetchCategories, getMediaUrl, fetchUsers } from "@/lib/api";
import { toast } from "react-hot-toast";
import { useYear } from "@/context/YearContext";
import { useSession } from "next-auth/react";

const deptConfig: Record<string, { color: string; dot: string; badge: string }> = {
    "สำนักอำนวยการ": { color: "border-amber-300 bg-amber-50", dot: "bg-amber-400", badge: "bg-amber-100 text-amber-800" },
    "สมาคมพัฒนาเยาวชนมุสลิมไทย": { color: "border-blue-300 bg-blue-50", dot: "bg-blue-400", badge: "bg-blue-100 text-blue-800" },
    "สำนักกิจการสตรี สมาคมฯ": { color: "border-pink-300 bg-pink-50", dot: "bg-pink-400", badge: "bg-pink-100 text-pink-800" },
    "ครอบครัวฟิตยะตุลฮัก": { color: "border-emerald-300 bg-emerald-50", dot: "bg-emerald-400", badge: "bg-emerald-100 text-emerald-800" },
};

const typeIcons: Record<string, string> = {
    "ประเภทเอกสารโครงการ": "📁",
    "ประเภทเอกสารรายงานผลการดำเนินโครงการ": "📊",
    "ประเภทเอกสารประกาศหรือคำสั่ง": "📢",
    "ประเภทเอกสารภายใน": "📋",
    "ประเภทเอกสารภายนอก": "📤",
    "ประเภทเอกสารอื่น ๆ": "📄"
};

const categoryIcons: Record<string, string> = {
    "ประเภทเอกสารโครงการ": "📁",
    "ประเภทเอกสารรายงานผลการดำเนินโครงการ": "📊",
    "ประเภทเอกสารประกาศหรือคำสั่ง": "📢",
    "ประเภทเอกสารภายใน": "📋",
    "ประเภทเอกสารภายนอก": "📤",
    "ประเภทเอกสารอื่น ๆ": "📄"
};

type View = "dept" | "type" | "all";

export default function RegistryPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || "VIEWER";
    const canEdit = userRole === "SUPER_ADMIN" || userRole === "ADMIN";

    const { selectedYear } = useYear();
    const [docs, setDocs] = useState<StoredDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [filterDept, setFilterDept] = useState("all");
    const [view, setView] = useState<View>("dept");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [sortBy, setSortBy] = useState<"date" | "no">("date");
    const [dbDepartments, setDbDepartments] = useState<any[]>([]);
    const [dbCategories, setDbCategories] = useState<any[]>([]);
    const [dbUsers, setDbUsers] = useState<any[]>([]);

    // Fetch documents and metadata from API
    useEffect(() => {
        if (selectedYear) {
            refreshData();
            loadMetadata();
        }
    }, [selectedYear]);

    const loadMetadata = async () => {
        try {
            const [depts, cats, users] = await Promise.all([
                fetchDepartments('all'),
                fetchCategories(),
                fetchUsers().catch(err => {
                    console.error("Failed to fetch users, falling back to empty list:", err);
                    return [];
                })
            ]);
            setDbDepartments(depts);
            setDbCategories(cats);
            setDbUsers(users);

            // Set default selections if not already set
            setFormData(prev => ({
                ...prev,
                type: prev.type || (cats.length > 0 ? cats[0].id : ""),
                department: prev.department || (depts.length > 0 ? depts[0].id : "")
            }));
        } catch (error) {
            console.error("Error loading metadata:", error);
        }
    };

    const refreshData = () => {
        setLoading(true);
        fetchDocuments(selectedYear || undefined)
            .then((data) => {
                const mapped: StoredDocument[] = data.map((d: any) => ({
                    id: d.id,
                    docNo: d.docNo,
                    name: d.name,
                    type: d.category?.name || "",
                    department: d.department?.name || "",
                    uploadedBy: d.uploadedBy?.name || "",
                    uploadedAt: new Date(d.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }),
                    createdAt: d.createdAt, // Store raw ISO for sorting
                    fileUrl: d.filePath || undefined,
                }));
                setDocs(mapped);
            })
            .catch(() => { /* API fallback */ })
            .finally(() => setLoading(false));
    };

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        docNo: "",
        type: "", // Will be set to category UUID
        department: "", // Will be set to department UUID
        name: "",
        uploadedBy: (session?.user as any)?.name || "กำลังโหลด...",
        uploadedById: (session?.user as any)?.id || ""
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingDocId, setEditingDocId] = useState<string | null>(null);

    const isGlobalType = useMemo(() => {
        const cat = dbCategories.find(c => c.id === formData.type);
        return cat?.name === "ประเภทเอกสารโครงการ" || cat?.name === "ประเภทเอกสารรายงานผลการดำเนินโครงการ";
    }, [formData.type, dbCategories]);

    // Auto-populate uploader name when session is ready or modal opens
    useEffect(() => {
        if (showAddModal && session?.user && !isEditing) {
            const userName = (session.user as any).name || "";
            const userId = (session.user as any).id || (session.user as any).userId || "";
            if (userId && formData.uploadedById !== userId) {
                setFormData(prev => ({ ...prev, uploadedBy: userName, uploadedById: userId }));
            }
        }
    }, [session, isEditing, showAddModal, formData.uploadedById]);

    const filtered = useMemo(() => {
        const result = docs.filter(d => {
            const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || 
                                 d.docNo.toLowerCase().includes(search.toLowerCase());
            const matchesType = filterType === "all" || d.type === filterType;
            const matchesDept = filterDept === "all" || d.department === filterDept;
            return matchesSearch && matchesType && matchesDept;
        });

        return result.sort((a, b) => {
            let comp = 0;
            if (sortBy === "date") {
                // Use raw createdAt for reliable sorting
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                comp = timeA - timeB;
            } else {
                comp = a.docNo.localeCompare(b.docNo);
            }
            return sortOrder === "asc" ? comp : -comp;
        });
    }, [docs, search, filterType, filterDept, sortBy, sortOrder]);

    // Remove front-end docNo auto-generation to prevent race conditions.
    // The backend will generate a safe, unique docNo inside a transaction.
    useEffect(() => {
        if (showAddModal && !isEditing) {
            setFormData(prev => ({ ...prev, docNo: "(ออกเลขอัตโนมัติ)" }));
            
            // Set default department for global types to Admin Office
            if (isGlobalType) {
                const adminDept = dbDepartments.find(d => d.name === "สำนักอำนวยการ");
                if (adminDept) {
                    setFormData(prev => ({ ...prev, department: adminDept.id }));
                }
            }
        }
    }, [showAddModal, isEditing, isGlobalType]);

    // Handle re-generation of docNo when category or department changes in EDIT mode
    useEffect(() => {
        if (showAddModal && isEditing && editingDocId) {
            // Find existing doc to see if something changed
            const currentDoc = docs.find(d => d.id === editingDocId);
            if (!currentDoc) return;
            
            const selectedCat = dbCategories.find(c => c.id === formData.type);
            const selectedDept = dbDepartments.find(d => d.id === formData.department);
            
            const catChanged = selectedCat && selectedCat.name !== currentDoc.type;
            const deptChanged = !isGlobalType && selectedDept && selectedDept.name !== currentDoc.department;
            
            if (catChanged || deptChanged) {
                if (formData.docNo !== "(ออกเลขอัตโนมัติ)") {
                    setFormData(prev => ({ ...prev, docNo: "(ออกเลขอัตโนมัติ)" }));
                    toast("หมวดหมู่หรือหน่วยงานเปลี่ยนไป ระบบจะรันเลขที่เอกสารใหม่ให้โดยอัตโนมัติ", {
                        icon: 'ℹ️',
                        id: 'doc-no-reset'
                    });
                }
            } else {
                // If it's the original category/dept, restore original docNo
                if (formData.docNo === "(ออกเลขอัตโนมัติ)") {
                    setFormData(prev => ({ ...prev, docNo: currentDoc.docNo }));
                }
            }
        }
    }, [formData.type, formData.department, isEditing, showAddModal, editingDocId, docs, dbCategories, dbDepartments, isGlobalType]);

    // Grouping logic
    const byDept = useMemo(() => {
        const map = new Map<string, Map<string, StoredDocument[]>>();
        dbDepartments.forEach(d => map.set(d.name, new Map()));
        filtered.forEach(doc => {
            if (!map.has(doc.department)) map.set(doc.department, new Map());
            const deptMap = map.get(doc.department)!;
            const cat = doc.type || "อื่น ๆ";
            if (!deptMap.has(cat)) deptMap.set(cat, []);
            deptMap.get(cat)!.push(doc);
        });
        return map;
    }, [filtered]);

    const byCategory = useMemo(() => {
        const map = new Map<string, StoredDocument[]>();
        filtered.forEach(doc => {
            const cat = doc.type || "อื่น ๆ";
            if (!map.has(cat)) map.set(cat, []);
            map.get(cat)!.push(doc);
        });
        return map;
    }, [filtered]);

    const totalByDept = (deptName: string) => {
        let n = 0;
        byDept.get(deptName)?.forEach(arr => n += arr.length);
        return n;
    };

    const [selectedDoc, setSelectedDoc] = useState<StoredDocument | null>(null);

    // Body Scroll Lock
    useEffect(() => {
        if (selectedDoc || showAddModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedDoc, showAddModal]);

    const handleAddDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedFile && !isEditing) {
            toast.error("กรุณาอัปโหลดไฟล์ PDF");
            return;
        }

        setSubmitting(true);
        try {
            const formDataToSubmit = new FormData();
            formDataToSubmit.append("docNo", formData.docNo);
            formDataToSubmit.append("name", formData.name);
            formDataToSubmit.append("departmentId", formData.department || "");
            formDataToSubmit.append("categoryId", formData.type);
            formDataToSubmit.append("uploadedById", formData.uploadedById || (session?.user as any)?.id || "user_id_placeholder");
            if (selectedYear) {
                formDataToSubmit.append("thaiYear", selectedYear.toString());
            }
            if (selectedFile) {
                formDataToSubmit.append("file", selectedFile);
            }

            if (isEditing && editingDocId) {
                const updatedDoc = await updateDocument(editingDocId, formDataToSubmit);
                const mapped: StoredDocument = {
                    id: updatedDoc.id,
                    docNo: updatedDoc.docNo,
                    name: updatedDoc.name,
                    type: updatedDoc.category?.name || "",
                    department: updatedDoc.department?.name || "",
                    uploadedBy: updatedDoc.uploadedBy?.name || "",
                    uploadedAt: new Date(updatedDoc.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }),
                    fileUrl: updatedDoc.filePath || undefined,
                };
                setDocs(prev => prev.map(d => d.id === editingDocId ? mapped : d));
                toast.success("แก้ไขเอกสารเรียบร้อยแล้ว");
            } else {
                const createdDoc = await createDocument(formDataToSubmit);
                const mapped: StoredDocument = {
                    id: createdDoc.id,
                    docNo: createdDoc.docNo,
                    name: createdDoc.name,
                    type: createdDoc.category?.name || "",
                    department: createdDoc.department?.name || "",
                    uploadedBy: createdDoc.uploadedBy?.name || "",
                    uploadedAt: new Date(createdDoc.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }),
                    fileUrl: createdDoc.filePath || undefined,
                };
                setDocs(prev => [mapped, ...prev]);
                toast.success("บันทึกเอกสารเรียบร้อยแล้ว");
            }
            
            setShowAddModal(false);
            setFormData(prev => ({ ...prev, name: "" }));
            setSelectedFile(null);
            setIsEditing(false);
            setEditingDocId(null);
        } catch (error) {
            console.error(error);
            toast.error(isEditing ? "ไม่สามารถแก้ไขเอกสารได้" : "ไม่สามารถบันทึกเอกสารได้");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (doc: StoredDocument) => {
        const docDept = dbDepartments.find(d => d.name === doc.department);
        const docCat = dbCategories.find(c => c.name === doc.type);
        const docUser = dbUsers.find(u => u.name === doc.uploadedBy);

        setFormData({
            docNo: doc.docNo,
            type: docCat?.id || "",
            department: docDept?.id || "",
            name: doc.name,
            uploadedBy: doc.uploadedBy,
            uploadedById: docUser?.id || ""
        });
        setIsEditing(true);
        setEditingDocId(doc.id);
        setShowAddModal(true);
    };

    const handleDeleteDocument = async (id: string) => {
        if (!confirm("คุณต้องการลบเอกสารนี้ใช่หรือไม่?")) return;

        try {
            await deleteDocument(id);
            setDocs(prev => prev.filter(d => d.id !== id));
            toast.success("ลบเอกสารเรียบร้อยแล้ว");
        } catch (error) {
            console.error(error);
            toast.error("ไม่สามารถลบเอกสารได้");
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
            <Loader className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p>กำลังโหลดข้อมูลทะเบียนเอกสาร...</p>
        </div>
    );

    return (
        <>
            <div className="space-y-5 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ทะเบียนเอกสาร</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        เอกสารจัดเก็บทั้งหมดในปี พ.ศ. {selectedYear || CURRENT_THAI_YEAR} · {docs.length} รายการ
                    </p>
                </div>
                {canEdit && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-blue-600/20 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        เพิ่มเอกสารใหม่
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {dbDepartments.map(dept => {
                    const count = docs.filter(d => d.department === dept.name).length;
                    const cfg = deptConfig[dept.name] || { color: "bg-slate-50", dot: "bg-slate-300", badge: "bg-slate-100" };
                    return (
                        <div key={dept.id} className={cn("rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-sm", cfg.color,
                            filterDept === dept.name && "ring-2 ring-blue-400")}
                            onClick={() => setFilterDept(f => f === dept.name ? "all" : dept.name)}>
                            <div className="flex items-center gap-1.5 mb-2">
                                <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                                <p className="text-xs font-semibold text-slate-700 truncate">{dept.name}</p>
                            </div>
                            <p className="text-2xl font-bold text-slate-800">{count}</p>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col md:flex-row items-center gap-3 mb-6">
                <div className="flex-1 w-full flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="ค้นหาเลขที่เอกสาร / ชื่อเรื่อง..."
                        className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none flex-1 min-w-0" />
                    {search && (
                        <button onClick={() => setSearch("")} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Filter Dept */}
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <select
                            value={filterDept}
                            onChange={e => { setFilterDept(e.target.value); setView("all"); }}
                            className="pl-9 pr-8 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer appearance-none shadow-sm hover:border-indigo-200 transition-all min-w-[140px]"
                        >
                            <option value="all">หน่วยงาน (ทั้งหมด)</option>
                            {dbDepartments.map(d => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Filter className="w-3 h-3 text-slate-300" />
                        </div>
                    </div>

                    {/* Filter Category */}
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Layers className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <select
                            value={filterType}
                            onChange={e => { setFilterType(e.target.value); setView("all"); }}
                            className="pl-9 pr-8 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer appearance-none shadow-sm hover:border-indigo-200 transition-all min-w-[140px]"
                        >
                            <option value="all">ประเภท (ทั้งหมด)</option>
                            {dbCategories.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Filter className="w-3 h-3 text-slate-300" />
                        </div>
                    </div>

                    {/* Sort Order */}
                    <button 
                        onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold transition-all shadow-sm",
                            sortOrder === "asc" ? "text-indigo-600 border-indigo-100 bg-indigo-50/30" : "text-slate-700 hover:border-slate-200"
                        )}
                    >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span>{sortOrder === "asc" ? "เก่า-ใหม่" : "ใหม่-เก่า"}</span>
                    </button>
                    
                    {/* View Switcher */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                        {(["dept", "type", "all"] as View[]).map(v => (
                            <button key={v} onClick={() => setView(v)}
                                className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                                    view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                                {v === "dept" ? "หน่วยงาน" : v === "type" ? "ประเภท" : "ทั้งหมด"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {view === "dept" && (
                <div className="space-y-6">
                    {dbDepartments.map(dept => {
                        const typeMap = byDept.get(dept.name);
                        const total = totalByDept(dept.name);
                        if (total === 0) return null;
                        const cfg = deptConfig[dept.name] || { color: "bg-slate-50", dot: "bg-slate-300", badge: "bg-slate-100" };
                        return (
                            <div key={dept.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                <div className={cn("flex items-center gap-3 px-5 py-3 border-b", cfg.color)}>
                                    <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", cfg.dot)} />
                                    <h2 className="text-sm font-bold text-slate-800 flex-1">{dept.name}</h2>
                                    <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", cfg.badge)}>{total} รายการ</span>
                                </div>
                                {dbCategories.map(cat => {
                                    const catDocs = typeMap?.get(cat.name);
                                    if (!catDocs || catDocs.length === 0) return null;
                                    return (
                                        <div key={cat.id}>
                                            <div className="flex items-center gap-2 px-5 py-2 bg-slate-50/70 border-b border-slate-50">
                                                <span className="text-sm">{typeIcons[cat.name] ?? "📄"}</span>
                                                <span className="text-xs font-semibold text-slate-500">{cat.name}</span>
                                            </div>
                                            <div className="divide-y divide-slate-50">
                                                {catDocs.map((doc, idx) => (
                                                    <DocRow 
                                                        key={doc.id} 
                                                        doc={doc} 
                                                        seq={idx + 1} 
                                                        onClick={() => setSelectedDoc(doc)} 
                                                        onEdit={() => handleEdit(doc)}
                                                        onDelete={() => handleDeleteDocument(doc.id)}
                                                        canEdit={canEdit}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}

            {view === "type" && (
                <div className="space-y-4">
                    {dbCategories.map(cat => {
                        const catDocs = byCategory.get(cat.name);
                        if (!catDocs || catDocs.length === 0) return null;
                        return (
                            <div key={cat.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100">
                                    <span className="text-lg">{typeIcons[cat.name] ?? "📄"}</span>
                                    <h2 className="text-sm font-bold text-slate-800 flex-1">{cat.name}</h2>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {catDocs.map((doc, idx) => (
                                        <DocRow 
                                            key={doc.id} 
                                            doc={doc} 
                                            seq={idx + 1} 
                                            showDept 
                                            onClick={() => setSelectedDoc(doc)} 
                                            onEdit={() => handleEdit(doc)}
                                            onDelete={() => handleDeleteDocument(doc.id)}
                                            canEdit={canEdit}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {view === "all" && (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
                    {filtered.map((doc, idx) => (
                        <DocRow 
                            key={doc.id} 
                            doc={doc} 
                            seq={idx + 1} 
                            showDept 
                            onClick={() => setSelectedDoc(doc)} 
                            onEdit={() => handleEdit(doc)}
                            onDelete={() => handleDeleteDocument(doc.id)}
                            canEdit={canEdit}
                        />
                    ))}
                </div>
            )}

            </div>

            {/* ADD MODAL - REDESIGNED */}
            {showAddModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="bg-white/95 backdrop-blur-2xl rounded-[2rem] w-full max-w-[440px] shadow-[0_32px_128px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-500 border border-white/40 flex flex-col max-h-[95vh] relative text-[13px]">
                        {/* Decorative Background Accents */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                        {/* Modal Header */}
                        <div className="px-6 py-4 relative overflow-hidden flex-shrink-0 border-b border-slate-100/50 bg-slate-50/50">
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 rotate-3">
                                        <Plus className="w-5 h-5 text-white -rotate-3" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-[900] text-slate-900 tracking-tight">{isEditing ? "แก้ไขเอกสาร" : "เพิ่มเอกสารใหม่"}</h3>
                                        <p className="text-[9px] font-bold text-slate-400 mt-0.5 flex items-center gap-1.5 uppercase tracking-widest">
                                            <span className="flex h-1 w-1 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1 w-1 bg-blue-500"></span>
                                            </span>
                                            ทะเบียนเอกสาร
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowAddModal(false); setIsEditing(false); setEditingDocId(null); }}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-white hover:border-slate-300 transition-all active:scale-90"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
                            <form id="add-doc-form" onSubmit={handleAddDocument} className="space-y-6">
                                {/* Section 1: Identification */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-4 w-1 bg-blue-600 rounded-full" />
                                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">ข้อมูลทะเบียน</h4>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50/80 border border-slate-100 rounded-[1.5rem] p-4 transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 group">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <Hash className="w-3 h-3 text-blue-500" />
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">เลขที่ (Gen)</label>
                                            </div>
                                            <p className="text-sm font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors uppercase truncate">{formData.docNo}</p>
                                        </div>
                                        <div className="bg-slate-50/80 border border-slate-100 rounded-[1.5rem] p-4 transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 group">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <Edit3 className="w-3 h-3 text-indigo-500" />
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">นายทะเบียน</label>
                                            </div>
                                            <select
                                                value={formData.uploadedById}
                                                onChange={e => {
                                                    const userId = e.target.value;
                                                    const u = dbUsers.find(x => x.id === userId);
                                                    setFormData({ ...formData, uploadedById: userId, uploadedBy: u?.name || "" });
                                                }}
                                                className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer appearance-none group-hover:text-indigo-600 transition-colors"
                                            >
                                                {dbUsers.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Document Details */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-4 w-1 bg-indigo-600 rounded-full" />
                                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">รายละเอียดเอกสาร</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="relative group">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1.5">ชื่อเรื่อง / ชื่อเอกสาร</label>
                                            <div className="relative">
                                                <textarea
                                                    required
                                                    rows={2}
                                                    value={formData.name}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full text-sm font-bold border-2 border-slate-100 rounded-[1.25rem] px-4 py-3 outline-none focus:border-blue-500/50 focus:bg-white bg-slate-50/50 transition-all placeholder:text-slate-300 resize-none shadow-sm"
                                                    placeholder="กรุณาระบุชื่อเรื่อง..."
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1.5">ประเภทเอกสาร</label>
                                                <div className="relative">
                                                    <select
                                                        value={formData.type}
                                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                                        className="w-full text-[13px] font-bold border-2 border-slate-100 rounded-[1.25rem] px-4 py-3 outline-none focus:border-blue-500/50 bg-white appearance-none cursor-pointer transition-all shadow-sm"
                                                    >
                                                        {dbCategories.map(cat => (
                                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                        <ChevronDown className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black uppercase tracking-widest ml-1.5 text-slate-500">หน่วยงานผู้รันเลข</label>
                                                <div className="relative group">
                                                    <select
                                                        value={formData.department}
                                                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                                                        className={cn("w-full text-[13px] font-bold border-2 rounded-[1.25rem] px-4 py-3 outline-none transition-all appearance-none cursor-pointer shadow-sm border-slate-100 bg-white focus:border-blue-500/50 text-slate-700",
                                                            isGlobalType && !formData.department && "bg-blue-50/30 border-blue-100")}
                                                    >
                                                        {dbDepartments.map(d => (
                                                            <option key={d.id} value={d.id}>{d.name}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-500 transition-colors">
                                                        <ChevronDown className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Upload */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-4 w-1 bg-emerald-600 rounded-full" />
                                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">ไฟล์แนบ</h4>
                                    </div>

                                    <div 
                                        onClick={() => document.getElementById('file-upload')?.click()}
                                        className={cn(
                                            "group relative border-2 border-dotted rounded-[1.5rem] py-6 px-4 text-center transition-all cursor-pointer",
                                            selectedFile 
                                                ? "border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/50" 
                                                : "border-slate-200 bg-slate-50/20 hover:bg-blue-50/30 hover:border-blue-300"
                                        )}
                                    >
                                        <input 
                                            id="file-upload"
                                            type="file"
                                            accept=".pdf"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) setSelectedFile(file);
                                            }}
                                        />
                                        <div className="relative z-10">
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl shadow-xl flex items-center justify-center mx-auto mb-3 transition-all duration-500",
                                                selectedFile ? "bg-emerald-500 scale-110" : "bg-white border border-slate-100 group-hover:scale-110"
                                            )}>
                                                {selectedFile ? (
                                                    <FileCheck className="w-6 h-6 text-white" />
                                                ) : (
                                                    <UploadCloud className="w-6 h-6 text-blue-500 group-hover:text-blue-700" />
                                                )}
                                            </div>
                                            <p className="text-sm font-black text-slate-800 mb-0.5">
                                                {selectedFile ? selectedFile.name : (isEditing ? "คลิกเพื่อเปลี่ยนไฟล์แนบ (ถ้ามี)" : "คลิกเพื่ออัปโหลดแบบฟอร์ม")}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : "PDF · Max 10MB"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex-shrink-0 backdrop-blur-sm">
                            <div className="flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => setShowAddModal(false)}
                                    className="px-5 py-2.5 text-xs font-black text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    form="add-doc-form"
                                    disabled={submitting}
                                    className="px-6 py-2.5 text-xs font-black text-white bg-slate-900 hover:bg-blue-600 rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 group disabled:bg-slate-400"
                                >
                                    {submitting ? (
                                        <Loader className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <FileCheck className="w-4 h-4" />
                                    )}
                                    {submitting ? (isEditing ? "กำลังอัปเดต..." : "กำลังบันทึก...") : (isEditing ? "อัปเดตข้อมูล" : "บันทึกข้อมูล")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEWER MODAL */}
            {selectedDoc && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-none sm:rounded-[2rem] w-full max-w-5xl h-full sm:h-[95vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="px-4 py-3 sm:px-8 sm:py-6 border-b bg-white flex-shrink-0 relative">
                            <div className="flex items-start justify-between gap-4 mb-2 sm:mb-0">
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-sm sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight line-clamp-2 sm:line-clamp-none">{selectedDoc.name}</h3>
                                    <p className="text-[9px] sm:text-sm font-medium text-slate-400 mt-0.5">{selectedDoc.docNo} · {selectedDoc.department}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button 
                                        onClick={() => {
                                            if (selectedDoc.fileUrl) {
                                                const url = getMediaUrl(selectedDoc.fileUrl);
                                                window.open(url, '_blank');
                                            }
                                        }}
                                        className="hidden sm:block px-6 py-2.5 text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                    >
                                        ดาวน์โหลด PDF
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (selectedDoc.fileUrl) {
                                                const url = getMediaUrl(selectedDoc.fileUrl);
                                                window.open(url, '_blank');
                                            }
                                        }}
                                        className="sm:hidden p-2 text-blue-600 bg-blue-50 rounded-lg"
                                        title="Download"
                                    >
                                        <UploadCloud className="w-4 h-4 rotate-180" />
                                    </button>
                                    <button onClick={() => setSelectedDoc(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 bg-slate-900/5 overflow-hidden relative">
                            {selectedDoc.fileUrl ? (
                                <iframe 
                                    src={`${getMediaUrl(selectedDoc.fileUrl)}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                                    className="w-full h-full border-none"
                                    title={selectedDoc.name}
                                />
                            ) : (
                                <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-12 text-center">
                                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                                        <FileText className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-800 mb-2">ไม่พบไฟล์ตัวอย่าง</h4>
                                    <p className="text-slate-500 font-medium">เอกสารนี้ไม่มีไฟล์แนบในระบบ</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function DocRow({ doc, seq, showDept = false, onClick, onEdit, onDelete, canEdit }: { 
    doc: StoredDocument; 
    seq: number; 
    showDept?: boolean; 
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onEdit?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onDelete?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    canEdit?: boolean;
}) {
    const cfg = deptConfig[doc.department] || { badge: "bg-slate-100 text-slate-600" };
    return (
        <div 
            onClick={onClick}
            className="flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-blue-50/20 transition-all group cursor-pointer border-l-4 border-transparent hover:border-blue-500 relative"
        >
            {/* Seq + DocNo */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <span className="text-[10px] font-mono text-slate-300 w-4 text-right leading-none hidden sm:block">{seq}</span>
                <span className="font-mono text-[9px] sm:text-xs font-black text-blue-700 bg-blue-50/80 border border-blue-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl flex-shrink-0 shadow-sm whitespace-nowrap">
                    {doc.docNo}
                </span>
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-black text-slate-800 leading-snug group-hover:text-blue-700 transition-colors line-clamp-1">{doc.name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {showDept && (
                        <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md border", cfg.badge)}>{doc.department}</span>
                    )}
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                         <div className="w-3.5 h-3.5 rounded-full bg-slate-100 flex items-center justify-center text-[7px] text-slate-500 font-black flex-shrink-0">
                            {doc.uploadedBy.substring(0, 1)}
                         </div>
                         <span className="truncate max-w-[100px] sm:max-w-none">{doc.uploadedBy}</span>
                         <span>·</span>
                         <span className="whitespace-nowrap">{doc.uploadedAt}</span>
                    </div>
                </div>
            </div>

            {/* Actions - always visible on mobile, hover on desktop */}
            <div className="flex items-center gap-1 flex-shrink-0">
                {canEdit && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(e); }}
                            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100"
                            title="แก้ไข"
                        >
                            <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(e); }}
                            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                            title="ลบ"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </>
                )}
                <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-blue-500 transition-colors" />
            </div>
        </div>
    );
}
