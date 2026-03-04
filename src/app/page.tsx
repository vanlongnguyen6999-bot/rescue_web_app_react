 "use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { Product, ProductCategory, Store } from "@/types";
import { ProductCard } from "@/components/ProductCard";
import dynamic from "next/dynamic";
import Link from "next/link";

type FilterTab = "all" | "flash_sale" | "grocery";

const DynamicMapView = dynamic(
  () => import("@/components/MapView"),
  {
    ssr: false,
  }
);

const fetcher = async (): Promise<Product[]> => {
  const today = new Date().toISOString().slice(0, 10);

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
    .eq("is_active", true)
    .gt("quantity", 0)
    .gte("expiry_date", today)
    .order("created_at", { ascending: false });

  if (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    throw error;
  }

  return (
    data?.map((row: any) => ({
      ...row,
      store: row.stores as Store,
    })) ?? []
  );
};

export default function HomePage() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useSWR<Product[]>(
    "products",
    fetcher,
    {
      refreshInterval: 30_000,
    }
  );

  const filteredProducts = useMemo(() => {
    let list = data ?? [];

    if (filter !== "all") {
      list = list.filter((p) => p.category === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.store.name.toLowerCase().includes(q)
      );
    }

    return list;
  }, [data, filter, search]);

  const groupedStores = useMemo(() => {
    const map = new Map<
      string,
      Store & { deal_count: number; has_flash_sale: boolean }
    >();

    (data ?? []).forEach((p) => {
      if (!p.store) return;
      const existing = map.get(p.store.id);
      const base = {
        id: p.store.id,
        name: p.store.name,
        address: p.store.address,
        lat: p.store.lat,
        lng: p.store.lng,
      };
      if (!existing) {
        map.set(p.store.id, {
          ...base,
          deal_count: 1,
          has_flash_sale: p.category === "flash_sale",
        });
      } else {
        existing.deal_count += 1;
        if (p.category === "flash_sale") {
          existing.has_flash_sale = true;
        }
      }
    });

    return Array.from(map.values());
  }, [data]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-2xl bg-orange-50"
            />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
          Không tải được dữ liệu. Vui lòng thử lại sau.
        </div>
      );
    }

    if (!filteredProducts.length) {
      return (
        <div className="rounded-2xl bg-orange-50 p-4 text-sm text-orange-600">
          Chưa có deal nào trong khu vực bạn.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8]">
      <header className="flex items-center justify-between px-4 pb-3 pt-4">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] text-gray-500">
            Quận 1, TP. HCM
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍊</span>
            <div>
              <div className="text-base font-bold text-[#FF6B00]">
                Food Rescue
              </div>
              <p className="text-[11px] text-gray-500">
                Deal cuối ngày • Giảm tới 70%
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/auth"
          className="text-xs font-semibold text-[#FF6B00]"
        >
          Đăng nhập
        </Link>
      </header>

      <main className="flex-1 px-4 pb-20">
        <div className="mb-3 space-y-2">
          <div className="rounded-2xl bg-[#FF6B00] px-4 py-3 text-xs text-white shadow-md shadow-orange-300">
            <div className="text-[10px] font-semibold uppercase tracking-wide">
              URGENT • Sau 20:00
            </div>
            <div className="text-sm font-bold">
              Flash-Sale cuối ngày • Ready-to-eat
            </div>
            <div className="text-[11px] text-orange-50">
              Giải cứu ngay để tránh lãng phí thực phẩm
            </div>
          </div>
          <div className="rounded-full bg-white shadow-md shadow-orange-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm thực phẩm..."
              className="w-full rounded-full px-4 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-2 text-xs font-medium">
            {[
              { id: "all", label: "Tất cả" },
              { id: "flash_sale", label: "Flash Sale cuối ngày" },
              { id: "grocery", label: "Hàng cận date" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as FilterTab)}
                className={`rounded-full px-3 py-1 ${
                  filter === tab.id
                    ? "bg-[#FF6B00] text-white"
                    : "bg-orange-50 text-[#FF6B00]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex rounded-full bg-orange-50 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-full px-2 py-1 ${
                viewMode === "list"
                  ? "bg-[#FF6B00] text-white"
                  : "text-[#FF6B00]"
              }`}
            >
              Danh sách
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`rounded-full px-2 py-1 ${
                viewMode === "map"
                  ? "bg-[#FF6B00] text-white"
                  : "text-[#FF6B00]"
              }`}
            >
              Bản đồ
            </button>
          </div>
        </div>

        {viewMode === "list" ? (
          renderContent()
        ) : (
          <div className="h-[450px] overflow-hidden rounded-2xl bg-gray-100">
            <DynamicMapView stores={groupedStores as any} />
          </div>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-orange-100 bg-white/95 px-4 py-2 text-[11px] text-gray-600 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link
            href="/"
            className="flex flex-col items-center gap-0.5 text-[#FF6B00]"
          >
            <span>🏠</span>
            <span className="font-semibold">Trang chủ</span>
          </Link>
          <Link
            href="/categories"
            className="flex flex-col items-center gap-0.5 text-gray-500"
          >
            <span>🧺</span>
            <span>Danh mục</span>
          </Link>
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className="flex flex-col items-center gap-0.5 text-gray-500"
          >
            <span>🗺️</span>
            <span>Bản đồ</span>
          </button>
          <Link
            href="/my-orders"
            className="flex flex-col items-center gap-0.5 text-gray-500"
          >
            <span>🧾</span>
            <span>Đơn hàng</span>
          </Link>
          <Link
            href="/profile"
            className="flex flex-col items-center gap-0.5 text-gray-500"
          >
            <span>👤</span>
            <span>Cá nhân</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

