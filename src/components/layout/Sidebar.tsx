"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, FileText, FolderKanban, Settings,
    BarChart3, Users, ChevronDown, LogOut, BadgePlus,
    Bell, BookOpen, Star, BookMarked, CalendarDays, Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navGroups = [
    {
        label: 'หลัก',
        items: [
            { name: 'Dashboard', href: '/', icon: LayoutDashboard, permission: 'ACCESS_DASHBOARD' },
            { name: 'งบประมาณ & รายงาน', href: '/budget', icon: BarChart3, permission: 'ACCESS_BUDGET' },
            { name: 'รายรับ-รายจ่าย', href: '/income-expense', icon: Receipt, permission: 'ACCESS_INCOME_EXPENSE' },
        ],
    },
    {
        label: 'การดำเนินงาน',
        items: [
            { name: 'เอกสาร', href: '/documents', icon: FileText, permission: 'ACCESS_DOCUMENTS' },
            { name: 'ทะเบียนเอกสาร', href: '/registry', icon: BookMarked, permission: 'ACCESS_REGISTRY' },
            { name: 'โครงการประจำปี', href: '/annual-projects', icon: CalendarDays, permission: 'ACCESS_ANNUAL_PROJECTS' },
            { name: 'จัดการโครงการ', href: '/projects', icon: FolderKanban, permission: 'ACCESS_PROJECTS' },
        ],
    },
    {
        label: 'ระบบ',
        items: [
            { name: 'ผู้ใช้งาน', href: '/users', icon: Users, permission: 'ACCESS_USERS' },
            { name: 'ตั้งค่า', href: '/settings', icon: Settings, permission: 'ACCESS_SETTINGS' },
        ],
    },
];

import { DEPARTMENTS } from '@/lib/constants';

const departmentBadges = [
    { name: 'สำนักกิจการสตรี สมาคมฯ', color: 'bg-pink-400/10 text-pink-400', dot: 'bg-pink-400', subDepts: DEPARTMENTS.find(d => d.name === 'สำนักกิจการสตรี สมาคมฯ')?.subDepts || [] },
    { name: 'สมาคมพัฒนาเยาวชนมุสลิมไทย', color: 'bg-blue-400/10 text-blue-400', dot: 'bg-blue-400', subDepts: DEPARTMENTS.find(d => d.name === 'สมาคมพัฒนาเยาวชนมุสลิมไทย')?.subDepts || [] },
    { name: 'สำนักอำนวยการ', color: 'bg-amber-400/10 text-amber-400', dot: 'bg-amber-400', subDepts: DEPARTMENTS.find(d => d.name === 'สำนักอำนวยการ')?.subDepts || [] },
    { name: 'ครอบครัวฟิตยะตุลฮัก', color: 'bg-emerald-400/10 text-emerald-400', dot: 'bg-emerald-400', subDepts: DEPARTMENTS.find(d => d.name === 'ครอบครัวฟิตยะตุลฮัก')?.subDepts || [] },
];

import { useSession, signOut } from 'next-auth/react';

export function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [deptExpanded, setDeptExpanded] = useState(false);

    const user = session?.user as any;
    const role = user?.role || 'USER';
    const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
    const isSuperAdmin = role === 'SUPER_ADMIN';

    console.log('--- SIDEBAR DEBUG ---');
    console.log('User Name:', user?.name);
    console.log('User Role:', role);
    console.log('User Permissions:', JSON.stringify(permissions));
    console.log('Is Super Admin:', isSuperAdmin);

    // Filter navigation based on permissions and role
    const filteredGroups = navGroups.map(group => {
        const filteredItems = group.items.filter(item => {
            // Super Admin sees everything
            if (isSuperAdmin) return true;
            
            // Check if user has explicit permission for this item
            const hasPerm = permissions.includes(item.permission);
            console.log(`- Checking item ${item.name}: perm=${item.permission}, hasPerm=${hasPerm}`);
            return hasPerm;
        });
        
        return {
            ...group,
            items: filteredItems
        };
    }).filter(group => group.items.length > 0);

    return (
        <div className="w-64 flex-shrink-0 bg-[#0f172a] h-screen hidden md:flex flex-col">
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
                                        className={cn(
                                            "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                                            isActive
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                                                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                        )}
                                    >
                                        <item.icon className={cn("flex-shrink-0 h-4 w-4", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
                                        <span className="truncate">{item.name}</span>
                                        {item.href === '/documents' && (
                                            <span className="ml-auto text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">4 ใหม่</span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Departments quick-access */}
                <div>
                    <button
                        onClick={() => setDeptExpanded(!deptExpanded)}
                        className="w-full flex items-center gap-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-1.5 hover:text-slate-300 transition-colors"
                    >
                        <BookOpen className="w-3 h-3" />
                        หน่วยงาน / สำนัก
                        <ChevronDown className={cn("w-3 h-3 ml-auto transition-transform", deptExpanded && "rotate-180")} />
                    </button>
                    {deptExpanded && (
                        <div className="space-y-2 pl-2 mt-2">
                            {departmentBadges.map(dept => (
                                <div key={dept.name} className="flex flex-col">
                                    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold cursor-default transition-colors", dept.color)}>
                                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dept.dot)} />
                                        <span className="truncate">{dept.name}</span>
                                    </div>
                                    <div className="pl-6 pt-1 space-y-1 my-1 border-l border-white/10 ml-3">
                                        {dept.subDepts.map((sub: string) => (
                                            <div key={sub} className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer transition-colors py-0.5 truncate">
                                                {sub}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </nav>

            {/* User Profile */}
            <div className="p-3 border-t border-white/5">
                <div 
                    onClick={() => signOut()}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                    title="คลิกเพื่อออกจากระบบ"
                >
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg">
                        {user?.name?.charAt(0) || <Users className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{user?.name || 'ผู้ใช้งาน'}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.department || user?.role || 'Fityatulhak'}</p>
                    </div>
                    <LogOut className="w-4 h-4 text-slate-600 group-hover:text-rose-500 transition-colors flex-shrink-0" />
                </div>
            </div>
        </div>
    );
}
