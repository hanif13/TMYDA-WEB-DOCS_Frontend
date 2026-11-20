"use client";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { PageHeader, useToast } from "../_shared";
import { Tabs, useHashTab } from "../_editors";
import { ContentManager } from "../_content";
import { bookConfig, campConfig, courseConfig, qaConfig, recommendedConfig, videoConfig } from "../_configs";

const TABS = [
    { key: "courses", label: "หลักสูตร", cfg: courseConfig, path: "/knowledge/courses" },
    { key: "camps", label: "ค่ายและกิจกรรม", cfg: campConfig, path: "/knowledge/camps" },
    { key: "qa", label: "Youth Care Q&A", cfg: qaConfig, path: "/knowledge/qa" },
    { key: "books", label: "หนังสือแนะนำ", cfg: bookConfig, path: "/knowledge/books" },
    { key: "videos", label: "วิดีโอแนะนำ", cfg: videoConfig, path: "/knowledge/videos" },
    { key: "recommended", label: "รายการแนะนำ", cfg: recommendedConfig, path: "/knowledge/recommended" },
] as const;
type Key = (typeof TABS)[number]["key"];

export default function WebsiteKnowledgePage() {
    const toast = useToast();
    const [tab, setTab] = useHashTab<Key>(TABS.map(t => t.key), "courses");
    const current = TABS.find(t => t.key === tab)!;
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <PageHeader icon={GraduationCap} title="ศูนย์เนื้อหาวิชาการ" subtitle="หลักสูตร ค่าย คลังคำถาม หนังสือ วิดีโอ และรายการแนะนำ" previewPath={current.path} />
            <Link href="/website/news" className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100">
                <span><b>บทความ 4 หมวด</b> (ข้อมูลวิชาการ · สาระน่ารู้ · ชีวประวัติ · คำแนะนำด้านเยาวชน) ย้ายไปโพสต์รวมกับข่าวที่ “โพสต์ข่าวและความรู้” แล้ว — เลือกหน้าที่จะลงได้ตอนโพสต์</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
            <Tabs tabs={TABS.map(t => ({ key: t.key, label: t.label }))} value={tab} onChange={setTab} />
            <ContentManager key={tab} cfg={current.cfg} toast={toast.show} />
            {toast.node}
        </div>
    );
}
