"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { WorkingYearGuard } from "@/components/WorkingYearGuard";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const toggleMobileMenu = () => setIsMobileOpen(!isMobileOpen);
  const closeMobileMenu = () => setIsMobileOpen(false);
  const toggleDesktopMenu = () => setIsDesktopCollapsed(!isDesktopCollapsed);

  return (
    <WorkingYearGuard>
      <div className="flex h-screen overflow-hidden relative">
        <Sidebar 
          isOpen={isMobileOpen} 
          onClose={closeMobileMenu} 
          isDesktopCollapsed={isDesktopCollapsed} 
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            onMobileMenuToggle={toggleMobileMenu} 
            onDesktopMenuToggle={toggleDesktopMenu} 
          />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </WorkingYearGuard>
  );
}
