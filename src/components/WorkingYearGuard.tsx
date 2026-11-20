"use client";

import { useYear } from "@/context/YearContext";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarX2, Eye, Loader, LogOut } from "lucide-react";
import { useEffect } from "react";

export function WorkingYearGuard({ children }: { children: React.ReactNode }) {
    const { selectedYear, isLoading, hasLoadError, availableYears, yearAccess } = useYear();
    const { data: session, status } = useSession();
    const router = useRouter();

    const pathname = usePathname();

    // Force redirect to login if unauthenticated (only if not already on login page)
    useEffect(() => {
        if (status === "unauthenticated" && pathname !== "/login") {
            router.push("/login");
        }
    }, [status, router, pathname]);

    // If authenticated but API load failed, force sign out 
    // (likely expired backend token that apiFetch already handled)
    useEffect(() => {
        if (status === "authenticated" && hasLoadError) {
            signOut({ callbackUrl: "/login" });
        }
    }, [status, hasLoadError]);

    // (status is also "loading" while the session is being refreshed — keep the page mounted then)
    if ((status === "loading" && !session) || isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-sm font-bold text-slate-500 animate-pulse">กำลังเตรียมข้อมูล...</p>
                </div>
            </div>
        );
    }

    // Signed in, but no working year has been granted to this account
    if (status === "authenticated" && !hasLoadError && availableYears.length === 0) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
                    <CalendarX2 className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-slate-800">ยังไม่มีปีการทำงานสำหรับบัญชีนี้</h1>
                    <p className="text-sm text-slate-500 mt-2">ผู้ดูแลระบบยังไม่ได้เพิ่มคุณเข้าปีการทำงานใด หรือปีที่คุณเคยทำงานถูกนำออกแล้ว กรุณาติดต่อผู้ดูแลระบบ</p>
                    <button onClick={() => signOut({ callbackUrl: "/login" })} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900">
                        <LogOut className="w-4 h-4" />ออกจากระบบ
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {yearAccess === "view" && selectedYear && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-semibold shadow-lg pointer-events-none">
                    <Eye className="w-4 h-4" />ปี {selectedYear} ดูได้อย่างเดียว
                </div>
            )}
            {children}
        </>
    );
}
