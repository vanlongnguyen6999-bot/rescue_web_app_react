"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types";

type AuthMode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("buyer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        // After signup, also sign in the user directly
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        const userRole =
          (data.user?.user_metadata?.role as UserRole | undefined) ?? "buyer";
        
        // Gọi API init store nếu là chủ cửa hàng để đảm bảo đồng bộ session/cookie
        if (userRole === "store_owner") {
          await fetch("/api/store/init", { method: "POST" });
        } else {
          // Với buyer, có thể gọi một API nhẹ nhàng để sync cookie nếu cần
          await fetch("/api/reservations", { method: "GET" }).catch(() => null);
        }

        router.replace(userRole === "store_owner" ? "/dashboard" : "/");
      } else {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        const userRole =
          (data.user?.user_metadata?.role as UserRole | undefined) ?? "buyer";

        // Đồng bộ session sang server-side
        if (userRole === "store_owner") {
          await fetch("/api/store/init", { method: "POST" });
        } else {
          await fetch("/api/reservations", { method: "GET" }).catch(() => null);
        }

        router.replace(userRole === "store_owner" ? "/dashboard" : "/");
      }
    } catch (err) {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const isRegister = mode === "register";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-md">
        <div className="mb-6 text-center">
          <div className="mb-4 flex flex-col items-center justify-center gap-2">
            <div className="h-28 w-28 overflow-hidden rounded-3xl bg-white shadow-sm border border-orange-50 relative flex items-center justify-center">
              <img src="/logo.png" alt="EcoEat Logo" className="absolute h-[150%] w-[150%] max-w-none object-contain scale-125" />
            </div>
            <div className="text-4xl font-black tracking-tight text-gray-900">
              Eco<span className="text-[#FF6B00]">Eat</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium">
            Cùng cứu thực phẩm, nhận deal ngon mỗi ngày
          </p>
        </div>

        <div className="mb-6 flex rounded-full bg-orange-50 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-full px-3 py-2 ${
              !isRegister
                ? "bg-[#FF6B00] text-white"
                : "text-[#FF6B00] hover:bg-orange-100"
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-full px-3 py-2 ${
              isRegister
                ? "bg-[#FF6B00] text-white"
                : "text-[#FF6B00] hover:bg-orange-100"
            }`}
          >
            Đăng ký
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Họ và tên
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                placeholder="Nguyễn Văn A"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
              placeholder="ban@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
              placeholder="Ít nhất 6 ký tự"
            />
          </div>

          {isRegister && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Vai trò của bạn
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRole("buyer")}
                  className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold ${
                    role === "buyer"
                      ? "border-transparent bg-[#FF6B00] text-white"
                      : "border-gray-200 bg-orange-50 text-[#FF6B00]"
                  }`}
                >
                  Người mua
                </button>
                <button
                  type="button"
                  onClick={() => setRole("store_owner")}
                  className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold ${
                    role === "store_owner"
                      ? "border-transparent bg-[#FF6B00] text-white"
                      : "border-gray-200 bg-orange-50 text-[#FF6B00]"
                  }`}
                >
                  Chủ cửa hàng
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-[#FF6B00] py-2 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:bg-[#e55f00] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading && (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {isRegister ? "Tạo tài khoản" : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}

