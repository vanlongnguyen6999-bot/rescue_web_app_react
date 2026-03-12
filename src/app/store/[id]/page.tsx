"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Store, Product } from "@/types";
import { ProductCard } from "@/components/ProductCard";
import Link from "next/link";

interface StoreDetail extends Store {
  rating_avg?: number;
  rating_count?: number;
}

export default function StoreDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const storeId = params?.id;
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;

    const fetchStoreData = async () => {
      setLoading(true);
      try {
        // 1. Lấy thông tin cửa hàng
        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select("*")
          .eq("id", storeId)
          .maybeSingle();

        if (storeError || !storeData) {
          setError("Không tìm thấy thông tin cửa hàng.");
          return;
        }

        // 2. Lấy đánh giá trung bình từ hàm RPC của Supabase
        const { data: ratingData, error: ratingError } = await supabase
          .rpc('get_store_rating', { p_store_id: storeId })
          .maybeSingle();

        if (ratingError) {
          console.error("Error fetching store rating:", ratingError);
        }

        const ratingInfo = ratingData as any;

        setStore({
          ...storeData,
          rating_avg: ratingInfo?.avg_rating ?? 0,
          rating_count: ratingInfo?.review_count ?? 0,
        });

        // 3. Lấy các deal đang bán của cửa hàng
        const today = new Date().toISOString().slice(0, 10);
        const { data: productsData } = await supabase
          .from("products")
          .select("*, stores(*)")
          .eq("store_id", storeId)
          .eq("is_active", true)
          .gt("quantity", 0)
          .gte("expiry_date", today)
          .order("created_at", { ascending: false });

        if (productsData) {
          setProducts(productsData.map((p: any) => ({
            ...p,
            store: Array.isArray(p.stores) ? p.stores[0] : p.stores
          })) as Product[]);
        }

      } catch (err) {
        console.error("Error fetching store detail:", err);
        setError("Đã có lỗi xảy ra. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [storeId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF8]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF8] px-4">
        <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-md">
          <div className="mb-3 text-3xl">🏪</div>
          <div className="text-sm font-medium text-gray-900 mb-4">{error || "Cửa hàng không tồn tại"}</div>
          <button
            onClick={() => router.back()}
            className="w-full rounded-xl bg-orange-50 py-2 text-xs font-semibold text-[#FF6B00]"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8] pb-10">
      <header className="flex items-center justify-between px-4 pb-3 pt-4 border-b border-orange-50 bg-white sticky top-0 z-20">
        <button onClick={() => router.back()} className="h-8 w-8 flex items-center justify-center rounded-full bg-orange-50 text-[#FF6B00]">←</button>
        <h1 className="text-base font-bold text-gray-900">Thông tin</h1>
        <div className="h-8 w-8" />
      </header>

      <main className="p-4 space-y-6">
        {/* Tên và Đánh giá */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900">{store.name}</h2>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-lg">★</span>
              <span className="font-bold text-gray-900">{store.rating_avg || "0.0"}</span>
              <span className="text-gray-400">({store.rating_count || 0})</span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1 text-gray-600">
              <span>🕒</span>
              <span>15-30 phút</span>
            </div>
          </div>
        </div>

        {/* Bản đồ nhỏ (Static placeholder hoặc link) */}
        <div className="relative h-32 w-full overflow-hidden rounded-2xl bg-orange-50 border border-orange-100">
          <div className="absolute inset-0 flex items-center justify-center text-xs text-orange-400 p-4 text-center">
            {store.address || "Chưa có bản đồ"}
          </div>
          {store.lat && store.lng && (
            <div className="absolute bottom-2 right-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-medium text-gray-600 shadow-sm">
              Xem vị trí
            </div>
          )}
        </div>

        {/* Thông tin chi tiết */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-lg text-blue-500">📍</span>
            <div className="flex-1">
              <p className="text-sm text-gray-800 leading-snug">
                {store.address || "Chưa cập nhật địa chỉ"}
              </p>
            </div>
            <span className="text-gray-300">›</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-lg text-blue-500">🍴</span>
            <div className="flex-1">
              <p className="text-sm text-gray-800">
                Phân loại: <span className="font-medium">{store.business_type || "Chưa cập nhật"}</span>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3 text-blue-500">
              <span className="text-lg">🕒</span>
              <span className="text-sm font-medium text-gray-800">Giờ mở cửa:</span>
            </div>
            <div className="pl-8 flex justify-between text-sm">
              <span className="text-gray-500">Thứ 2 - Chủ nhật</span>
              <span className="font-bold text-gray-800">{store.opening_hours || "Chưa cập nhật"}</span>
            </div>
          </div>
        </div>

        {/* Danh sách Deal của cửa hàng */}
        <div className="pt-4 space-y-4">
          <h3 className="text-base font-bold text-gray-900">Deal đang bán</h3>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-orange-50 p-6 text-center text-sm text-orange-600">
              Hiện cửa hàng chưa có deal nào mới.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
