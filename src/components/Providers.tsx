"use client";

import { SessionProvider } from "next-auth/react";
import { YearProvider } from "@/context/YearContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <YearProvider>
        {children}
      </YearProvider>
    </SessionProvider>
  );
}
