"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { Product, Store } from "@/types";
import { ProductCard } from "@/components/ProductCard";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Tab = "category" | "store";

const fetcher = async (): Promise<Product[]> => {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      stores (*)
    `)
    .eq("is_active", true)
    .gt("quantity", 0)
    .gte("expiry_date", today)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data?.map((row: any) => ({ ...row, store: row.stores })) ?? [];
};

function CategoriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("category");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const { data, isLoading } = useSWR<Product[]>("products", fetcher);

  // Lấy danh sách các loại hàng độc nhất
  const categories = useMemo(() => {
    const cats = new Set<string>();
    data?.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [data]);

  // Lấy danh sách các cửa hàng độc nhất
  const stores = useMemo(() => {
    const storeMap = new Map<string, Store>();
    data?.forEach(p => {
      if (p.store) storeMap.set(p.store.id, p.store);
    });
    return Array.from(storeMap.values());
  }, [data]);

  // Lọc sản phẩm theo lựa chọn
  const filteredProducts = useMemo(() => {
    if (!selectedItem) return [];
    if (activeTab === "category") {
      return data?.filter(p => p.category === selectedItem) ?? [];
    } else {
      return data?.filter(p => p.store?.id === selectedItem) ?? [];
    }
  }, [data, activeTab, selectedItem]);

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "flash_sale": return "Flash Sale cuối ngày";
      case "grocery": return "Hàng cận date";
      default: return cat;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8]">
      <header className="flex items-center justify-between px-4 pb-3 pt-4 border-b border-orange-50 bg-white">
        <button onClick={() => router.back()} className="h-8 w-8 flex items-center justify-center rounded-full bg-orange-50 text-[#FF6B00]">←</button>
        <h1 className="text-base font-bold text-gray-900">Danh mục</h1>
        <div className="h-8 w-8" />
      </header>

      {/* Tab Switcher */}
      <div className="flex bg-white px-4 border-b border-orange-50">
        <button 
          onClick={() => { setActiveTab("category"); setSelectedItem(null); }}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "category" ? "text-[#FF6B00] border-b-2 border-[#FF6B00]" : "text-gray-500"}`}
        >
          Theo Loại hàng
        </button>
        <button 
          onClick={() => { setActiveTab("store"); setSelectedItem(null); }}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "store" ? "text-[#FF6B00] border-b-2 border-[#FF6B00]" : "text-gray-500"}`}
        >
          Theo Cửa hàng
        </button>
      </div>

      <main className="flex-1 overflow-y-auto pb-24">
        {!selectedItem ? (
          <div className="p-4 grid grid-cols-1 gap-3">
            {activeTab === "category" ? (
              categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedItem(cat)}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white shadow-sm border border-orange-50 hover:border-orange-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat === "flash_sale" ? "⚡" : "🛒"}</span>
                    <span className="font-semibold text-gray-700">{getCategoryLabel(cat)}</span>
                  </div>
                  <span className="text-orange-300">›</span>
                </button>
              ))
            ) : (
              stores.map(store => (
                <Link
                  key={store.id}
                  href={`/store/${store.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98] transition-all"
                >
                  <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-orange-50 text-xl">
                    🏪
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-900">{store.name}</div>
                    <div className="text-[11px] text-gray-500 line-clamp-1">{store.address}</div>
                  </div>
                  <span className="text-gray-300">›</span>
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">
                {activeTab === "category" ? getCategoryLabel(selectedItem) : stores.find(s => s.id === selectedItem)?.name}
              </h2>
              <button onClick={() => setSelectedItem(null)} className="text-xs text-[#FF6B00] font-medium">Quay lại</button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-orange-50" />
            ))}
          </div>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-orange-100 bg-white/95 px-4 py-2 text-[11px] text-gray-600 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500">
            <span>🏠</span>
            <span>Trang chủ</span>
          </Link>
          <Link href="/categories" className="flex flex-col items-center gap-0.5 text-[#FF6B00]">
            <span>🧺</span>
            <span className="font-semibold">Danh mục</span>
          </Link>
          <Link href={user ? "/my-orders" : "/auth"} className="flex flex-col items-center gap-0.5 text-gray-500">
            <span>🧾</span>
            <span>Đơn hàng</span>
          </Link>
          <Link href={user ? "/profile" : "/auth"} className="flex flex-col items-center gap-0.5 text-gray-500">
            <span>👤</span>
            <span>{user ? "Cá nhân" : "Đăng nhập"}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF8]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    }>
      <CategoriesContent />
    </Suspense>
  );
}
