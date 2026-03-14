"use client";

import { useMemo, useState, useEffect } from "react";
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
    console.error(error);
    throw error;
  }

  return (
    data?.map((row: any) => {
      const storeData = Array.isArray(row.stores) ? row.stores[0] : row.stores;
      return {
        ...row,
        store: storeData as Store,
      };
    }) ?? []
  );
};

export default function HomePage() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [search, setSearch] = useState("");
  const [userLocation, setUserLocation] = useState<string>("Đang xác định vị trí...");
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserCoords([latitude, longitude]);
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
            );
            const data = await response.json();
            const address = data.address;
            const district = address.suburb || address.district || address.town || address.village || "";
            const city = address.city || address.province || address.state || "";
            
            if (district && city) {
              setUserLocation(`${district}, ${city}`);
            } else if (city) {
              setUserLocation(city);
            } else {
              setUserLocation(data.display_name.split(',')[0]);
            }
          } catch (error) {
            console.error("Lỗi lấy địa chỉ:", error);
            setUserLocation("Hồ Chí Minh, Việt Nam");
          }
        },
        (error) => {
          console.error("Lỗi Geolocation:", error);
          setUserLocation("Vị trí chưa được cấp quyền");
        }
      );
    } else {
      setUserLocation("Trình duyệt không hỗ trợ vị trí");
    }
  }, []);

  const { data, isLoading } = useSWR<Product[]>(
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
        opening_hours: (p.store as any).opening_hours,
        business_type: (p.store as any).business_type,
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

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8] pb-20">
      <header className="sticky top-0 z-20 border-b border-orange-50 bg-white/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm overflow-hidden border border-orange-50">
              <img src="/logo.png" alt="EcoEat Logo" className="h-14 w-14 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-gray-900 leading-none mb-1">
                Eco<span className="text-[#FF6B00]">Eat</span>
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">📍</span>
                <span className="text-xs font-bold text-gray-900 line-clamp-1 max-w-[150px]">
                  {userLocation}
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-base shadow-sm border border-orange-100"
          >
            👤
          </Link>
        </div>

        <div className="mt-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm món ăn, cửa hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border-none bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:bg-white focus:ring-2 focus:ring-orange-100"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="px-4 py-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  filter === "all"
                    ? "bg-[#FF6B00] text-white shadow-md shadow-orange-100"
                    : "bg-white text-gray-500 shadow-sm"
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilter("flash_sale")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  filter === "flash_sale"
                    ? "bg-[#FF6B00] text-white shadow-md shadow-orange-100"
                    : "bg-white text-gray-500 shadow-sm"
                }`}
              >
                Flash Sale 🔥
              </button>
            </div>
            <button
              onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm shadow-sm"
            >
              {viewMode === "list" ? "🗺️" : "📋"}
            </button>
          </div>

          {viewMode === "list" ? (
            isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-3xl bg-orange-50"
                  />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="mb-2 text-4xl">🥡</span>
                <p className="text-sm text-gray-500">
                  Không tìm thấy deal nào phù hợp
                </p>
              </div>
            )
          ) : (
            <div className="h-[calc(100vh-280px)] overflow-hidden rounded-3xl border border-orange-50 bg-white shadow-inner">
              <DynamicMapView
                stores={groupedStores}
                userCoords={userCoords}
              />
            </div>
          )}
        </div>
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
            href={user ? "/my-orders" : "/auth"}
            className="flex flex-col items-center gap-0.5 text-gray-500"
          >
            <span>🧾</span>
            <span>Đơn hàng</span>
          </Link>
          <Link
            href={user ? "/profile" : "/auth"}
            className="flex flex-col items-center gap-0.5 text-gray-500"
          >
            <span>👤</span>
            <span>{user ? "Cá nhân" : "Đăng nhập"}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
