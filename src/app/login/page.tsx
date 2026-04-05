"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, User, Loader, ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      } else {
        toast.success("ยินดีต้อนรับกลับเข้าสู่ระบบ");
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-100 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 blur-[120px] rounded-full" />

      <div className="w-full max-w-md p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white border border-slate-200/60 rounded-3xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative overflow-hidden"
        >
          {/* Decorative line */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#009EDB] via-[#0072B5] to-[#009EDB] animate-gradient-x" />

          {/* Logo */}
          <div className="h-40 flex flex-col items-center justify-center mb-6">
            <div className="w-28 h-28 mb-1 overflow-hidden transform hover:scale-110 transition-transform duration-500 cursor-pointer">
              <img src="/favicon.ico" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase text-center px-2">TMYDA Web Secretariat Office</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">ชื่อผู้ใช้งาน</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400 group-focus-within:text-[#009EDB] transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#009EDB]/20 focus:border-[#009EDB] transition-all text-sm font-medium"
                  placeholder="admin"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">รหัสผ่าน</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-[#009EDB] transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#009EDB]/20 focus:border-[#009EDB] transition-all text-sm font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#009EDB] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center py-1">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 bg-white text-[#009EDB] focus:ring-[#009EDB]/20"
              />
              <label htmlFor="remember" className="ml-2 block text-xs text-slate-500 font-medium select-none cursor-pointer">จดจำฉันไว้</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-[#009EDB] to-[#0072B5] hover:opacity-90 text-white font-bold rounded-xl shadow-lg shadow-sky-600/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  เข้าสู่ระบบ
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-[10px] text-slate-400 font-medium tracking-tight">
              © 2026 Thai Muslim Youth Development Association. All rights reserved.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
