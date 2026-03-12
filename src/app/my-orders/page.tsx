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
  reviews: {
    rating: number;
    comment: string | null;
  }[] | null;
}

type Tab = "ongoing" | "completed" | "review";

export default function MyOrdersPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<Tab>("ongoing");
  const [submittingReview, setSubmittingReview] = useState<string | null>(null);

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
          ),
          reviews (
            rating,
            comment
          )
        `
        )
        .eq("user_id", user.id) // Chỉ lấy đơn hàng của người dùng hiện tại
        .order("created_at", { ascending: false });

      if (error) {
        setError("Không tải được danh sách đơn.");
      } else {
        // Sửa lỗi TypeScript: Ép kiểu dữ liệu trả về từ Supabase (có thể là array hoặc object)
        const mappedReservations = (data ?? []).map((r: any) => {
          const productData = Array.isArray(r.products) ? r.products[0] : r.products;
          const storeData = productData && Array.isArray(productData.stores) ? productData.stores[0] : productData?.stores;
          
          return {
            ...r,
            products: productData ? {
              ...productData,
              stores: storeData || null
            } : null
          };
        });
        setReservations(mappedReservations as unknown as Reservation[]);
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

  const filteredReservations = useMemo(() => {
    if (activeTab === "ongoing") {
      return withComputedStatus.filter(r => r.status === "Reserved");
    }
    if (activeTab === "completed") {
      return withComputedStatus.filter(r => r.status === "Completed" || r.status === "Expired");
    }
    // Tạm thời tab Đánh giá sẽ hiển thị các đơn đã hoàn thành
    if (activeTab === "review") {
      return withComputedStatus.filter(r => r.status === "Completed");
    }
    return [];
  }, [withComputedStatus, activeTab]);

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

  const handleRate = async (reservationId: string, productId: string, rating: number) => {
    setSubmittingReview(reservationId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      product_id: productId,
      reservation_id: reservationId,
      rating: rating,
    });

    if (error) {
      alert("Không thể gửi đánh giá: " + error.message);
    } else {
      // Refresh danh sách
      const { data } = await supabase
        .from("reservations")
        .select(`
          id, quantity, qr_code, status, expires_at, created_at,
          products (id, name, sale_price, image_url, stores (id, name, address)),
          reviews (rating, comment)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (data) {
        // Sửa lỗi TypeScript: Ép kiểu dữ liệu trả về từ Supabase (có thể là array hoặc object)
        const mappedReservations = (data ?? []).map((r: any) => {
          const productData = Array.isArray(r.products) ? r.products[0] : r.products;
          const storeData = productData && Array.isArray(productData.stores) ? productData.stores[0] : productData?.stores;
          
          return {
            ...r,
            products: productData ? {
              ...productData,
              stores: storeData || null
            } : null
          };
        });
        setReservations(mappedReservations as unknown as Reservation[]);
      }
    }
    setSubmittingReview(null);
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

      {/* Tabs */}
      <div className="mb-3 flex justify-center border-b border-orange-100">
        <div className="-mb-px flex gap-4 px-4 text-sm font-medium text-gray-500">
          <button 
            type="button"
            onClick={() => setActiveTab("ongoing")}
            className={`py-2 ${activeTab === 'ongoing' ? 'border-b-2 border-[#FF6B00] text-[#FF6B00]' : ''}`}>
            Đang thực hiện
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`py-2 ${activeTab === 'completed' ? 'border-b-2 border-[#FF6B00] text-[#FF6B00]' : ''}`}>
            Đã hoàn thành
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("review")}
            className={`py-2 ${activeTab === 'review' ? 'border-b-2 border-[#FF6B00] text-[#FF6B00]' : ''}`}>
            Đánh giá
          </button>
        </div>
      </div>

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

        {!loading && !error && !filteredReservations.length && (
          <div className="rounded-2xl bg-orange-50 p-4 text-center text-sm text-orange-600">
            Không có đơn hàng nào trong mục này.
          </div>
        )}

        {!loading &&
          !error &&
          filteredReservations.map((r) => {
            const badge = getStatusBadge(r.status);
            const product = r.products;
            const store = product?.stores ?? null;
            const isActiveReserved =
              r.status === "Reserved" && !!r.expires_at && new Date(r.expires_at) > now;
            const review = r.reviews && r.reviews.length > 0 ? r.reviews[0] : null;

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

                {/* Phần đánh giá */}
                {activeTab === "review" && product && (
                  <div className="mt-2 border-t border-orange-50 pt-3">
                    {review ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">Bạn đã đánh giá:</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span key={s} className={`text-sm ${s <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="text-xs text-gray-500 font-medium">Hãy để lại đánh giá của bạn:</div>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                disabled={submittingReview === r.id}
                                onClick={() => handleRate(r.id, product.id, star)}
                                className="text-2xl text-gray-200 transition-colors hover:text-yellow-400 focus:text-yellow-400 active:scale-95"
                              >
                                ★
                              </button>
                            ))}
                          </div>
                          {submittingReview === r.id && (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#FF6B00] border-t-transparent" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isActiveReserved && (
                  <div className="mt-2 flex flex-col items-center gap-2 rounded-2xl bg-orange-50 p-3">
                    <div className="text-center">
                      <div className="text-xs font-semibold text-[#FF6B00]">
                        Đưa mã này cho nhân viên quét
                      </div>
                      <div className="mt-1 text-sm font-bold text-gray-800 tracking-wider">
                        {r.qr_code.slice(0, 8).toUpperCase()}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                      <QRCode
                        value={r.qr_code}
                        size={160}
                        bgColor="#FFFFFF"
                        fgColor="#000000"
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

