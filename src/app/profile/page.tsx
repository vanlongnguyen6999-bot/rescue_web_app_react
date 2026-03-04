"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8]">
      <header className="flex items-center justify-between px-4 pb-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"
        >
          ←
        </button>
        <h1 className="text-base font-bold text-gray-900">Cá nhân</h1>
        <div className="h-8 w-8" />
      </header>

      <main className="flex-1 space-y-3 px-4 pt-2 text-sm">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold text-gray-500">
            Tài khoản
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex w-full items-center justify-between rounded-xl border border-orange-100 px-3 py-2 text-left"
          >
            <span>Dashboard cửa hàng</span>
            <span>›</span>
          </button>
        </div>

        <div className="rounded-2xl bg-white p-4 text-xs text-gray-600 shadow-sm">
          <button
            type="button"
            onClick={handleLogout}
            className="text-red-500"
          >
            Đăng xuất
          </button>
        </div>
      </main>
    </div>
  );
}

