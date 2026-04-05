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

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Đang tải dữ liệu...</div>;

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <button onClick={() => router.push("/")} style={styles.headerBtn}>
           <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M7.3 20L6.9 16.8C6.68333 16.7167 6.47917 16.6167 6.2875 16.5C6.09583 16.3833 5.90833 16.2583 5.725 16.125L2.75 17.375L0 12.625L2.575 10.675C2.55833 10.5583 2.55 10.4458 2.55 10.3375C2.55 10.2292 2.55 10.1167 2.55 10C2.55 9.88333 2.55 9.77083 2.55 9.6625C2.55 9.55417 2.55833 9.44167 2.575 9.325L0 7.375L2.75 2.625L5.725 3.875C5.90833 3.74167 6.1 3.61667 6.3 3.5C6.5 3.38333 6.7 3.28333 6.9 3.2L7.3 0H12.8L13.2 3.2C13.4167 3.28333 13.6208 3.38333 13.8125 3.5C14.0042 3.61667 14.1917 3.74167 14.375 3.875L17.35 2.625L20.1 7.375L17.525 9.325C17.5417 9.44167 17.55 9.55417 17.55 9.6625C17.55 9.77083 17.55 9.88333 17.55 10C17.55 10.1167 17.55 10.2292 17.55 10.3375C17.55 10.4458 17.5333 10.5583 17.5 10.675L20.075 12.625L17.325 17.375L14.375 16.125C14.1917 16.2583 14 16.3833 13.8 16.5C13.6 16.6167 13.4 16.7167 13.2 16.8L12.8 20H7.3ZM9.05 18H11.025L11.375 15.35C11.8917 15.2167 12.3708 15.0208 12.8125 14.7625C13.2542 14.5042 13.6583 14.1917 14.025 13.825L16.5 14.85L17.475 13.15L15.325 11.525C15.4083 11.2917 15.4667 11.0458 15.5 10.7875C15.5333 10.5292 15.55 10.2667 15.55 10C15.55 9.73333 15.5333 9.47083 15.5 9.2125C15.4667 8.95417 15.4083 8.70833 15.325 8.475L17.475 6.85L16.5 5.15L14.025 6.2C13.6583 5.81667 13.2542 5.49583 12.8125 5.2375C12.3708 4.97917 11.8917 4.78333 11.375 4.65L11.05 2H9.075L8.725 4.65C8.20833 4.78333 7.72917 4.97917 7.2875 5.2375C6.84583 5.49583 6.44167 5.80833 6.075 6.175L3.6 5.15L2.625 6.85L4.775 8.45C4.69167 8.7 4.63333 8.95 4.6 9.2C4.56667 9.45 4.55 9.71667 4.55 10C4.55 10.2667 4.56667 10.525 4.6 10.775C4.63333 11.025 4.69167 11.275 4.775 11.525L2.625 13.15L3.6 14.85L6.075 13.8C6.44167 14.1833 6.84583 14.5042 7.2875 14.7625C7.72917 15.0208 8.20833 15.2167 8.725 15.35L9.05 18ZM10.1 13.5C11.0667 13.5 11.8917 13.1583 12.575 12.475C13.2583 11.7917 13.6 10.9667 13.6 10C13.6 9.03333 13.2583 8.20833 12.575 7.525C11.8917 6.84167 11.0667 6.5 10.1 6.5C9.11667 6.5 8.2875 6.84167 7.6125 7.525C6.9375 8.20833 6.6 9.03333 6.6 10C6.6 10.9667 6.9375 11.7917 7.6125 12.475C8.2875 13.1583 9.11667 13.5 10.1 13.5Z" fill="#0F172A"/>
           </svg>
        </button>
        <h1 style={styles.headerTitle}>Cửa hàng của tôi</h1>
        <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }} style={styles.headerBtn}>
           <span style={{color: '#EF4444', fontSize: '12px', fontWeight: 700}}>Thoát</span>
        </button>
      </header>

      <div style={styles.contentWrapper}>
        <section style={styles.profileCard}>
          <div style={styles.userInfo}>
            <img src="/canhan1.jpg" alt="Avatar" style={styles.avatar} />
            <div>
              <h2 style={styles.userName}>{store?.name || "Cửa hàng của tôi"}</h2>
              <span style={styles.userRank}>Hạng Kim Cương</span>
            </div>
          </div>
          <div style={styles.btnEditProfile} onClick={() => router.push('/dashboard/settings')}>
            Quản lý thông tin
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

        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Công cụ cửa hàng</h3>
          <span style={styles.viewAll}>Xem thêm</span>
        </div>
        
        <div style={styles.horizontalScroll}>
          <div style={styles.followItem} onClick={() => router.push('/dashboard/scan')}>
            <img src="/canhan2.jpg" style={styles.followImg} alt="Scan" />
            <p style={styles.followName}>Xác nhận mã đơn</p>
          </div>
          <div style={styles.followItem} onClick={() => router.push('/dashboard/products')}>
            <img src="/canhan3.jpg" style={styles.followImg} alt="Products" />
            <p style={styles.followName}>Quản lý món ăn</p>
          </div>
          <div style={styles.followItem} onClick={() => router.push('/dashboard/analytics')}>
            <img src="/canhan4.jpg" style={styles.followImg} alt="Stats" />
            <p style={styles.followName}>Thống kê</p>
          </div>
        </div>

        <div style={styles.settingsList}>
          <div style={styles.settingItem}>
            <div style={styles.settingInfo}>
              <span style={{fontSize: '18px'}}><svg width="16" height="19" viewBox="0 0 16 19" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 11C2 11.8667 2.175 12.6875 2.525 13.4625C2.875 14.2375 3.375 14.9167 4.025 15.5C4.00833 15.4167 4 15.3417 4 15.275C4 15.2083 4 15.1333 4 15.05C4 14.5167 4.1 14.0167 4.3 13.55C4.5 13.0833 4.79167 12.6583 5.175 12.275L8 9.5L10.825 12.275C11.2083 12.6583 11.5 13.0833 11.7 13.55C11.9 14.0167 12 14.5167 12 15.05C12 15.1333 12 15.2083 12 15.275C12 15.3417 11.9917 15.4167 11.975 15.5C12.625 14.9167 13.125 14.2375 13.475 13.4625C13.825 12.6875 14 11.8667 14 11C14 10.1667 13.8458 9.37917 13.5375 8.6375C13.2292 7.89583 12.7833 7.23333 12.2 6.65C11.8667 6.86667 11.5167 7.02917 11.15 7.1375C10.7833 7.24583 10.4083 7.3 10.025 7.3C8.99167 7.3 8.09583 6.95833 7.3375 6.275C6.57917 5.59167 6.14167 4.75 6.025 3.75C5.375 4.3 4.8 4.87083 4.3 5.4625C3.8 6.05417 3.37917 6.65417 3.0375 7.2625C2.69583 7.87083 2.4375 8.49167 2.2625 9.125C2.0875 9.75833 2 10.3833 2 11ZM8 12.3L6.575 13.7C6.39167 13.8833 6.25 14.0917 6.15 14.325C6.05 14.5583 6 14.8 6 15.05C6 15.5833 6.19583 16.0417 6.5875 16.425C6.97917 16.8083 7.45 17 8 17C8.55 17 9.02083 16.8083 9.4125 16.425C9.80417 16.0417 10 15.5833 10 15.05C10 14.7833 9.95 14.5375 9.85 14.3125C9.75 14.0875 9.60833 13.8833 9.425 13.7L8 12.3ZM8 0V3.3C8 3.86667 8.19583 4.34167 8.5875 4.725C8.97917 5.10833 9.45833 5.3 10.025 5.3C10.325 5.3 10.6042 5.2375 10.8625 5.1125C11.1208 4.9875 11.35 4.8 11.55 4.55L12 4C13.2333 4.7 14.2083 5.675 14.925 6.925C15.6417 8.175 16 9.53333 16 11C16 13.2333 15.225 15.125 13.675 16.675C12.125 18.225 10.2333 19 8 19C5.76667 19 3.875 18.225 2.325 16.675C0.775 15.125 0 13.2333 0 11C0 8.85 0.720833 6.80833 2.1625 4.875C3.60417 2.94167 5.55 1.31667 8 0Z" fill="#EF4444"/>
              </svg></span>
              <span>Đơn hoàn tất hôm nay: <b>{stats.completedToday}</b></span>
            </div>
          </div>
          <div style={styles.settingItem} onClick={() => router.push('/dashboard/settings')}>
            <div style={styles.settingInfo}>
              <span style={{fontSize: '18px'}}><svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.3 20L6.9 16.8C6.68333 16.7167 6.47917 16.6167 6.2875 16.5C6.09583 16.3833 5.90833 16.2583 5.725 16.125L2.75 17.375L0 12.625L2.575 10.675C2.55833 10.5583 2.55 10.4458 2.55 10.3375C2.55 10.2292 2.55 10.1167 2.55 10C2.55 9.88333 2.55 9.77083 2.55 9.6625C2.55 9.55417 2.55833 9.44167 2.575 9.325L0 7.375L2.75 2.625L5.725 3.875C5.90833 3.74167 6.1 3.61667 6.3 3.5C6.5 3.38333 6.7 3.28333 6.9 3.2L7.3 0H12.8L13.2 3.2C13.4167 3.28333 13.6208 3.38333 13.8125 3.5C14.0042 3.61667 14.1917 3.74167 14.375 3.875L17.35 2.625L20.1 7.375L17.525 9.325C17.5417 9.44167 17.55 9.55417 17.55 9.6625C17.55 9.77083 17.55 9.88333 17.55 10C17.55 10.1167 17.55 10.2292 17.55 10.3375C17.55 10.4458 17.5333 10.5583 17.5 10.675L20.075 12.625L17.325 17.375L14.375 16.125C14.1917 16.2583 14 16.3833 13.8 16.5C13.6 16.6167 13.4 16.7167 13.2 16.8L12.8 20H7.3ZM9.05 18H11.025L11.375 15.35C11.8917 15.2167 12.3708 15.0208 12.8125 14.7625C13.2542 14.5042 13.6583 14.1917 14.025 13.825L16.5 14.85L17.475 13.15L15.325 11.525C15.4083 11.2917 15.4667 11.0458 15.5 10.7875C15.5333 10.5292 15.55 10.2667 15.55 10C15.55 9.73333 15.5333 9.47083 15.5 9.2125C15.4667 8.95417 15.4083 8.70833 15.325 8.475L17.475 6.85L16.5 5.15L14.025 6.2C13.6583 5.81667 13.2542 5.49583 12.8125 5.2375C12.3708 4.97917 11.8917 4.78333 11.375 4.65L11.05 2H9.075L8.725 4.65C8.20833 4.78333 7.72917 4.97917 7.2875 5.2375C6.84583 5.49583 6.44167 5.80833 6.075 6.175L3.6 5.15L2.625 6.85L4.775 8.45C4.69167 8.7 4.63333 8.95 4.6 9.2C4.56667 9.45 4.55 9.71667 4.55 10C4.55 10.2667 4.56667 10.525 4.6 10.775C4.63333 11.025 4.69167 11.275 4.775 11.525L2.625 13.15L3.6 14.85L6.075 13.8C6.44167 14.1833 6.84583 14.5042 7.2875 14.7625C7.72917 15.0208 8.20833 15.2167 8.725 15.35L9.05 18ZM10.1 13.5C11.0667 13.5 11.8917 13.1583 12.575 12.475C13.2583 11.7917 13.6 10.9667 13.6 10C13.6 9.03333 13.2583 8.20833 12.575 7.525C11.8917 6.84167 11.0667 6.5 10.1 6.5C9.11667 6.5 8.2875 6.84167 7.6125 7.525C6.9375 8.20833 6.6 9.03333 6.6 10C6.6 10.9667 6.9375 11.7917 7.6125 12.475C8.2875 13.1583 9.11667 13.5 10.1 13.5Z" fill="#0F172A"/>
</svg>
</span>
              <span>Cài đặt vận hành</span>
            </div>
          </div>
        </div>

        <div style={styles.logoutBtn} onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}>
            Đăng xuất
        </div>
        <p style={{textAlign:'center', color:'#64748B', fontSize:'12px', marginBottom: '20px'}}>Phiên bản 2.4.0</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: { width: '100%', minHeight: '100vh', background: '#FCFAF8', position: 'relative', display: 'flex', flexDirection: 'column', paddingBottom: '100px', overflowX: 'hidden' },
  header: { position: 'sticky', top: 0, width: '100%', height: '70px', background: '#FFF4DD', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 100, borderBottom: '1px solid rgba(255, 106, 0, 0.1)' },
  headerTitle: { fontSize: '18px', fontWeight: 700, color: '#0F172A' },
  headerBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  contentWrapper: { width: '100%', margin: 0, padding: 0 },
  profileCard: { background: '#FFF4DD', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
  avatar: { width: '80px', height: '80px', borderRadius: '50%', border: '2px solid rgba(255, 106, 0, 0.2)', objectFit: 'cover' },
  userName: { fontSize: '20px', fontWeight: 700, color: '#0F172A' },
  userRank: { fontSize: '14px', fontWeight: 500, color: '#FF6A00' },
  btnEditProfile: { width: '100%', padding: '12px', background: 'rgba(255, 106, 0, 0.1)', borderRadius: '12px', border: '1px solid rgba(255, 106, 0, 0.2)', color: '#FF6A00', fontWeight: 700, fontSize: '14px', cursor: 'pointer', textAlign: 'center' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px' },
  statBox: { background: '#FFFFFF', padding: '12px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid rgba(255, 106, 0, 0.1)' },
  statValue: { fontSize: '20px', fontWeight: 700, color: '#FF6A00' },
  statLabel: { fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginTop: '4px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 8px' },
  sectionTitle: { fontSize: '18px', fontWeight: 700, color: '#0F172A' },
  viewAll: { fontSize: '14px', color: '#FF6A00', fontWeight: 600, cursor: 'pointer' },
  horizontalScroll: { display: 'flex', gap: '12px', overflowX: 'auto', padding: '8px 16px 16px' },
  followItem: { flex: '0 0 160px', cursor: 'pointer' },
  followImg: { width: '160px', height: '112px', borderRadius: '12px', objectFit: 'cover', marginBottom: '8px' },
  followName: { fontSize: '14px', fontWeight: 600, color: '#0F172A' },
  settingsList: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  settingItem: { background: '#FFFFFF', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255, 106, 0, 0.05)', cursor: 'pointer' },
  settingInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoutBtn: { margin: '24px 16px', padding: '16px', background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FECACA', color: '#EF4444', fontWeight: 700, textAlign: 'center', cursor: 'pointer' }
};