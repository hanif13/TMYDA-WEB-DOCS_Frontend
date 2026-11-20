"use client";
import { Building2, ExternalLink, Loader2, Users } from "lucide-react";
import { PageHeader, PUBLIC_SITE_URL, inputCls, useCanEditWebsite, useToast } from "../_shared";
import { Field, LinesInput, RowsEditor, SaveBar, SectionTitle, Tabs, sectionCls, useHashTab, useSiteSetting } from "../_editors";
import { ContentManager } from "../_content";
import Link from "next/link";
import { partnerConfig } from "../_configs";

const TABS = [
    { key: "profile", label: "ข้อมูลองค์กร", path: "/about" },
    { key: "history", label: "ประวัติความเป็นมา", path: "/about#history" },
    { key: "structure", label: "โครงสร้างองค์กร", path: "/about#structure" },
    { key: "committee", label: "คณะกรรมการ", path: "/about/committee" },
    { key: "partners", label: "เครือข่ายพันธมิตร", path: "/partners" },
] as const;
type Key = (typeof TABS)[number]["key"];

function AboutSettings({ tab, toast }: { tab: "profile" | "history" | "structure"; toast: (m: string, t?: "success" | "error") => void }) {
    const canEdit = useCanEditWebsite();
    const { value: about, set, save, saving, dirty } = useSiteSetting("about", toast);
    if (!about) return <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></div>;
    return (
        <div className="space-y-5">
            <fieldset disabled={!canEdit} className="space-y-5">
                {tab === "profile" && <>
                    <section className={sectionCls}>
                        <SectionTitle title="แนะนำองค์กร" hint="แสดงที่ส่วนบนของหน้าเกี่ยวกับองค์กร" />
                        <Field label="คำแนะนำสั้น ๆ"><textarea rows={3} value={about.intro} onChange={e => set({ intro: e.target.value })} className={`${inputCls} resize-y`} /></Field>
                        <Field label="วิสัยทัศน์"><textarea rows={2} value={about.vision} onChange={e => set({ vision: e.target.value })} className={`${inputCls} resize-y`} /></Field>
                        <LinesInput label="พันธกิจ" value={about.missions} onChange={missions => set({ missions })} rows={5} />
                    </section>
                    <section className={sectionCls}>
                        <SectionTitle title="ค่านิยมองค์กร" />
                        <RowsEditor label="ค่านิยม" rows={about.values} onChange={values => set({ values })} addLabel="เพิ่มค่านิยม"
                            columns={[{ key: "title", label: "ชื่อค่านิยม", width: "sm:col-span-4" }, { key: "text", label: "ความหมาย", width: "sm:col-span-8" }]}
                            blank={() => ({ title: "", text: "" })} />
                    </section>
                    <section className={sectionCls}>
                        <SectionTitle title="ตัวเลขสำคัญ" hint="เช่น ปีที่ดำเนินงาน จำนวนสาขา" />
                        <RowsEditor label="ตัวเลข" rows={about.stats} onChange={stats => set({ stats })} addLabel="เพิ่มตัวเลข"
                            columns={[{ key: "value", label: "ตัวเลข", width: "sm:col-span-4", placeholder: "เช่น 120+" }, { key: "label", label: "คำอธิบาย", width: "sm:col-span-8" }]}
                            blank={() => ({ value: "", label: "" })} />
                    </section>
                </>}
                {tab === "history" && (
                    <section className={sectionCls}>
                        <SectionTitle title="ประวัติความเป็นมา" hint="เส้นเวลาบนหน้าเกี่ยวกับองค์กร เรียงจากอดีตไปปัจจุบัน" />
                        <RowsEditor label="เหตุการณ์" rows={about.history} onChange={history => set({ history })} addLabel="เพิ่มเหตุการณ์"
                            columns={[{ key: "year", label: "ปี (พ.ศ.)", width: "sm:col-span-2" }, { key: "text", label: "เหตุการณ์", kind: "textarea", width: "sm:col-span-10" }]}
                            blank={() => ({ year: "", text: "" })} />
                    </section>
                )}
                {tab === "structure" && (
                    <section className={sectionCls}>
                        <SectionTitle title="โครงสร้างองค์กร" hint="หน่วยงานหลักและฝ่ายย่อยในแต่ละหน่วยงาน" />
                        <RowsEditor label="หน่วยงาน" rows={about.units} onChange={units => set({ units })} addLabel="เพิ่มหน่วยงาน"
                            columns={[{ key: "name", label: "ชื่อหน่วยงาน", width: "sm:col-span-5" }, { key: "children", label: "ฝ่ายย่อย", kind: "lines", width: "sm:col-span-7" }]}
                            blank={() => ({ name: "", children: [] })} />
                    </section>
                )}
            </fieldset>
            <SaveBar dirty={dirty} saving={saving} onSave={save} canEdit={canEdit} />
        </div>
    );
}

export default function WebsiteAboutPage() {
    const toast = useToast();
    const [tab, setTab] = useHashTab<Key>(TABS.map(t => t.key), "profile");
    const current = TABS.find(t => t.key === tab)!;
    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <PageHeader icon={Building2} title="เกี่ยวกับองค์กร" subtitle="วิสัยทัศน์ พันธกิจ ประวัติ โครงสร้าง คณะกรรมการ และเครือข่ายพันธมิตร" previewPath={current.path} />
            <Tabs tabs={TABS.map(t => ({ key: t.key, label: t.label }))} value={tab} onChange={setTab} />
            {tab === "committee" ? (
                <div className={`${sectionCls} flex flex-col sm:flex-row sm:items-center gap-5`}>
                    <Users className="w-10 h-10 text-blue-600 shrink-0" />
                    <div className="flex-1">
                        <h2 className="text-base font-bold text-slate-800">รายชื่อคณะกรรมการดึงมาจากเมนู &quot;คณะกรรมการ&quot; อัตโนมัติ</h2>
                        <p className="text-sm text-slate-500 mt-1">เว็บไซต์แสดงเฉพาะชื่อ ตำแหน่ง และรูปถ่ายของปีล่าสุด แยกตามหน่วยงาน (ไม่แสดงเบอร์โทร อีเมล และอาชีพ) แก้ไขรายชื่อได้ที่เมนูคณะกรรมการ</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/committee" className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">ไปที่เมนูคณะกรรมการ</Link>
                        <a href={`${PUBLIC_SITE_URL}/about/committee`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ExternalLink className="w-4 h-4" />ดูบนเว็บ</a>
                    </div>
                </div>
            )
                : tab === "partners" ? <ContentManager key="p" cfg={partnerConfig} toast={toast.show} />
                    : <AboutSettings tab={tab} toast={toast.show} />}
            {toast.node}
        </div>
    );
}
