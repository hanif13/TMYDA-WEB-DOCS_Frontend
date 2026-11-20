"use client";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { PageHeader, useToast } from "../_shared";
import { Tabs, useHashTab } from "../_editors";
import { ContentManager } from "../_content";
import { bookConfig, qaConfig, recommendedConfig, videoConfig } from "../_configs";

const TABS = [
    { key: "qa", label: "Youth Care Q&A", cfg: qaConfig, path: "/knowledge/qa" },
    { key: "books", label: "หนังสือแนะนำ", cfg: bookConfig, path: "/knowledge/books" },
    { key: "videos", label: "วิดีโอแนะนำ", cfg: videoConfig, path: "/knowledge/videos" },
    { key: "recommended", label: "รายการแนะนำ", cfg: recommendedConfig, path: "/knowledge/recommended" },
] as const;
type Key = (typeof TABS)[number]["key"];

export default function WebsiteKnowledgePage() {
    const toast = useToast();
    const [tab, setTab] = useHashTab<Key>(TABS.map(t => t.key), "qa");
    const current = TABS.find(t => t.key === tab)!;
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <PageHeader icon={GraduationCap} title="ศูนย์เนื้อหาศาสนา" subtitle="คลังคำถาม หนังสือ วิดีโอ และรายการแนะนำ" previewPath={current.path} />
            <Link href="/website/news" className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100">
                <span><b>บทความ 4 หมวด</b> (ข้อมูลวิชาการ · สาระน่ารู้/บทความ · ชีวประวัติ · คำแนะนำแด่เยาวชน/นาศีหัต) และค่ายและกิจกรรม อยู่ที่ “โพสต์ข่าวและความรู้” · หลักสูตรอยู่ที่ “เกี่ยวกับองค์กร”</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
            <Tabs tabs={TABS.map(t => ({ key: t.key, label: t.label }))} value={tab} onChange={setTab} />
            <ContentManager key={tab} cfg={current.cfg} toast={toast.show} />
            {toast.node}
        </div>
    );
}
