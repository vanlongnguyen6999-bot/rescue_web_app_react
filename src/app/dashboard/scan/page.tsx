"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Định nghĩa Interface rõ ràng cho kết quả trả về từ API
interface ReservationDetail {
  id: string;
  status: string;
  quantity: number;
  expires_at: string | null;
  users: {
    full_name: string | null;
    email: string;
  } | null;
  products: {
    name: string;
    store_id: string;
  } | null;
}

// Định nghĩa kiểu cho lỗi API
interface ApiError {
  message: string;
}

export default function ScanPage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReservationDetail | null>(null);
  const [isAuthorized, setAuthorized] = useState<boolean>(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // Kiểm tra quyền: Phải là store_owner
      if (!user || user.user_metadata?.role !== 'store_owner') {
        alert("Bạn không có quyền truy cập.");
        router.replace('/');
      } else {
        setAuthorized(true);
      }
    };
    checkUser();
  }, [router]);

  const handleConfirm = async () => {
    const trimmedCode = qrCode.trim().toUpperCase();
    if (!trimmedCode) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/reservations/confirm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_code: trimmedCode }),
      });

      const data: ReservationDetail | ApiError = await res.json();

      if (!res.ok) {
        // Ép kiểu về ApiError để lấy message
        const errorData = data as ApiError;
        setError(errorData.message ?? "Mã không hợp lệ hoặc đã hết hạn.");
      } else {
        // Ép kiểu về ReservationDetail khi thành công
        setResult(data as ReservationDetail);
        setQrCode(""); 
      }
    } catch (err: unknown) {
      // Xử lý lỗi hệ thống/kết nối không dùng any
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Lỗi kết nối Server không xác định");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) return null;

  return (
    <div style={{ backgroundColor: '#F8F7F5', minHeight: '100vh', paddingBottom: '100px' }}>
      
      {/* HEADER */}
      <header style={{ 
        height: '70px', background: 'white', display: 'flex', alignItems: 'center', 
        justifyContent: 'center', borderBottom: '1px solid rgba(255,106,0,0.1)', position: 'sticky', top: 0, zIndex: 100 
      }}>
        <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          <button 
            onClick={() => router.push("/dashboard")} 
            style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Xác nhận đơn hàng</h1>
          <div style={{ width: '40px' }} />
        </div>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* NHẬP MÃ (INPUT SECTION) */}
        <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,106,0,0.1)', textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '60px', height: '60px', background: '#FFF7ED', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Nhập mã giải cứu</h2>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>Dán mã từ máy khách hoặc nhập thủ công</p>

          <input
            type="text"
            value={qrCode}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQrCode(e.target.value)}
            style={{ 
              width: '100%', padding: '18px', borderRadius: '16px', border: '2px dashed #E2E8F0', 
              fontSize: '20px', fontWeight: 'bold', color: '#FF6A00', textAlign: 'center', outline: 'none', backgroundColor: '#F8FAFC' 
            }}
            placeholder="VÍ DỤ: ECO-YIF6YMI"
          />

          {error && (
            <div style={{ marginTop: '16px', padding: '12px', borderRadius: '12px', backgroundColor: '#FEE2E2', color: '#EF4444', fontSize: '13px', fontWeight: 700 }}>
              ⚠️ {error}
            </div>
          )}

          <button
            disabled={loading || !qrCode.trim()}
            onClick={handleConfirm}
            style={{ 
              marginTop: '24px', width: '100%', padding: '18px', borderRadius: '16px', 
              background: '#FF6A00', color: 'white', fontWeight: 700, border: 'none', fontSize: '16px',
              cursor: 'pointer', opacity: (loading || !qrCode.trim()) ? 0.7 : 1, transition: '0.3s'
            }}
          >
            {loading ? "ĐANG XỬ LÝ..." : "XÁC NHẬN NHẬN HÀNG"}
          </button>
        </div>

        {/* KẾT QUẢ THÀNH CÔNG */}
        {result && (
          <div style={{ marginTop: '24px', background: 'white', padding: '24px', borderRadius: '24px', border: '2px solid #22C55E', animation: 'slideUp 0.4s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', background: '#DCFCE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#166534' }}>XÁC NHẬN THÀNH CÔNG!</h3>
                <div style={{ fontSize: '12px', color: '#22C55E', fontWeight: 600 }}>ID Đơn: #{result.id.slice(0,8).toUpperCase()}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>{result.products?.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: '#64748B' }}>Khách hàng:</span>
                <span style={{ fontWeight: 700 }}>{result.users?.full_name || result.users?.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#64748B' }}>Số lượng:</span>
                <span style={{ fontWeight: 800, color: '#FF6A00', fontSize: '18px' }}>x{result.quantity}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER FIXED CĂN GIỮA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: 'white', padding: '16px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'center', zIndex: 1000 }}>
        <button 
          onClick={() => router.push("/dashboard")} 
          style={{ width: '90%', maxWidth: '400px', padding: '16px', borderRadius: '12px', background: '#FF6A00', color: 'white', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '16px', cursor: 'pointer' }}
        >
          <svg width="16" height="18" viewBox="0 0 16 18" fill="none"><path d="M2 16H5V10H11V16H14V7L8 2.5L2 7V16ZM0 18V6L8 0L16 6V18H9V12H7V18H0Z" fill="white"/></svg> 
          Về Dashboard
        </button>
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}