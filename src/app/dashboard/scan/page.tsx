"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ScanResult {
  product_name: string;
  quantity: number;
  status: string;
}

export default function ScanPage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string>(""); // Lưu mã ECO-...
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string>("");

  const handleConfirm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!qrCode) return;
    
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/reservations/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: qrCode.trim().toUpperCase() }), 
      });
      
      const data = await res.json();

      if (res.ok) {
        setResult(data as ScanResult);
        setQrCode(""); // Xóa mã sau khi thành công
      } else {
        setError(data.error || "Mã không hợp lệ hoặc đã sử dụng");
      }
    } catch (err) {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#F8F7F5', minHeight: '100vh' }}>
      <header style={{ height: '70px', background: 'white', display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid #E2E8F0' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 style={{ flex: 1, textAlign: 'center', fontSize: '18px', fontWeight: 800, marginRight: '24px' }}>Xác nhận đơn hàng</h1>
      </header>

      <main style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 20px' }}>
        
        <form onSubmit={handleConfirm}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '12px', color: '#475569' }}>
              Nhập mã nhận hàng (Ví dụ: ECO-ABCD12)
            </label>
            <input 
              type="text"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              placeholder="ECO-XXXXXX"
              style={{
                width: '100%', padding: '18px', borderRadius: '16px',
                border: '2px solid #FF6A00', fontSize: '20px', fontWeight: 700,
                textAlign: 'center', color: '#FF6A00', outline: 'none',
                backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(255,106,0,0.1)'
              }}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || !qrCode}
            style={{
              width: '100%', padding: '18px', borderRadius: '16px',
              background: loading || !qrCode ? '#CBD5E1' : '#FF6A00',
              color: 'white', border: 'none', fontSize: '16px', fontWeight: 800,
              cursor: 'pointer', boxShadow: qrCode ? '0 8px 20px rgba(255,106,0,0.2)' : 'none'
            }}
          >
            {loading ? "ĐANG KIỂM TRA..." : "XÁC NHẬN ĐƠN HÀNG"}
          </button>
        </form>

        {/* THÔNG BÁO LỖI */}
        {error && (
          <div style={{ marginTop: '24px', background: '#FFF1F2', color: '#E11D48', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid #FFE4E6', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* THÔNG BÁO THÀNH CÔNG */}
        {result && (
          <div style={{ marginTop: '24px', background: '#F0FDF4', color: '#16A34A', padding: '24px', borderRadius: '20px', border: '1px solid #DCFCE7' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '8px' }}>✅ XÁC NHẬN THÀNH CÔNG</h3>
            <p style={{ fontSize: '14px' }}>Sản phẩm: <b>{result.product_name}</b></p>
            <p style={{ fontSize: '14px' }}>Số lượng: <b>{result.quantity}</b></p>
          </div>
        )}
      </main>
    </div>
  );
}