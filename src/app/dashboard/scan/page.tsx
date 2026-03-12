"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ReservationDetail {
  id: string;
  status: string;
  quantity: number;
  expires_at: string | null;
  users: {
    full_name: string | null;
    email: string;
  } | null;
  products: {
    name: string;
    store_id: string;
  } | null;
}

export default function ScanPage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReservationDetail | null>(null);
  const [isAuthorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth');
        return;
      }
      const userRole = (user.user_metadata as any)?.role;
      if (userRole !== 'store_owner') {
        alert("Bạn không có quyền truy cập trang này.");
        router.replace('/');
      } else {
        setAuthorized(true);
      }
    };
    checkUser();
  }, [router]);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/reservations/confirm", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ qr_code: qrCode.trim() }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message ?? "Mã không hợp lệ.");
      } else if (data) {
        // Sửa lỗi TypeScript: Ép kiểu dữ liệu trả về từ Supabase (có thể là array hoặc object)
        const productData = Array.isArray(data.products) ? data.products[0] : data.products;
        const userData = Array.isArray(data.users) ? data.users[0] : data.users;
        
        setResult({
          ...data,
          products: productData as any,
          users: userData as any
        } as ReservationDetail);
      }
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8] pb-4">
      <header className="flex items-center justify-between px-4 pb-3 pt-4">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"
        >
          ←
        </button>
        <h1 className="text-base font-bold text-gray-900">Quét QR xác nhận</h1>
        <div className="h-8 w-8" />
      </header>

      {isAuthorized && (
        <main className="space-y-4 px-4">
          <div className="space-y-2 rounded-2xl bg-white p-4 text-sm shadow-md">
            <label className="text-xs font-medium text-gray-700">
              Nhập mã QR (dán từ app khách hàng)
            </label>
            <textarea
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
              placeholder="Dán chuỗi QR code tại đây..."
            />
            <button
              type="button"
              disabled={!qrCode.trim() || loading}
              onClick={handleConfirm}
              className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#FF6B00] py-2 text-sm font-semibold text-white shadow-md shadow-orange-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Xác nhận nhận hàng
            </button>

            {error && (
              <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}
          </div>

          {result && (
            <div className="space-y-2 rounded-2xl bg-white p-4 text-sm shadow-md">
              <div className="text-xs font-semibold text-emerald-600">
                Xác nhận thành công!
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {result.products?.name}
              </div>
              <div className="text-xs text-gray-600">
                Khách hàng:{" "}
                <span className="font-medium">
                  {result.users?.full_name ?? result.users?.email}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                Số lượng:{" "}
                <span className="font-semibold">{result.quantity}</span>
              </div>
              <div className="text-xs text-gray-600">
                Trạng thái:{" "}
                <span className="font-semibold text-emerald-600">
                  {result.status}
                </span>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

