"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function NotificationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "promo">("all");
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => router.back()} style={styles.backBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 style={styles.headerTitle}>THÔNG BÁO</h1>
        <div style={{ width: '40px' }} />
      </header>

      <div style={styles.tabBar}>
        <button 
          onClick={() => setActiveTab("all")}
          style={{ 
            ...styles.tabItem as React.CSSProperties, 
            ...(activeTab === "all" ? styles.tabActive as React.CSSProperties : {}) 
          }}
        >
          Hoạt động
        </button>
        <button 
          onClick={() => setActiveTab("promo")}
          style={{ 
            ...styles.tabItem as React.CSSProperties, 
            ...(activeTab === "promo" ? styles.tabActive as React.CSSProperties : {}) 
          }}
        >
          Khuyến mãi
        </button>
      </div>
      <main style={styles.main}>
        <div style={styles.emptyBox}>
          <div style={styles.iconCircle}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <h2 style={styles.emptyTitle}>Chưa có thông báo nào</h2>
          <p style={styles.emptyDesc}>
            {activeTab === "all" 
              ? "Cập nhật về đơn hàng và cửa hàng bạn theo dõi sẽ xuất hiện tại đây." 
              : "Các mã giảm giá và chương trình giải cứu đặc biệt đang chờ bạn!"}
          </p>
          <button onClick={() => router.push("/")} style={styles.btnHome}>
            KHÁM PHÁ NGAY
          </button>
        </div>
      </main>
    </div>
  );
}
const styles: Record<string, React.CSSProperties> = {
  container: { backgroundColor: '#FCFAF8', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' },
  header: { position: 'sticky', top: 0, height: '70px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #F1F5F9', zIndex: 100 },
  headerTitle: { fontSize: '16px', fontWeight: 900, color: '#0F172A', letterSpacing: '0.5px' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px' },
  tabBar: { display: 'flex', background: 'white', padding: '0 16px', borderBottom: '1px solid #F1F5F9' },
  tabItem: { flex: 1, padding: '16px 0', border: 'none', background: 'none', fontSize: '14px', fontWeight: 600, color: '#94A3B8', cursor: 'pointer', borderBottom: '2px solid transparent', transition: 'all 0.2s' },
  tabActive: { color: '#FF6A00', borderBottom: '2px solid #FF6A00' },
  main: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  emptyBox: { textAlign: 'center', maxWidth: '280px' },
  iconCircle: { width: '80px', height: '80px', backgroundColor: 'rgba(255, 106, 0, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' },
  emptyTitle: { fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' },
  emptyDesc: { fontSize: '14px', color: '#64748B', lineHeight: '1.5', marginBottom: '32px' },
  btnHome: { width: '100%', padding: '14px', background: '#FF6A00', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 106, 0, 0.2)' }
};