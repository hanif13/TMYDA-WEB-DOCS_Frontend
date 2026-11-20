"use client";
import { ArrowDown, ArrowUp, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import type { SiteSettings } from "@/lib/api";
import { ImagePicker, PageHeader, inputCls, labelCls, useCanEditWebsite, useToast } from "../_shared";
import { Field, RowsEditor, SaveBar, SectionTitle, Tabs, sectionCls, useHashTab, useSiteSetting } from "../_editors";

const TABS = [
    { key: "donation", label: "ช่องทางสนับสนุน", path: "/donate" },
    { key: "privacy", label: "นโยบายความเป็นส่วนตัว", path: "/privacy-policy" },
    { key: "terms", label: "ข้อกำหนดการใช้งาน", path: "/terms" },
] as const;
type Key = (typeof TABS)[number]["key"];
type Toast = (m: string, t?: "success" | "error") => void;
const loading = <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></div>;

function DonationEditor({ toast }: { toast: Toast }) {
    const canEdit = useCanEditWebsite();
    const { value: d, set, save, saving, dirty } = useSiteSetting("donation", toast);
    if (!d) return loading;
    const text = (key: keyof SiteSettings["donation"], label: string, half = true, placeholder?: string) => (
        <div className={half ? "" : "sm:col-span-2"}>
            <Field label={label}><input value={d[key] as string} placeholder={placeholder} onChange={e => set({ [key]: e.target.value })} className={inputCls} /></Field>
        </div>
    );
    return (
        <div className="space-y-5">
            <fieldset disabled={!canEdit} className="space-y-5">
                <section className={sectionCls}>
                    <SectionTitle title="ข้อความแนะนำ" />
                    <Field label="ข้อความด้านบนของหน้า"><textarea rows={2} value={d.intro} onChange={e => set({ intro: e.target.value })} className={`${inputCls} resize-y`} /></Field>
                    <Field label="ข้อความแจ้งเตือน (แถบสีเหลือง)" hint="เว้นว่างเพื่อไม่แสดง · ตอนนี้ใช้เตือนว่าเป็นบัญชีตัวอย่าง">
                        <textarea rows={2} value={d.note} onChange={e => set({ note: e.target.value })} className={`${inputCls} resize-y`} />
                    </Field>
                </section>
                <section className={sectionCls}>
                    <SectionTitle title="บัญชีธนาคารและพร้อมเพย์" hint="ตรวจเลขบัญชีให้ถูกต้องก่อนบันทึก ผู้บริจาคจะโอนตามข้อมูลนี้" />
                    <div className="grid sm:grid-cols-2 gap-4">
                        {text("bankName", "ธนาคาร")}
                        {text("branch", "สาขา")}
                        {text("accountName", "ชื่อบัญชี")}
                        {text("accountNo", "เลขที่บัญชี", true, "xxx-x-xxxxx-x")}
                        {text("promptPay", "พร้อมเพย์ (เลขประจำตัวผู้เสียภาษี/เบอร์โทร)")}
                    </div>
                    <div className="max-w-[220px]">
                        <ImagePicker label="รูป QR Code พร้อมเพย์" value={d.qrUrl ? [d.qrUrl] : []} onChange={u => set({ qrUrl: u[0] ?? "" })} aspect="aspect-square" />
                    </div>
                </section>
                <section className={sectionCls}>
                    <SectionTitle title="กองทุนที่เปิดรับ" />
                    <RowsEditor label="กองทุน" rows={d.funds} onChange={funds => set({ funds })} addLabel="เพิ่มกองทุน"
                        columns={[
                            { key: "title", label: "ชื่อกองทุน", width: "sm:col-span-4" },
                            { key: "text", label: "รายละเอียด", width: "sm:col-span-5" },
                            { key: "tone", label: "สี", kind: "tone", width: "sm:col-span-3" },
                        ]}
                        blank={() => ({ title: "", text: "", tone: "green" })} />
                </section>
            </fieldset>
            <SaveBar dirty={dirty} saving={saving} onSave={save} canEdit={canEdit} />
        </div>
    );
}

function DocEditor({ docKey, toast }: { docKey: "privacy" | "terms"; toast: Toast }) {
    const canEdit = useCanEditWebsite();
    const { value: doc, set, save, saving, dirty } = useSiteSetting(docKey, toast);
    if (!doc) return loading;
    const sections = doc.sections;
    const setSection = (i: number, patch: Partial<(typeof sections)[number]>) => set({ sections: sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
    const move = (i: number, d: number) => {
        const j = i + d;
        if (j < 0 || j >= sections.length) return;
        const next = [...sections];
        [next[i], next[j]] = [next[j], next[i]];
        set({ sections: next });
    };
    return (
        <div className="space-y-5">
            <fieldset disabled={!canEdit} className="space-y-5">
                <section className={sectionCls}>
                    <div className="grid sm:grid-cols-[200px_1fr] gap-4">
                        <Field label="ปรับปรุงล่าสุด"><input value={doc.updated} onChange={e => set({ updated: e.target.value })} className={inputCls} placeholder="20 พฤศจิกายน 2569" /></Field>
                        <Field label="บทนำ"><textarea rows={3} value={doc.intro} onChange={e => set({ intro: e.target.value })} className={`${inputCls} resize-y`} /></Field>
                    </div>
                </section>
                {sections.map((s, i) => (
                    <section key={i} className={sectionCls} aria-label={`หัวข้อที่ ${i + 1}`}>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-400 w-6">{i + 1}.</span>
                            <input aria-label={`ชื่อหัวข้อที่ ${i + 1}`} value={s.title} onChange={e => setSection(i, { title: e.target.value })} className={`${inputCls} font-semibold`} placeholder="ชื่อหัวข้อ" />
                            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="เลื่อนขึ้น" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                            <button type="button" onClick={() => move(i, 1)} disabled={i === sections.length - 1} aria-label="เลื่อนลง" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                            <button type="button" onClick={() => set({ sections: sections.filter((_, j) => j !== i) })} aria-label="ลบหัวข้อนี้" className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <textarea aria-label={`เนื้อหาหัวข้อที่ ${i + 1}`} rows={Math.min(14, Math.max(4, s.body.split("\n").length + 1))} value={s.body}
                            onChange={e => setSection(i, { body: e.target.value })} className={`${inputCls} resize-y leading-relaxed`} />
                    </section>
                ))}
                <button type="button" onClick={() => set({ sections: [...sections, { title: "", body: "" }] })}
                    className="flex items-center gap-1.5 px-3 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600 w-full justify-center">
                    <Plus className="w-4 h-4" />เพิ่มหัวข้อ
                </button>
                <p className={`${labelCls} font-normal`}>วิธีจัดรูปแบบ: เว้นบรรทัดว่างเพื่อขึ้นย่อหน้าใหม่ · ขึ้นต้นบรรทัดด้วย &quot;- &quot; เพื่อทำเป็นรายการหัวข้อย่อย</p>
            </fieldset>
            <SaveBar dirty={dirty} saving={saving} onSave={save} canEdit={canEdit} />
        </div>
    );
}

export default function WebsitePagesPage() {
    const toast = useToast();
    const [tab, setTab] = useHashTab<Key>(TABS.map(t => t.key), "donation");
    const current = TABS.find(t => t.key === tab)!;
    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <PageHeader icon={FileText} title="บริจาค & นโยบาย" subtitle="ช่องทางสนับสนุน นโยบายความเป็นส่วนตัว และข้อกำหนดการใช้งาน" previewPath={current.path} />
            <Tabs tabs={TABS.map(t => ({ key: t.key, label: t.label }))} value={tab} onChange={setTab} />
            {tab === "donation" ? <DonationEditor toast={toast.show} /> : <DocEditor key={tab} docKey={tab} toast={toast.show} />}
            {toast.node}
        </div>
    );
}
