"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface FoodDeal {
  id: number;
  name: string;
  price: number;
  stock: number;
  sold: number;
  status: "active" | "expired";
  expiry: string;
}

export default function ManageFoodsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"active" | "expired">("active");

  const [deals, setDeals] = useState<FoodDeal[]>([
    { id: 1, name: "Bánh mì gậy", price: 15000, stock: 10, sold: 45, status: "active", expiry: "21:00 Hôm nay" },
    { id: 2, name: "Croissant hạnh nhân", price: 35000, stock: 3, sold: 12, status: "active", expiry: "22:00 Hôm nay" },
    { id: 3, name: "Bánh su kem", price: 10000, stock: 0, sold: 30, status: "expired", expiry: "Hết hạn hôm qua" },
    { id: 4, name: "Pate đặc biệt", price: 85000, stock: 0, sold: 15, status: "expired", expiry: "20/03/2026" },
  ]);

  const handleStopDeal = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn dừng deal này không?")) {
      setDeals(deals.map(deal => 
        deal.id === id ? { ...deal, status: "expired" as const } : deal
      ));
    }
  };

  const handleToggleStatus = (id: number) => {
    setDeals(deals.map(deal => 
      deal.id === id ? { ...deal, status: deal.status === "active" ? "expired" : "active" } : deal
    ));
  };

  const handleEdit = (id: number) => {
    router.push(`/store/manage-foods/edit/${id}`);
  };

  const filteredDeals = deals.filter((d) => d.status === activeTab);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => router.back()} style={styles.backBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 style={styles.headerTitle}>QUẢN LÝ MÓN ĂN</h1>
        <div style={{ width: 40 }} />
      </header>

      <div style={styles.tabBar}>
        <button
          onClick={() => setActiveTab("active")}
          style={{
            ...styles.tabItem,
            ...(activeTab === "active" ? styles.tabActive : {}),
          }}
        >
          ĐANG HOẠT ĐỘNG
        </button>
        <button
          onClick={() => setActiveTab("expired")}
          style={{
            ...styles.tabItem,
            ...(activeTab === "expired" ? styles.tabActive : {}),
          }}
        >
          ĐÃ HẾT HẠN
        </button>
      </div>

      <main style={styles.main}>
        {filteredDeals.map((deal) => (
          <div key={deal.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.foodName}>{deal.name}</h3>
                <p style={styles.expiryText}>{deal.expiry}</p>
              </div>
              <span style={styles.priceTag}>{deal.price.toLocaleString()}đ</span>
            </div>

            <div style={styles.statsRow}>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Đã bán</span>
                <span style={styles.statValue}>{deal.sold}</span>
              </div>
              <div style={styles.divider} />
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Còn lại</span>
                <span
                  style={{
                    ...styles.statValue,
                    color: deal.stock < 5 ? "#EF4444" : "#10B981",
                  }}
                >
                  {deal.stock}
                </span>
              </div>
            </div>

            <div style={styles.actionGroup}>
              <button 
                style={styles.btnSecondary} 
                onClick={() => handleEdit(deal.id)}
              >
                Sửa món
              </button>
              {activeTab === "active" ? (
                <button 
                  style={styles.btnDanger} 
                  onClick={() => handleStopDeal(deal.id)}
                >
                  Dừng deal
                </button>
              ) : (
                <button 
                  style={styles.btnSuccess} 
                  onClick={() => handleToggleStatus(deal.id)}
                >
                  Mở lại
                </button>
              )}
            </div>
          </div>
        ))}
      </main>

      <button style={styles.floatingBtn} onClick={() => router.push('/store/manage-foods/add')}>
        + THÊM MÓN MỚI
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { backgroundColor: "#F8FAFC", minHeight: "100vh", paddingBottom: "100px", fontFamily: "Inter, sans-serif" },
  header: { height: "70px", background: "white", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: "1px solid #F1F5F9", position: "sticky", top: 0, zIndex: 10 },
  headerTitle: { fontSize: "16px", fontWeight: 900, color: "#0F172A" },
  backBtn: { background: "none", border: "none", cursor: "pointer", padding: "8px" },
  tabBar: { display: "flex", background: "white", borderBottom: "1px solid #F1F5F9" },
  tabItem: { flex: 1, padding: "16px", border: "none", background: "none", fontSize: "13px", fontWeight: 700, color: "#94A3B8", cursor: "pointer", borderBottom: "2px solid transparent" },
  tabActive: { color: "#FF6A00", borderBottom: "2px solid #FF6A00" },
  main: { padding: "16px" },
  card: { background: "white", borderRadius: "16px", padding: "16px", marginBottom: "16px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" },
  cardHeader: { display: "flex", justifyContent: "space-between", marginBottom: "16px" },
  foodName: { fontSize: "16px", fontWeight: 700, color: "#1E293B" },
  expiryText: { fontSize: "12px", color: "#94A3B8", marginTop: "4px" },
  priceTag: { color: "#FF6A00", fontWeight: 800, fontSize: "15px" },
  statsRow: { display: "flex", background: "#F8FAFC", borderRadius: "12px", padding: "12px", marginBottom: "16px" },
  statItem: { flex: 1, textAlign: "center" },
  statLabel: { display: "block", fontSize: "11px", color: "#64748B", marginBottom: "4px" },
  statValue: { fontSize: "16px", fontWeight: 800, color: "#0F172A" },
  divider: { width: "1px", background: "#E2E8F0", margin: "0 10px" },
  actionGroup: { display: "flex", gap: "10px" },
  btnSecondary: { flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "white", fontWeight: 600, fontSize: "12px", cursor: "pointer" },
  btnDanger: { flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#FFF1F2", color: "#E11D48", fontWeight: 600, fontSize: "12px", cursor: "pointer" },
  btnSuccess: { flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#F0FDF4", color: "#16A34A", fontWeight: 600, fontSize: "12px", cursor: "pointer" },
  floatingBtn: { position: "fixed", bottom: "24px", left: "24px", right: "24px", background: "#FF6A00", color: "white", border: "none", padding: "16px", borderRadius: "16px", fontWeight: 800, boxShadow: "0 10px 15px -3px rgba(255, 106, 0, 0.3)", cursor: "pointer" },
};