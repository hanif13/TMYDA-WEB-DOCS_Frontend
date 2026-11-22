"use client";

import { Menu, ChevronRight, Users } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

const breadcrumbMap: Record<string, string> = {
    '/': 'Dashboard',
    '/documents': 'สร้างเอกสาร',
    '/projects': 'จัดการโครงการ',
    '/budget': 'งบประมาณ & รายงาน',
    '/users': 'ผู้ใช้งาน',
    '/registry': 'ทะเบียนเอกสาร',
    '/settings': 'ตั้งค่า',
    '/approvals': 'เอกสารรอพิจารณา',
    '/media-review/calendar': 'ปฏิทินโพสต์',
    '/media-review': 'ตรวจงานสื่อประชาสัมพันธ์',
    '/website/home': 'เว็บไซต์หลัก · หน้าแรก & แบนเนอร์',
    '/website/mailings': 'กลุ่มงานสมาชิก · ส่งอีเมลถึงสมาชิก',
    '/website/news': 'เว็บไซต์หลัก · ประชาสัมพันธ์ & เนื้อหาศาสนา',
    '/website/announcements': 'เว็บไซต์หลัก · คำประกาศ / แถลงการณ์',
    '/website/about': 'เว็บไซต์หลัก · เกี่ยวกับองค์กร',
    '/website/knowledge': 'เว็บไซต์หลัก · ศูนย์เนื้อหาศาสนา',
    '/website/webboard': 'เว็บไซต์หลัก · เว็บบอร์ด',
    '/website/members': 'กลุ่มงานสมาชิก · บัญชีเว็บ & เงื่อนไขการสมัคร',
    '/website/pages': 'เว็บไซต์หลัก · บริจาค & นโยบาย',
};

export function Header({ 
    onMobileMenuToggle, 
    onDesktopMenuToggle 
}: { 
    onMobileMenuToggle: () => void;
    onDesktopMenuToggle: () => void;
}) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const pageName = breadcrumbMap[pathname] ?? 'หน้าหลัก';
    const user = session?.user as any;

    return (
        <header className="bg-white/90 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-30">
            <div className="flex items-center justify-between h-16 px-4 md:px-6">
                {/* Mobile Menu Toggle & Breadcrumbs */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onMobileMenuToggle}
                        className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-lg md:hidden transition-colors"
                        aria-label="Toggle Mobile Menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <button
                        onClick={onDesktopMenuToggle}
                        className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-lg hidden md:block transition-colors"
                        aria-label="Toggle Desktop Menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    
                    <div className="flex items-center gap-1.5 text-xs md:text-sm text-slate-500">
                        <Link href="/" className="hover:text-slate-700 transition-colors hidden sm:inline">หน้าหลัก</Link>
                        {pathname !== '/' && (
                            <>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
                                <span className="text-slate-800 font-semibold truncate max-w-[120px] md:max-w-none">{pageName}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-2">
                    {/* User pill */}
                    <div className="flex items-center gap-2 pl-2 ml-2 border-l border-slate-50">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow uppercase">
                            {user?.name?.substring(0, 2) || <Users className="w-4 h-4" />}
                        </div>
                        <div className="hidden lg:flex flex-col">
                            <span className="text-[13px] font-bold text-slate-700 leading-tight">{user?.name || 'ผู้ใช้งาน'}</span>
                            <span className="text-[10px] text-slate-400 leading-tight">
                                {user?.role === 'SUPER_ADMIN' ? 'ผู้ดูแลระบบ' : 
                                 user?.role === 'ADMIN' ? 'ผู้ใช้งาน' :
                                 user?.role === 'FINANCE' ? 'ผู้จัดการการเงิน' : 'ผู้ใช้ทั่วไป'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
