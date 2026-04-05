"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { Product, Store } from "@/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// --- INTERFACES & FETCHER (GIỮ NGUYÊN LOGIC CỦA LONG) ---
interface RawProductResponse extends Product {
  stores: Store[] | Store;
}
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
  return (data as unknown as RawProductResponse[])?.map((row) => ({
    ...row,
    store: Array.isArray(row.stores) ? row.stores[0] : row.stores
  })) ?? [];
};

function getCategoryLabel(cat: string) {
  if (cat === 'flash_sale') return 'Flash Sale Cuối Ngày';
  if (cat === 'grocery') return 'Gian hàng Cận Date';
  if (cat === 'bakery') return 'Bánh mì & Bánh ngọt';
  if (cat === 'meals') return 'Thịt tươi';
  if (cat === 'drinks') return 'Đồ uống giải cứu';
  return cat;
}

function CategoriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter");
  const [activeTab, setActiveTab] = useState<Tab>(searchParams.get('tab') as Tab || "category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>((initialFilter) ? initialFilter : null);
  const [user, setUser] = useState<{id?: string; email?: string} | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if(authUser) setUser({id: authUser.id, email: authUser.email});
    };
    getUser();
  }, [searchParams]);

  const { data, isLoading } = useSWR<Product[]>("products", fetcher);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return data?.filter(p => p.category === selectedCategory) ?? [];
  }, [data, selectedCategory]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#F8F7F5]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6A00] border-t-transparent"></div></div>;

  return (
    <div style={{ backgroundColor: '#F8F7F5', minHeight: '100vh', paddingBottom: '100px', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, width: '100%', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', padding: '16px 20px', borderBottom: '1px solid rgba(255, 106, 0, 0.1)', zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button onClick={() => selectedCategory ? setSelectedCategory(null) : router.back()} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase' }}>Danh mục</h1>
          <button style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', background: '#F1F5F9', padding: '12px 16px', borderRadius: '16px', gap: '12px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="Tìm kiếm loại thực phẩm..." style={{ border: 'none', outline: 'none', fontSize: '14px', width: '100%', color: '#0F172A', background: 'transparent' }} />
        </div>
      </header>
      <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'center', gap: '40px' }}>
          <button onClick={() => {setActiveTab("category"); setSelectedCategory(null)}} style={{ padding: '16px 0', border: 'none', background: 'none', fontSize: '13px', fontWeight: 900, color: activeTab === "category" ? "#FF6A00" : "#94A3B8", borderBottom: activeTab === "category" ? "3px solid #FF6A00" : "3px solid transparent", cursor: 'pointer', textTransform: 'uppercase' }}>Theo Loại hàng</button>
          <button onClick={() => {setActiveTab("store"); setSelectedCategory(null)}} style={{ padding: '16px 0', border: 'none', background: 'none', fontSize: '13px', fontWeight: 900, color: activeTab === "store" ? "#FF6A00" : "#94A3B8", borderBottom: activeTab === "store" ? "3px solid #FF6A00" : "3px solid transparent", cursor: 'pointer', textTransform: 'uppercase' }}>Theo Cửa hàng</button>
      </div>

      <main style={{ padding: '24px 16px', flex: 1 }}>
        {selectedCategory ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 900 }}>{getCategoryLabel(selectedCategory)}</h2>
                    <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>{filteredProducts.length} món sẵn có</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {filteredProducts.map((product) => (
                        <Link key={product.id} href={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
                            <div style={{ background: 'white', borderRadius: '20px', padding: '10px', border: '1px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                                <img src={product.image_url?.startsWith('http') ? product.image_url : `/${product.image_url}`} style={{ width: '100%', height: '110px', borderRadius: '14px', objectFit: 'cover' }} />
                                <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginTop: '10px', marginBottom: '4px' }} className="line-clamp-1">{product.name}</h3>
                                <div style={{ color: '#FF6B00', fontWeight: 900, fontSize: '16px' }}>{product.sale_price.toLocaleString()}đ</div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        ) : activeTab === 'category' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section onClick={() => setSelectedCategory('flash_sale')} style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(135deg, #FF6A00 0%, #EA580C 100%)', color: 'white', cursor: 'pointer', boxShadow: '0 10px 20px rgba(255, 106, 0, 0.2)' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Flash Sale Sau 20:00
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 900, marginTop: '12px' }}>Cứu đói Đêm khuya</h2>
                <p style={{ opacity: 0.9, fontSize: '13px', marginBottom: '20px', fontWeight: 500 }}>Ready-to-eat • Giảm sập sàn 70%</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700 }}>Chỉ còn tối nay</span>
                    <div style={{ background: 'white', color: '#FF6A00', padding: '8px 20px', borderRadius: '12px', fontWeight: 900, fontSize: '13px' }}>XEM NGAY</div>
                </div>
            </section>
            <section onClick={() => setSelectedCategory('grocery')} style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <span style={{ color: '#FF6B00', fontSize: '10px', fontWeight: 900, background: '#FFF4DD', padding: '6px 12px', borderRadius: '8px', textTransform: 'uppercase' }}>Hàng Bách Hóa</span>
                <h2 style={{ fontSize: '22px', fontWeight: 900, marginTop: '12px', color: '#0F172A' }}>Kho Bách Hóa Cận Date</h2>
                <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontWeight: 500 }}>Sữa, đồ đóng hộp • Date &lt; 7 ngày</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                    <div style={{ display: 'flex' }}>
                        {[1, 2, 3].map((i) => (
                           <div key={i} style={{ width: '38px', height: '38px', borderRadius: '50%', border: '3px solid white', background: '#F1F5F9', marginRight: '-12px', overflow: 'hidden' }}>
                              <img src={`/tiem1.jpg`} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                           </div>
                        ))}
                    </div>
                    <span style={{ color: '#FF6B00', fontWeight: 900, fontSize: '13px' }}>KHÁM PHÁ ›</span>
                </div>
            </section>
            <section>
              <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tất cả danh mục</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {[
                  { name: 'Bánh mì', img: '/tiem1.jpg', id: 'bakery' },
                  { name: 'Thịt tươi', img: '/thit.jpg', id: 'meals' },
                  { name: 'Đồ uống', img: '/sua.jpg', id: 'drinks' },
                  { name: 'Trái cây', img: '/traicay.jpg', id: 'fruits' },
                  { name: 'Rau củ', img: '/rau.png', id: 'veggies' },
                  { name: 'Gia vị', img: '/giavi.jpg', id: 'spices' },
                ].map((item, i) => (
                  <div key={i} onClick={() => setSelectedCategory(item.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <div style={{ width: '100%', aspectRatio: '1', background: 'white', borderRadius: '20px', overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)' }}>
                      <img src={item.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>{item.name}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data?.map(p => p.store).filter((v, i, a) => a.findIndex(t => t?.id === v?.id) === i).map(store => (
              <Link key={store?.id} href={`/store/${store?.id}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'white', padding: '16px', borderRadius: '20px', border: '1px solid #F1F5F9', textDecoration: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '50px', height: '50px', background: '#FFF4DD', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏪</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{store?.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }} className="line-clamp-1">{store?.address}</div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>
              </Link>
            ))}
          </div>
        )}
      </main>
      <nav style={{ position: 'fixed', bottom: 0, width: '100%', left: 0, height: '75px', backgroundColor: 'white', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingBottom: '10px', zIndex: 1000 }}>
        <Link href="/" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: '#94A3B8', gap: '4px', textDecoration: 'none', flex: 1 }}>
          <svg width="24" height="24" viewBox="0 0 16 18" fill="none"><path d="M2 16H5V10H11V16H14V7L8 2.5L2 7V16ZM0 18V6L8 0L16 6V18H9V12H7V18H0Z" fill="currentColor"/></svg>
          <span style={{fontWeight: 700}}>Trang chủ</span>
        </Link>
        <Link href="/categories" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: '#FF6A00', gap: '4px', textDecoration: 'none', flex: 1 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M0 8V0H8V8H0ZM0 18V10H8V18H0ZM10 8V0H18V8H10ZM10 18V10H18V18H10ZM2 6H6V2H2V6ZM12 6H16V2H12V6ZM12 16H16V12H12V16ZM2 16H6V12H2V16Z" fill="currentColor"/></svg>
          <span style={{fontWeight: 800}}>Danh mục</span>
        </Link>
        <Link href="/map" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: '#94A3B8', gap: '4px', textDecoration: 'none', flex: 1 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M12 18L6 15.9L1.35 17.7C1.01667 17.8333 0.708333 17.7958 0.425 17.5875C0.141667 17.3792 0 17.1 0 16.75V2.75C0 2.53333 0.0625 2.34167 0.1875 2.175C0.3125 2.00833 0.483333 1.88333 0.7 1.8L6 0L12 2.1L16.65 0.3C16.9833 0.166667 17.2917 0.204167 17.575 0.4125C17.8583 0.620833 18 0.9 18 1.25V15.25C18 15.4667 17.9375 15.6583 17.8125 15.825C17.6875 15.9917 17.5167 16.1167 17.3 16.2L12 18Z" fill="currentColor"/></svg>
          <span style={{fontWeight: 700}}>Bản đồ</span>
        </Link>
        <Link href={user ? "/my-orders" : "/auth"} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: '#94A3B8', gap: '4px', textDecoration: 'none', flex: 1 }}>
          <svg width="18" height="20" viewBox="0 0 18 20" fill="none"><path d="M3 20C2.16667 20 1.45833 19.7083 0.875 19.125C0.291667 18.5417 0 17.8333 0 17V14H3V0L4.5 1.5L6 0L7.5 1.5L9 0L10.5 1.5L12 0L13.5 1.5L15 0L16.5 1.5L18 0V17C18 17.8333 17.7083 18.5417 17.125 19.125C16.5417 19.7083 15.8333 20 15 20H3ZM15 18C15.2833 18 15.5208 17.9042 15.7125 17.7125C15.9042 17.5208 16 17.2833 16 17V3H5V14H14V17C14 17.2833 14.0958 17.5208 14.2875 17.7125C14.4792 17.9042 14.7167 18 15 18ZM6 7V5H12V7H6ZM6 10V8H12V10H6Z" fill="currentColor"/></svg>
          <span style={{fontWeight: 700}}>Đơn hàng</span>
        </Link>
        <Link href={user ? "/profile" : "/auth"} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: '#94A3B8', gap: '4px', textDecoration: 'none', flex: 1 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0Z" fill="currentColor"/></svg>
          <span style={{fontWeight: 700}}>Cá nhân</span>
        </Link>
      </nav>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#F8F7F5]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6A00] border-t-transparent"></div></div>}>
      <CategoriesContent />
    </Suspense>
  );
}