"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface DailyStats {
  revenue: number;
  orders: number;
  growth: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<DailyStats>({ revenue: 0, orders: 0, growth: 0 });
  const [yesterday, setYesterday] = useState<DailyStats>({ revenue: 0, orders: 0, growth: 0 });

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const now = new Date();
      const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const startOfYesterday = new Date(new Date(new Date().setDate(now.getDate() - 1)).setHours(0, 0, 0, 0)).toISOString();

      const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user.id).single();
      if (!store) return;

      const fetchStats = async (startTime: string, endTime: string): Promise<{ revenue: number; orders: number }> => {
        const { data } = await supabase
          .from("reservations")
          .select(`quantity, products!inner(sale_price)`)
          .eq("products.store_id", store.id)
          .eq("status", "Completed")
          .gte("created_at", startTime)
          .lt("created_at", endTime);

        const revenue = (data || []).reduce((acc, cur) => {
          const p = Array.isArray(cur.products) ? cur.products[0] : cur.products;
          return acc + ((p?.sale_price ?? 0) * cur.quantity);
        }, 0);

        return { revenue, orders: data?.length || 0 };
      };

      const tStats = await fetchStats(startOfToday, new Date().toISOString());
      const yStats = await fetchStats(startOfYesterday, startOfToday);

      const growth = yStats.revenue === 0 ? (tStats.revenue > 0 ? 100 : 0) : ((tStats.revenue - yStats.revenue) / yStats.revenue) * 100;

      setToday({ ...tStats, growth });
      setYesterday({ ...yStats, growth: 0 });
      setLoading(false);
    };

    fetchAnalytics();
  }, [router]);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center', color: '#FF6A00', fontWeight: 800 }}>Đang phân tích...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => router.back()} style={styles.backBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 style={styles.headerTitle}>THỐNG KÊ DOANH SỐ</h1>
        <div style={{ width: 40 }} />
      </header>

      <main style={styles.main}>
        <div style={styles.summaryCard}>
          <p style={styles.cardLabel}>Doanh thu hôm nay</p>
          <h2 style={styles.mainRevenue}>{today.revenue.toLocaleString()}đ</h2>
          <div style={{ 
            ...styles.growthTag, 
            backgroundColor: today.growth >= 0 ? '#DCFCE7' : '#FEE2E2',
            color: today.growth >= 0 ? '#16A34A' : '#EF4444' 
          }}>
            {today.growth >= 0 ? '↑' : '↓'} {Math.abs(today.growth).toFixed(1)}% so với hôm qua
          </div>
        </div>

        <div style={styles.gridStats}>
          <div style={styles.smallCard}>
            <p style={styles.smallLabel}>Tổng đơn hàng</p>
            <p style={styles.smallValue}>{today.orders}</p>
          </div>
          <div style={styles.smallCard}>
            <p style={styles.smallLabel}>Doanh thu hôm qua</p>
            <p style={styles.smallValue}>{yesterday.revenue.toLocaleString()}đ</p>
          </div>
        </div>

        <h3 style={styles.sectionTitle}>Biểu đồ doanh thu</h3>
        <div style={styles.chartContainer}>
          <div style={styles.chartBarWrapper}>
            <div style={{ ...styles.chartBar, height: '40%', background: '#E2E8F0' }} />
            <p style={styles.chartLabel}>Hôm qua</p>
          </div>
          <div style={styles.chartBarWrapper}>
            <div style={{ 
              ...styles.chartBar, 
              height: today.revenue >= yesterday.revenue ? '80%' : '30%', 
              background: '#FF6A00' 
            }} />
            <p style={styles.chartLabel}>Hôm nay</p>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
  header: { height: '70px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #F1F5F9' },
  headerTitle: { fontSize: '16px', fontWeight: 900, color: '#0F172A' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  main: { padding: '20px', maxWidth: '600px', margin: '0 auto' },
  summaryCard: { background: 'white', padding: '24px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.03)', marginBottom: '20px' },
  cardLabel: { fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' },
  mainRevenue: { fontSize: '32px', fontWeight: 900, color: '#0F172A', marginBottom: '12px' },
  growthTag: { display: 'inline-block', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 },
  gridStats: { display: 'flex', gap: '15px', marginBottom: '30px' },
  smallCard: { flex: 1, background: 'white', padding: '16px', borderRadius: '20px', border: '1px solid #F1F5F9' },
  smallLabel: { fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' },
  smallValue: { fontSize: '18px', fontWeight: 800, color: '#1E293B' },
  sectionTitle: { fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '20px' },
  chartContainer: { height: '200px', background: 'white', borderRadius: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '20px' },
  chartBarWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '60px' },
  chartBar: { width: '40px', borderRadius: '8px 8px 4px 4px', transition: 'height 0.5s ease' },
  chartLabel: { fontSize: '11px', fontWeight: 600, color: '#94A3B8' }
};