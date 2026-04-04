"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard, FileText, FolderKanban, Settings,
    BarChart3, Users, ChevronDown, LogOut, BadgePlus,
    Bell, Star, BookMarked, CalendarDays, Receipt,
    KeyRound, UserCircle, Shield, Wallet, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useYear } from '@/context/YearContext';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';

// Role-based navigation configuration
const navGroups = [
    {
        label: 'หลัก',
        items: [
            { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'VIEWER'] },
            { name: 'โครงการที่เสร็จสิ้น', href: '/completed-projects', icon: FolderKanban, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'VIEWER'] },
            { name: 'คณะกรรมการ', href: '/committee', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'VIEWER'] },
        ],
    },
    {
        label: 'การดำเนินงาน',
        items: [
            { name: 'เอกสาร', href: '/documents', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'VIEWER'] },
            { name: 'ทะเบียนเอกสาร', href: '/registry', icon: BookMarked, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'VIEWER'] },
            { name: 'รายรับ-รายจ่าย', href: '/income-expense', icon: Receipt, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE'] },
            { name: 'โครงการประจำปี', href: '/annual-projects', icon: CalendarDays, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'VIEWER'] },
            { name: 'จัดการโครงการ', href: '/projects', icon: FolderKanban, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'VIEWER'] },
        ],
    },
    {
        label: 'ระบบ',
        items: [
            { name: 'ผู้ใช้งาน', href: '/users', icon: Users, roles: ['SUPER_ADMIN'] },
            { name: 'จัดการปีการทำงาน', href: '/settings/years', icon: CalendarDays, roles: ['SUPER_ADMIN'] },
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

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const pathname = usePathname();
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

    // Filter navigation based on role
    const filteredGroups = navGroups.map(group => {
        const filteredItems = group.items.filter(item => {
            return item.roles.includes(role);
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
                "fixed inset-y-0 left-0 w-64 bg-[#0f172a] h-screen flex flex-col z-50 transition-transform duration-300 md:relative md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
            {/* Logo */}
            <div className="h-16 flex items-center px-5 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40">
                        <Star className="w-4 h-4 text-white fill-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white tracking-wide leading-tight">ฟิตยะตุลฮัก</p>
                        <p className="text-[10px] text-slate-400 leading-tight">Document Portal</p>
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
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
                            {group.label}
                        </p>
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href ||
                                    (pathname.startsWith(item.href) && item.href !== '/');
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
            <div className="p-3 border-t border-white/5">
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
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg">
                            {user?.name?.charAt(0) || <Users className="w-4 h-4" />}
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
                                    <span className="font-medium">ดูโปรไฟล์</span>
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
