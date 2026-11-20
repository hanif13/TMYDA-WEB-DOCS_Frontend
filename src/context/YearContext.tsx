"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { fetchAnnualYears, getMyProfile } from "@/lib/api";
import { useSession, signOut } from "next-auth/react";
import toast from "react-hot-toast";

interface YearContextType {
    selectedYear: number | null;
    setSelectedYear: (year: number) => void;
    availableYears: number[];
    plans: any[];
    isLoading: boolean;
    hasLoadError: boolean;
    refreshYears: () => Promise<void>;
    /** "edit" or "view" (view = read-only year for this user) */
    yearAccess: "edit" | "view" | null;
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export function YearProvider({ children }: { children: ReactNode }) {
    const { status, update } = useSession();
    const [yearAccess, setYearAccess] = useState<"edit" | "view" | null>(null);
    // Rights of the working year loaded into the session (role/permissions are per year)
    const [accessYear, setAccessYear] = useState<number | null>(null);
    // update() briefly sets the session status to "loading"; load each year's rights only once
    const requestedFor = useRef<number | null>(null);
    const [selectedYear, setSelectedYearState] = useState<number | null>(null);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasLoadError, setHasLoadError] = useState(false);

    const loadYears = async () => {
        if (status !== "authenticated") return;
        
        setIsLoading(true);
        setHasLoadError(false);
        try {
            const fetchedPlans = await fetchAnnualYears();
            setPlans(fetchedPlans);
            const years = fetchedPlans.map((p: any) => p.thaiYear).sort((a: number, b: number) => b - a);
            setAvailableYears(years);

            // Try to restore from localStorage
            const savedYear = localStorage.getItem("workingYear");
            if (savedYear && years.includes(Number(savedYear))) {
                setSelectedYearState(Number(savedYear));
            } else if (years.length > 0) {
                const newYear = years[0];
                localStorage.setItem("workingYear", newYear.toString());
                setSelectedYearState(newYear);
            } else {
                setSelectedYearState(null);
            }
        } catch (error: any) {
            console.error("Failed to fetch available years:", error);
            setHasLoadError(true);
            // Note: 401/403 errors are now auto-handled by apiFetch (auto signOut)
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (status === "authenticated") {
            loadYears();
        } else if (status === "unauthenticated") {
            setIsLoading(false);
        }
    }, [status]);

    const refreshYears = async () => {
        try {
            const fetchedPlans = await fetchAnnualYears();
            setPlans(fetchedPlans);
            const years = fetchedPlans.map((p: any) => p.thaiYear).sort((a: number, b: number) => b - a);
            setAvailableYears(years);
            
            setSelectedYearState((prev) => {
                if (prev !== null && !years.includes(prev)) {
                    if (years.length > 0) {
                        const newYear = years[0];
                        localStorage.setItem("workingYear", newYear.toString());
                        return newYear;
                    } else {
                        localStorage.removeItem("workingYear");
                        return null;
                    }
                }
                return prev;
            });
        } catch (error: any) {
            console.error("Failed to refresh years:", error);
            // Note: 401/403 errors are now auto-handled by apiFetch (auto signOut)
        }
    };

    useEffect(() => {
        if (status !== "authenticated" || selectedYear === null || requestedFor.current === selectedYear) return;
        requestedFor.current = selectedYear;
        getMyProfile()
            .then(async p => {
                const switched = sessionStorage.getItem("yearSwitched");
                if (switched) {
                    sessionStorage.removeItem("yearSwitched");
                    toast.success(`สลับข้อมูลเป็นปี พ.ศ. ${switched} แล้ว`, { icon: "🗓️", duration: 2000 });
                }
                await update({ yearAccess: { year: selectedYear, role: p.role, permissions: p.permissions ?? [], department: p.department ?? null, subDepartment: p.subDepartment ?? null, access: p.access ?? "edit" } });
                setYearAccess(p.access === "view" ? "view" : "edit");
                setAccessYear(selectedYear);
            })
            .catch(() => { setYearAccess("view"); setAccessYear(selectedYear); });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, selectedYear]);

    const setSelectedYear = (year: number) => {
        if (year !== selectedYear) {
            localStorage.setItem("workingYear", year.toString());
            // Everything (data and rights) belongs to one year: start the page over in the new year
            sessionStorage.setItem("yearSwitched", year.toString());
            window.location.reload();
        }
    };

    return (
        <YearContext.Provider value={{
            selectedYear, setSelectedYear, availableYears, plans, hasLoadError, refreshYears, yearAccess,
            // still loading until the rights of the chosen year are in the session
            isLoading: isLoading || (selectedYear !== null && accessYear !== selectedYear),
        }}>
            {children}
        </YearContext.Provider>
    );
}

export function useYear() {
    const context = useContext(YearContext);
    if (context === undefined) {
        throw new Error("useYear must be used within a YearProvider");
    }
    return context;
}
