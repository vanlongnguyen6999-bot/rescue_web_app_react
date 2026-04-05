"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Product, Store } from "@/types";
import { ProductCard } from "@/components/ProductCard";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StoreMarker } from "@/components/MapView";

type FilterTab = "all" | "flash_sale" | "grocery";

// Định nghĩa kiểu dữ liệu thô từ Supabase để diệt "any"
interface RawProductRow extends Omit<Product, 'store'> {
  stores: Store | Store[] | null;
}

// 1. Dynamic Import chuẩn cho Leaflet
const DynamicMapView = dynamic(
  () => import("@/components/MapView").then((mod) => mod.MapView),
  { ssr: false }
);

// 2. Fetcher logic chuẩn - KHÔNG dùng any
const fetcher = async (): Promise<Product[]> => {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, name, original_price, sale_price, quantity, expiry_date, category, image_url, is_active, created_at,
      stores ( id, name, address, lat, lng )
    `)
    .eq("is_active", true)
    .gt("quantity", 0)
    .gte("expiry_date", today)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rowData = data as unknown as RawProductRow[];
  
  const formattedData: Product[] = rowData?.map((row) => {
    const storeData = Array.isArray(row.stores) ? row.stores[0] : row.stores;
    return {
      ...row,
      store: storeData as Store,
    };
  }) || [];

  return formattedData;
};

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#FCFAF8]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6A00] border-t-transparent"></div></div>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  
  // --- ĐÃ KHÔI PHỤC DÒNG NÀY ĐỂ HẾT LỖI setMounted ---
  const [mounted, setMounted] = useState(false); 
  
  const [filter, setFilter] = useState<FilterTab>((searchParams.get("filter") as FilterTab) || "all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [search, setSearch] = useState("");
  const [userLocation, setUserLocation] = useState("Đang xác định...");
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const { data, isLoading } = useSWR<Product[]>("products", fetcher, { refreshInterval: 30_000 });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true); // Đánh dấu đã ở phía Client
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserCoords([latitude, longitude]);
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const resData = await response.json();
            const displayName = resData.address.suburb || resData.address.quarter || resData.address.road || "Hà Nội";
            setUserLocation(displayName);
          } catch {
            setUserLocation("Hà Nội, VN");
          }
        },
        () => setUserLocation("Chùa Láng, Láng")
      );
    }
  }, []);

  const filteredProducts = useMemo(() => {
    let list = data ?? [];
    if (filter !== "all") list = list.filter((p) => p.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.store?.name.toLowerCase().includes(q));
    }
    return list;
  }, [data, filter, search]);

  const groupedStores = useMemo(() => {
    const map = new Map<string, StoreMarker>();
    (data ?? []).forEach((p) => {
      if (!p.store) return;
      const existing = map.get(p.store.id);
      if (!existing) {
        map.set(p.store.id, {
          id: p.store.id, name: p.store.name, lat: p.store.lat || 0, lng: p.store.lng || 0, 
          deal_count: 1, has_flash_sale: p.category === "flash_sale"
        });
      } else {
        existing.deal_count += 1;
        if (p.category === "flash_sale") existing.has_flash_sale = true;
      }
    });
    return Array.from(map.values());
  }, [data]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#FCFAF8] font-sans text-[#0F172A] relative overflow-x-hidden">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-30 border-b border-[#F1F5F9] bg-white/95 p-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-1 overflow-hidden max-w-[180px]">
            <span className="text-[#FF6A00]">
              <svg width="14" height="18" viewBox="0 0 10 12" fill="none"><path d="M4.66667 5.83333C4.9875 5.83333 5.26215 5.7191 5.49062 5.49062C5.7191 5.26215 5.83333 4.9875 5.83333 4.66667C5.83333 4.34583 5.7191 4.07118 5.49062 3.84271C5.26215 3.61424 4.9875 3.5 4.66667 3.5C4.34583 3.5 4.07118 3.61424 3.84271 3.84271C3.61424 4.07118 3.5 4.34583 3.5 4.66667C3.5 4.9875 3.61424 5.26215 3.84271 5.49062C4.07118 5.7191 4.34583 5.83333 4.66667 5.83333ZM4.66667 10.1208C5.85278 9.03194 6.73264 8.04271 7.30625 7.15312C7.87986 6.26354 8.16667 5.47361 8.16667 4.78333C8.16667 3.72361 7.82882 2.8559 7.15312 2.18021C6.47743 1.50451 5.64861 1.16667 4.66667 1.16667C3.68472 1.16667 2.8559 1.50451 2.18021 2.18021C1.50451 2.8559 1.16667 3.72361 1.16667 4.78333C1.16667 5.47361 1.45347 6.26354 2.02708 7.15312C2.60069 8.04271 3.48056 9.03194 4.66667 10.1208ZM4.66667 11.6667C3.10139 10.3347 1.93229 9.09757 1.15937 7.95521C0.386458 6.81285 0 5.75556 0 4.78333C0 3.325 0.469097 2.16319 1.40729 1.29792C2.34549 0.432639 3.43194 0 4.66667 0C5.90139 0 6.98785 0.432639 7.92604 1.29792C8.86424 2.16319 9.33333 3.325 9.33333 4.78333C9.33333 5.75556 8.94688 6.81285 8.17396 7.95521C7.40104 9.09757 6.23194 10.3347 4.66667 11.6667Z" fill="#FF6A00"/></svg>
            </span>
            <span className="text-sm font-black text-[#0F172A] truncate">
              {mounted ? userLocation : "Đang xác định..."}
            </span>
            <svg width="7" height="5" viewBox="0 0 7 5" fill="none" className="ml-0.5"><path d="M3.5 4.31667L0 0.816667L0.816667 0L3.5 2.68333L6.18333 0L7 0.816667L3.5 4.31667Z" fill="#64748B"/></svg>
          </div>
          <div className="text-[1.25rem] font-black text-[#FF6A00] tracking-tighter">EcoEat</div>
          <button className="relative p-1">
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none"><path d="M0 17V15H2V8C2 6.61667 2.41667 5.3875 3.25 4.3125C4.08333 3.2375 5.16667 2.53333 6.5 2.2V1.5C6.5 1.08333 6.64583 0.729167 6.9375 0.4375C7.22917 0.145833 7.58333 0 8 0C8.41667 0 8.77083 0.145833 9.0625 0.4375C9.35417 0.729167 9.5 1.08333 9.5 1.5V2.2C10.8333 2.53333 11.9167 3.2375 12.75 4.3125C13.5833 5.3875 14 6.61667 14 8V15H16V17H0ZM8 20C7.45 20 6.97917 19.8042 6.5875 19.4125C6.19583 19.0208 6 18.55 6 18H10C10 18.55 9.80417 19.0208 9.4125 19.4125C9.02083 19.8042 8.55 20 8 20ZM4 15H12V8C12 6.9 11.6083 5.95833 10.825 5.175C10.0417 4.39167 9.1 4 8 4C6.9 4 5.95833 4.39167 5.175 5.175C4.39167 5.95833 4 6.9 4 8V15Z" fill="#0F172A"/></svg>
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
          </button>
        </div>
        
        <div className="relative mt-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
             <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z" fill="#94A3B8"/></svg>
          </div>
          <input 
            type="text" 
            placeholder="Tìm món ngon quanh đây..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl bg-[#F1F5F9] py-3 pl-10 pr-4 text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6A0033]"
          />
        </div>
      </header>

      <main className="flex-1 pb-24">
        <section className="relative h-[200px] w-full bg-[#F1F5F9] overflow-hidden">
          <img src="/banner.jpg" alt="banner" className="h-full w-full object-cover" />
        </section>

        <div className="p-4 space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {(["all", "flash_sale", "grocery"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                  filter === t ? "bg-[#FF6A00] text-white shadow-lg" : "bg-white text-[#94A3B8] border border-[#F1F5F9]"
                }`}
              >
                {t === "all" ? "Tất cả" : t === "flash_sale" ? "Flash Sale 🔥" : "Cận date 📉"}
              </button>
            ))}
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-[#0F172A] uppercase tracking-tight">Deal Hời Giải Cứu</h2>
              <button 
                onClick={() => setViewMode(v => v === 'list' ? 'map' : 'list')}
                className="text-[10px] font-black text-[#FF6A00] bg-[#FF6A001a] px-4 py-2 rounded-xl uppercase"
              >
                {viewMode === 'list' ? "📍 Xem bản đồ" : "📋 Danh sách"}
              </button>
            </div>

            {viewMode === "list" ? (
              <div className="grid grid-cols-2 gap-4">
                {isLoading ? (
                  [1, 2, 3, 4].map(i => <div key={i} className="aspect-square animate-pulse rounded-3xl bg-white border border-[#F1F5F9]" />)
                ) : filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="h-[400px] overflow-hidden rounded-[32px] border-4 border-white shadow-2xl">
                {mounted && (
                   <DynamicMapView stores={groupedStores} userCoords={userCoords} />
                )}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black text-[#0F172A] uppercase tracking-tight">Gian hàng nổi bật</h2>
            <div className="space-y-3">
              {groupedStores.slice(0, 3).map((store) => (
                <Link href={`/store/${store.id}`} key={store.id} className="flex gap-4 rounded-[24px] border border-[#F1F5F9] bg-white p-3 shadow-sm hover:scale-[0.98] transition-transform">
                  <img src="/tiem1.jpg" alt={store.name} className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover" />
                  <div className="flex-1 py-1">
                    <h3 className="font-black text-[#0F172A]">{store.name}</h3>
                    <p className="text-[11px] text-[#64748B] mt-1 line-clamp-1">Hà Nội • Cách bạn 1.2km</p>
                    <div className="flex gap-2 mt-2">
                       <span className="text-[10px] font-black text-[#FF6A00] bg-[#FFF4DD] px-2 py-1 rounded-lg uppercase">{store.deal_count} Deal</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-[#F1F5F9] bg-white/95 px-4 py-3 backdrop-blur-lg pb-6">
        <Link href="/" className="flex flex-col items-center gap-1 text-[#FF6A00]">
          <svg width="24" height="24" viewBox="0 0 16 18" fill="none"><path d="M2 16H5V10H11V16H14V7L8 2.5L2 7V16ZM0 18V6L8 0L16 6V18H9V12H7V18H0Z" fill="currentColor"/></svg>
          <span className="text-[10px] font-black uppercase">Trang chủ</span>
        </Link>
        <Link href="/categories" className="flex flex-col items-center gap-1 text-[#94A3B8]">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M0 8V0H8V8H0ZM0 18V10H8V18H0ZM10 8V0H18V8H10ZM10 18V10H18V18H10ZM2 6H6V2H2V6ZM12 6H16V2H12V6ZM12 16H16V12H12V16ZM2 16H6V12H2V16Z" fill="currentColor"/></svg>
          <span className="text-[10px] font-bold uppercase">Danh mục</span>
        </Link>
        <Link href="/map" className="flex flex-col items-center gap-1 text-[#94A3B8]">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M12 18L6 15.9L1.35 17.7C1.01667 17.8333 0.708333 17.7958 0.425 17.5875C0.141667 17.3792 0 17.1 0 16.75V2.75C0 2.53333 0.0625 2.34167 0.1875 2.175C0.3125 2.00833 0.483333 1.88333 0.7 1.8L6 0L12 2.1L16.65 0.3C16.9833 0.166667 17.2917 0.204167 17.575 0.4125C17.8583 0.620833 18 0.9 18 1.25V15.25C18 15.4667 17.9375 15.6583 17.8125 15.825C17.6875 15.9917 17.5167 16.1167 17.3 16.2L12 18Z" fill="currentColor"/></svg>
          <span className="text-[10px] font-bold uppercase">Bản đồ</span>
        </Link>
        <Link href="/my-orders" className="flex flex-col items-center gap-1 text-[#94A3B8]">
          <svg width="18" height="20" viewBox="0 0 18 20" fill="none"><path d="M3 20C2.16667 20 1.45833 19.7083 0.875 19.125C0.291667 18.5417 0 17.8333 0 17V14H3V0L4.5 1.5L6 0L7.5 1.5L9 0L10.5 1.5L12 0L13.5 1.5L15 0L16.5 1.5L18 0V17C18 17.8333 17.7083 18.5417 17.125 19.125C16.5417 19.7083 15.8333 20 15 20H3ZM15 18C15.2833 18 15.5208 17.9042 15.7125 17.7125C15.9042 17.5208 16 17.2833 16 17V3H5V14H14V17C14 17.2833 14.0958 17.5208 14.2875 17.7125C14.4792 17.9042 14.7167 18 15 18ZM6 7V5H12V7H6ZM6 10V8H12V10H6Z" fill="currentColor"/></svg>
          <span className="text-[10px] font-bold uppercase">Đơn hàng</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-[#94A3B8]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0Z" fill="currentColor"/></svg>
          <span className="text-[10px] font-bold uppercase">Cá nhân</span>
        </Link>
      </nav>
    </div>
  );
}