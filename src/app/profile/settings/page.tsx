"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Định nghĩa interface để sạch bóng any
interface UserMetadata {
  role?: string;
  full_name?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth");
        return;
      }

      setEmail(user.email ?? "");

      const { data: userData } = await supabase
        .from("users")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();
      
      if (userData) {
        setFullName(userData.full_name ?? "");
        setPhone(userData.phone ?? "");
      }
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Không tìm thấy người dùng");

      const { error } = await supabase
        .from("users")
        .update({ 
          full_name: fullName,
          phone: phone
        })
        .eq("id", user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: "Cập nhật thông tin thành công!" });
    } catch (err: unknown) {
      const error = err as Error;
      setMessage({ type: 'error', text: "Có lỗi xảy ra: " + error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FCFAF8]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6A00] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFAF8]">
      {/* HEADER - STYLE CREAM */}
      <header className="sticky top-0 z-50 flex h-[70px] items-center justify-between border-b border-[rgba(255,106,0,0.1)] bg-[#FFF4DD] px-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/50 shadow-sm"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-[#0F172A]">Thiết lập tài khoản</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 px-4 py-6">
        <form onSubmit={handleUpdateProfile} className="space-y-5">
          {/* EMAIL - READ ONLY */}
          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Địa chỉ Email
            </label>
            <div className="w-full rounded-2xl border border-[rgba(255,106,0,0.05)] bg-white px-4 py-4 text-sm text-[#94A3B8]">
              {email}
            </div>
          </div>

          {/* HỌ VÀ TÊN */}
          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Họ và tên
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn Long..."
              className="w-full rounded-2xl border border-[rgba(255,106,0,0.1)] bg-white px-4 py-4 text-sm text-[#0F172A] outline-none transition-all focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00]"
              required
            />
          </div>

          {/* SỐ ĐIỆN THOẠI */}
          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xx xxx xxx"
              className="w-full rounded-2xl border border-[rgba(255,106,0,0.1)] bg-white px-4 py-4 text-sm text-[#0F172A] outline-none transition-all focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00]"
            />
          </div>

          {/* THÔNG BÁO */}
          {message && (
            <div className={`rounded-2xl border px-4 py-3 text-xs font-bold ${
              message.type === 'success' 
                ? 'border-emerald-100 bg-emerald-50 text-emerald-600' 
                : 'border-red-100 bg-red-50 text-red-600'
            }`}>
              {message.type === 'success' ? '✅ ' : '⚠️ '} {message.text}
            </div>
          )}

          {/* NÚT LƯU */}
          <button
            type="submit"
            disabled={saving}
            className="mt-4 w-full rounded-2xl bg-[#FF6A00] py-4 text-base font-extrabold text-white shadow-[0_10px_20px_rgba(255,106,0,0.2)] transition-all active:scale-[0.97] disabled:opacity-70"
          >
            {saving ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Đang lưu...</span>
              </div>
            ) : (
              "Lưu thay đổi"
            )}
          </button>
        </form>

        {/* SECTION MẸO NHỎ VỚI ICON BÓNG ĐÈN */}
        <div className="mt-10 rounded-2xl border border-[rgba(255,106,0,0.1)] bg-[rgba(255,106,0,0.05)] p-5">
          <div className="mb-2 flex items-center gap-2">
            {/* ICON BÓNG ĐÈN CHUẨN CỦA LONG */}
            <svg 
              width="18" 
              height="18" 
              viewBox="-0.5 0 25 25" 
              fill="none" 
              stroke="#FF6A00" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M19.0006 9.03002C19.0007 8.10058 18.8158 7.18037 18.4565 6.32317C18.0972 5.46598 17.5709 4.68895 16.9081 4.03734C16.2453 3.38574 15.4594 2.87265 14.5962 2.52801C13.7331 2.18336 12.8099 2.01409 11.8806 2.03002C10.0966 2.08307 8.39798 2.80604 7.12302 4.05504C5.84807 5.30405 5.0903 6.98746 5.00059 8.77001C4.95795 9.9595 5.21931 11.1402 5.75999 12.2006C6.30067 13.2609 7.10281 14.1659 8.09058 14.83C8.36897 15.011 8.59791 15.2584 8.75678 15.5499C8.91565 15.8415 8.99945 16.168 9.00059 16.5V18.03H15.0006V16.5C15.0006 16.1689 15.0829 15.843 15.24 15.5515C15.3971 15.26 15.6241 15.0121 15.9006 14.83C16.8528 14.1911 17.6336 13.328 18.1741 12.3167C18.7147 11.3054 18.9985 10.1767 19.0006 9.03002V9.03002Z" />
              <path d="M15 21.04C14.1345 21.6891 13.0819 22.04 12 22.04C10.9181 22.04 9.86548 21.6891 9 21.04" />
            </svg>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#FF6A00]">
              Mẹo nhỏ
            </span>
          </div>
          <p className="text-[12px] leading-relaxed text-[#64748B]">
            Việc cập nhật số điện thoại chính xác giúp các cửa hàng dễ dàng liên lạc với bạn khi có thay đổi về đơn hàng giải cứu.
          </p>
        </div>
      </main>
    </div>
  );
}