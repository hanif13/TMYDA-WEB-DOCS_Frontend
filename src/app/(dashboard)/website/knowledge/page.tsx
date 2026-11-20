"use client";
// ศูนย์เนื้อหาศาสนา is now part of "ประชาสัมพันธ์ & เนื้อหาศาสนา" (/website/news#rel/...).
// Old links (/website/knowledge#qa …) land on the same tab there.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function WebsiteKnowledgeRedirect() {
    const router = useRouter();
    useEffect(() => {
        const tab = window.location.hash.slice(1);
        router.replace(`/website/news#rel${tab ? `/${tab}` : ""}`);
    }, [router]);
    return <div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
}
