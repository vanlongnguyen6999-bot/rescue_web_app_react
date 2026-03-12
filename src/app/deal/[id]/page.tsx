"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import QRCode from "react-qr-code";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/types";
import { differenceInHours, parseISO } from "date-fns";

export default function DealDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params?.id;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [reservation, setReservation] = useState<{
    id: string;
    qr_code: string;
    expires_at: string;
  } | null>(null);

  useEffect(() => {
    if (!productId) return;

    const fetchProduct = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          id,
          name,
          original_price,
          sale_price,
          quantity,
          expiry_date,
          category,
          image_url,
          is_active,
          created_at,
          stores (
            id,
            name,
            address,
            lat,
            lng
          )
        `
        )
        .eq("id", productId)
        .single();

      if (error) {
        setError("Không tìm thấy deal này.");
      } else if (!data) {
        setError("Không tìm thấy deal này.");
      } else {
        // Sửa lỗi TypeScript: Ép kiểu dữ liệu trả về từ Supabase
        const storeData = Array.isArray(data.stores) ? data.stores[0] : data.stores;
        setProduct({
          ...data,
          store: storeData as any,
        } as Product);

        // Kiểm tra xem đã theo dõi cửa hàng chưa
        const { data: { user } } = await supabase.auth.getUser();
        if (user && (storeData as any)?.id) {
          const { data: followData } = await supabase
            .from("follows")
            .select("id")
            .eq("user_id", user.id)
            .eq("store_id", (storeData as any).id)
            .maybeSingle();
          
          setIsFollowing(!!followData);
        }
      }
      setLoading(false);
    };

    fetchProduct();
  }, [productId]);

  const handleFollow = async () => {
    if (!product?.store?.id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Vui lòng đăng nhập để theo dõi cửa hàng.");
      setTimeout(() => router.push("/auth"), 2000);
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Hủy theo dõi
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("user_id", user.id)
          .eq("store_id", product.store.id);
        
        if (!error) setIsFollowing(false);
      } else {
        // Theo dõi
        const { error } = await supabase
          .from("follows")
          .insert({
            user_id: user.id,
            store_id: product.store.id
          });
        
        if (!error) setIsFollowing(true);
      }
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const expiryInfo = useMemo(() => {
    if (!product) return null;
    const expiry = parseISO(product.expiry_date);
    const hoursLeft = differenceInHours(expiry, new Date());
    return { expiry, hoursLeft };
  }, [product]);

  const handleReserve = async () => {
    if (!product) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity,
        }),
      });

      const body = await res.json().catch(() => null);

      if (res.status === 401) {
        setError("Vui lòng đăng nhập để thực hiện giữ chỗ.");
        setTimeout(() => router.push("/auth"), 2000);
        return;
      }

      // Xử lý lỗi tranh chấp (409) hoặc các lỗi khác cần refresh dữ liệu
      if (res.status === 409 || res.status === 400) {
        // Fetch lại sản phẩm để cập nhật số lượng mới nhất
        const { data: updatedProduct } = await supabase
          .from("products")
          .select("quantity, is_active")
          .eq("id", product.id)
          .single();
        
        if (updatedProduct) {
          setProduct(prev => prev ? { ...prev, ...updatedProduct } : null);
        }
        
        setError(body?.message ?? "Có lỗi xảy ra. Vui lòng thử lại.");
        return;
      }

      if (!res.ok) {
        setError(body?.message ?? "Không thể giữ chỗ. Vui lòng thử lại.");
        return;
      }

      setReservation({
        id: body.reservation_id,
        qr_code: body.qr_code,
        expires_at: body.expires_at,
      });
      // Xóa lỗi nếu có sau khi thành công
      setError(null);
    } catch (err) {
      console.error("Reservation error:", err);
      setError("Có lỗi hệ thống. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FFFDF8]">
        <div className="h-64 animate-pulse bg-orange-100" />
        <div className="space-y-3 p-4">
          <div className="h-6 w-2/3 animate-pulse rounded bg-orange-100" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-orange-50" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-orange-50" />
        </div>
      </div>
    );
  }

  if (!product || !product.store || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF8] px-4">
        <div className="max-w-sm rounded-2xl bg-white p-4 text-center text-sm text-gray-600 shadow-md">
          {error ?? "Không tìm thấy deal này hoặc cửa hàng đã đóng cửa."}
        </div>
      </div>
    );
  }

  const discountPercent = Math.round(
    ((product.original_price - product.sale_price) / product.original_price) *
      100
  );

  const isAlmostExpired = !!expiryInfo && expiryInfo.hoursLeft < 24;

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8] pb-24">
      <div className="relative h-72 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-orange-50 text-sm text-orange-400">
            Không có ảnh
          </div>
        )}
        <button
          type="button"
          className="absolute left-3 top-8 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-sm shadow-md"
          onClick={() => router.back()}
        >
          ←
        </button>
      </div>

      <main className="flex-1 space-y-4 px-4 pt-4">
        <h1 className="text-lg font-bold text-gray-900">{product.name}</h1>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 line-through">
                {product.original_price.toLocaleString("vi-VN")}₫
              </span>
              <span className="text-xl font-extrabold text-[#FF6B00]">
                {product.sale_price.toLocaleString("vi-VN")}₫
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-[#FF6B00]">
                Tiết kiệm {discountPercent}%
              </span>
              {expiryInfo && (
                <span
                  className={`text-xs font-medium ${
                    isAlmostExpired ? "text-red-500" : "text-orange-500"
                  }`}
                >
                  HSD:{" "}
                  {expiryInfo.expiry.toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-orange-50 px-3 py-2 text-right text-xs text-gray-700">
            <div>Còn</div>
            <div className="text-base font-bold text-red-500">
              {product.quantity}
            </div>
            <div>suất</div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-lg">
            📍
          </div>
          <div className="flex-1 text-sm">
            <div className="font-semibold text-gray-900">
              {product.store.name}
            </div>
            <div className="text-xs text-gray-600">
              {product.store.address ?? "Địa chỉ đang cập nhật"}
            </div>
          </div>
          <button
            type="button"
            disabled={followLoading}
            onClick={handleFollow}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
              isFollowing
                ? "bg-gray-100 text-gray-500"
                : "bg-orange-50 text-[#FF6B00] shadow-sm"
            }`}
          >
            {followLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#FF6B00] border-t-transparent" />
            ) : isFollowing ? (
              "Đã theo dõi"
            ) : (
              "+ Theo dõi"
            )}
          </button>
        </div>

        <div className="space-y-2 rounded-2xl bg-white p-3 text-sm text-gray-700 shadow-sm">
          <h2 className="text-sm font-semibold">Mô tả sản phẩm</h2>
          <p className="text-xs leading-relaxed text-gray-600">
            Combo món ngon cuối ngày được giảm giá sâu để tránh lãng phí thực
            phẩm. Hình ảnh mang tính minh họa, bạn nhận món trực tiếp tại cửa
            hàng.
          </p>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-2xl bg-white p-3 text-sm shadow-sm">
          <span className="font-medium text-gray-800">Số lượng muốn giữ</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setQuantity((q) => Math.max(1, Math.min(q - 1, product.quantity)))
              }
              className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-lg text-[#FF6B00]"
            >
              −
            </button>
            <span className="w-6 text-center text-base font-semibold">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) => Math.max(1, Math.min(q + 1, product.quantity)))
              }
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6B00] text-lg text-white"
            >
              +
            </button>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-orange-100 bg-white/95 px-4 pb-4 pt-2 backdrop-blur">
        {error && (
          <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}
        <button
          type="button"
          disabled={submitting || product.quantity <= 0}
          onClick={handleReserve}
          className="flex w-full items-center justify-center rounded-2xl bg-[#FF6B00] py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting && (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          Giữ chỗ ngay
        </button>
      </div>

      {/* QR Code Modal */}
      {reservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex flex-col items-center p-6 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-3xl">
                ✅
              </div>
              <h3 className="text-xl font-bold text-gray-900">Giữ chỗ thành công!</h3>
              <p className="mt-1 text-xs text-gray-500">
                Hãy đưa mã này cho nhân viên cửa hàng để nhận món.
              </p>
            </div>

            <div className="mx-6 mb-6 flex flex-col items-center gap-4 rounded-3xl bg-orange-50 p-6">
              <div className="w-full max-w-[200px] rounded-2xl bg-white p-4 shadow-sm">
                <QRCode
                  value={String(reservation.qr_code)}
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-[#FF6B00]">
                  Mã: {reservation.qr_code.slice(0, 8).toUpperCase()}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  Hết hạn lúc: {new Date(reservation.expires_at).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-50 p-4">
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/my-orders")}
                  className="w-full rounded-2xl bg-[#FF6B00] py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 active:scale-[0.98]"
                >
                  Xem đơn của tôi
                </button>
                <button
                  type="button"
                  onClick={() => setReservation(null)}
                  className="w-full py-2 text-sm font-medium text-gray-400 active:text-gray-600"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

