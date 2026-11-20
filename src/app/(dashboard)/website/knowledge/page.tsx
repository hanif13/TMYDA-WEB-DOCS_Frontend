"use client";
import { GraduationCap } from "lucide-react";
import { PageHeader, useToast } from "../_shared";
import { Tabs, useHashTab } from "../_editors";
import { ContentManager } from "../_content";
import {
    ARTICLE_CATEGORIES, articleConfigs, bookConfig, campConfig, courseConfig, qaConfig, recommendedConfig, videoConfig,
} from "../_configs";

const TABS = [
    { key: "courses", label: "หลักสูตร", cfg: courseConfig, path: "/knowledge/courses" },
    { key: "camps", label: "ค่ายและกิจกรรม", cfg: campConfig, path: "/knowledge/camps" },
    ...ARTICLE_CATEGORIES.map(c => ({ key: c.key, label: c.label, cfg: articleConfigs[c.key], path: `/knowledge/${c.key}` })),
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
            <PageHeader icon={GraduationCap} title="ศูนย์เนื้อหาวิชาการ" subtitle="หลักสูตร ค่าย บทความ 4 หมวด คลังคำถาม หนังสือ วิดีโอ และรายการแนะนำ" previewPath={current.path} />
            <Tabs tabs={TABS.map(t => ({ key: t.key, label: t.label }))} value={tab} onChange={setTab} />
            <ContentManager key={tab} cfg={current.cfg} toast={toast.show} />
            {toast.node}
        </div>
    );
}
