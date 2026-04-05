"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import React from "react";

interface Store {
  id: string;
  name: string;
  address: string | null;
  owner_id: string;
}

interface ProductRow {
  id: string;
  name: string;
  is_active: boolean;
  sale_price: number;
  quantity: number;
}

interface ReservationRow {
  id: string;
  status: string;
  quantity: number;
  products: { sale_price: number; name: string } | null;
}

interface UserMetadata {
  role?: string;
  full_name?: string;
  name?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }
      
      const metadata = user.user_metadata as UserMetadata;

      if (metadata.role !== 'store_owner') {
        alert("Bạn không có quyền truy cập trang này.");
        router.replace('/');
        return;
      }

      await supabase.from("users").upsert({
        id: user.id,
        email: user.email,
        full_name: metadata.full_name ?? metadata.name ?? null,
        role: metadata.role ?? "store_owner",
      }, { onConflict: "id" });

      let { data: storeRow } = await supabase
        .from("stores")
        .select("id, name, address, owner_id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!storeRow) {
        const defaultName = metadata.full_name ? `Cửa hàng ${metadata.full_name}` : `Cửa hàng của ${user.email}`;
        const { data: newStore } = await supabase
          .from("stores")
          .insert({ owner_id: user.id, name: defaultName, is_active: true })
          .select().single();
        storeRow = newStore;
      }
      
      const currentStore = storeRow as Store;
      setStore(currentStore);

      const { data: productData } = await supabase
        .from("products")
        .select("id, name, is_active, sale_price, quantity")
        .eq("store_id", currentStore.id);
      setProducts((productData as ProductRow[]) ?? []);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: resData } = await supabase
        .from("reservations")
        .select(`id, status, quantity, products!inner(sale_price, name)`)
        .eq("products.store_id", currentStore.id)
        .gte("created_at", today.toISOString());

      const mappedRes: ReservationRow[] = (resData ?? []).map((r) => {
        const p = Array.isArray(r.products) ? r.products[0] : r.products;
        return {
          id: String(r.id),
          status: String(r.status),
          quantity: Number(r.quantity),
          products: p ? { sale_price: Number(p.sale_price), name: String(p.name) } : null
        };
      });
      setReservations(mappedRes);
      
      setLoading(false);
    };

    loadData();
  }, [router]);

  const stats = useMemo(() => {
    const activeDeals = products.filter((p) => p.is_active).length;
    let completedToday = 0;
    let estimatedRevenue = 0;

    reservations.forEach((r) => {
      if (r.status === "Completed") completedToday += 1;
      estimatedRevenue += (r.products?.sale_price ?? 0) * r.quantity;
    });

    return {
      activeDeals,
      todayReservations: reservations.length,
      completedToday,
      revenue: (estimatedRevenue / 1000).toFixed(0) + "k"
    };
  }, [products, reservations]);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: '#FF6A00', fontWeight: 800 }}>Đang tải dữ liệu...</div>;

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <button onClick={() => router.push("/")} style={styles.headerBtn}>
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 style={styles.headerTitle}>Cửa hàng của tôi</h1>
        <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }} style={styles.headerBtn}>
           <span style={{color: '#EF4444', fontSize: '12px', fontWeight: 700}}>Thoát</span>
        </button>
      </header>

      <main style={styles.contentWrapper}>
        <section style={styles.profileCard}>
          <div style={styles.userInfo}>
            <img src="/canhan1.jpg" alt="Avatar" style={styles.avatar} />
            <div>
              <h2 style={styles.userName}>{store?.name || "Cửa hàng của tôi"}</h2>
              <span style={styles.userRank}>Hạng Kim Cương</span>
            </div>
          </div>
          <div style={styles.btnEditProfile} onClick={() => router.push('/dashboard/settings')}>
            Quản lý thông tin cửa hàng
          </div>
        </section>

        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{stats.todayReservations}</div>
            <div style={styles.statLabel}>Đơn mới</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{stats.revenue}</div>
            <div style={styles.statLabel}>Doanh thu</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{stats.activeDeals}</div>
            <div style={styles.statLabel}>Deal đang bán</div>
          </div>
        </div>

        {/* CÔNG CỤ CỬA HÀNG - DÀN ĐỀU GIỮA */}
        <section style={styles.toolsSection}>
          <div style={styles.toolsContainer}>
            <h3 style={styles.sectionTitle}>Công cụ cửa hàng</h3>
            <div style={styles.toolsGrid}>
              <div onClick={() => router.push('/store/verify')} style={styles.toolItem}>
                <img src="/canhan1.jpg" style={styles.toolImg} alt="Xác nhận" />
                <p style={styles.toolText}>Xác nhận mã đơn</p>
              </div>
              <div onClick={() => router.push('/store/manage-foods')} style={styles.toolItem}>
                <img src="/canhan2.jpg" style={styles.toolImg} alt="Quản lý" />
                <p style={styles.toolText}>Quản lý món ăn</p>
              </div>
              <div onClick={() => router.push('/store/analytics')} style={styles.toolItem}>
                <img src="/canhan1.jpg" style={styles.toolImg} alt="Thống kê" />
                <p style={styles.toolText}>Thống kê</p>
              </div>
            </div>
          </div>
        </section>

        <div style={styles.settingsList}>
          <div style={styles.settingItem}>
            <div style={styles.settingInfo}>
              <span style={{fontSize: '20px'}}>🔥</span>
              <span>Đơn hoàn tất hôm nay: <b>{stats.completedToday}</b></span>
            </div>
          </div>
          <div style={styles.settingItem} onClick={() => router.push('/dashboard/settings')}>
            <div style={styles.settingInfo}>
              <span style={{fontSize: '20px'}}>⚙️</span>
              <span>Cài đặt vận hành</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </div>

        <div style={styles.logoutBtn} onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}>
            Đăng xuất tài khoản
        </div>
        <p style={{textAlign:'center', color:'#64748B', fontSize:'12px', marginBottom: '20px'}}>Phiên bản 2.4.0</p>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: { width: '100%', minHeight: '100vh', background: '#FCFAF8', display: 'flex', flexDirection: 'column', paddingBottom: '40px' },
  header: { position: 'sticky', top: 0, height: '70px', background: '#FFF4DD', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 100, borderBottom: '1px solid rgba(255, 106, 0, 0.1)' },
  headerTitle: { fontSize: '18px', fontWeight: 800, color: '#0F172A' },
  headerBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px' },
  contentWrapper: { width: '100%' },
  profileCard: { background: '#FFF4DD', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
  avatar: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid white' },
  userName: { fontSize: '20px', fontWeight: 800, color: '#0F172A' },
  userRank: { fontSize: '14px', fontWeight: 600, color: '#FF6A00' },
  btnEditProfile: { width: '100%', padding: '14px', background: 'white', borderRadius: '12px', color: '#FF6A00', fontWeight: 800, fontSize: '13px', cursor: 'pointer', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '20px 16px' },
  statBox: { background: '#FFFFFF', padding: '16px 8px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255, 106, 0, 0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' },
  statValue: { fontSize: '22px', fontWeight: 900, color: '#FF6A00' },
  statLabel: { fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginTop: '4px' },
  toolsSection: { padding: '0 16px 32px', width: '100%' },
  toolsContainer: { maxWidth: '600px', margin: '0 auto' },
  sectionTitle: { fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '20px' },
  toolsGrid: { display: 'flex', justifyContent: 'space-between', gap: '12px' },
  toolItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', maxWidth: '150px' },
  toolImg: { width: '100%', aspectRatio: '1/1', borderRadius: '20px', objectFit: 'cover', marginBottom: '10px', boxShadow: '0 8px 16px rgba(0,0,0,0.06)' },
  toolText: { fontSize: '13px', fontWeight: 700, color: '#1E293B', textAlign: 'center', lineHeight: '1.4' },
  settingsList: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  settingItem: { background: '#FFFFFF', padding: '18px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.02)' },
  settingInfo: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 600, color: '#1E293B' },
  logoutBtn: { margin: '32px 16px 16px', padding: '18px', background: '#FEF2F2', borderRadius: '16px', border: '1px solid #FECACA', color: '#EF4444', fontWeight: 800, textAlign: 'center', cursor: 'pointer' }
};
