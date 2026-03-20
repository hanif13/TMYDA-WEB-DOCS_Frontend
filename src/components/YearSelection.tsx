"use client";

import { CalendarDays, ChevronRight, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useYear } from "@/context/YearContext";

export function YearSelection() {
    const { availableYears, setSelectedYear } = useYear();
    const { data: session } = useSession();

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
            </div>

            <div className="max-w-4xl w-full px-6 relative z-10">
                <div className="text-center mb-12">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-xl shadow-blue-100 mb-6"
                    >
                        <CalendarDays className="w-8 h-8 text-blue-600" />
                    </motion.div>
                    <motion.h1 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl font-black text-slate-800 tracking-tight"
                    >
                        เลือกปีการทำงาน
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-500 mt-2 font-medium"
                    >
                        กรุณาเลือกปีงบประมาณที่คุณต้องการเข้าถึงข้อมูล
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {availableYears.map((year, index) => {
                        return (
                            <motion.div
                                key={year}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 * (index + 3) }}
                                onClick={() => setSelectedYear(year)}
                                className={cn(
                                    "group relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all duration-500 overflow-hidden text-left",
                                    "hover:shadow-2xl hover:shadow-blue-100 hover:-translate-y-2 cursor-pointer"
                                )}
                            >
                                {/* Decorative element */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 transition-colors group-hover:bg-blue-50/50 duration-500" />
                                
                                <div className="relative z-10">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">Working Year</span>
                                    <h2 className="text-4xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">
                                        {year}
                                    </h2>
                                    
                                    <div className="mt-8 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500 group-hover:text-blue-500 transition-colors">เข้าสู่ระบบ</span>
                                        <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 transition-all duration-500 group-hover:rotate-45">
                                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-12 flex items-center justify-center gap-6"
                >
                    <button 
                        onClick={() => signOut()}
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-red-500 text-sm font-bold transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        ออกจากระบบ
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
