"use client";

import { useYear } from "@/context/YearContext";
import { YearSelection } from "@/components/YearSelection";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Loader } from "lucide-react";
import { useEffect } from "react";

export function WorkingYearGuard({ children }: { children: React.ReactNode }) {
    const { selectedYear, isLoading } = useYear();
    const { data: session, status } = useSession();
    const router = useRouter();

    const pathname = usePathname();

    // Force redirect to login if unauthenticated
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    if (status === "loading" || isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-sm font-bold text-slate-500 animate-pulse">กำลังเตรียมข้อมูล...</p>
                </div>
            </div>
        );
    }

    // Always allow access to settings/years so users can add a new year if none exist
    if (pathname === '/settings/years') {
        return <>{children}</>;
    }

    // Only guard if logged in and no year selected
    if (status === "authenticated" && !selectedYear) {
        return <YearSelection />;
    }

    return <>{children}</>;
}
