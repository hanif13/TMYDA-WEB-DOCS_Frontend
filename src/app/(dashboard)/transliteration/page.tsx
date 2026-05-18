"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, Upload, Trash2, Pencil, X, Languages, ChevronDown, FileUp, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { fetchTransliterations, fetchTransliterationCategories, createTransliteration, bulkCreateTransliterations, updateTransliteration, deleteTransliteration } from "@/lib/api";

interface Item { id: string; foreign: string; arabic: string | null; thai: string; category: string | null; note: string | null; }

function Toast({ msg, type, onClose }: { msg: string; type: "success"|"error"; onClose: ()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300 ${type==="success"?"bg-emerald-600":"bg-rose-600"} text-white`}>
      {type==="success"?<CheckCircle2 className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}{msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5"/></button>
    </div>
  );
}

function EntryModal({ item, categories, onClose, onSave }: { item?: Item|null; categories: string[]; onClose: ()=>void; onSave: (d:any)=>Promise<void>; }) {
  const [form, setForm] = useState({ foreign: item?.foreign??"", arabic: item?.arabic??"", thai: item?.thai??"", category: item?.category??"", note: item?.note??"" });
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => setForm(f=>({...f,[k]:e.target.value}));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.foreign.trim()||!form.thai.trim()) return;
    setSaving(true); try { await onSave(form); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-bold text-slate-800">{item?"แก้ไขคำทับศัพท์":"เพิ่มคำทับศัพท์"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-4 h-4"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ภาษาอังกฤษ <span className="text-rose-500">*</span></label>
              <input required value={form.foreign} onChange={set("foreign")} placeholder="เช่น computer"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ภาษาอาหรับ</label>
              <input value={form.arabic} onChange={set("arabic")} placeholder="مثال: حاسوب" dir="rtl"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-right font-arabic"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ภาษาไทย <span className="text-rose-500">*</span></label>
              <input required value={form.thai} onChange={set("thai")} placeholder="เช่น คอมพิวเตอร์"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">หมวดหมู่</label>
            {newCat ? (
              <input value={form.category} onChange={set("category")} placeholder="พิมพ์หมวดหมู่ใหม่"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onBlur={()=>{ if(!form.category) setNewCat(false); }} autoFocus/>
            ) : (
              <select value={form.category} onChange={e=>{ if(e.target.value==="__new__"){ setForm(f=>({...f,category:""})); setNewCat(true); } else set("category")(e); }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- ไม่ระบุ --</option>
                {categories.map(c=><option key={c} value={c}>{c}</option>)}
                <option value="__new__">+ เพิ่มหมวดหมู่ใหม่</option>
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">หมายเหตุ</label>
            <textarea value={form.note} onChange={set("note")} rows={2} placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving&&<Loader2 className="w-4 h-4 animate-spin"/>}{item?"บันทึกการแก้ไข":"เพิ่มรายการ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CsvModal({ onClose, onImport }: { onClose:()=>void; onImport:(items:any[])=>Promise<void>; }) {
  const [file, setFile] = useState<File|null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l=>l.trim());
    if (lines.length < 2) { setError("ไฟล์ต้องมีอย่างน้อย 1 แถวข้อมูล"); return; }
    const header = lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/"/g,""));
    const fIdx = header.findIndex(h=>["foreign","english","อังกฤษ"].includes(h));
    const aIdx = header.findIndex(h=>["arabic","อาหรับ"].includes(h));
    const tIdx = header.findIndex(h=>["thai","ไทย","คำทับศัพท์"].includes(h));
    const cIdx = header.findIndex(h=>["category","หมวดหมู่"].includes(h));
    const nIdx = header.findIndex(h=>["note","หมายเหตุ"].includes(h));
    if (fIdx<0||tIdx<0) { setError('ไม่พบคอลัมน์ "foreign" และ "thai" (หรือ "english","อังกฤษ","ไทย")'); return; }
    const rows = lines.slice(1).map(line=>{
      const cols = line.split(",").map(c=>c.trim().replace(/^"|"$/g,""));
      return { foreign:cols[fIdx]||"", arabic:aIdx>=0?cols[aIdx]||"":"", thai:cols[tIdx]||"", category:cIdx>=0?cols[cIdx]||"":"", note:nIdx>=0?cols[nIdx]||"":"" };
    }).filter(r=>r.foreign&&r.thai);
    if (!rows.length) { setError("ไม่พบข้อมูลที่ถูกต้อง"); return; }
    setError(""); setPreview(rows);
  };

  const handleFile = (f: File) => { setFile(f); setPreview([]); setError(""); const r=new FileReader(); r.onload=e=>parseCSV(e.target?.result as string); r.readAsText(f,"UTF-8"); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-bold text-slate-800">นำเข้าจากไฟล์ CSV</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
            onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f);}}>
            <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2"/>
            <p className="text-sm font-semibold text-slate-600">{file?file.name:"คลิกหรือลากไฟล์ CSV มาวาง"}</p>
            <p className="text-xs text-slate-400 mt-1">รองรับ .csv เท่านั้น</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700">รูปแบบไฟล์ CSV (3 ภาษา):</p>
            <code className="block bg-white border rounded p-2 font-mono text-[11px] text-slate-600">
              foreign,arabic,thai,category,note<br/>
              computer,حاسوب,คอมพิวเตอร์,เทคโนโลยี,<br/>
              internet,إنترنت,อินเทอร์เน็ต,เทคโนโลยี,
            </code>
          </div>
          {error&&<div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
          {preview.length>0&&(
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">พบข้อมูล {preview.length} รายการ (ตัวอย่าง 3 แถวแรก)</p>
              <div className="border rounded-xl overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-slate-100"><tr>{["อังกฤษ","อาหรับ","ไทย","หมวดหมู่"].map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>)}</tr></thead>
                  <tbody>{preview.slice(0,3).map((r,i)=><tr key={i} className="border-t"><td className="px-3 py-1.5">{r.foreign}</td><td className="px-3 py-1.5 text-right font-arabic" dir="rtl">{r.arabic||"-"}</td><td className="px-3 py-1.5 text-violet-700">{r.thai}</td><td className="px-3 py-1.5 text-slate-400">{r.category||"-"}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
            <button onClick={async()=>{if(!preview.length)return;setImporting(true);try{await onImport(preview);}finally{setImporting(false);}}}
              disabled={!preview.length||importing}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {importing&&<Loader2 className="w-4 h-4 animate-spin"/>}นำเข้า {preview.length>0?`${preview.length} รายการ`:""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TransliterationPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [editItem, setEditItem] = useState<Item|null>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [toast, setToast] = useState<{msg:string;type:"success"|"error"}|null>(null);
  const showToast = (msg: string, type: "success"|"error"="success") => setToast({msg,type});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([fetchTransliterations({search,category:catFilter}), fetchTransliterationCategories()]);
      setItems(data); setCategories(cats);
    } catch { showToast("โหลดข้อมูลไม่สำเร็จ","error"); } finally { setLoading(false); }
  }, [search, catFilter]);

  useEffect(()=>{load();},[load]);

  const handleAdd = async (data: any) => { await createTransliteration(data); showToast("เพิ่มรายการสำเร็จ"); setShowAdd(false); load(); };
  const handleEdit = async (data: any) => { if(!editItem)return; await updateTransliteration(editItem.id,data); showToast("แก้ไขรายการสำเร็จ"); setEditItem(null); load(); };
  const handleDelete = async () => { if(!deleteId)return; await deleteTransliteration(deleteId); showToast("ลบรายการสำเร็จ"); setDeleteId(null); load(); };
  const handleCsv = async (rows: any[]) => { const res=await bulkCreateTransliterations(rows); showToast(res.message||`นำเข้าสำเร็จ`); setShowCsv(false); load(); };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/20">
            <Languages className="w-5 h-5 text-white"/>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">ตารางคำทับศัพท์</h1>
            <p className="text-xs text-slate-500 mt-0.5">อาหรับ · อังกฤษ · ไทย — {items.length} รายการ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setShowCsv(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
            <Upload className="w-4 h-4"/>นำเข้า CSV
          </button>
          <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-900/20">
            <Plus className="w-4 h-4"/>เพิ่มรายการ
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหา อาหรับ / อังกฤษ / ไทย..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"/>
        </div>
        <div className="relative">
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700">
            <option value="">ทุกหมวดหมู่</option>
            {categories.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"/>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-400 w-10">#</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><span className="text-base">🇬🇧</span> อังกฤษ</span>
                </th>
                <th className="text-right px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center justify-end gap-1.5"><span className="text-base">🇸🇦</span> อาหรับ</span>
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><span className="text-base">🇹🇭</span> ไทย</span>
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">หมวดหมู่</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">หมายเหตุ</th>
                <th className="px-4 py-3.5 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto mb-2"/>
                  <p className="text-sm text-slate-400">กำลังโหลด...</p>
                </td></tr>
              ) : items.length===0 ? (
                <tr><td colSpan={7} className="text-center py-16">
                  <Languages className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
                  <p className="text-sm font-semibold text-slate-400">{search||catFilter?"ไม่พบรายการที่ค้นหา":"ยังไม่มีข้อมูล"}</p>
                  <p className="text-xs text-slate-300 mt-1">{!search&&!catFilter&&'กดปุ่ม "เพิ่มรายการ" หรือ "นำเข้า CSV" เพื่อเริ่มต้น'}</p>
                </td></tr>
              ) : items.map((item,i)=>(
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-4 py-3 text-slate-300 text-xs font-mono">{i+1}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.foreign}</td>
                  <td className="px-4 py-3 text-right" dir="rtl">
                    {item.arabic
                      ? <span className="text-amber-700 font-medium text-base leading-relaxed">{item.arabic}</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-violet-700 font-medium">{item.thai}</td>
                  <td className="px-4 py-3">
                    {item.category
                      ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">{item.category}</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-[160px] truncate">{item.note||"—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>setEditItem(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5"/></button>
                      <button onClick={()=>setDeleteId(item.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd&&<EntryModal categories={categories} onClose={()=>setShowAdd(false)} onSave={handleAdd}/>}
      {editItem&&<EntryModal item={editItem} categories={categories} onClose={()=>setEditItem(null)} onSave={handleEdit}/>}
      {showCsv&&<CsvModal onClose={()=>setShowCsv(false)} onImport={handleCsv}/>}

      {deleteId&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4"><Trash2 className="w-5 h-5 text-rose-600"/></div>
            <h3 className="text-base font-bold text-slate-800 mb-2">ยืนยันการลบ</h3>
            <p className="text-sm text-slate-500 mb-6">คุณต้องการลบรายการนี้ใช่หรือไม่?</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700">ลบรายการ</button>
            </div>
          </div>
        </div>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}
