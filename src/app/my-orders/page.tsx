"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code"; // Đảm bảo đã npm install react-qr-code
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type ReservationStatus = "Reserved" | "Completed" | "Expired";

interface Reservation {
  id: string;
  quantity: number;
  qr_code: string;
  status: ReservationStatus;
  expires_at: string | null;
  created_at: string;
  products: {
    id: string;
    name: string;
    sale_price: number;
    image_url: string | null;
    stores: {
      id: string;
      name: string;
      address: string | null;
    } | null;
  } | null;
  reviews: {
    rating: number;
    comment: string | null;
  }[] | null;
}

type Tab = "ongoing" | "completed" | "review";

export default function MyOrdersPage() {
  const [showQR, setShowQR] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<Tab>("ongoing");
  const [submittingReview, setSubmittingReview] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      const { data } = await supabase
        .from("reservations")
        .select(`id, quantity, qr_code, status, expires_at, created_at,
          products (id, name, sale_price, image_url, stores (id, name, address)),
          reviews (rating, comment)`)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped = (data ?? []).map((r: any) => {
        const productData = Array.isArray(r.products) ? r.products[0] : r.products;
        const storeData = productData && Array.isArray(productData.stores) ? productData.stores[0] : productData?.stores;
        return { ...r, products: productData ? { ...productData, stores: storeData || null } : null };
      });
      setReservations(mapped as unknown as Reservation[]);
      setLoading(false);
    };
    load();
  }, [router]);

  const withComputedStatus = useMemo(() => {
    return reservations.map((r) => {
      if (r.status === "Reserved" && r.expires_at) {
        if (new Date(r.expires_at).getTime() <= now.getTime()) {
          return { ...r, status: "Expired" as ReservationStatus };
        }
      }
      return r;
    });
  }, [reservations, now]);

  const ongoingOrders = useMemo(() => withComputedStatus.filter(r => r.status === "Reserved"), [withComputedStatus]);
  const completedOrders = useMemo(() => withComputedStatus.filter(r => r.status === "Completed" || r.status === "Expired"), [withComputedStatus]);
  
  const filteredByTab = useMemo(() => {
    if (activeTab === "ongoing") return ongoingOrders;
    if (activeTab === "completed") return completedOrders;
    if (activeTab === "review") return withComputedStatus.filter(r => r.status === "Completed");
    return [];
  }, [ongoingOrders, completedOrders, withComputedStatus, activeTab]);

  const handleRate = async (reservationId: string, productId: string, rating: number) => {
    setSubmittingReview(reservationId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("reviews").insert({ user_id: user.id, product_id: productId, reservation_id: reservationId, rating });
    setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, reviews: [{ rating, comment: null }] } : r));
    setSubmittingReview(null);
  };

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCFAF8' }}>
      <div style={{ width: '32px', height: '32px', border: '4px solid #FF6A00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#FCFAF8', minHeight: '100vh', paddingBottom: '100px', fontFamily: 'sans-serif' }}>
      {showQR && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '32px', width: '100%', maxWidth: '340px', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setShowQR(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '24px', color: '#CBD5E1', cursor: 'pointer' }}>✕</button>
            <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>MÃ XÁC NHẬN</h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>Đưa mã này cho chủ quán để lấy món nhé!</p>
            <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '24px', display: 'inline-block', border: '2px solid #F1F5F9', marginBottom: '20px' }}>
              <QRCode 
            value={selectedCode} 
            size={160} 
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
         />
            </div>
            <div style={{ background: '#0F172A', padding: '15px', borderRadius: '16px', color: 'white' }}>
              <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '6px' }}>{selectedCode}</span>
            </div>
            <button onClick={() => setShowQR(false)} style={{ marginTop: '24px', width: '100%', padding: '12px', background: 'none', border: 'none', color: '#94A3B8', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>Đóng lại</button>
          </div>
        </div>
      )}

      <header style={{ position: 'sticky', top: 0, height: '70px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #F1F5F9', zIndex: 100 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase' }}>Đơn hàng của tôi</div>
        <div style={{ width: '24px' }} />
      </header>

      {/* TABS */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #F1F5F9', position: 'sticky', top: '70px', zIndex: 99 }}>
        <button onClick={() => setActiveTab("ongoing")} style={{ flex: 1, padding: '16px 0', fontSize: '11px', fontWeight: 900, color: activeTab === 'ongoing' ? '#FF6A00' : '#94A3B8', border: 'none', background: 'none', borderBottom: activeTab === 'ongoing' ? '3px solid #FF6A00' : '3px solid transparent' }}>CHỜ LẤY</button>
        <button onClick={() => setActiveTab("completed")} style={{ flex: 1, padding: '16px 0', fontSize: '11px', fontWeight: 900, color: activeTab === 'completed' ? '#FF6A00' : '#94A3B8', border: 'none', background: 'none', borderBottom: activeTab === 'completed' ? '3px solid #FF6A00' : '3px solid transparent' }}>LỊCH SỬ</button>
        <button onClick={() => setActiveTab("review")} style={{ flex: 1, padding: '16px 0', fontSize: '11px', fontWeight: 900, color: activeTab === 'review' ? '#FF6A00' : '#94A3B8', border: 'none', background: 'none', borderBottom: activeTab === 'review' ? '3px solid #FF6A00' : '3px solid transparent' }}>ĐÁNH GIÁ</button>
      </div>

      <main style={{ padding: '20px' }}>
        {filteredByTab.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '100px', opacity: 0.3 }}><p style={{ fontWeight: 900 }}>CHƯA CÓ ĐƠN HÀNG</p></div>
        ) : (
          filteredByTab.map((order) => (
            <div key={order.id} style={{ background: 'white', borderRadius: '28px', padding: '20px', marginBottom: '16px', border: '1px solid #F1F5F9', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 900, color: '#94A3B8' }}>📍 {order.products?.stores?.name}</span>
                <span style={{ fontSize: '9px', fontWeight: 900, padding: '4px 8px', borderRadius: '99px', background: order.status === 'Reserved' ? '#FF6A001a' : '#F1F5F9', color: order.status === 'Reserved' ? '#FF6A00' : '#94A3B8' }}>{order.status}</span>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <img src={order.products?.image_url?.startsWith('http') ? order.products.image_url : `/${order.products?.image_url}`} style={{ width: '70px', height: '70px', borderRadius: '20px', objectFit: 'cover' }} alt="" />
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 900, margin: 0 }}>{order.products?.name}</h3>
                  <p style={{ color: '#FF6A00', fontWeight: 900, fontSize: '16px', marginTop: '4px' }}>{order.products?.sale_price.toLocaleString()}đ</p>
                </div>
              </div>

              {order.status === "Reserved" && (
                <button 
                  onClick={() => { setSelectedCode(order.qr_code); setShowQR(true); }}
                  style={{ width: '100%', padding: '14px', background: '#10B981', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 900, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                >
                   BẤM ĐỂ HIỆN MÃ NHẬN HÀNG
                </button>
              )}

              {order.status === "Completed" && (
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '15px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => order.products && handleRate(order.id, order.products.id, star)} disabled={!!order.reviews?.length} style={{ fontSize: '24px', background: 'none', border: 'none', opacity: (order.reviews?.[0]?.rating || 0) >= star ? 1 : 0.2, cursor: 'pointer' }}>⭐</button>
                  ))}
                </div>
              )}

              {order.status === "Reserved" && order.expires_at && (
                <div style={{ marginTop: '12px', fontSize: '10px', fontWeight: 900, color: '#EF4444', textAlign: 'center' }}>
                  ⏱ HẾT HẠN SAU: {Math.max(0, Math.floor((new Date(order.expires_at).getTime() - now.getTime()) / 60000))} PHÚT
                </div>
              )}
            </div>
          ))
        )}
      </main>
      <nav style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', height: '75px', background: 'white', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingBottom: '10px', zIndex: 1000 }}>
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
        <Link href="/my-orders" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: '#FF6A00', gap: '4px', textDecoration: 'none', flex: 1 }}>
          <svg width="18" height="20" viewBox="0 0 18 20" fill="none"><path d="M3 20C2.16667 20 1.45833 19.7083 0.875 19.125C0.291667 18.5417 0 17.8333 0 17V14H3V0L4.5 1.5L6 0L7.5 1.5L9 0L10.5 1.5L12 0L13.5 1.5L15 0L16.5 1.5L18 0V17C18 17.8333 17.7083 18.5417 17.125 19.125C16.5417 19.7083 15.8333 20 15 20H3ZM15 18C15.2833 18 15.5208 17.9042 15.7125 17.7125C15.9042 17.5208 16 17.2833 16 17V3H5V14H14V17C14 17.2833 14.0958 17.5208 14.2875 17.7125C14.4792 17.9042 14.7167 18 15 18ZM6 7V5H12V7H6ZM6 10V8H12V10H6Z" fill="currentColor"/></svg>
          <span>Đơn hàng</span>
        </Link>
        <Link href="/profile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: '#94A3B8', gap: '4px', textDecoration: 'none', flex: 1 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0Z" fill="currentColor"/></svg>
          <span>Cá nhân</span>
        </Link>
      </nav>
    </div>
  );
}