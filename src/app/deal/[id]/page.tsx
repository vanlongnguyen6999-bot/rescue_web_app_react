"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
        setProduct({
          ...data,
          store: Array.isArray(data.stores) ? data.stores[0] : data.stores,
        } as unknown as Product);
      }
      setLoading(false);
    };

    fetchProduct();
  }, [productId]);

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

      if (res.status === 401) {
        router.push("/auth");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Không thể giữ chỗ. Vui lòng thử lại.");
        return;
      }

      router.push("/my-orders");
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
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

  if (!product || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF8] px-4">
        <div className="max-w-sm rounded-2xl bg-white p-4 text-center text-sm text-gray-600 shadow-md">
          {error ?? "Không tìm thấy deal này."}
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
          <div className="text-sm">
            <div className="font-semibold text-gray-900">
              {product.store.name}
            </div>
            <div className="text-xs text-gray-600">
              {product.store.address ?? "Địa chỉ đang cập nhật"}
            </div>
          </div>
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
    </div>
  );
}

