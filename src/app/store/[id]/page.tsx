"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Store, Product } from "@/types";
import Link from "next/link";
import dynamic from "next/dynamic";
import { StoreMarker } from "@/components/MapView";

const DynamicMapView = dynamic(
  () => import("@/components/MapView").then((mod) => mod.MapView),
  { ssr: false }
);

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
  const [showMap, setShowMap] = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<'flash' | 'date'>('flash');

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => setUserCoords([pos.coords.latitude, pos.coords.longitude]));
    }
    if (!storeId) return;

    const fetchStoreData = async () => {
      setLoading(true);
      try {
        const { data: storeData } = await supabase.from("stores").select("*").eq("id", storeId).maybeSingle();
        if (storeData) {
          const { data: ratingData } = await supabase.rpc('get_store_rating', { p_store_id: storeId }).maybeSingle();
          const ratingInfo = ratingData as {avg_rating: number ; review_count: number} || null;
          setStore({ ...storeData, rating_avg: ratingInfo?.avg_rating ?? 0, rating_count: ratingInfo?.review_count ?? 0 });
        }
        const today = new Date().toISOString().slice(0, 10);
        const { data: pData } = await supabase.from("products").select("*, stores(*)").eq("store_id", storeId).eq("is_active", true).gt("quantity", 0).gte("expiry_date", today).order("created_at", { ascending: false });
        if (pData) setProducts(pData as unknown as Product[]);
      } catch (err) { setError("Lỗi tải dữ liệu"); } finally { setLoading(false); }
    };
    fetchStoreData();
  }, [storeId]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#FCFAF8]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6A00] border-t-transparent"></div></div>;
  if (error || !store) return <div className="p-10 text-center">{error || "Cửa hàng không tồn tại"}</div>;

  return (
    <div style={{ backgroundColor: '#FCFAF8', minHeight: '100vh', paddingBottom: '100px' }}>
      
      {/* HEADER */}
      <header style={{ position: 'sticky', top: 0, height: '70px', backgroundColor: 'rgba(248, 247, 245, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, borderBottom: '1px solid rgba(255, 106, 0, 0.1)' }}>
        <div style={{ width: '100%', maxWidth: '1100px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => router.back()} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Thông tin</h1>
          <button style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* SHOP INFO */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #eee' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <img src={store.image_url || "/images/store-default.jpg"} style={{ width: '85px', height: '85px', borderRadius: '14px', objectFit: 'cover' }} alt="Logo" />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{store.name}</h2>
                <button onClick={() => setIsFavorite(!isFavorite)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF6A00' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorite ? "#FF6A00" : "none"} stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginTop: '4px' }}>
                <span style={{ color: '#FF6A00', fontWeight: 700 }}>★ {store.rating_avg}</span>
                <span style={{ color: '#94A3B8' }}>•</span>
                {store.lat && store.lng && userCoords && (
                  <span style={{ color: '#64748B' }}>{calculateDistance(userCoords[0], userCoords[1], store.lat, store.lng)} km</span>
                )}
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>{store.address}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 700, background: '#FF6A00', color: 'white', border: 'none' }}>Follow</button>
            <button style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 700, background: '#FFF1E6', color: '#FF6A00', border: 'none' }}>Nhắn tin</button>
          </div>
        </div>

        {/* MAP MINI */}
        {store.lat && store.lng && (
          <div onClick={() => setShowMap(true)} style={{ height: '160px', width: '100%', borderRadius: '20px', overflow: 'hidden', marginTop: '16px', position: 'relative', cursor: 'pointer', border: '1px solid #eee' }}>
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <button style={{ background: 'white', padding: '8px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: 800, color: '#FF6A00', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>📍 Xem đường đi</button>
            </div>
            <div style={{ opacity: 0.6, height: '100%' }}>
              <DynamicMapView stores={[{ id: store.id, name: store.name, lat: store.lat, lng: store.lng, deal_count: products.length, has_flash_sale: true } as StoreMarker]} userCoords={null} />
            </div>
          </div>
        )}

        {/* TABS */}
        <div style={{ display: 'flex', gap: '32px', borderBottom: '2px solid #F1F5F9', marginTop: '32px' }}>
          <button onClick={() => setActiveTab('flash')} style={{ padding: '16px 0', border: 'none', background: 'none', fontSize: '16px', fontWeight: 800, color: activeTab === 'flash' ? '#FF6A00' : '#94A3B8', position: 'relative', cursor: 'pointer' }}>
            Flash-Sale Cuối Ngày
            {activeTab === 'flash' && <div style={{ position: 'absolute', bottom: '-2px', left: 0, width: '100%', height: '3px', background: '#FF6A00', borderRadius: '10px' }} />}
          </button>
          <button onClick={() => setActiveTab('date')} style={{ padding: '16px 0', border: 'none', background: 'none', fontSize: '16px', fontWeight: 800, color: activeTab === 'date' ? '#FF6A00' : '#94A3B8', position: 'relative', cursor: 'pointer' }}>
            Gian hàng Cận Date
            {activeTab === 'date' && <div style={{ position: 'absolute', bottom: '-2px', left: 0, width: '100%', height: '3px', background: '#FF6A00', borderRadius: '10px' }} />}
          </button>
        </div>

        {/* PRODUCTS */}
        <div style={{ marginTop: '20px' }}>
          {products.filter(p => activeTab === 'flash' ? p.category === 'flash_sale' : p.category === 'grocery').map(product => (
            <div key={product.id} style={{ background: 'white', borderRadius: '20px', padding: '16px', marginBottom: '16px', display: 'flex', gap: '16px', border: '1px solid rgba(0,0,0,0.03)', position: 'relative' }}>
              <div style={{ width: '100px', height: '100px', flexShrink: 0, position: 'relative' }}>
                <img src={product.image_url || "https://placehold.co/150x150"} style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 6, left: 6, background: '#FF6A00', color: 'white', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>-{Math.round(((product.original_price - product.sale_price) / product.original_price) * 100)}%</div>
                {activeTab === 'date' && <div style={{ position: 'absolute', bottom: 6, left: -4, background: '#F59E0B', color: 'white', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>Cận date</div>}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800 }}>{product.name}</h3>
                  {activeTab === 'date' && <p style={{ color: '#EF4444', fontSize: '12px', fontWeight: 700, marginBottom: '2px' }}>HSD: {product.expiry_date}</p>}
                  <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.4' }}>{product.description}</p>
                  <p style={{ fontSize: '13px', color: '#FF6A00', fontWeight: 800, marginTop: '4px' }}>Còn lại {product.quantity} phần</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', textDecoration: 'line-through' }}>{product.original_price.toLocaleString()}đ</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#FF6A00' }}>{product.sale_price.toLocaleString()}đ</div>
                  </div>
                  <button style={{ width: '40px', height: '40px', background: '#FFF1E6', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- ĐÃ THÊM: BOTTOM NAVIGATION (5 MỤC) --- */}
      <nav style={{
        position: 'fixed', bottom: 0, width: '100%', left: 0, height: '75px',
        backgroundColor: 'white', borderTop: '1px solid #E2E8F0',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 1000
      }}>
        <Link href="/" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: '#94A3B8', gap: '4px', textDecoration: 'none', flex: 1 }}>
          <svg width="24" height="24" viewBox="0 0 16 18" fill="none"><path d="M2 16H5V10H11V16H14V7L8 2.5L2 7V16ZM0 18V6L8 0L16 6V18H9V12H7V18H0Z" fill="currentColor"/></svg>
          <span>Trang chủ</span>
        </Link>
        <Link href="/categories" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: '#94A3B8', gap: '4px', textDecoration: 'none', flex: 1 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M0 8V0H8V8H0ZM0 18V10H8V18H0ZM10 8V0H18V8H10ZM10 18V10H18V18H10ZM2 6H6V2H2V6ZM12 6H16V2H12V6ZM12 16H16V12H12V16ZM2 16H6V12H2V16Z" fill="currentColor"/></svg>
          <span>Danh mục</span>
        </Link>
        <Link href="/map" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: '#94A3B8', gap: '4px', textDecoration: 'none', flex: 1 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M12 18L6 15.9L1.35 17.7C1.01667 17.8333 0.708333 17.7958 0.425 17.5875C0.141667 17.3792 0 17.1 0 16.75V2.75C0 2.53333 0.0625 2.34167 0.1875 2.175C0.3125 2.00833 0.483333 1.88333 0.7 1.8L6 0L12 2.1L16.65 0.3C16.9833 0.166667 17.2917 0.204167 17.575 0.4125C17.8583 0.620833 18 0.9 18 1.25V15.25C18 15.4667 17.9375 15.6583 17.8125 15.825C17.6875 15.9917 17.5167 16.1167 17.3 16.2L12 18Z" fill="currentColor"/></svg>
          <span>Bản đồ</span>
        </Link>
        <Link href="/my-orders" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: '#94A3B8', gap: '4px', textDecoration: 'none', flex: 1 }}>
          <svg width="18" height="20" viewBox="0 0 18 20" fill="none"><path d="M3 20C2.16667 20 1.45833 19.7083 0.875 19.125C0.291667 18.5417 0 17.8333 0 17V14H3V0L4.5 1.5L6 0L7.5 1.5L9 0L10.5 1.5L12 0L13.5 1.5L15 0L16.5 1.5L18 0V17C18 17.8333 17.7083 18.5417 17.125 19.125C16.5417 19.7083 15.8333 20 15 20H3ZM15 18C15.2833 18 15.5208 17.9042 15.7125 17.7125C15.9042 17.5208 16 17.2833 16 17V3H5V14H14V17C14 17.2833 14.0958 17.5208 14.2875 17.7125C14.4792 17.9042 14.7167 18 15 18ZM6 7V5H12V7H6ZM6 10V8H12V10H6Z" fill="currentColor"/></svg>
          <span>Đơn hàng</span>
        </Link>
        <Link href="/profile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: '#94A3B8', gap: '4px', textDecoration: 'none', flex: 1 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0Z" fill="currentColor"/></svg>
          <span>Cá nhân</span>
        </Link>
      </nav>

      {/* MODAL MAP */}
      {showMap && store.lat && store.lng && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg h-[500px] bg-white rounded-3xl overflow-hidden shadow-2xl">
            <button onClick={() => setShowMap(false)} style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 160, background: 'white', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>✕</button>
            <DynamicMapView stores={[{ id: store.id, name: store.name, lat: store.lat, lng: store.lng, deal_count: products.length, has_flash_sale: true } as StoreMarker]} userCoords={userCoords} />
          </div>
        </div>
      )}
    </div>
  );
}