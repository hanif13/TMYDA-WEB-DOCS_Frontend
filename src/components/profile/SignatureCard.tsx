"use client";
// ลายเซ็นและตำแหน่งสำหรับลงนามเอกสาร (อัปโหลดครั้งเดียว ใช้ทุกครั้งที่อนุมัติ/ลงนาม)
import { useEffect, useRef, useState } from "react";
import { Loader2, PenLine, Save, Upload } from "lucide-react";
import { toast } from "react-hot-toast";
import { apiErrorMessage, getMyProfile, updateMyProfile, uploadMySignature } from "@/lib/api";

export function SignatureCard() {
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
    const [position, setPosition] = useState("");
    const [savedPosition, setSavedPosition] = useState("");
    const [busy, setBusy] = useState<"" | "upload" | "position">("");
    const [loaded, setLoaded] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getMyProfile().then((p: { signatureUrl?: string | null; position?: string | null }) => {
            setSignatureUrl(p.signatureUrl ?? null);
            setPosition(p.position ?? ""); setSavedPosition(p.position ?? "");
        }).catch(() => undefined).finally(() => setLoaded(true));
    }, []);

    const pick = async (file?: File) => {
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error("ไฟล์ใหญ่เกิน 2 MB"); return; }
        setBusy("upload");
        try {
            const { signatureUrl: url } = await uploadMySignature(file);
            setSignatureUrl(url);
            toast.success("บันทึกลายเซ็นแล้ว");
        } catch (e) { toast.error(apiErrorMessage(e, "อัปโหลดลายเซ็นไม่สำเร็จ")); }
        finally { setBusy(""); if (fileRef.current) fileRef.current.value = ""; }
    };

    const savePosition = async () => {
        setBusy("position");
        try {
            await updateMyProfile({ position });
            setSavedPosition(position);
            toast.success("บันทึกตำแหน่งแล้ว");
        } catch (e) { toast.error(apiErrorMessage(e, "บันทึกไม่สำเร็จ")); }
        finally { setBusy(""); }
    };

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg">
                    <PenLine className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">ลายเซ็นสำหรับลงนามเอกสาร</h3>
                    <p className="text-xs text-slate-500">ใช้ประทับลงในเอกสาร PDF อัตโนมัติเมื่อคุณอนุมัติหรือลงนาม</p>
                </div>
            </div>
            <div className="p-8 grid md:grid-cols-2 gap-8">
                <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">รูปลายเซ็น</p>
                    <div className="h-36 rounded-2xl border-2 border-dashed border-slate-200 bg-[repeating-linear-gradient(45deg,#f8fafc,#f8fafc_10px,#fff_10px,#fff_20px)] flex items-center justify-center overflow-hidden">
                        {!loaded ? <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                            : signatureUrl
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={signatureUrl} alt="ลายเซ็นของคุณ" className="max-h-28 max-w-[85%] object-contain" />
                                : <span className="text-sm text-slate-400">ยังไม่มีลายเซ็น</span>}
                    </div>
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={busy !== ""}
                        className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                        {busy === "upload" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {signatureUrl ? "เปลี่ยนลายเซ็น" : "อัปโหลดลายเซ็น"}
                    </button>
                    <p className="text-xs text-slate-500 mt-2">PNG พื้นหลังโปร่งใสดีที่สุด (หรือ JPG พื้นขาว) ไม่เกิน 2 MB · เอกสารที่ลงนามไปแล้วจะใช้ลายเซ็นเดิมของตอนนั้น</p>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => pick(e.target.files?.[0])} />
                </div>
                <div>
                    <label htmlFor="sig-position" className="text-sm font-semibold text-slate-700 mb-2 block">ตำแหน่งที่พิมพ์ใต้ลายเซ็น</label>
                    <textarea id="sig-position" rows={3} value={position} onChange={e => setPosition(e.target.value)}
                        placeholder={"เช่น นายกสมาคมพัฒนาเยาวชนมุสลิมไทย"}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    <p className="text-xs text-slate-500 mt-1">ขึ้นบรรทัดใหม่ได้ ถ้าตำแหน่งยาว</p>
                    <button type="button" onClick={savePosition} disabled={busy !== "" || position === savedPosition}
                        className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold disabled:opacity-40">
                        {busy === "position" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}บันทึกตำแหน่ง
                    </button>
                </div>
            </div>
        </div>
    );
}
