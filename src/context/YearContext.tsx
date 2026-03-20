"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { fetchAnnualYears } from "@/lib/api";
import { useSession } from "next-auth/react";

interface YearContextType {
    selectedYear: number | null;
    setSelectedYear: (year: number) => void;
    availableYears: number[];
    plans: any[];
    isLoading: boolean;
    refreshYears: () => Promise<void>;
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export function YearProvider({ children }: { children: ReactNode }) {
    const { status } = useSession();
    const [selectedYear, setSelectedYearState] = useState<number | null>(null);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadYears = async () => {
        if (status !== "authenticated") return;
        
        setIsLoading(true);
        try {
            const fetchedPlans = await fetchAnnualYears();
            setPlans(fetchedPlans);
            const years = fetchedPlans.map((p: any) => p.thaiYear).sort((a: number, b: number) => b - a);
            setAvailableYears(years);

            // Try to restore from localStorage
            const savedYear = localStorage.getItem("workingYear");
            if (savedYear && years.includes(Number(savedYear))) {
                setSelectedYearState(Number(savedYear));
            }
        } catch (error) {
            console.error("Failed to fetch available years:", error);
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
        } catch (error) {
            console.error("Failed to refresh years:", error);
        }
    };

    const setSelectedYear = (year: number) => {
        setSelectedYearState(year);
        localStorage.setItem("workingYear", year.toString());
    };

    return (
        <YearContext.Provider value={{ selectedYear, setSelectedYear, availableYears, plans, isLoading, refreshYears }}>
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
