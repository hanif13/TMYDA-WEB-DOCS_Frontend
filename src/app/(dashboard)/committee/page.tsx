
"use client";

import { useEffect, useState, useRef } from 'react';
import { Users, Mail, Phone, Briefcase, Plus, Trash2, X, Upload, Camera, Pencil, UploadCloud } from 'lucide-react';
import { fetchCommitteeMembers, createCommitteeMember, updateCommitteeMember, deleteCommitteeMember, createCommitteeBulk, fetchDepartments, getMediaUrl } from '@/lib/api';
import Papa from 'papaparse';
import { CommitteeMember } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { 
    DndContext, 
    closestCenter, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors,
    DragEndEvent,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import { DragOverlay } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { GripVertical, MoreVertical, LayoutGrid, List } from 'lucide-react';
import { reorderCommitteeMembers, reorderDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/lib/api';

const DEPT_STYLES: Record<string, { color: string, text: string }> = {
    'admin': { color: 'bg-blue-600', text: 'text-blue-600' },
    'family': { color: 'bg-emerald-600', text: 'text-emerald-600' },
    'tmyda': { color: 'bg-indigo-600', text: 'text-indigo-600' },
    'women': { color: 'bg-pink-600', text: 'text-pink-600' },
    'shura': { color: 'bg-violet-600', text: 'text-violet-600' },
};

const getDeptStyles = (name: string) => {
    if (name.includes('สำนักอำนวยการ')) return DEPT_STYLES.admin;
    if (name.includes('ครอบครัวฟิตยะตุลฮัก')) return DEPT_STYLES.family;
    if (name.includes('สมาคมพัฒนาเยาวชนมุสลิมไทย')) return DEPT_STYLES.tmyda;
    if (name.includes('สำนักกิจการสตรี')) return DEPT_STYLES.women;
    if (name.includes('ชูรอ') || name.includes('ที่ปรึกษา')) return DEPT_STYLES.shura;
    return DEPT_STYLES.admin; // Fallback
};
import { useSession } from 'next-auth/react';
import { useYear } from '@/context/YearContext';

// --- UI Shared Components ---

function MemberCard({ member, isDragging, onEdit, onDelete, onClick, canEdit, isEditMode, attributes, listeners, isOverlay }: any) {
    return (
        <div 
            onClick={() => !isEditMode && !isDragging && onClick && onClick(member)}
            className={cn(
                "group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 transition-all duration-200 relative truncate",
                isDragging ? "opacity-0" : "opacity-100",
                !isOverlay && "hover:shadow-xl hover:border-blue-100 hover:-translate-y-1 cursor-pointer",
                isOverlay && "shadow-2xl border-blue-200 ring-4 ring-blue-50/50 scale-105",
                isEditMode && "cursor-default hover:translate-y-0"
            )}
        >
            {canEdit && (
                <div className={cn(
                    "absolute top-4 right-4 flex items-center gap-1 transition-opacity z-10",
                    isEditMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                    {isEditMode && (
                        <div {...attributes} {...listeners} className="p-2 text-slate-300 hover:text-blue-500 cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-4 h-4" />
                        </div>
                    )}
                    {!isOverlay && (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(member); }}
                                className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(member.id, member.name); }}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            )}
            
            <div className="flex gap-4">
                <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-slate-50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-100">
                    {member.photoUrl ? (
                        <img 
                            src={getMediaUrl(member.photoUrl)} 
                            alt={member.name} 
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <Users className="w-10 h-10 text-slate-300" />
                    )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {member.name}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 mb-2">
                        {member.position}
                    </p>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 space-y-2.5">
                {member.phoneNumber && (
                    <div className="flex items-center gap-2.5 text-xs text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{member.phoneNumber}</span>
                    </div>
                )}
                {member.email && (
                    <div className="flex items-center gap-2.5 text-xs text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{member.email}</span>
                    </div>
                )}
                {member.occupation && (
                    <div className="flex items-center gap-2.5 text-xs text-slate-600">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{member.occupation}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function DepartmentHeader({ dept, canEdit, isEditMode, onEditDept, onDeleteDept, styles, attributes, listeners, isOverlay }: any) {
    return (
        <div className={cn(
            "flex items-center justify-between group py-2 px-4 rounded-2xl transition-all",
            isOverlay && "bg-white shadow-xl border border-blue-100 ring-2 ring-blue-50"
        )}>
            <div className="flex items-center gap-4">
                {isEditMode && canEdit && (
                    <div {...attributes} {...listeners} className="p-1 text-slate-300 hover:text-blue-500 cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-5 h-5" />
                    </div>
                )}
                <div className={cn("h-8 w-1.5 rounded-full shadow-sm", styles?.color || 'bg-blue-600')} />
                <h2 className="text-xl font-black text-slate-800 tracking-tight">{dept.name}</h2>
                {isEditMode && canEdit && !isOverlay && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => onEditDept(dept)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => onDeleteDept(dept.id, dept.name)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Sortable Item Components ---

function SortableMember({ member, canEdit, isEditMode, handleEdit, handleDelete, handleView }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: member.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <MemberCard 
                member={member} 
                canEdit={canEdit} 
                isEditMode={isEditMode} 
                onEdit={handleEdit} 
                onDelete={handleDelete}
                onClick={handleView}
                attributes={attributes}
                listeners={listeners}
                isDragging={isDragging}
            />
        </div>
    );
}

function SortableDepartment({ dept, members, canEdit, isEditMode, handleEdit, handleDelete, handleEditDept, handleDeleteDept, handleView, getDeptStyles, setIsModalOpen, setFormData }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: dept.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const deptMembers = members.filter((m: any) => m.departmentId === dept.id);
    const styles = getDeptStyles(dept.name);

    if (deptMembers.length === 0 && !canEdit) return null;

    return (
        <div ref={setNodeRef} style={style} className={cn("space-y-6", isDragging && "opacity-0")}>
            <DepartmentHeader 
                dept={dept} 
                canEdit={canEdit} 
                isEditMode={isEditMode} 
                onEditDept={handleEditDept} 
                onDeleteDept={handleDeleteDept} 
                styles={styles} 
                attributes={attributes} 
                listeners={listeners} 
            />

            {deptMembers.length > 0 ? (
                <SortableContext items={deptMembers.map((m: any) => m.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {deptMembers.map((member: any) => (
                            <SortableMember 
                                key={member.id} 
                                member={member} 
                                canEdit={canEdit}
                                isEditMode={isEditMode}
                                handleEdit={handleEdit}
                                handleDelete={handleDelete}
                                handleView={handleView}
                            />
                        ))}
                    </div>
                </SortableContext>
            ) : (
                <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl py-14 flex flex-col items-center justify-center gap-3 mx-4 outline-none">
                    <Users className="w-10 h-10 text-slate-300" />
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">ยังไม่มีข้อมูลในส่วนนี้</p>
                    {canEdit && (
                        <button 
                            onClick={() => {
                                setFormData((prev: any) => ({ ...prev, departmentId: dept.id }));
                                setIsModalOpen(true);
                            }}
                            className="text-blue-600 text-sm font-black hover:scale-105 transition-transform"
                        >
                            + เพิ่มรายชื่อแรก
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default function CommitteePage() {
    const { data: session } = useSession();
    const { selectedYear } = useYear();
    const userRole = (session?.user as any)?.role;
    const canEdit = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
    
    const [members, setMembers] = useState<CommitteeMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Detail View State
    const [selectedMember, setSelectedMember] = useState<CommitteeMember | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    
    // Department Management State
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
    const [deptFormData, setDeptFormData] = useState({ name: '', theme: '' });

    const [formData, setFormData] = useState({
        name: '',
        position: '',
        phoneNumber: '',
        email: '',
        occupation: '',
        departmentId: 'admin',
        order: '0'
    });
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);

    const [dbDepartments, setDbDepartments] = useState<any[]>([]);
    
    // Smooth DND State
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeMember, setActiveMember] = useState<CommitteeMember | null>(null);
    const [activeDept, setActiveDept] = useState<any | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const loadMembers = async () => {
        try {
            setLoading(true);
            const [membersData, deptsData] = await Promise.all([
                fetchCommitteeMembers(selectedYear || undefined),
                fetchDepartments(selectedYear || undefined, 'committee')
            ]);
            setMembers(membersData);
            setDbDepartments(deptsData);
            
            // Set default departmentId if not set
            if ((!formData.departmentId || formData.departmentId === 'admin') && deptsData.length > 0) {
                setFormData(prev => ({ ...prev, departmentId: deptsData[0].id }));
            }
        } catch (error) {
            console.error("Error loading committee data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMembers();
    }, [selectedYear]);

    // Body Scroll Lock
    useEffect(() => {
        if (isModalOpen || isDeptModalOpen || isDetailModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isModalOpen, isDeptModalOpen]);

    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        toast.loading("กำลังอัปโหลดข้อมูล...", { id: "csv-upload" });
        Papa.parse(file, {
            header: false,
            skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data as string[][];
                if (rows.length === 0) {
                    toast.error("ไม่พบข้อมูลในไฟล์ CSV", { id: "csv-upload" });
                    return;
                }
                
                try {
                    // Find header row gracefully
                    let headerIndex = rows.findIndex(row => row.some(cell => typeof cell === 'string' && cell.includes('ชื่อ')));
                    if (headerIndex === -1) headerIndex = 0;
                    
                    const headers = rows[headerIndex].map(h => h.trim().toLowerCase());
                    const dataRows = rows.slice(headerIndex + 1);

                    // Try to infer department from row 0 if header isn't row 0 (e.g. the merged title cell)
                    let inferredDept = "";
                    if (headerIndex > 0) {
                        inferredDept = String(rows[0].find(c => c && c.trim()) || "").trim();
                    }

                    // Flexible Column Matching
                    const getCol = (aliases: string[]) => headers.findIndex(h => aliases.some(a => h.includes(a)));
                    const nIdx = getCol(['ชื่อ', 'name']);
                    const pIdx = getCol(['ตำแหน่ง', 'position']);
                    const phIdx = getCol(['เบอร์', 'phone']);
                    const eIdx = getCol(['อีเมล', 'email']);
                    const oIdx = getCol(['อาชีพ', 'occupation']);
                    const dIdx = getCol(['หน่วยงาน', 'department']);
                    const ordIdx = getCol(['ลำดับ', 'order']);

                    const mappedData: any[] = [];
                    const uniqueDeptNames = Array.from(new Set(dataRows.map(row => {
                        const dName = (dIdx >= 0 && row[dIdx] ? row[dIdx] : inferredDept).trim();
                        return dName;
                    }).filter(Boolean)));

                    // 1. Automatically create missing departments
                    let currentDepts = [...dbDepartments];
                    for (const dName of uniqueDeptNames) {
                        const exists = currentDepts.some((d: any) => dName.includes(d.name) || d.name.includes(dName));
                        if (!exists) {
                            try {
                                const newDept = await createDepartment({ name: dName, order: currentDepts.length }, selectedYear || 2567, true);
                                currentDepts.push(newDept);
                            } catch (err) {
                                console.error("Failed to auto-create department:", dName);
                            }
                        }
                    }
                    
                    // Refresh local state and local reference
                    setDbDepartments(currentDepts);

                    // 2. Map data with newly created IDs
                    dataRows.forEach((row, idx) => {
                        const name = nIdx >= 0 ? row[nIdx] : '';
                        if (!name || !name.trim()) return;

                        const deptName = (dIdx >= 0 && row[dIdx] ? row[dIdx] : inferredDept).trim();
                        let foundDeptId = currentDepts.length > 0 ? currentDepts[0].id : "";
                        
                        if (deptName) {
                            const match = currentDepts.find((d: any) => deptName.includes(d.name) || d.name.includes(deptName) || d.id === deptName);
                            if (match) foundDeptId = match.id;
                        }

                        if (!foundDeptId) return; // Skip if still no dept

                        mappedData.push({
                            name: name.trim(),
                            position: pIdx >= 0 && row[pIdx] ? row[pIdx].trim() : 'กรรมการ',
                            phoneNumber: phIdx >= 0 && row[phIdx] ? row[phIdx].trim() : "",
                            email: eIdx >= 0 && row[eIdx] ? row[eIdx].trim() : "",
                            occupation: oIdx >= 0 && row[oIdx] ? row[oIdx].trim() : "",
                            departmentId: foundDeptId,
                            order: ordIdx >= 0 && !isNaN(Number(row[ordIdx])) ? Number(row[ordIdx]) : idx,
                            thaiYear: selectedYear || 2567
                        });
                    });

                    if (mappedData.length === 0) {
                        toast.error("รูปแบบข้อมูลในไฟล์ CSV ไม่ถูกต้อง", { id: "csv-upload" });
                        return;
                    }

                    await createCommitteeBulk(mappedData);
                    toast.success(`นำเข้าข้อมูลสำเร็จ ${mappedData.length} รายการ`, { id: "csv-upload" });
                    loadMembers();
                } catch (err) {
                    console.error("CSV Upload Error:", err);
                    toast.error("เกิดข้อผิดพลาดในการนำเข้าข้อมูล", { id: "csv-upload" });
                }
            },
            error: () => toast.error("ไม่สามารถอ่านไฟล์ CSV ได้", { id: "csv-upload" })
        });
        
        e.target.value = '';
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEdit = (member: CommitteeMember) => {
        setEditingId(member.id);
        setFormData({
            name: member.name || '',
            position: member.position || '',
            phoneNumber: member.phoneNumber || '',
            email: member.email || '',
            occupation: member.occupation || '',
            departmentId: member.departmentId || 'admin',
            order: (member.order || 0).toString()
        });
        setPhotoPreview(member.photoUrl ? getMediaUrl(member.photoUrl) : null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const data = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                data.append(key, value);
            });
            if (photo) {
                data.append('photo', photo);
            }
            if (selectedYear) {
                data.append('thaiYear', selectedYear.toString());
            }

            if (editingId) {
                await updateCommitteeMember(editingId, data);
                toast.success("แก้ไขรายชื่อสำเร็จ");
            } else {
                await createCommitteeMember(data);
                toast.success("เพิ่มรายชื่อสำเร็จ");
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({
                name: '',
                position: '',
                phoneNumber: '',
                email: '',
                occupation: '',
                departmentId: 'admin',
                order: '0'
            });
            setPhoto(null);
            setPhotoPreview(null);
            loadMembers();
        } catch (error) {
            toast.error("ไม่สามารถเพิ่มรายชื่อได้");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`ยืนยันการลบคุณ ${name}?`)) return;
        
        try {
            await deleteCommitteeMember(id);
            toast.success("ลบรายชื่อสำเร็จ");
            loadMembers();
        } catch (error) {
            toast.error("ไม่สามารถลบรายชื่อได้");
        }
    };

    // --- REORDER HANDLERS ---
    const handleDragStart = (event: any) => {
        const { active } = event;
        const id = active.id as string;
        setActiveId(id);
        
        const member = members.find(m => m.id === id);
        if (member) {
            setActiveMember(member);
            setActiveDept(null);
        } else {
            const dept = dbDepartments.find(d => d.id === id);
            if (dept) {
                setActiveDept(dept);
                setActiveMember(null);
            }
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveMember(null);
        setActiveDept(null);

        if (!over || active.id === over.id) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Determine if we are dragging a member or a department
        const isActiveMember = members.some(m => m.id === activeId);
        const isOverMember = members.some(m => m.id === overId);

        if (isActiveMember) {
            // Reordering Members
            const oldIndex = members.findIndex(m => m.id === activeId);
            const newIndex = members.findIndex(m => m.id === overId);
            
            let newMembers = [...members];
            
            // If dropping over a member
            if (newIndex !== -1) {
                // Find target department
                const targetDeptId = members[newIndex].departmentId;
                
                // Update local state first for snappiness
                const updatedMembers = arrayMove(members, oldIndex, newIndex).map((m, idx) => {
                    if (m.id === activeId) return { ...m, departmentId: targetDeptId, order: idx };
                    return { ...m, order: idx };
                });
                
                setMembers(updatedMembers);
                
                // Sync to backend
                try {
                    await reorderCommitteeMembers(updatedMembers.map((m, idx) => ({ 
                        id: m.id, 
                        order: idx,
                        departmentId: m.id === activeId ? targetDeptId : m.departmentId
                    })));
                } catch (err) {
                    toast.error("ไม่สามารถบันทึกลำดับได้");
                    loadMembers(); // Revert
                }
            } else {
                // Dropping over a department container (handle via over.id if it's a dept id)
                const targetDept = dbDepartments.find(d => d.id === overId);
                if (targetDept) {
                    const updatedMembers = members.map(m => {
                        if (m.id === activeId) return { ...m, departmentId: targetDept.id };
                        return m;
                    });
                    setMembers(updatedMembers);
                    try {
                        await reorderCommitteeMembers([{ id: activeId, order: 0, departmentId: targetDept.id }]);
                    } catch (err) {
                        loadMembers();
                    }
                }
            }
        } else {
            // Reordering Departments
            const oldIndex = dbDepartments.findIndex(d => d.id === activeId);
            const newIndex = dbDepartments.findIndex(d => d.id === overId);
            
            if (oldIndex !== -1 && newIndex !== -1) {
                const newDepts = arrayMove(dbDepartments, oldIndex, newIndex);
                setDbDepartments(newDepts);
                
                try {
                    await reorderDepartments(newDepts.map((d, idx) => ({ id: d.id, order: idx })));
                } catch (err) {
                    toast.error("ไม่สามารถบันทึกลำดับหน่วยงานได้");
                    loadMembers();
                }
            }
        }
    };

    // --- DEPARTMENT MANAGEMENT ---
    const handleSaveDept = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingDeptId) {
                await updateDepartment(editingDeptId, deptFormData);
                toast.success("แก้ไขหน่วยงานสำเร็จ");
            } else {
                await createDepartment(
                    { ...deptFormData, order: dbDepartments.length }, 
                    selectedYear || undefined,
                    true
                );
                toast.success("เพิ่มหน่วยงานสำเร็จ");
            }
            setIsDeptModalOpen(false);
            setEditingDeptId(null);
            setDeptFormData({ name: '', theme: '' });
            loadMembers();
        } catch (err) {
            toast.error("ไม่สามารถบันทึกหน่วยงานได้");
        }
    };

    const handleDeleteDept = async (id: string, name: string) => {
        if (!window.confirm(`ยืนยันการลบหน่วยงาน "${name}"? (ต้องไม่มีสมาชิกเหลืออยู่)`)) return;
        try {
            await deleteDepartment(id, selectedYear || undefined);
            toast.success("ลบหน่วยงานสำเร็จ");
            loadMembers();
        } catch (err: any) {
            toast.error(err.message || "ไม่สามารถลบหน่วยงานได้");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Users className="w-8 h-8 text-blue-600" />
                        คณะกรรมการ
                    </h1>
                    <p className="text-slate-500">ทำเนียบคณะกรรมการและเจ้าหน้าที่แต่ละหน่วยงาน</p>
                </div>

                {canEdit && (
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {/* Edit Mode Toggle */}
                        <button 
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={cn(
                                "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all text-xs",
                                isEditMode 
                                    ? "bg-slate-800 text-white shadow-sm" 
                                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm"
                            )}
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            {isEditMode ? "เสร็จสิ้น" : "แก้ไข"}
                        </button>

                        <div className="h-6 w-px bg-slate-200" />

                        <input 
                            type="file" 
                            accept=".csv" 
                            className="hidden" 
                            ref={csvInputRef} 
                            onChange={handleCsvUpload} 
                        />
                        <button 
                            onClick={() => csvInputRef.current?.click()}
                            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl font-bold transition-all shadow-sm text-xs"
                        >
                            <UploadCloud className="w-3.5 h-3.5" />
                            CSV
                        </button>
                        <button 
                            onClick={() => {
                                setEditingId(null);
                                setFormData({
                                    name: '', position: '', phoneNumber: '', email: '', occupation: '', departmentId: dbDepartments[0]?.id || 'admin', order: '0'
                                });
                                setPhoto(null);
                                setPhotoPreview(null);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-bold transition-all shadow-sm text-xs"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            เพิ่มรายชื่อ
                        </button>
                        
                        {isEditMode && (
                            <button 
                                onClick={() => {
                                    setEditingDeptId(null);
                                    setDeptFormData({ name: '', theme: '' });
                                    setIsDeptModalOpen(true);
                                }}
                                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold transition-all text-xs"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                หน่วยงาน
                            </button>
                        )}
                    </div>
                )}
            </div>

            <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                modifiers={isEditMode ? [] : [restrictToVerticalAxis]}
            >
                <SortableContext 
                    items={dbDepartments.map(d => d.id)} 
                    strategy={verticalListSortingStrategy}
                    disabled={!isEditMode}
                >
                    <div className="space-y-12">
                        {dbDepartments.map((dept: any) => (
                            <SortableDepartment 
                                key={dept.id}
                                dept={dept}
                                members={members}
                                canEdit={canEdit}
                                isEditMode={isEditMode}
                                handleEdit={handleEdit}
                                handleDelete={handleDelete}
                                handleEditDept={(d: any) => {
                                    setEditingDeptId(d.id);
                                    setDeptFormData({ name: d.name, theme: d.theme || '' });
                                    setIsDeptModalOpen(true);
                                }}
                                handleDeleteDept={handleDeleteDept}
                                getDeptStyles={getDeptStyles}
                                setIsModalOpen={setIsModalOpen}
                                setFormData={setFormData}
                                handleView={(m: CommitteeMember) => {
                                    setSelectedMember(m);
                                    setIsDetailModalOpen(true);
                                }}
                            />
                        ))}
                    </div>
                </SortableContext>

                <DragOverlay dropAnimation={null}>
                    {activeId ? (
                        activeMember ? (
                            <MemberCard member={activeMember} isOverlay />
                        ) : activeDept ? (
                            <DepartmentHeader dept={activeDept} styles={getDeptStyles(activeDept.name)} isOverlay />
                        ) : null
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Create Member Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">{editingId ? 'แก้ไขรายชื่อคณะกรรมการ' : 'เพิ่มรายชื่อคณะกรรมการ'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Photo Upload */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="h-32 w-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden group-hover:border-blue-400 transition-all">
                                        {photoPreview ? (
                                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 text-slate-400">
                                                <Camera className="w-8 h-8" />
                                                <span className="text-[10px] font-bold">อัพโหลดรูป</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">ชื่อ-นามสกุล</label>
                                    <input
                                        required
                                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="เช่น นายมานะ ใจดี"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">ตำแหน่ง</label>
                                        <input
                                            required
                                            className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                            placeholder="เช่น ประธานโครงการ"
                                            value={formData.position}
                                            onChange={e => setFormData({ ...formData, position: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">เบอร์โทรศัพท์</label>
                                        <input
                                            className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                            placeholder="Ex. 081-234-5678"
                                            value={formData.phoneNumber}
                                            onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">อีเมล</label>
                                    <input
                                        type="email"
                                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="example@email.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">อาชีพปัจจุบัน</label>
                                    <input
                                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="เช่น ข้าราชการครู"
                                        value={formData.occupation}
                                        onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">หน่วยงาน</label>
                                    <select
                                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                        value={formData.departmentId}
                                        onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                                    >
                                        {dbDepartments.map((d: any) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button
                                disabled={isSubmitting}
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    "บันทึกข้อมูล"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Department Modal */}
            {isDeptModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDeptModalOpen(false)} />
                    <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">{editingDeptId ? 'แก้ไขหน่วยงาน' : 'เพิ่มหน่วยงานใหม่'}</h2>
                            <button onClick={() => setIsDeptModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveDept} className="p-6 space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">ชื่อหน่วยงาน</label>
                                <input
                                    required
                                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="เช่น สำนักอำนวยการ"
                                    value={deptFormData.name}
                                    onChange={e => setDeptFormData({ ...deptFormData, name: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all"
                            >
                                {editingDeptId ? "บันทึกการแก้ไข" : "สร้างหน่วยงาน"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Member Detail Modal */}
            {isDetailModalOpen && selectedMember && (() => {
                const dept = dbDepartments.find(d => d.id === selectedMember.departmentId);
                const deptName = dept?.name || "";
                
                // Dynamic theme based on department
                const getTheme = () => {
                    if (deptName.includes('สำนักอำนวยการ')) return { gradient: 'from-blue-600 to-indigo-700', iconBg: 'bg-blue-50', iconText: 'text-blue-600', badge: 'bg-blue-50 text-blue-600' };
                    if (deptName.includes('ครอบครัวฟิตยะตุลฮัก')) return { gradient: 'from-emerald-500 to-teal-700', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-600' };
                    if (deptName.includes('สมาคมพัฒนาเยาวชนมุสลิมไทย')) return { gradient: 'from-sky-500 to-blue-700', iconBg: 'bg-sky-50', iconText: 'text-sky-600', badge: 'bg-sky-50 text-sky-600' };
                    if (deptName.includes('สำนักกิจการสตรี')) return { gradient: 'from-pink-500 to-rose-600', iconBg: 'bg-pink-50', iconText: 'text-pink-600', badge: 'bg-pink-50 text-pink-600' };
                    if (deptName.includes('ชูรอ') || deptName.includes('ที่ปรึกษา')) return { gradient: 'from-violet-500 to-purple-700', iconBg: 'bg-violet-50', iconText: 'text-violet-600', badge: 'bg-violet-50 text-violet-600' };
                    return { gradient: 'from-slate-800 to-slate-900', iconBg: 'bg-slate-100', iconText: 'text-slate-600', badge: 'bg-slate-100 text-slate-600' };
                };
                
                const theme = getTheme();

                return (
                    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-6 sm:py-12">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsDetailModalOpen(false)} />
                        <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden sm:max-h-[85vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500 pointer-events-auto custom-scrollbar">
                            {/* Header Image Area */}
                            <div className={cn("h-40 sm:h-48 bg-gradient-to-br relative transition-all duration-700", theme.gradient)}>
                                {/* Abstract pattern overlay */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none">
                                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                                            </pattern>
                                        </defs>
                                        <rect width="100%" height="100%" fill="url(#grid)" />
                                    </svg>
                                </div>

                                <button 
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-all z-20 shadow-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                
                                <div className="absolute -bottom-14 left-8 sm:left-10">
                                    <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-[2rem] bg-white p-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] ring-4 ring-white/10">
                                        <div className="h-full w-full rounded-[1.6rem] bg-slate-50 overflow-hidden flex items-center justify-center">
                                            {selectedMember.photoUrl ? (
                                                <img 
                                                    src={getMediaUrl(selectedMember.photoUrl)} 
                                                    alt={selectedMember.name} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            ) : (
                                                <Users className="w-12 h-12 text-slate-300" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="pt-16 pb-8 sm:pb-10 px-8 sm:px-10">
                                <div className="mb-8">
                                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">{selectedMember.name}</h2>
                                    <div className={cn("inline-flex px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-sm", theme.badge)}>
                                        {selectedMember.position}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Info Cards Grid */}
                                    <div className="grid grid-cols-1 gap-3.5">
                                        {selectedMember.phoneNumber && (
                                            <div className="bg-slate-50/80 p-4 rounded-3xl flex items-center gap-4 group hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all border border-slate-100/50 hover:border-slate-200">
                                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", theme.iconBg, theme.iconText)}>
                                                    <Phone className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">เบอร์โทรศัพท์</p>
                                                    <p className="text-base font-bold text-slate-800 tabular-nums tracking-tight">{selectedMember.phoneNumber}</p>
                                                </div>
                                            </div>
                                        )}

                                        {selectedMember.email && (
                                            <div className="bg-slate-50/80 p-4 rounded-3xl flex items-center gap-4 group hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all border border-slate-100/50 hover:border-slate-200">
                                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", theme.iconBg, theme.iconText)}>
                                                    <Mail className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">อีเมล</p>
                                                    <p className="text-base font-bold text-slate-800 truncate">{selectedMember.email}</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-slate-50/80 p-4 rounded-3xl flex items-center gap-4 group hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all border border-slate-100/50 hover:border-slate-200">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                                                <Briefcase className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">อาชีพปัจจุบัน</p>
                                                <p className="text-base font-bold text-slate-800">{selectedMember.occupation || "—"}</p>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/80 p-4 rounded-3xl flex items-center gap-4 group hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all border border-slate-100/50 hover:border-slate-200">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center shadow-inner">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">หน่วยงานสังกัด</p>
                                                <p className="text-base font-bold text-slate-800">
                                                    {deptName || "—"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-8 sm:px-10 py-6 sm:py-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-center">
                                <button 
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="w-full py-4 bg-white border border-slate-200 rounded-3xl text-sm font-black text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    ปิดหน้าต่าง
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
