"use client";

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    LayoutDashboard, FileText, FolderKanban, Settings,
    BarChart3, Users, ChevronDown, LogOut, BadgePlus,
    Bell, Star, BookMarked, CalendarDays, Receipt,
    KeyRound, UserCircle, Shield, Wallet, ChevronRight,
    Inbox, Languages, UserPlus, Globe, Newspaper, Megaphone, Building2, GraduationCap, MessagesSquare, HandHeart, UserCheck, FileSignature
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useYear } from '@/context/YearContext';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { hasPermission } from '@/config/permissions';

// Permission-based navigation configuration
const navGroups = [
    {
        label: 'หลัก',
        items: [
            { name: 'Dashboard', href: '/', icon: LayoutDashboard, permission: 'dashboard.view' },
            { name: 'โครงการที่เสร็จสิ้น', href: '/completed-projects', icon: FolderKanban, permission: 'completed_projects.view' },
            { name: 'คณะกรรมการ', href: '/committee', icon: Users, permission: 'committee.view' },
            { name: 'คำทับศัพท์ที่ใช้บ่อย', href: '/transliteration', icon: Languages, permission: 'transliteration.view' },
            { name: 'ปฏิทินกิจกรรม', href: '/calendar', icon: CalendarDays, permission: 'calendar.view' },
        ],
    },
    {
        label: 'กลุ่มงานเลขานุการ',
        items: [
            { name: 'ส่งคำขอเอกสาร', href: '/documents?tab=request', icon: FileText, permission: 'documents.view' },
            { name: 'เอกสารรอพิจารณา', href: '/approvals', icon: FileSignature, permission: 'documents.view' },
            { name: 'ประวัติคำขอเอกสาร', href: '/documents?tab=pending', icon: Inbox, permission: 'documents.view' },
            { name: 'ทะเบียนเอกสาร', href: '/registry', icon: BookMarked, permission: 'registry.view' },
            { name: 'โครงการประจำปี', href: '/annual-projects', icon: CalendarDays, permission: 'annual_projects.view' },
            { name: 'จัดการโครงการ', href: '/projects', icon: FolderKanban, permission: 'projects.view' },
        ],
    },
    {
        label: 'กลุ่มงานการเงินและบัญชี',
        items: [
            { name: 'รายรับ-รายจ่าย', href: '/income-expense', icon: Receipt, permission: 'income_expense.view' },
        ],
    },
    {
        label: 'กลุ่มงานสมาชิก',
        items: [
            { name: 'ข้อมูลสมาชิก', href: '/members', icon: UserPlus, permission: 'members.view' },
        ],
    },
    {
        label: 'จัดการเว็บไซต์หลัก',
        items: [
            { name: 'หน้าแรก & แบนเนอร์', href: '/website/home', icon: Globe, permission: 'website.view' },
            { name: 'ข่าวประชาสัมพันธ์', href: '/website/news', icon: Newspaper, permission: 'website.view' },
            { name: 'คำประกาศ / แถลงการณ์', href: '/website/announcements', icon: Megaphone, permission: 'website.view' },
            { name: 'เกี่ยวกับองค์กร', href: '/website/about', icon: Building2, permission: 'website.view' },
            { name: 'ศูนย์เนื้อหาวิชาการ', href: '/website/knowledge', icon: GraduationCap, permission: 'website.view' },
            { name: 'สมาชิกเว็บไซต์', href: '/website/members', icon: UserCheck, permission: 'site_members.view' },
            { name: 'เว็บบอร์ด', href: '/website/webboard', icon: MessagesSquare, permission: 'website.view' },
            { name: 'บริจาค & นโยบาย', href: '/website/pages', icon: HandHeart, permission: 'website.view' },
        ],
    },
    {
        label: 'ระบบ',
        items: [
            { name: 'ผู้ใช้งาน', href: '/users', icon: Users, permission: 'users.view' },
            { name: 'จัดการปีการทำงาน', href: '/settings/years', icon: CalendarDays, permission: 'settings.view' },
            { name: 'ประวัติการใช้งาน', href: '/activity-logs', icon: LayoutDashboard, permission: 'activity_logs.view' },
        ],
    },
];

// Role display config
const ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    SUPER_ADMIN: { label: 'ผู้ดูแลระบบ', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
    ADMIN: { label: 'ผู้ใช้งาน', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    FINANCE: { label: 'ผู้จัดการการเงิน', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
    VIEWER: { label: 'ผู้ใช้ทั่วไป', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
};

export function Sidebar({ 
    isOpen, 
    onClose,
    isDesktopCollapsed = false
}: { 
    isOpen: boolean; 
    onClose: () => void;
    isDesktopCollapsed?: boolean;
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: session } = useSession();
    const { selectedYear, setSelectedYear, availableYears } = useYear();

    // States for dropdowns
    const [yearSwitcherOpen, setYearSwitcherOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    // Refs for click-outside detection
    const yearSwitcherRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const user = session?.user as any;
    const role = user?.role || 'VIEWER';
    const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.VIEWER;

    const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (label: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };

    useEffect(() => {
        const checkProfile = async () => {
            if (session?.user) {
                try {
                    const { getMyProfile } = await import('@/lib/api');
                    const profile = await getMyProfile();
                    if (!profile.email || !profile.phoneNumber || !profile.facebook || !profile.subDepartment) {
                        setIsProfileIncomplete(true);
                    }
                } catch (err) {
                    // Fail silently
                }
            }
        };
        checkProfile();
    }, [session]);

    // 1. Close dropdowns when navigating to a new page
    useEffect(() => {
        setYearSwitcherOpen(false);
        setProfileOpen(false);
    }, [pathname]);

    // 2. Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (yearSwitcherRef.current && !yearSwitcherRef.current.contains(event.target as Node)) {
                setYearSwitcherOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setProfileOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter navigation based on permissions
    const userPermissions = user?.permissions || [];
    const filteredGroups = navGroups.map(group => {
        const filteredItems = group.items.filter(item => {
            // SUPER_ADMIN bypasses all checks
            if (role === 'SUPER_ADMIN') return true;
            return hasPermission(userPermissions, item.permission);
        });

        return {
            ...group,
            items: filteredItems
        };
    }).filter(group => group.items.length > 0);

    return (
        <>
            {/* Backdrop for mobile */}
            <div
                className={cn(
                    "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar drawer */}
            <div className={cn(
                "fixed inset-y-0 left-0 bg-[#0f172a] h-full h-[100dvh] md:h-screen flex flex-col z-50 transition-all duration-300 md:relative md:translate-x-0 overflow-hidden whitespace-nowrap",
                isOpen ? "translate-x-0" : "-translate-x-full",
                isDesktopCollapsed ? "w-64 md:w-0 md:opacity-0" : "w-64 md:opacity-100"
            )}>
                {/* Logo */}
                <div className="h-20 flex items-center px-5 border-b border-white/5">
                    <div className="flex items-center gap-0.5">
                        <div className="h-17 w-17 flex items-center justify-center overflow-hidden flex-shrink-0">
                            <img src="/favicon.ico" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-white tracking-wide leading-tight truncate">สมาคมพัฒนาเยาวชนมุสลิมไทย</p>
                            <p className="text-[10px] text-slate-400 leading-tight">Secretariat Office</p>
                        </div>
                    </div>
                </div>
                {/* Year Switcher */}
                <div className="px-3 py-4 border-b border-white/5 bg-white/5 shadow-inner">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-2">ปีการทำงานปัจจุบัน</p>
                    <div className="relative" ref={yearSwitcherRef}>
                        <button
                            onClick={() => setYearSwitcherOpen(!yearSwitcherOpen)}
                            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white hover:border-blue-500/50 transition-all duration-300 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                    <CalendarDays className="w-4 h-4 text-blue-400" />
                                </div>
                                <span className="text-xl font-black tracking-tight">{selectedYear || '—'}</span>
                            </div>
                            <ChevronDown className={cn("w-4 h-4 text-slate-600 transition-transform duration-300", yearSwitcherOpen && "rotate-180")} />
                        </button>

                        {yearSwitcherOpen && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                {availableYears.map(year => (
                                    <button
                                        key={year}
                                        onClick={() => {
                                            setSelectedYear(year);
                                            setYearSwitcherOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-all",
                                            selectedYear === year
                                                ? "bg-blue-600 text-white"
                                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <span>พ.ศ. {year}</span>
                                        {selectedYear === year && <Star className="w-3 h-3 fill-white" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
                    {filteredGroups.map((group) => (
                        <div key={group.label}>
                            <button 
                                onClick={() => toggleGroup(group.label)}
                                className="w-full flex items-center justify-between px-3 mb-1.5 group"
                            >
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest transition-colors group-hover:text-slate-400">
                                    {group.label}
                                </p>
                                <ChevronDown 
                                    className={cn(
                                        "w-3.5 h-3.5 text-slate-600 transition-transform duration-200",
                                        collapsedGroups[group.label] ? "rotate-180" : ""
                                    )} 
                                />
                            </button>
                            
                            <div className={cn(
                                "space-y-0.5 overflow-hidden transition-all duration-300",
                                collapsedGroups[group.label] ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
                            )}>
                                {group.items.map((item) => {
                                    const fullCurrentPath = pathname + (searchParams.toString() ? ('?' + searchParams.toString()) : '');
                                    const isActive = item.href.includes('?') 
                                        ? fullCurrentPath === item.href 
                                        : pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => {
                                                if (window.innerWidth < 768) onClose();
                                            }}
                                            className={cn(
                                                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                                                isActive
                                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                                                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                            )}
                                        >
                                            <item.icon className={cn("flex-shrink-0 h-4 w-4", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
                                            <span className="truncate">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                </nav>

                {/* User Profile */}
                <div className="p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] border-t border-white/5">
                    {/* Role Badge */}
                    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2", roleConfig.bgColor)}>
                        <Shield className={cn("w-3.5 h-3.5", roleConfig.color)} />
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", roleConfig.color)}>{roleConfig.label}</span>
                    </div>

                    {/* Profile Menu */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg relative">
                                {user?.name?.charAt(0) || <Users className="w-4 h-4" />}
                                {isProfileIncomplete && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 border-2 border-[#0f172a] rounded-full animate-pulse" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-semibold text-slate-200 truncate">{user?.name || 'ผู้ใช้งาน'}</p>
                                <p className="text-[10px] text-slate-500 truncate">@{user?.username || 'user'}</p>
                            </div>
                            <ChevronRight className={cn("w-4 h-4 text-slate-600 transition-transform duration-200", profileOpen && "-rotate-90")} />
                        </button>

                        {/* Profile Dropdown */}
                        {profileOpen && (
                            <div className="absolute bottom-full left-0 w-full mb-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="p-1.5">
                                    <button
                                        onClick={() => {
                                            setProfileOpen(false);
                                            router.push('/profile');
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                                    >
                                        <UserCircle className="w-4 h-4 text-slate-500" />
                                        <div className="flex-1 flex items-center justify-between">
                                            <span className="font-medium">ดูโปรไฟล์</span>
                                            {isProfileIncomplete && (
                                                <span className="text-[9px] font-black bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">ไม่ครบถ้วน</span>
                                            )}
                                        </div>
                                    </button>
                                    <div className="h-px bg-white/5 my-1" />
                                    <button
                                        onClick={() => signOut()}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span className="font-medium">ออกจากระบบ</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
