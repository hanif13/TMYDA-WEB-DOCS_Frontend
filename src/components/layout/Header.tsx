"use client";

import { Bell, Search, Menu, ChevronRight, Users } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

const breadcrumbMap: Record<string, string> = {
    '/': 'Dashboard',
    '/documents': 'สร้างเอกสาร',
    '/projects': 'จัดการโครงการ',
    '/budget': 'งบประมาณ & รายงาน',
    '/users': 'ผู้ใช้งาน',
    '/settings': 'ตั้งค่า',
};

const notifications = [
    { id: 1, text: 'โครงการค่ายฯ รอการอนุมัติ', time: '2 นาทีที่แล้ว', unread: true },
    { id: 2, text: 'เอกสารประกาศรับสมัครถูกสร้างแล้ว', time: '1 ชั่วโมงที่แล้ว', unread: true },
    { id: 3, text: 'งบประมาณสมาคมพัฒนาเยาวชนมุสลิมไทย ใกล้หมด', time: '1 วันที่แล้ว', unread: false },
];

import { useSession } from 'next-auth/react';

export function Header() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [showNotifs, setShowNotifs] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const unreadCount = notifications.filter(n => n.unread).length;
    const pageName = breadcrumbMap[pathname] ?? 'หน้า';
    const user = session?.user as any;

    return (
        <header className="bg-white/90 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-30">
            <div className="flex items-center justify-between h-16 px-6">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Link href="/" className="hover:text-slate-700 transition-colors">หน้าหลัก</Link>
                    {pathname !== '/' && (
                        <>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                            <span className="text-slate-800 font-semibold">{pageName}</span>
                        </>
                    )}
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-2">
                    {/* Search */}
                    {showSearch ? (
                        <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 w-56 transition-all">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                autoFocus
                                onBlur={() => setShowSearch(false)}
                                type="text"
                                placeholder="ค้นหาเอกสาร / โครงการ..."
                                className="bg-transparent text-sm outline-none text-slate-700 placeholder:text-slate-400 w-full"
                            />
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowSearch(true)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <Search className="w-4.5 h-4.5" />
                        </button>
                    )}

                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifs(!showNotifs)}
                            className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <Bell className="w-4.5 h-4.5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                            )}
                        </button>
                        {showNotifs && (
                            <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                                    <p className="font-semibold text-sm text-slate-800">การแจ้งเตือน</p>
                                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{unreadCount} ใหม่</span>
                                </div>
                                <ul className="divide-y divide-slate-50">
                                    {notifications.map(notif => (
                                        <li key={notif.id} className={`px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${notif.unread ? 'bg-blue-50/40' : ''}`}>
                                            <p className={`text-xs font-medium ${notif.unread ? 'text-slate-800' : 'text-slate-500'}`}>{notif.text}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{notif.time}</p>
                                        </li>
                                    ))}
                                </ul>
                                <div className="px-4 py-2.5 border-t border-slate-50">
                                    <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">ดูการแจ้งเตือนทั้งหมด</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User pill */}
                    <div className="flex items-center gap-2 pl-2 ml-2 border-l border-slate-100">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow uppercase">
                            {user?.name?.substring(0, 2) || <Users className="w-4 h-4" />}
                        </div>
                        <div className="hidden lg:flex flex-col">
                            <span className="text-[13px] font-bold text-slate-700 leading-tight">{user?.name || 'ผู้ใช้งาน'}</span>
                            <span className="text-[10px] text-slate-400 leading-tight">{user?.role || 'Fityatulhak'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
