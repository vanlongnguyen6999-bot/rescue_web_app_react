"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { Product, Store } from "@/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Tab = "category" | "store";

const fetcher = async (): Promise<Product[]> => {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("products")
    .select("*, stores(*)")
    .eq("is_active", true)
    .gt("quantity", 0)
    .gte("expiry_date", today);

  if (error) throw error;
  return data?.map((row: any) => ({ ...row, store: Array.isArray(row.stores) ? row.stores[0] : row.stores })) ?? [];
};

function getCategoryLabel(cat: string) {
  if (cat === 'flash_sale') return 'Flash Sale Cuối Ngày';
  if (cat === 'grocery') return 'Đi chợ online';
  return cat;
}

function CategoriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(searchParams.get('tab') as Tab || "category");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const { data, isLoading } = useSWR<Product[]>("products", fetcher);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    data?.forEach(p => { if (p.category) cats.add(p.category); });
    return Array.from(cats);
  }, [data]);

  const stores = useMemo(() => {
    const storeMap = new Map<string, Store>();
    data?.forEach(p => { if (p.store) storeMap.set(p.store.id, p.store); });
    return Array.from(storeMap.values());
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF8]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8]">
      <header className="flex items-center justify-between px-4 pb-3 pt-4 border-b border-orange-50 bg-white sticky top-0 z-20">
        <button onClick={() => router.back()} className="h-8 w-8 flex items-center justify-center rounded-full bg-orange-50 text-[#FF6B00]">←</button>
        <h1 className="text-base font-bold text-gray-900">Danh mục</h1>
        <div className="h-8 w-8" />
      </header>

      <div className="mb-4 flex justify-center border-b border-orange-100 bg-white">
        <div className="-mb-px flex gap-8 px-4 text-base font-bold text-gray-500">
          <button type="button" onClick={() => setActiveTab("category")} className={`py-3 transition-all ${activeTab === 'category' ? 'border-b-2 border-[#FF6B00] text-[#FF6B00]' : ''}`}>Theo Loại hàng</button>
          <button type="button" onClick={() => setActiveTab("store")} className={`py-3 transition-all ${activeTab === 'store' ? 'border-b-2 border-[#FF6B00] text-[#FF6B00]' : ''}`}>Theo Cửa hàng</button>
        </div>
      </div>

      <main className="flex-1 p-4 space-y-4">
        {activeTab === 'category' ? (
          categories.map(cat => (
            <Link key={cat} href={`/?category=${cat}`} className="flex w-full items-center justify-between p-6 rounded-3xl bg-white shadow-sm border border-orange-50 hover:border-orange-200 transition-all active:scale-[0.98]">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{cat === "flash_sale" ? "⚡" : "🛒"}</span>
                <span className="text-lg font-bold text-gray-800">{getCategoryLabel(cat)}</span>
              </div>
              <span className="text-2xl text-orange-300">›</span>
            </Link>
          ))
        ) : (
          stores.map(store => (
            <Link key={store.id} href={`/store/${store.id}`} className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm border border-orange-50 active:scale-[0.98] transition-all">
              <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-orange-50 text-3xl">🏪</div>
              <div className="flex-1">
                <div className="text-lg font-extrabold text-gray-900 mb-1">{store.name}</div>
                <div className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{store.address}</div>
              </div>
              <span className="text-2xl text-gray-300">›</span>
            </Link>
          ))
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-orange-100 bg-white/95 px-4 py-2 text-[11px] text-gray-600 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span>🏠</span><span>Trang chủ</span></Link>
          <Link href="/categories" className="flex flex-col items-center gap-0.5 text-[#FF6B00]"><span>🧺</span><span className="font-semibold">Danh mục</span></Link>
          <Link href={user ? "/my-orders" : "/auth"} className="flex flex-col items-center gap-0.5 text-gray-500"><span>🧾</span><span>Đơn hàng</span></Link>
          <Link href={user ? "/profile" : "/auth"} className="flex flex-col items-center gap-0.5 text-gray-500"><span>👤</span><span>{user ? "Cá nhân" : "Đăng nhập"}</span></Link>
        </div>
      </nav>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#FFFDF8]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6B00] border-t-transparent"></div></div>}>
      <CategoriesContent />
    </Suspense>
  );
}