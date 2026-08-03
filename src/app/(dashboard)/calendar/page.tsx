"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
    CalendarDays, ChevronLeft, ChevronRight, Plus, X, MapPin,
    Building2, Clock, Loader, Trash2, Edit3, Eye, Filter, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchEvents, createEvent, updateEvent, deleteEvent, fetchDepartments } from "@/lib/api";
import { toast } from "react-hot-toast";
import { useYear } from "@/context/YearContext";
import { useSession } from "next-auth/react";

type ViewMode = "month" | "week" | "day";

interface CalendarEvent {
    id: string;
    title: string;
    departmentId: string;
    date: string;
    endDate?: string;
    location?: string;
    description?: string;
    color?: string;
    thaiYear: number;
    department?: { id: string; name: string; theme?: string };
}

const DEPT_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    default: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
};

const COLOR_PALETTE = [
    { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
    { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
    { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", dot: "bg-pink-500" },
    { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
    { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", dot: "bg-cyan-500" },
    { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
    { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
];

const THAI_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const THAI_DAYS_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const THAI_MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function getDeptColor(deptId: string, allDepts: any[]) {
    const idx = allDepts.findIndex(d => d.id === deptId);
    if (idx < 0) return COLOR_PALETTE[0];
    return COLOR_PALETTE[idx % COLOR_PALETTE.length];
}

function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function isSameDay(d1: Date, d2: Date) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function getMonthDays(year: number, month: number) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    // Pad start to fill weeks
    const startPad = firstDay.getDay();
    for (let i = startPad - 1; i >= 0; i--) {
        days.push(new Date(year, month, -i));
    }
    // Days of month
    for (let d = 1; d <= lastDay.getDate(); d++) {
        days.push(new Date(year, month, d));
    }
    // Pad end
    while (days.length % 7 !== 0) {
        days.push(new Date(year, month + 1, days.length - startPad - lastDay.getDate() + 1));
    }
    return days;
}

function getWeekDays(date: Date) {
    const day = date.getDay();
    const start = new Date(date);
    start.setDate(date.getDate() - day);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
    }
    return days;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || "VIEWER";
    const canEdit = userRole === "SUPER_ADMIN" || userRole === "ADMIN";

    const { selectedYear } = useYear();
    const [viewMode, setViewMode] = useState<ViewMode>("month");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDept, setFilterDept] = useState("all");

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        departmentId: "",
        date: "",
        time: "09:00",
        endDate: "",
        endTime: "10:00",
        location: "",
        description: "",
    });
    const [saving, setSaving] = useState(false);

    const loadData = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        try {
            const [evts, depts] = await Promise.all([
                fetchEvents({ year: selectedYear }),
                fetchDepartments("all"),
            ]);
            setEvents(evts);
            const filteredDepts = depts.filter((d: any) => d.name !== "ทุกหน่วยงาน");
            setDepartments(filteredDepts);
        } catch (err) {
            console.error("Failed to load calendar data:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedYear]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filtered events
    const filteredEvents = useMemo(() => {
        if (filterDept === "all") return events;
        return events.filter(e => e.departmentId === filterDept);
    }, [events, filterDept]);

    // Navigation
    const navigate = (direction: number) => {
        const d = new Date(currentDate);
        if (viewMode === "month") d.setMonth(d.getMonth() + direction);
        else if (viewMode === "week") d.setDate(d.getDate() + direction * 7);
        else d.setDate(d.getDate() + direction);
        setCurrentDate(d);
    };

    const goToToday = () => setCurrentDate(new Date());

    // Title for navigation
    const navTitle = useMemo(() => {
        if (viewMode === "month") {
            return `${THAI_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear() + 543}`;
        }
        if (viewMode === "week") {
            const week = getWeekDays(currentDate);
            const s = week[0];
            const e = week[6];
            if (s.getMonth() === e.getMonth()) {
                return `${s.getDate()} - ${e.getDate()} ${THAI_MONTHS[s.getMonth()]} ${s.getFullYear() + 543}`;
            }
            return `${s.getDate()} ${THAI_MONTHS[s.getMonth()].slice(0, 3)} - ${e.getDate()} ${THAI_MONTHS[e.getMonth()].slice(0, 3)} ${e.getFullYear() + 543}`;
        }
        return `${currentDate.getDate()} ${THAI_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear() + 543}`;
    }, [currentDate, viewMode]);

    // Events for a specific day
    const eventsForDay = useCallback((day: Date) => {
        return filteredEvents.filter(e => {
            const eventDate = new Date(e.date);
            return isSameDay(eventDate, day);
        });
    }, [filteredEvents]);

    // Modal handlers
    const openCreateModal = (date?: Date) => {
        const d = date || new Date();
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        setFormData({
            title: "",
            departmentId: departments.length > 0 ? departments[0].id : "",
            date: dateStr,
            time: "09:00",
            endDate: dateStr,
            endTime: "10:00",
            location: "",
            description: "",
        });
        setEditingEvent(null);
        setShowModal(true);
    };

    const openEditModal = (event: CalendarEvent) => {
        const d = new Date(event.date);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

        let endDateStr = dateStr;
        let endTimeStr = "10:00";
        if (event.endDate) {
            const ed = new Date(event.endDate);
            endDateStr = `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, "0")}-${String(ed.getDate()).padStart(2, "0")}`;
            endTimeStr = `${String(ed.getHours()).padStart(2, "0")}:${String(ed.getMinutes()).padStart(2, "0")}`;
        }

        setFormData({
            title: event.title,
            departmentId: event.departmentId,
            date: dateStr,
            time: timeStr,
            endDate: endDateStr,
            endTime: endTimeStr,
            location: event.location || "",
            description: event.description || "",
        });
        setEditingEvent(event);
        setViewingEvent(null);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.departmentId || !formData.date) {
            toast.error("กรุณากรอกชื่อกิจกรรม, หน่วยงาน และวันที่");
            return;
        }

        setSaving(true);
        try {
            const dateTime = `${formData.date}T${formData.time}:00`;
            const endDateTime = formData.endDate ? `${formData.endDate}T${formData.endTime}:00` : undefined;

            if (editingEvent) {
                await updateEvent(editingEvent.id, {
                    title: formData.title,
                    departmentId: formData.departmentId,
                    date: dateTime,
                    endDate: endDateTime,
                    location: formData.location || undefined,
                    description: formData.description || undefined,
                });
                toast.success("แก้ไขกิจกรรมเรียบร้อย");
            } else {
                await createEvent({
                    title: formData.title,
                    departmentId: formData.departmentId,
                    date: dateTime,
                    endDate: endDateTime,
                    location: formData.location || undefined,
                    description: formData.description || undefined,
                    thaiYear: selectedYear || undefined,
                });
                toast.success("เพิ่มกิจกรรมเรียบร้อย");
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (event: CalendarEvent) => {
        if (!confirm(`ลบกิจกรรม "${event.title}" ?`)) return;
        try {
            await deleteEvent(event.id);
            toast.success("ลบกิจกรรมเรียบร้อย");
            setViewingEvent(null);
            loadData();
        } catch {
            toast.error("เกิดข้อผิดพลาดในการลบ");
        }
    };

    const today = new Date();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-sm font-bold text-slate-500 animate-pulse">กำลังโหลดปฏิทิน...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                            <CalendarDays className="w-5 h-5 text-white" />
                        </div>
                        ปฏิทินกิจกรรม
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">จัดการและดูกิจกรรมทั้งหมดของหน่วยงาน</p>
                </div>
                {canEdit && (
                    <button
                        onClick={() => openCreateModal()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] transition-all duration-200"
                    >
                        <Plus className="w-4 h-4" />
                        เพิ่มกิจกรรม
                    </button>
                )}
            </div>

            {/* Controls Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* View mode toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                        {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                                    viewMode === mode
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {mode === "month" ? "เดือน" : mode === "week" ? "สัปดาห์" : "วัน"}
                            </button>
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <button
                            onClick={goToToday}
                            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
                        >
                            วันนี้
                        </button>
                        <h2 className="text-lg font-bold text-slate-800 min-w-[200px] text-center">
                            {navTitle}
                        </h2>
                        <button
                            onClick={() => navigate(1)}
                            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>

                    {/* Department filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={filterDept}
                            onChange={e => setFilterDept(e.target.value)}
                            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        >
                            <option value="all">ทุกหน่วยงาน</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                {viewMode === "month" && (
                    <MonthView
                        currentDate={currentDate}
                        events={filteredEvents}
                        departments={departments}
                        today={today}
                        canEdit={canEdit}
                        onClickDay={(d) => canEdit && openCreateModal(d)}
                        onClickEvent={(e) => setViewingEvent(e)}
                    />
                )}
                {viewMode === "week" && (
                    <WeekView
                        currentDate={currentDate}
                        events={filteredEvents}
                        departments={departments}
                        today={today}
                        canEdit={canEdit}
                        onClickHour={(d) => canEdit && openCreateModal(d)}
                        onClickEvent={(e) => setViewingEvent(e)}
                    />
                )}
                {viewMode === "day" && (
                    <DayView
                        currentDate={currentDate}
                        events={filteredEvents}
                        departments={departments}
                        today={today}
                        canEdit={canEdit}
                        onClickHour={(d) => canEdit && openCreateModal(d)}
                        onClickEvent={(e) => setViewingEvent(e)}
                    />
                )}
            </div>

            {/* Department Legend */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">หน่วยงาน</p>
                <div className="flex flex-wrap gap-3">
                    {departments.map((d, idx) => {
                        const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];
                        return (
                            <button
                                key={d.id}
                                onClick={() => setFilterDept(filterDept === d.id ? "all" : d.id)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                                    filterDept === d.id
                                        ? `${color.bg} ${color.text} ${color.border}`
                                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                )}
                            >
                                <span className={cn("w-2.5 h-2.5 rounded-full", color.dot)} />
                                {d.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* View Event Modal */}
            {viewingEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setViewingEvent(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200" onClick={e => e.stopPropagation()}>
                        {/* Header bar with department color */}
                        {(() => {
                            const color = getDeptColor(viewingEvent.departmentId, departments);
                            return <div className={cn("h-2", color.dot)} />;
                        })()}
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <h3 className="text-xl font-bold text-slate-800">{viewingEvent.title}</h3>
                                <button onClick={() => setViewingEvent(null)} className="p-1 rounded-lg hover:bg-slate-100">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <CalendarDays className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    <span>{formatDate(viewingEvent.date)}</span>
                                    <span className="text-slate-400">|</span>
                                    <span>{formatTime(viewingEvent.date)}</span>
                                    {viewingEvent.endDate && (
                                        <>
                                            <span className="text-slate-400">→</span>
                                            <span>{formatTime(viewingEvent.endDate)}</span>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    <span>{viewingEvent.department?.name || "ไม่ระบุ"}</span>
                                </div>
                                {viewingEvent.location && (
                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        <span>{viewingEvent.location}</span>
                                    </div>
                                )}
                                {viewingEvent.description && (
                                    <div className="mt-4 p-3 bg-slate-50 rounded-xl text-sm text-slate-600">
                                        {viewingEvent.description}
                                    </div>
                                )}
                            </div>

                            {canEdit && (
                                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => openEditModal(viewingEvent)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        แก้ไข
                                    </button>
                                    <button
                                        onClick={() => handleDelete(viewingEvent)}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-sm font-semibold hover:bg-rose-100 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        ลบ
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 fade-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-slate-800">
                                    {editingEvent ? "แก้ไขกิจกรรม" : "เพิ่มกิจกรรมใหม่"}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">ชื่อกิจกรรม *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                        placeholder="เช่น ประชุมคณะกรรมการ"
                                    />
                                </div>

                                {/* Department */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">หน่วยงานที่จัด *</label>
                                    <select
                                        value={formData.departmentId}
                                        onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                                    >
                                        <option value="">เลือกหน่วยงาน</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date + Time row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">วันที่เริ่ม *</label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">เวลาเริ่ม</label>
                                        <input
                                            type="time"
                                            value={formData.time}
                                            onChange={e => setFormData({ ...formData, time: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* End Date + Time row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">วันที่สิ้นสุด</label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">เวลาสิ้นสุด</label>
                                        <input
                                            type="time"
                                            value={formData.endTime}
                                            onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">สถานที่</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                        placeholder="เช่น ห้องประชุมชั้น 2"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">รายละเอียด</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none"
                                        rows={3}
                                        placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 transition-all"
                                >
                                    {saving ? <Loader className="w-4 h-4 animate-spin" /> : null}
                                    {editingEvent ? "บันทึก" : "เพิ่มกิจกรรม"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ================================================================
// MONTH VIEW
// ================================================================
function MonthView({
    currentDate, events, departments, today, canEdit, onClickDay, onClickEvent
}: {
    currentDate: Date; events: CalendarEvent[]; departments: any[]; today: Date;
    canEdit: boolean; onClickDay: (d: Date) => void; onClickEvent: (e: CalendarEvent) => void;
}) {
    const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());

    const eventsForDay = (day: Date) =>
        events.filter(e => isSameDay(new Date(e.date), day));

    return (
        <div>
            {/* Header row */}
            <div className="grid grid-cols-7 border-b border-slate-200">
                {THAI_DAYS.map((d, i) => (
                    <div key={d} className={cn(
                        "py-3 text-center text-xs font-bold uppercase tracking-wider",
                        i === 0 ? "text-rose-400" : "text-slate-400"
                    )}>
                        {d}
                    </div>
                ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7">
                {days.map((day, idx) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = isSameDay(day, today);
                    const dayEvents = eventsForDay(day);
                    return (
                        <div
                            key={idx}
                            onClick={() => canEdit && onClickDay(day)}
                            className={cn(
                                "min-h-[100px] md:min-h-[120px] border-b border-r border-slate-100 p-1.5 transition-colors",
                                !isCurrentMonth && "bg-slate-50/50",
                                canEdit && "cursor-pointer hover:bg-blue-50/50",
                            )}
                        >
                            <div className={cn(
                                "text-sm font-semibold mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                                isToday ? "bg-blue-600 text-white" : isCurrentMonth ? "text-slate-700" : "text-slate-300"
                            )}>
                                {day.getDate()}
                            </div>
                            <div className="space-y-0.5">
                                {dayEvents.slice(0, 3).map(evt => {
                                    const color = getDeptColor(evt.departmentId, departments);
                                    return (
                                        <button
                                            key={evt.id}
                                            onClick={(e) => { e.stopPropagation(); onClickEvent(evt); }}
                                            className={cn(
                                                "w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate border transition-all hover:shadow-sm",
                                                color.bg, color.text, color.border
                                            )}
                                        >
                                            <span className="hidden sm:inline">{formatTime(evt.date)} </span>
                                            {evt.title}
                                        </button>
                                    );
                                })}
                                {dayEvents.length > 3 && (
                                    <p className="text-[10px] text-slate-400 font-semibold px-1">+{dayEvents.length - 3} เพิ่มเติม</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ================================================================
// WEEK VIEW
// ================================================================
function WeekView({
    currentDate, events, departments, today, canEdit, onClickHour, onClickEvent
}: {
    currentDate: Date; events: CalendarEvent[]; departments: any[]; today: Date;
    canEdit: boolean; onClickHour: (d: Date) => void; onClickEvent: (e: CalendarEvent) => void;
}) {
    const weekDays = getWeekDays(currentDate);

    const eventsForDayHour = (day: Date, hour: number) =>
        events.filter(e => {
            const d = new Date(e.date);
            return isSameDay(d, day) && d.getHours() === hour;
        });

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[700px]">
                {/* Header */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200">
                    <div className="py-3" />
                    {weekDays.map((d, i) => {
                        const isToday = isSameDay(d, today);
                        return (
                            <div key={i} className="py-3 text-center border-l border-slate-100">
                                <p className={cn("text-xs font-semibold", i === 0 ? "text-rose-400" : "text-slate-400")}>
                                    {THAI_DAYS_FULL[d.getDay()]}
                                </p>
                                <p className={cn(
                                    "text-lg font-bold mt-0.5 w-9 h-9 flex items-center justify-center rounded-full mx-auto",
                                    isToday ? "bg-blue-600 text-white" : "text-slate-700"
                                )}>
                                    {d.getDate()}
                                </p>
                            </div>
                        );
                    })}
                </div>
                {/* Time slots */}
                <div className="max-h-[600px] overflow-y-auto">
                    {HOURS.map(hour => (
                        <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-50">
                            <div className="py-3 text-right pr-2 text-xs text-slate-400 font-medium">
                                {String(hour).padStart(2, "0")}:00
                            </div>
                            {weekDays.map((day, di) => {
                                const hourEvents = eventsForDayHour(day, hour);
                                return (
                                    <div
                                        key={di}
                                        onClick={() => {
                                            const d = new Date(day);
                                            d.setHours(hour);
                                            onClickHour(d);
                                        }}
                                        className={cn(
                                            "min-h-[48px] border-l border-slate-100 p-0.5 transition-colors",
                                            canEdit && "cursor-pointer hover:bg-blue-50/50"
                                        )}
                                    >
                                        {hourEvents.map(evt => {
                                            const color = getDeptColor(evt.departmentId, departments);
                                            return (
                                                <button
                                                    key={evt.id}
                                                    onClick={(e) => { e.stopPropagation(); onClickEvent(evt); }}
                                                    className={cn(
                                                        "w-full text-left px-2 py-1 rounded-lg text-[11px] font-medium border transition-all hover:shadow-sm mb-0.5",
                                                        color.bg, color.text, color.border
                                                    )}
                                                >
                                                    <p className="truncate font-bold">{evt.title}</p>
                                                    <p className="truncate opacity-70">{formatTime(evt.date)}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ================================================================
// DAY VIEW
// ================================================================
function DayView({
    currentDate, events, departments, today, canEdit, onClickHour, onClickEvent
}: {
    currentDate: Date; events: CalendarEvent[]; departments: any[]; today: Date;
    canEdit: boolean; onClickHour: (d: Date) => void; onClickEvent: (e: CalendarEvent) => void;
}) {
    const isToday = isSameDay(currentDate, today);

    const eventsForHour = (hour: number) =>
        events.filter(e => {
            const d = new Date(e.date);
            return isSameDay(d, currentDate) && d.getHours() === hour;
        });

    return (
        <div>
            {/* Day header */}
            <div className="py-4 px-6 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-14 h-14 rounded-2xl flex flex-col items-center justify-center",
                        isToday ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                    )}>
                        <span className="text-[10px] font-bold uppercase">{THAI_DAYS_FULL[currentDate.getDay()]}</span>
                        <span className="text-xl font-black leading-none">{currentDate.getDate()}</span>
                    </div>
                    <div>
                        <p className="text-lg font-bold text-slate-800">
                            {THAI_MONTHS[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
                        </p>
                        <p className="text-sm text-slate-500">
                            {events.filter(e => isSameDay(new Date(e.date), currentDate)).length} กิจกรรม
                        </p>
                    </div>
                </div>
            </div>

            {/* Hourly slots */}
            <div className="max-h-[600px] overflow-y-auto">
                {HOURS.map(hour => {
                    const hourEvents = eventsForHour(hour);
                    const isNowHour = isToday && new Date().getHours() === hour;
                    return (
                        <div
                            key={hour}
                            onClick={() => {
                                const d = new Date(currentDate);
                                d.setHours(hour);
                                onClickHour(d);
                            }}
                            className={cn(
                                "flex border-b border-slate-50 min-h-[56px] transition-colors",
                                isNowHour && "bg-blue-50/30",
                                canEdit && "cursor-pointer hover:bg-blue-50/50"
                            )}
                        >
                            <div className={cn(
                                "w-[70px] py-3 text-right pr-3 text-sm font-medium flex-shrink-0",
                                isNowHour ? "text-blue-600 font-bold" : "text-slate-400"
                            )}>
                                {String(hour).padStart(2, "0")}:00
                            </div>
                            <div className="flex-1 border-l border-slate-100 p-1 space-y-1">
                                {hourEvents.map(evt => {
                                    const color = getDeptColor(evt.departmentId, departments);
                                    return (
                                        <button
                                            key={evt.id}
                                            onClick={(e) => { e.stopPropagation(); onClickEvent(evt); }}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-xl border transition-all hover:shadow-md flex items-center gap-3",
                                                color.bg, color.text, color.border
                                            )}
                                        >
                                            <span className={cn("w-2 h-8 rounded-full flex-shrink-0", color.dot)} />
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm truncate">{evt.title}</p>
                                                <p className="text-xs opacity-70 flex items-center gap-1.5 mt-0.5">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTime(evt.date)}
                                                    {evt.endDate && ` → ${formatTime(evt.endDate)}`}
                                                    {evt.location && (
                                                        <>
                                                            <span className="opacity-50">•</span>
                                                            <MapPin className="w-3 h-3" />
                                                            {evt.location}
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
