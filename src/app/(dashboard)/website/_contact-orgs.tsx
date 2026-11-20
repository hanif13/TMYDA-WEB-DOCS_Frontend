"use client";
// Edit the official channels of each unit shown on the website's contact page.
import { useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { uploadImages, type ContactOrg } from "@/lib/api";
import { PUBLIC_SITE_URL, inputCls, labelCls } from "./_shared";
import { RowsEditor } from "./_editors";

const KINDS = [
    { value: "facebook", label: "Facebook" }, { value: "instagram", label: "Instagram" }, { value: "youtube", label: "YouTube" },
    { value: "tiktok", label: "TikTok" }, { value: "line", label: "LINE" }, { value: "email", label: "อีเมล" },
    { value: "phone", label: "โทรศัพท์" }, { value: "website", label: "เว็บไซต์" },
];
/** Logos may be a file on the website itself ("/orgs/…") or an uploaded image. */
const logoSrc = (u: string) => (u.startsWith("/") ? `${PUBLIC_SITE_URL}${u}` : u);

export function ContactOrgsEditor({ orgs, onChange, disabled }: { orgs: ContactOrg[]; onChange: (o: ContactOrg[]) => void; disabled?: boolean }) {
    const [uploading, setUploading] = useState<number | null>(null);
    const set = (i: number, patch: Partial<ContactOrg>) => onChange(orgs.map((o, j) => (j === i ? { ...o, ...patch } : o)));
    const move = (i: number, d: number) => {
        const j = i + d;
        if (j < 0 || j >= orgs.length) return;
        const next = [...orgs]; [next[i], next[j]] = [next[j], next[i]]; onChange(next);
    };
    return (
        <fieldset disabled={disabled} className="space-y-4">
            <legend className={labelCls}>ช่องทางออนไลน์ของแต่ละหน่วยงาน <span className="font-normal text-slate-400">· แสดงเป็นการ์ดในหน้าติดต่อประสานงาน</span></legend>
            {orgs.map((o, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                        <label className="relative w-16 h-16 shrink-0 rounded-full border border-slate-200 bg-white overflow-hidden flex items-center justify-center cursor-pointer" title="เปลี่ยนโลโก้">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {o.logoUrl ? <img src={logoSrc(o.logoUrl)} alt="" className="w-full h-full object-contain p-1" /> : <ImagePlus className="w-5 h-5 text-slate-300" />}
                            {uploading === i && <span className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></span>}
                            <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                const f = e.target.files?.[0]; e.target.value = "";
                                if (!f) return;
                                setUploading(i);
                                try { const { urls } = await uploadImages([f]); if (urls[0]) set(i, { logoUrl: urls[0] }); } finally { setUploading(null); }
                            }} />
                        </label>
                        <div className="flex-1 grid sm:grid-cols-2 gap-2">
                            <div><label className={labelCls}>ชื่อหน่วยงาน</label><input value={o.name} onChange={e => set(i, { name: e.target.value })} className={inputCls} /></div>
                            <div><label className={labelCls}>คำอธิบายสั้น</label><input value={o.subtitle} onChange={e => set(i, { subtitle: e.target.value })} className={inputCls} /></div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`เลื่อน ${o.name} ขึ้น`} className="p-1.5 rounded-lg text-slate-400 hover:bg-white disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                            <button type="button" onClick={() => move(i, 1)} disabled={i === orgs.length - 1} aria-label={`เลื่อน ${o.name} ลง`} className="p-1.5 rounded-lg text-slate-400 hover:bg-white disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                            <button type="button" onClick={() => { if (confirm(`ลบหน่วยงาน "${o.name}" ออกจากหน้าติดต่อ?`)) onChange(orgs.filter((_, j) => j !== i)); }} aria-label={`ลบ ${o.name}`} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <RowsEditor
                        label="ช่องทาง" rows={o.links} onChange={links => set(i, { links })} addLabel="เพิ่มช่องทาง"
                        blank={() => ({ kind: "facebook", handle: "", url: "" })}
                        columns={[
                            { key: "kind", label: "ประเภท", kind: "select", options: KINDS, width: "sm:col-span-3" },
                            { key: "handle", label: "ชื่อที่แสดง", placeholder: "@fityatulhaq", width: "sm:col-span-3" },
                            { key: "url", label: "ลิงก์", placeholder: "https://… หรือ mailto:…", width: "sm:col-span-6" },
                        ]}
                    />
                </div>
            ))}
            <button type="button" onClick={() => onChange([...orgs, { name: "", subtitle: "", logoUrl: "", links: [] }])}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-600">
                <Plus className="w-4 h-4" />เพิ่มหน่วยงาน
            </button>
        </fieldset>
    );
}
