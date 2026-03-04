"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { supabase } from "@/lib/supabase";

type ReservationStatus = "Reserved" | "Completed" | "Expired";

interface Reservation {
  id: string;
  quantity: number;
  qr_code: string;
  status: ReservationStatus;
  expires_at: string | null;
  created_at: string;
  products: {
    id: string;
    name: string;
    sale_price: number;
    image_url: string | null;
    stores: {
      id: string;
      name: string;
      address: string | null;
    } | null;
  } | null;
}

export default function MyOrdersPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("reservations")
        .select(
          `
          id,
          quantity,
          qr_code,
          status,
          expires_at,
          created_at,
          products (
            id,
            name,
            sale_price,
            image_url,
            stores (
              id,
              name,
              address
            )
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        setError("Không tải được danh sách đơn.");
      } else {
        setReservations((data as Reservation[]) ?? []);
      }
      setLoading(false);
    };

    load();
  }, [router]);

  const withComputedStatus = useMemo(() => {
    return reservations.map((r) => {
      if (r.status === "Reserved" && r.expires_at) {
        const exp = new Date(r.expires_at);
        if (exp.getTime() <= now.getTime()) {
          return { ...r, status: "Expired" as ReservationStatus };
        }
      }
      return r;
    });
  }, [reservations, now]);

  const getStatusBadge = (status: ReservationStatus) => {
    if (status === "Reserved") {
      return {
        label: "Đang giữ chỗ",
        className: "bg-orange-50 text-[#FF6B00]",
      };
    }
    if (status === "Completed") {
      return {
        label: "Đã nhận hàng",
        className: "bg-emerald-50 text-emerald-600",
      };
    }
    return {
      label: "Hết hạn",
      className: "bg-gray-100 text-gray-500",
    };
  };

  const renderCountdown = (reservation: Reservation) => {
    if (reservation.status !== "Reserved" || !reservation.expires_at) return null;
    const exp = new Date(reservation.expires_at);
    const diffMs = exp.getTime() - now.getTime();
    if (diffMs <= 0) return <span className="text-xs text-red-500">Đã hết hạn</span>;

    const totalSec = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;

    return (
      <span className="text-xs font-medium text-red-500">
        Hết hạn sau{" "}
        {minutes.toString().padStart(2, "0")}:
        {seconds.toString().padStart(2, "0")}
      </span>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8] pb-4">
      <header className="flex items-center justify-between px-4 pb-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"
        >
          ←
        </button>
        <h1 className="text-base font-bold text-gray-900">Đơn của tôi</h1>
        <div className="h-8 w-8" />
      </header>

      <main className="flex-1 space-y-3 px-4">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl bg-orange-50"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && !withComputedStatus.length && (
          <div className="rounded-2xl bg-orange-50 p-3 text-sm text-orange-600">
            Bạn chưa có đơn giữ chỗ nào. Hãy khám phá deal trên trang chủ nhé!
          </div>
        )}

        {!loading &&
          !error &&
          withComputedStatus.map((r) => {
            const badge = getStatusBadge(r.status);
            const product = r.products;
            const store = product?.stores ?? null;
            const isActiveReserved =
              r.status === "Reserved" && !!r.expires_at && new Date(r.expires_at) > now;

            return (
              <div
                key={r.id}
                className="space-y-3 rounded-2xl bg-white p-3 text-sm shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl bg-orange-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {product?.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-orange-400">
                        Không có ảnh
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {product?.name ?? "Sản phẩm đã xóa"}
                        </div>
                        {store && (
                          <div className="text-[11px] text-gray-500">
                            {store.name} • {store.address}
                          </div>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>
                        Số lượng:{" "}
                        <span className="font-semibold text-gray-800">
                          {r.quantity}
                        </span>
                      </span>
                      {renderCountdown(r)}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Giữ lúc{" "}
                      {new Date(r.created_at).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                {isActiveReserved && (
                  <div className="mt-2 flex flex-col items-center gap-2 rounded-2xl bg-orange-50 p-3">
                    <div className="text-xs font-semibold text-[#FF6B00]">
                      Mã QR dùng để nhân viên xác nhận đơn
                    </div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                      <QRCode
                        value={r.qr_code}
                        size={160}
                        bgColor="transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </main>
    </div>
  );
}

