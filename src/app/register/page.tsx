// การสมัครสมาชิกย้ายไปอยู่ที่เว็บไซต์หลัก (เว็บ 1): ใบสมัครเดียวกัน + บัญชีเข้าเว็บไซต์ + ค่าบำรุงสมาชิก.
// Old links (docs.fityatulhaq.org/register) land here and are sent on.
import { redirect } from "next/navigation";

const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || "http://localhost:3100").replace(/\/$/, "");

export default function RegisterRedirect() {
    redirect(`${PUBLIC_SITE_URL}/register`);
}
