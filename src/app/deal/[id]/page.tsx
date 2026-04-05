"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import QRCode from "react-qr-code";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/types";
import { differenceInHours, parseISO } from "date-fns";

export default function DealDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params?.id;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [reservation, setReservation] = useState<{
    id: string;
    qr_code: string;
    expires_at: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(9 * 60 + 45); 
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return { min: m < 10 ? `0${m}` : m, sec: s < 10 ? `0${s}` : s };
  };
  useEffect(() => {
    if (!productId) return;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from("products").select("*, stores (*)").eq("id", productId).maybeSingle();
        if (data) {
          const storeData = Array.isArray(data.stores) ? data.stores[0] : data.stores;
          setProduct({ ...data, store: storeData || null } as unknown as Product);
          const { data: { user } } = await supabase.auth.getUser();
          if (user && storeData?.id) {
            const { data: fData } = await supabase.from("follows").select("id").eq("user_id", user.id).eq("store_id", storeData.id).maybeSingle();
            setIsFollowing(!!fData);
          }
        } else { setFetchError("Không tìm thấy deal."); }
      } catch { setFetchError("Lỗi hệ thống."); } finally { setLoading(false); }
    };
    fetchProduct();
  }, [productId]);
  const handleReserve = async () => {
    if (!product) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setActionError("Vui lòng đăng nhập."); setTimeout(() => router.push("/auth"), 2000); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id, quantity }),
      });
      const body = await res.json();
      if (res.ok) setReservation({ id: body.reservation_id, qr_code: body.qr_code, expires_at: body.expires_at });
      else setActionError(body?.message || "Lỗi giữ chỗ.");
    } catch { setActionError("Lỗi hệ thống."); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#F8F7F5]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6A00] border-t-transparent" /></div>;
  if (!product) return <div className="p-10 text-center">{fetchError}</div>;

  const { min, sec } = formatTime(timeLeft);

  return (
    <div style={{ backgroundColor: '#F8F7F5', minHeight: '100vh', paddingBottom: '120px' }}>
      <header style={{ position: 'sticky', top: 0, height: '70px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Thông tin giải cứu</h1>
          <button style={{ background: 'none', border: 'none' }}>
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </header>

      <main style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ background: '#FFF7ED', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '24px', textAlign: 'center' }}>
            <span style={{ color: '#FF6A00', fontSize: '14px', fontWeight: 600, letterSpacing: '0.5px' }}>THỜI GIAN GIỮ CHỖ CÒN LẠI</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{ background: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #FFEDD5', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#FF6A00' }}>{min}</div>
                    <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase' }}>Phút</div>
                </div>
                <span style={{ color: '#FF6A00', fontSize: '24px', fontWeight: 700 }}>:</span>
                <div style={{ background: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #FFEDD5', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#FF6A00' }}>{sec}</div>
                    <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase' }}>Giây</div>
                </div>
            </div>
        </div>
        <div style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid #F1F5F9', display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            <img src={product.image_url || ""} style={{ width: '100px', height: '100px', borderRadius: '12px', objectFit: 'cover' }} />
            <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{product.name}</h2>
                <div style={{ fontSize: '14px', color: '#64748B', textDecoration: 'line-through' }}>{product.original_price.toLocaleString()}đ</div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: '#FF6A00' }}>{product.sale_price.toLocaleString()}đ</span>
                    <span style={{ background: '#FF6A00', color: 'white', fontSize: '11px', padding: '4px 8px', borderRadius: '6px', marginLeft: '12px' }}>
                      -{Math.round(((product.original_price - product.sale_price) / product.original_price) * 100)}%
                    </span>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F8F7F5', padding: '6px', borderRadius: '99px', height: 'fit-content', alignSelf: 'center' }}>
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <svg width="12" height="2" viewBox="0 0 12 2" fill="none"><path d="M0 1H12" stroke="#475569" strokeWidth="1.5"/></svg>
                </button>
                <span style={{ fontWeight: 800, fontSize: '18px', padding: '0 8px' }}>{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(product.quantity, q + 1))} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 0V12M0 6H12" stroke="#475569" strokeWidth="1.5"/></svg>
                </button>
            </div>
        </div>
        <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #F1F5F9', marginTop: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Chi tiết giải cứu</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px' }}>
                <span style={{ color: '#64748B' }}>Tạm tính</span>
                <span style={{ fontWeight: 600 }}>{(product.original_price * quantity).toLocaleString()}đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px' }}>
                <span style={{ color: '#64748B' }}>Tiết kiệm giải cứu</span>
                <span style={{ color: '#FF6A00', fontWeight: 600 }}>-{( (product.original_price - product.sale_price) * quantity ).toLocaleString()}đ</span>
            </div>
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700 }}>Tổng cộng</span>
                <span style={{ fontSize: '26px', fontWeight: 900, color: '#FF6A00' }}>{(product.sale_price * quantity).toLocaleString()}đ</span>
            </div>
        </div>
      </main>
      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: 'white', padding: '20px', borderTop: '1px solid #F1F5F9', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {actionError && <div style={{ color: '#EF4444', fontSize: '12px', textAlign: 'center', fontWeight: 600 }}>{actionError}</div>}
        <button 
          disabled={submitting || product.quantity <= 0}
          onClick={handleReserve}
          style={{ width: '100%', padding: '18px', background: '#FF6A00', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(255, 106, 0, 0.2)' }}
        >
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none"><path d="M13 9C12.1667 9 11.4583 8.70833 10.875 8.125C10.2917 7.54167 10 6.83333 10 6C10 5.16667 10.2917 4.45833 10.875 3.875C11.4583 3.29167 12.1667 3 13 3C13.8333 3 14.5417 3.29167 15.125 3.875C15.7083 4.45833 16 5.16667 16 6C16 6.83333 15.7083 7.54167 15.125 8.125C14.5417 8.70833 13.8333 9 13 9ZM6 12C5.45 12 4.97917 11.8042 4.5875 11.4125C4.19583 11.0208 4 10.55 4 10V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H20C20.55 0 21.0208 0.195833 21.4125 0.5875C21.8042 0.979167 22 1.45 22 2V10C22 10.55 21.8042 11.0208 21.4125 11.4125C21.0208 11.8042 20.55 12 20 12H6ZM8 10H18C18 9.45 18.1958 8.97917 18.5875 8.5875C18.9792 8.19583 19.45 8 20 8V4C19.45 4 18.9792 3.80417 18.5875 3.4125C18.1958 3.02083 18 2.55 18 2H8C8 2.55 7.80417 3.02083 7.4125 3.4125C7.02083 3.80417 6.55 4 6 4V8C6.55 8 7.02083 8.19583 7.4125 8.5875C7.80417 8.97917 8 9.45 8 10ZM19 16H2C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V3H2V14H19V16ZM6 10V2V10Z" fill="white"/></svg>
          {submitting ? "Đang xử lý..." : "Giữ chỗ & Thanh toán tại quầy"}
        </button>
      </div>
      {reservation && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '32px', padding: '32px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px' }}>Giữ chỗ thành công! ✅</h3>
            <div style={{ padding: '24px', background: '#F8F7F5', borderRadius: '24px', marginBottom: '24px' }}>
                <QRCode value={reservation.qr_code} size={180} style={{ margin: '0 auto' }} />
                <div style={{ marginTop: '16px', fontWeight: 900, color: '#FF6A00', fontSize: '18px' }}>{reservation.qr_code.toUpperCase()}</div>
            </div>
            <button onClick={() => router.push("/my-orders")} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#FF6A00', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Xem đơn của tôi</button>
            <button onClick={() => setReservation(null)} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#94A3B8', fontWeight: 600, cursor: 'pointer' }}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}