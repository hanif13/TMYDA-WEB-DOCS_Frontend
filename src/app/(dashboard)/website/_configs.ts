// Field lists for each kind of website content managed with <ContentManager>.
import type { SiteContent } from "@/lib/api";
import type { ContentConfig, FieldDef, Option } from "./_content";
import { SITE_DEPARTMENTS } from "./_shared";

const opts = (values: string[]): Option[] => values.map(v => ({ value: v, label: v }));
const ACCESS: Option[] = [{ value: "public", label: "เปิดทุกคน" }, { value: "member", label: "เฉพาะสมาชิก" }];
const accessLabel = (v?: string) => (v === "member" ? "🔒 สมาชิก" : "เปิดทุกคน");
/** categories of an item (several allowed; older items have one in `category`) */
const cats = (i: SiteContent) => (i.data?.categories?.length ? i.data.categories : i.category ? [i.category] : []).join(", ");
const join = (...parts: (string | number | null | undefined)[]) => parts.filter(p => p !== null && p !== undefined && p !== "").join(" · ");

const slug: FieldDef = { path: "slug", label: "ลิงก์", kind: "text" };
const tone: FieldDef = { path: "data.tone", label: "สีปก (ใช้เมื่อไม่มีรูป)", kind: "tone" };
const cover: FieldDef = { path: "coverUrl", label: "รูปปก", kind: "image", half: true };

// ─── Articles (4 categories) ──────────────────────────────────
export const ARTICLE_CATEGORIES = [
    { key: "academic", label: "ข้อมูลวิชาการ" },
    { key: "encyclopedia", label: "สาระน่ารู้ / บทความ" },
    { key: "biography", label: "ชีวประวัติบุคคลสำคัญ" },
    { key: "youth-advice", label: "คำแนะนำแด่เยาวชน / นาศีหัต" },
] as const;

function articleConfig(category: string): ContentConfig {
    const extra: FieldDef[] =
        category === "academic" ? [
            { path: "fileUrl", label: "ไฟล์ฉบับเต็ม (PDF · ดาวน์โหลดได้เฉพาะสมาชิก)", kind: "pdf", half: true },
            { path: "data.filePages", label: "จำนวนหน้าของไฟล์", kind: "number", half: true },
        ] : category === "biography" ? [
            { path: "data.era", label: "ช่วงชีวิต", kind: "text", placeholder: "เช่น ค.ศ. 980–1037", half: true },
        ] : category === "youth-advice" ? [
            { path: "data.audience", label: "กลุ่มผู้อ่าน", kind: "select", options: opts(["ผู้ปกครอง", "เยาวชน", "ครู"]), required: true, half: true },
        ] : [];
    return {
        type: "article", noun: "บทความ", category,
        categoryChoices: ARTICLE_CATEGORIES.map(c => ({ value: c.key, label: c.label })),
        fields: [
            { path: "title", label: "ชื่อบทความ", kind: "text", required: true },
            { path: "data.excerpt", label: "คำโปรย / บทคัดย่อ", kind: "textarea" },
            { path: "data.body", label: "เนื้อหา", kind: "longtext", hint: "เว้นบรรทัดว่างเพื่อขึ้นย่อหน้าใหม่" },
            { path: "data.author", label: "ผู้เขียน", kind: "text", half: true },
            { path: "date", label: "วันที่เผยแพร่", kind: "date", half: true },
            ...extra,
            { path: "data.readMinutes", label: "เวลาอ่าน (นาที)", kind: "number", half: true },
            { path: "data.topics", label: "หมวดหมู่ (ไม่บังคับ)", kind: "categories", catType: `article:${category}` },
            { path: "data.tags", label: "แท็ก", kind: "tags", tagType: "article" },
            { path: "data.images", label: "อัลบั้มภาพ", kind: "images" },
            { path: "data.videoUrl", label: "ลิงก์วิดีโอ (Facebook หรือ YouTube)", kind: "text", placeholder: "https://…", hint: "แสดงเป็นตัวเล่นวิดีโอแทนรูปปก" },
            cover, tone, slug,
        ],
        defaults: () => ({ data: { tone: category === "academic" ? "amber" : category === "encyclopedia" ? "sky" : category === "biography" ? "violet" : "pink", tags: [], audience: category === "youth-advice" ? "ผู้ปกครอง" : "" } }),
        subtitle: i => join(`👁 ${(i.data.views ?? 0).toLocaleString("th-TH")}`, i.data.audience, i.data.era, i.data.author, i.data.tags?.join(", "), i.fileUrl ? "📎 มีไฟล์ฉบับเต็ม" : ""),
        publicPath: i => `/knowledge/${category}/${i.slug}`,
        filter: category === "youth-advice" ? { path: "data.audience", label: "กลุ่มผู้อ่าน", options: opts(["ผู้ปกครอง", "เยาวชน", "ครู"]) } : undefined,
    };
}
export const articleConfigs = Object.fromEntries(ARTICLE_CATEGORIES.map(c => [c.key, articleConfig(c.key)])) as Record<string, ContentConfig>;

// ─── Courses ──────────────────────────────────────────────────
export const courseConfig: ContentConfig = {
    type: "course", noun: "หลักสูตร", sortable: true,
    fields: [
        { path: "title", label: "ชื่อหลักสูตร", kind: "text", required: true },
        { path: "data.summary", label: "สรุปหลักสูตร", kind: "textarea" },
        { path: "data.level", label: "ระดับ", kind: "select", options: opts(["เบื้องต้น", "กลาง", "ขั้นสูง"]), required: true, half: true },
        { path: "data.duration", label: "ระยะเวลา", kind: "text", placeholder: "เช่น 3 วัน 2 คืน", half: true },
        { path: "data.audience", label: "กลุ่มเป้าหมาย", kind: "text", placeholder: "เช่น อายุ 16–22 ปี", half: true },
        { path: "data.seats", label: "จำนวนที่รับ", kind: "text", placeholder: "เช่น รับ 60 คน", half: true },
        { path: "data.modules", label: "เนื้อหาหลักสูตร (โมดูล)", kind: "lines", half: true },
        { path: "data.instructors", label: "วิทยากร", kind: "lines", half: true },
        {
            path: "data.documents", label: "เอกสารประกอบ", kind: "rows",
            columns: [
                { key: "name", label: "ชื่อเอกสาร", width: "sm:col-span-5" },
                { key: "access", label: "สิทธิ์", kind: "select", options: ACCESS, width: "sm:col-span-3" },
                { key: "url", label: "ลิงก์ไฟล์ (ถ้ามี)", width: "sm:col-span-4" },
            ],
            blank: () => ({ name: "", access: "public", url: "" }),
        },
        { path: "data.applyUrl", label: "ลิงก์สมัคร (ถ้ามี)", kind: "text", placeholder: "https://…" },
        { path: "data.tags", label: "แท็ก", kind: "tags", tagType: "course" },
        cover, tone, slug,
    ],
    defaults: () => ({ data: { tone: "blue", level: "เบื้องต้น", modules: [], instructors: [], documents: [] } }),
    subtitle: i => join(i.data.level, i.data.duration, i.data.audience),
    publicPath: i => `/about/courses/${i.slug}`,
};

// ─── Camps ────────────────────────────────────────────────────
const CAMP_STATUS: Option[] = [{ value: "upcoming", label: "กำลังจะจัด" }, { value: "past", label: "จัดไปแล้ว" }];
export const campConfig: ContentConfig = {
    type: "camp", noun: "ค่าย/กิจกรรม",
    fields: [
        { path: "title", label: "ชื่อค่าย/กิจกรรม", kind: "text", required: true },
        { path: "data.status", label: "สถานะ", kind: "select", options: CAMP_STATUS, required: true, half: true },
        { path: "date", label: "วันเริ่ม (ใช้เรียงลำดับ)", kind: "date", half: true },
        { path: "data.dateText", label: "วันที่ที่แสดงบนเว็บ", kind: "text", placeholder: "เช่น 26–30 ธันวาคม 2569", half: true },
        { path: "data.applyBy", label: "ปิดรับสมัคร", kind: "text", placeholder: "เช่น 15 ธันวาคม 2569", half: true },
        { path: "data.location", label: "สถานที่", kind: "text", half: true },
        { path: "data.participants", label: "ผู้เข้าร่วม", kind: "text", half: true },
        { path: "data.summary", label: "รายละเอียดโดยย่อ", kind: "textarea" },
        { path: "data.tags", label: "แท็ก", kind: "tags", tagType: "camp" },
        { path: "data.objectives", label: "วัตถุประสงค์", kind: "lines" },
        {
            path: "data.schedule", label: "กำหนดการ", kind: "rows",
            columns: [
                { key: "day", label: "วัน/ช่วง", width: "sm:col-span-3", placeholder: "วันที่ 1" },
                { key: "items", label: "กิจกรรม", kind: "lines", width: "sm:col-span-9" },
            ],
            blank: () => ({ day: "", items: [] }),
        },
        { path: "data.applyUrl", label: "ลิงก์สมัคร (ถ้ามี)", kind: "text", placeholder: "https://…" },
        cover,
        { path: "data.images", label: "ภาพบรรยากาศ", kind: "images", half: true },
        tone, slug,
    ],
    defaults: () => ({ data: { tone: "green", status: "upcoming", objectives: [], schedule: [], images: [] } }),
    subtitle: i => join(i.data.status === "upcoming" ? "🟢 กำลังจะจัด" : "จัดไปแล้ว", i.data.dateText, i.data.location),
    publicPath: i => `/news/camps/${i.slug}`,
    filter: { path: "data.status", label: "สถานะ", options: CAMP_STATUS },
};

// ─── Books ────────────────────────────────────────────────────
export const bookConfig: ContentConfig = {
    type: "book", noun: "หนังสือ", sortable: true,
    fields: [
        { path: "title", label: "ชื่อหนังสือ", kind: "text", required: true },
        { path: "data.author", label: "ผู้เขียน", kind: "text", half: true },
        { path: "data.publisher", label: "สำนักพิมพ์", kind: "text", half: true },
        { path: "data.access", label: "สิทธิ์ดาวน์โหลด", kind: "select", options: ACCESS, required: true, half: true },
        { path: "data.year", label: "ปีที่พิมพ์ (พ.ศ.)", kind: "number", half: true },
        { path: "data.pages", label: "จำนวนหน้า", kind: "number", half: true },
        { path: "data.categories", label: "หมวดหนังสือ", kind: "categories", catType: "book" },
        { path: "data.tags", label: "แท็ก", kind: "tags", tagType: "book" },
        { path: "data.summary", label: "เรื่องย่อ", kind: "textarea" },
        { path: "data.toc", label: "สารบัญ", kind: "lines" },
        { path: "coverUrl", label: "ภาพปกหนังสือ", kind: "image", half: true, hint: "square" },
        { path: "fileUrl", label: "ไฟล์หนังสือ (PDF)", kind: "pdf", half: true },
        tone, slug,
    ],
    defaults: () => ({ data: { tone: "green", access: "public", toc: [] } }),
    subtitle: i => join(i.data.author, cats(i), accessLabel(i.data.access), i.fileUrl ? "📎 มีไฟล์" : "ยังไม่มีไฟล์"),
    categories: { type: "book", label: "หมวดหนังสือ" },
    publicPath: i => `/knowledge/books/${i.slug}`,
    filter: { path: "data.access", label: "สิทธิ์", options: ACCESS },
};

// ─── Videos ───────────────────────────────────────────────────
export const videoConfig: ContentConfig = {
    type: "video", noun: "วิดีโอ",
    fields: [
        { path: "title", label: "ชื่อวิดีโอ", kind: "text", required: true },
        { path: "data.youtubeUrl", label: "ลิงก์ YouTube", kind: "text", placeholder: "https://www.youtube.com/watch?v=…", hint: "วางลิงก์จาก YouTube เพื่อแสดงตัวเล่นวิดีโอบนเว็บ" },
        { path: "data.description", label: "คำอธิบาย", kind: "textarea" },
        { path: "data.categories", label: "หมวดวิดีโอ", kind: "categories", catType: "video" },
        { path: "data.tags", label: "แท็ก", kind: "tags", tagType: "video" },
        { path: "data.duration", label: "ความยาว", kind: "text", placeholder: "เช่น 12:30", half: true },
        { path: "data.access", label: "สิทธิ์การดู", kind: "select", options: ACCESS, required: true, half: true },
        { path: "date", label: "วันที่เผยแพร่", kind: "date", half: true },
        { path: "coverUrl", label: "ภาพตัวอย่าง (ถ้าไม่ใส่จะใช้ภาพจาก YouTube)", kind: "image" },
        tone, slug,
    ],
    defaults: () => ({ data: { tone: "red", access: "public" } }),
    categories: { type: "video", label: "หมวดวิดีโอ" },
    subtitle: i => join(cats(i), i.data.duration, accessLabel(i.data.access), i.data.youtubeUrl ? "▶ มีลิงก์ YouTube" : "ยังไม่มีลิงก์วิดีโอ"),
    publicPath: i => `/knowledge/videos/${i.slug}`,
    filter: { path: "data.access", label: "สิทธิ์", options: ACCESS },
};

// ─── Youth Care Q&A ───────────────────────────────────────────
export const qaConfig: ContentConfig = {
    type: "qa", noun: "คำถาม-คำตอบ",
    fields: [
        { path: "title", label: "คำถาม", kind: "text", required: true },
        { path: "data.answer", label: "คำตอบของทีม Youth Care", kind: "longtext" },
        { path: "data.categories", label: "หมวดปัญหา", kind: "categories", catType: "qa" },
        { path: "data.tags", label: "แท็ก", kind: "tags", tagType: "qa" },
        { path: "date", label: "วันที่ตอบ", kind: "date", half: true },
    ],
    defaults: () => ({ data: { answer: "", categories: [] } }),
    subtitle: i => join(cats(i), (i.data.answer || "").slice(0, 80)),
    categories: { type: "qa", label: "หมวดปัญหา" },
    publicPath: () => "/knowledge/qa",
};

// ─── Recommended links ────────────────────────────────────────
export const recommendedConfig: ContentConfig = {
    type: "recommended", noun: "รายการแนะนำ", sortable: true,
    fields: [
        { path: "title", label: "ชื่อรายการ", kind: "text", required: true },
        { path: "data.categories", label: "ประเภท", kind: "categories", catType: "recommended" },
        { path: "data.tags", label: "แท็ก", kind: "tags", tagType: "recommended" },
        { path: "data.source", label: "แหล่งที่มา", kind: "text", half: true },
        { path: "data.description", label: "คำอธิบาย", kind: "textarea" },
        { path: "data.url", label: "ลิงก์", kind: "text", placeholder: "https://…" },
    ],
    defaults: () => ({ data: { categories: [] } }),
    categories: { type: "recommended", label: "ประเภท" },
    subtitle: i => join(cats(i), i.data.source, i.data.url ? "🔗 มีลิงก์" : ""),
    publicPath: () => "/knowledge/recommended",
};

// ─── Committee & partners ─────────────────────────────────────
export const committeeConfig: ContentConfig = {
    type: "committee", noun: "กรรมการ", sortable: true,
    fields: [
        { path: "title", label: "ชื่อ-นามสกุล", kind: "text", required: true },
        { path: "data.position", label: "ตำแหน่ง", kind: "text", required: true, half: true },
        { path: "category", label: "หน่วยงาน", kind: "select", options: opts(SITE_DEPARTMENTS), required: true, half: true },
        { path: "coverUrl", label: "รูปถ่าย", kind: "image", half: true, hint: "square" },
        { path: "data.tone", label: "สีพื้นหลัง (ใช้เมื่อไม่มีรูป)", kind: "tone", half: true },
    ],
    defaults: () => ({ category: SITE_DEPARTMENTS[0], data: { tone: "blue", position: "" } }),
    subtitle: (i: SiteContent) => join(i.data.position, i.category),
    publicPath: () => "/about/committee",
    filter: { path: "category", label: "หน่วยงาน", options: opts(SITE_DEPARTMENTS) },
};

export const partnerConfig: ContentConfig = {
    type: "partner", noun: "พันธมิตร", sortable: true,
    fields: [
        { path: "title", label: "ชื่อองค์กร", kind: "text", required: true },
        { path: "data.categories", label: "ประเภท", kind: "categories", catType: "partner" },
        { path: "data.url", label: "เว็บไซต์", kind: "text", placeholder: "https://…", half: true },
        { path: "data.description", label: "ความร่วมมือ", kind: "textarea" },
        { path: "coverUrl", label: "โลโก้", kind: "image", half: true, hint: "square" },
    ],
    defaults: () => ({ data: { categories: [] } }),
    categories: { type: "partner", label: "ประเภท" },
    subtitle: i => join(cats(i), i.data.description),
    publicPath: () => "/partners",
};
