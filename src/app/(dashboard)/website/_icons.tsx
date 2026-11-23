// ไอคอนสำหรับบทความที่ไม่มีภาพปก — the same keys are used by web 1 and web 2 (keep both lists in step).
import {
    BookOpen, Compass, GraduationCap, HandHeart, Heart, HeartHandshake, Landmark, Lightbulb,
    MessageCircle, MoonStar, ShieldCheck, Sparkles, Sprout, Star, Sun, Users,
} from "lucide-react";

export const ARTICLE_ICONS: { key: string; label: string; Icon: React.ElementType }[] = [
    { key: "lightbulb", label: "หลอดไฟ", Icon: Lightbulb },
    { key: "heart-handshake", label: "มือจับหัวใจ", Icon: HeartHandshake },
    { key: "book-open", label: "หนังสือ", Icon: BookOpen },
    { key: "moon-star", label: "จันทร์เสี้ยว", Icon: MoonStar },
    { key: "landmark", label: "อาคาร", Icon: Landmark },
    { key: "heart", label: "หัวใจ", Icon: Heart },
    { key: "hand-heart", label: "มือให้", Icon: HandHeart },
    { key: "users", label: "ผู้คน", Icon: Users },
    { key: "message-circle", label: "สนทนา", Icon: MessageCircle },
    { key: "graduation-cap", label: "การศึกษา", Icon: GraduationCap },
    { key: "sprout", label: "ต้นกล้า", Icon: Sprout },
    { key: "compass", label: "เข็มทิศ", Icon: Compass },
    { key: "sun", label: "ดวงอาทิตย์", Icon: Sun },
    { key: "star", label: "ดาว", Icon: Star },
    { key: "sparkles", label: "ประกาย", Icon: Sparkles },
    { key: "shield-check", label: "โล่", Icon: ShieldCheck },
];
export const articleIcon = (key: string | null | undefined) => ARTICLE_ICONS.find(i => i.key === key)?.Icon ?? null;
