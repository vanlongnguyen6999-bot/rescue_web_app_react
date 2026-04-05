"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ProductInfo {
  name: string;
  image_url: string | null;
  original_price: number;
  sale_price: number;
}

interface ReservationJoined {
  id: string;
  status: string;
  quantity: number;
  created_at: string;
  products: ProductInfo | ProductInfo[] | null;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
}

interface RescuedItem {
  id: string;
  product_name: string;
  img_url: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [rescuedList, setRescuedList] = useState<RescuedItem[]>([]);
  const [stats, setStats] = useState({ followedStores: 0, rescuedItems: 0, totalSavings: 0 });
  const [loading, setLoading] = useState<boolean>(true);

  const getFullImgPath = (path: string | null | undefined): string => {
    if (!path) return "/canhan1.jpg";
    if (path.startsWith('http')) return path;
    return path.startsWith('/') ? path : `/${path}`;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
      if (userData) setProfile(userData as UserProfile);

      const { data: resData } = await supabase
        .from("reservations")
        .select(`id, status, quantity, created_at, products!inner(name, image_url, original_price, sale_price)`)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const typedReservations = (resData as unknown as ReservationJoined[]) ?? [];

      const formattedRes: RescuedItem[] = typedReservations
        .filter(r => r.status === "Completed")
        .slice(0, 5)
        .map((r) => {
          const p = Array.isArray(r.products) ? r.products[0] : r.products;
          return {
            id: r.id,
            product_name: p?.name ?? "Sản phẩm",
            img_url: p?.image_url || "/canhan2.jpg"
          };
        });
      setRescuedList(formattedRes);

      const { count: followCount } = await supabase.from("follows").select("*", { count: 'exact', head: true }).eq("user_id", user.id);

      let rescuedCount = 0;
      let savings = 0;
      typedReservations.forEach(r => {
        if (r.status === "Completed") {
          rescuedCount += r.quantity;
          const p = Array.isArray(r.products) ? r.products[0] : r.products;
          if (p) savings += (p.original_price - p.sale_price) * r.quantity;
        }
      });

      setStats({ followedStores: followCount ?? 0, rescuedItems: rescuedCount, totalSavings: savings });
      setLoading(false);
    };
    loadData();
  }, [router]);

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải...</div>;

  return (
    <div style={{ backgroundColor: '#FCFAF8', minHeight: '100vh', paddingBottom: '100px', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
      <header style={styles.header}>
        <button onClick={() => router.push('/profile/settings')} style={{ background: 'none', border: 'none' }}>
           <svg width="21" height="20" viewBox="0 0 21 20" fill="none"><path d="M7.3 20L6.9 16.8C6.68333 16.7167 6.47917 16.6167 6.2875 16.5C6.09583 16.3833 5.90833 16.2583 5.725 16.125L2.75 17.375L0 12.625L2.575 10.675C2.55833 10.5583 2.55 10.4458 2.55 10.3375C2.55 10.2292 2.55 10.1167 2.55 10C2.55 9.88333 2.55 9.77083 2.55 9.6625C2.55 9.55417 2.55833 9.44167 2.575 9.325L0 7.375L2.75 2.625L5.725 3.875C5.90833 3.74167 6.1 3.61667 6.3 3.5C6.5 3.38333 6.7 3.28333 6.9 3.2L7.3 0H12.8L13.2 3.2C13.4167 3.28333 13.6208 3.38333 13.8125 3.5C14.0042 3.61667 14.1917 3.74167 14.375 3.875L17.35 2.625L20.1 7.375L17.525 9.325C17.5417 9.44167 17.55 9.55417 17.55 9.6625C17.55 9.77083 17.55 9.88333 17.55 10C17.55 10.1167 17.55 10.2292 17.55 10.3375C17.55 10.4458 17.5333 10.5583 17.5 10.675L20.075 12.625L17.325 17.375L14.375 16.125C14.1917 16.2583 14 16.3833 13.8 16.5C13.6 16.6167 13.4 16.7167 13.2 16.8L12.8 20H7.3ZM9.05 18H11.025L11.375 15.35C11.8917 15.2167 12.3708 15.0208 12.8125 14.7625C13.2542 14.5042 13.6583 14.1917 14.025 13.825L16.5 14.85L17.475 13.15L15.325 11.525C15.4083 11.2917 15.4667 11.0458 15.5 10.7875C15.5333 10.5292 15.55 10.2667 15.55 10C15.55 9.73333 15.5333 9.47083 15.5 9.2125C15.4667 8.95417 15.4083 8.70833 15.325 8.475L17.475 6.85L16.5 5.15L14.025 6.2C13.6583 5.81667 13.2542 5.49583 12.8125 5.2375C12.3708 4.97917 11.8917 4.78333 11.375 4.65L11.05 2H9.075L8.725 4.65C8.20833 4.78333 7.72917 4.97917 7.2875 5.2375C6.84583 5.49583 6.44167 5.80833 6.075 6.175L3.6 5.15L2.625 6.85L4.775 8.45C4.69167 8.7 4.63333 8.95 4.6 9.2C4.56667 9.45 4.55 9.71667 4.55 10C4.55 10.2667 4.56667 10.525 4.6 10.775C4.63333 11.025 4.69167 11.275 4.775 11.525L2.625 13.15L3.6 14.85L6.075 13.8C6.44167 14.1833 6.84583 14.5042 7.2875 14.7625C7.72917 15.0208 8.20833 15.2167 8.725 15.35L9.05 18ZM10.1 13.5C11.0667 13.5 11.8917 13.1583 12.575 12.475C13.2583 11.7917 13.6 10.9667 13.6 10C13.6 9.03333 13.2583 8.20833 12.575 7.525C11.8917 6.84167 11.0667 6.5 10.1 6.5C9.11667 6.5 8.2875 6.84167 7.6125 7.525C6.9375 8.20833 6.6 9.03333 6.6 10C6.6 10.9667 6.9375 11.7917 7.6125 12.475C8.2875 13.1583 9.11667 13.5 10.1 13.5Z" fill="#0F172A"/></svg>
        </button>
        <h1 style={styles.headerTitle}>Cá nhân</h1>
        <button style={{ background: 'none', border: 'none' }}>
           <svg width="16" height="20" viewBox="0 0 16 20" fill="none"><path d="M0 17V15H2V8C2 6.61667 2.41667 5.3875 3.25 4.3125C4.08333 3.2375 5.16667 2.53333 6.5 2.2V1.5C6.5 1.08333 6.64583 0.729167 6.9375 0.4375C7.22917 0.145833 7.58333 0 8 0C8.41667 0 8.77083 0.145833 9.0625 0.4375C9.35417 0.729167 9.5 1.08333 9.5 1.5V2.2C10.8333 2.53333 11.9167 3.2375 12.75 4.3125C13.5833 5.3875 14 6.61667 14 8V15H16V17H0ZM8 20C7.45 20 6.97917 19.8042 6.5875 19.4125C6.19583 19.0208 6 18.55 6 18H10C10 18.55 9.80417 19.0208 9.4125 19.4125C9.02083 19.8042 8.55 20 8 20ZM4 15H12V8C12 6.9 11.6083 5.95833 10.825 5.175C10.0417 4.39167 9.1 4 8 4C6.9 4 5.95833 4.39167 5.175 5.175C4.39167 5.95833 4 6.9 4 8V15Z" fill="#0F172A"/></svg>
        </button>
      </header>

      <main style={{ width: '100%', flex: 1 }}>
        <section style={styles.profileCard}>
          <div style={styles.userInfo}>
            <img src="/canhan1.jpg" alt="Avatar" style={styles.avatar} />
            <div>
              <h2 style={styles.userName}>{profile?.full_name || "Giải cứu viên"}</h2>
              <span style={styles.userRank}>Hạng Eco-Hero</span>
            </div>
          </div>
          <button onClick={() => router.push('/profile/settings')} style={styles.btnEditProfile}>THÔNG TIN CÁ NHÂN</button>
        </section>

        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#FF6A00' }}>{stats.rescuedItems}</div>
            <div style={styles.statLabel}>Đã cứu</div>
          </div>
          <div style={styles.statBox}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#FF6A00' }}>{stats.totalSavings.toLocaleString()}đ</div>
            <div style={styles.statLabel}>Tiết kiệm</div>
          </div>
          <div style={styles.statBox}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#FF6A00' }}>{stats.followedStores}</div>
            <div style={styles.statLabel}>Theo dõi</div>
          </div>
        </div>

        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Đồ ăn đã cứu gần đây</h3>
          <span onClick={() => router.push('/my-orders')} style={styles.viewAll}>Xem tất cả</span>
        </div>
        
        <div style={styles.horizontalScroll}>
          {rescuedList.length > 0 ? rescuedList.map((item) => (
            <div key={item.id} style={styles.followItem} onClick={() => router.push(`/my-orders`)}>
              <img src={getFullImgPath(item.img_url)} style={styles.followImg} alt={item.product_name} />
              <p style={styles.followName}>{item.product_name}</p>
            </div>
          )) : (
            <p style={{ color: '#94A3B8', fontSize: '12px', paddingLeft: '16px' }}>Bạn chưa cứu món nào.</p>
          )}
        </div>

        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={styles.settingItem} onClick={() => router.push('/my-orders')}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '18px' }}><svg width="11" height="14" viewBox="0 0 11 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.33333 13.3333C0.966667 13.3333 0.652778 13.2028 0.391667 12.9417C0.130556 12.6806 0 12.3667 0 12V4C0 3.63333 0.130556 3.31944 0.391667 3.05833C0.652778 2.79722 0.966667 2.66667 1.33333 2.66667H2.66667C2.66667 1.93333 2.92778 1.30556 3.45 0.783333C3.97222 0.261111 4.6 0 5.33333 0C6.06667 0 6.69444 0.261111 7.21667 0.783333C7.73889 1.30556 8 1.93333 8 2.66667H9.33333C9.7 2.66667 10.0139 2.79722 10.275 3.05833C10.5361 3.31944 10.6667 3.63333 10.6667 4V12C10.6667 12.3667 10.5361 12.6806 10.275 12.9417C10.0139 13.2028 9.7 13.3333 9.33333 13.3333H1.33333ZM1.33333 12H9.33333V4H8V5.33333C8 5.52222 7.93611 5.68056 7.80833 5.80833C7.68056 5.93611 7.52222 6 7.33333 6C7.14444 6 6.98611 5.93611 6.85833 5.80833C6.73056 5.68056 6.66667 5.52222 6.66667 5.33333V4H4V5.33333C4 5.52222 3.93611 5.68056 3.80833 5.80833C3.68056 5.93611 3.52222 6 3.33333 6C3.14444 6 2.98611 5.93611 2.85833 5.80833C2.73056 5.68056 2.66667 5.52222 2.66667 5.33333V4H1.33333V12ZM4 2.66667H6.66667C6.66667 2.3 6.53611 1.98611 6.275 1.725C6.01389 1.46389 5.7 1.33333 5.33333 1.33333C4.96667 1.33333 4.65278 1.46389 4.39167 1.725C4.13056 1.98611 4 2.3 4 2.66667ZM1.33333 12V4V12Z" fill="#475569"/>
</svg>
</span>
                <span>Lịch sử cứu đồ</span>
             </div>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </div>
          <div style={styles.settingItem} onClick= {() => alert("Tính năng đang phát triển")}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>  <span style={{ fontSize: '18px' }}><svg width="23" height="20" viewBox="0 0 23 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.885 18C10.9517 18 11.0183 17.9833 11.085 17.95C11.1517 17.9167 11.2017 17.8833 11.235 17.85L19.435 9.65C19.635 9.45 19.7808 9.225 19.8725 8.975C19.9642 8.725 20.01 8.475 20.01 8.225C20.01 7.95833 19.9642 7.70417 19.8725 7.4625C19.7808 7.22083 19.635 7.00833 19.435 6.825L15.185 2.575C15.0017 2.375 14.7892 2.22917 14.5475 2.1375C14.3058 2.04583 14.0517 2 13.785 2C13.535 2 13.285 2.04583 13.035 2.1375C12.785 2.22917 12.56 2.375 12.36 2.575L12.085 2.85L13.935 4.725C14.185 4.95833 14.3683 5.225 14.485 5.525C14.6017 5.825 14.66 6.14167 14.66 6.475C14.66 7.175 14.4225 7.7625 13.9475 8.2375C13.4725 8.7125 12.885 8.95 12.185 8.95C11.8517 8.95 11.5308 8.89167 11.2225 8.775C10.9142 8.65833 10.6433 8.48333 10.41 8.25L8.535 6.4L4.16 10.775C4.11 10.825 4.0725 10.8792 4.0475 10.9375C4.0225 10.9958 4.01 11.0583 4.01 11.125C4.01 11.2583 4.06 11.3792 4.16 11.4875C4.26 11.5958 4.37667 11.65 4.51 11.65C4.57667 11.65 4.64333 11.6333 4.71 11.6C4.77667 11.5667 4.82667 11.5333 4.86 11.5L8.26 8.1L9.66 9.5L6.285 12.9C6.235 12.95 6.1975 13.0042 6.1725 13.0625C6.1475 13.1208 6.135 13.1833 6.135 13.25C6.135 13.3833 6.185 13.5 6.285 13.6C6.385 13.7 6.50167 13.75 6.635 13.75C6.70167 13.75 6.76833 13.7333 6.835 13.7C6.90167 13.6667 6.95167 13.6333 6.985 13.6L10.385 10.225L11.785 11.625L8.41 15.025C8.36 15.0583 8.3225 15.1083 8.2975 15.175C8.2725 15.2417 8.26 15.3083 8.26 15.375C8.26 15.5083 8.31 15.625 8.41 15.725C8.51 15.825 8.62667 15.875 8.76 15.875C8.82667 15.875 8.88917 15.8625 8.9475 15.8375C9.00583 15.8125 9.06 15.775 9.11 15.725L12.51 12.35L13.91 13.75L10.51 17.15C10.46 17.2 10.4225 17.2542 10.3975 17.3125C10.3725 17.3708 10.36 17.4333 10.36 17.5C10.36 17.6333 10.4142 17.75 10.5225 17.85C10.6308 17.95 10.7517 18 10.885 18ZM10.86 20C10.2433 20 9.6975 19.7958 9.2225 19.3875C8.7475 18.9792 8.46833 18.4667 8.385 17.85C7.81833 17.7667 7.34333 17.5333 6.96 17.15C6.57667 16.7667 6.34333 16.2917 6.26 15.725C5.69333 15.6417 5.2225 15.4042 4.8475 15.0125C4.4725 14.6208 4.24333 14.15 4.16 13.6C3.52667 13.5167 3.01 13.2417 2.61 12.775C2.21 12.3083 2.01 11.7583 2.01 11.125C2.01 10.7917 2.0725 10.4708 2.1975 10.1625C2.3225 9.85417 2.50167 9.58333 2.735 9.35L8.535 3.575L11.81 6.85C11.8433 6.9 11.8933 6.9375 11.96 6.9625C12.0267 6.9875 12.0933 7 12.16 7C12.31 7 12.435 6.95417 12.535 6.8625C12.635 6.77083 12.685 6.65 12.685 6.5C12.685 6.43333 12.6725 6.36667 12.6475 6.3C12.6225 6.23333 12.585 6.18333 12.535 6.15L8.96 2.575C8.77667 2.375 8.56417 2.22917 8.3225 2.1375C8.08083 2.04583 7.82667 2 7.56 2C7.31 2 7.06 2.04583 6.81 2.1375C6.56 2.22917 6.335 2.375 6.135 2.575L2.61 6.125C2.46 6.275 2.335 6.45 2.235 6.65C2.135 6.85 2.06833 7.05 2.035 7.25C2.00167 7.45 2.00167 7.65417 2.035 7.8625C2.06833 8.07083 2.135 8.26667 2.235 8.45L0.785 9.9C0.501667 9.51667 0.293333 9.09583 0.16 8.6375C0.0266667 8.17917 -0.0233333 7.71667 0.01 7.25C0.0433333 6.78333 0.16 6.32917 0.36 5.8875C0.56 5.44583 0.835 5.05 1.185 4.7L4.71 1.175C5.11 0.791667 5.55583 0.5 6.0475 0.3C6.53917 0.1 7.04333 0 7.56 0C8.07667 0 8.58083 0.1 9.0725 0.3C9.56417 0.5 10.0017 0.791667 10.385 1.175L10.66 1.45L10.935 1.175C11.335 0.791667 11.7808 0.5 12.2725 0.3C12.7642 0.1 13.2683 0 13.785 0C14.3017 0 14.8058 0.1 15.2975 0.3C15.7892 0.5 16.2267 0.791667 16.61 1.175L20.835 5.4C21.2183 5.78333 21.51 6.225 21.71 6.725C21.91 7.225 22.01 7.73333 22.01 8.25C22.01 8.76667 21.91 9.27083 21.71 9.7625C21.51 10.2542 21.2183 10.6917 20.835 11.075L12.635 19.25C12.4017 19.4833 12.1308 19.6667 11.8225 19.8C11.5142 19.9333 11.1933 20 10.86 20Z" fill="#475569"/>
</svg>
</span><span>Trở thành đối tác</span>
             </div>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </div>
           <div style={styles.settingItem} onClick= {() => alert("Tính năng đang phát triển")}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>  <span style={{ fontSize: '18px' }}><svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9 15C9.35 15 9.64583 14.8792 9.8875 14.6375C10.1292 14.3958 10.25 14.1 10.25 13.75C10.25 13.4 10.1292 13.1042 9.8875 12.8625C9.64583 12.6208 9.35 12.5 9 12.5C8.65 12.5 8.35417 12.6208 8.1125 12.8625C7.87083 13.1042 7.75 13.4 7.75 13.75C7.75 14.1 7.87083 14.3958 8.1125 14.6375C8.35417 14.8792 8.65 15 9 15ZM8.1 11.15H9.95C9.95 10.55 10.0167 10.1083 10.15 9.825C10.2833 9.54167 10.5667 9.18333 11 8.75C11.5833 8.16667 11.9958 7.67917 12.2375 7.2875C12.4792 6.89583 12.6 6.45 12.6 5.95C12.6 5.06667 12.3 4.35417 11.7 3.8125C11.1 3.27083 10.2917 3 9.275 3C8.35833 3 7.57917 3.225 6.9375 3.675C6.29583 4.125 5.85 4.75 5.6 5.55L7.25 6.2C7.36667 5.75 7.6 5.3875 7.95 5.1125C8.3 4.8375 8.70833 4.7 9.175 4.7C9.625 4.7 10 4.82083 10.3 5.0625C10.6 5.30417 10.75 5.625 10.75 6.025C10.75 6.30833 10.6583 6.60833 10.475 6.925C10.2917 7.24167 9.98333 7.59167 9.55 7.975C9 8.45833 8.62083 8.92083 8.4125 9.3625C8.20417 9.80417 8.1 10.4 8.1 11.15ZM2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H16C16.55 0 17.0208 0.195833 17.4125 0.5875C17.8042 0.979167 18 1.45 18 2V16C18 16.55 17.8042 17.0208 17.4125 17.4125C17.0208 17.8042 16.55 18 16 18H2ZM2 16H16V2H2V16ZM2 2V16V2Z" fill="#475569"/>
</svg>
</span><span>Trung tâm hỗ trợ</span>
             </div>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </div>
          <div style={styles.settingItem} onClick= {() => alert("Tính năng đang phát triển")}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>  <span style={{ fontSize: '18px' }}><svg width="20" height="10" viewBox="0 0 20 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9 10H5C3.61667 10 2.4375 9.5125 1.4625 8.5375C0.4875 7.5625 0 6.38333 0 5C0 3.61667 0.4875 2.4375 1.4625 1.4625C2.4375 0.4875 3.61667 0 5 0H9V2H5C4.16667 2 3.45833 2.29167 2.875 2.875C2.29167 3.45833 2 4.16667 2 5C2 5.83333 2.29167 6.54167 2.875 7.125C3.45833 7.70833 4.16667 8 5 8H9V10ZM6 6V4H14V6H6ZM11 10V8H15C15.8333 8 16.5417 7.70833 17.125 7.125C17.7083 6.54167 18 5.83333 18 5C18 4.16667 17.7083 3.45833 17.125 2.875C16.5417 2.29167 15.8333 2 15 2H11V0H15C16.3833 0 17.5625 0.4875 18.5375 1.4625C19.5125 2.4375 20 3.61667 20 5C20 6.38333 19.5125 7.5625 18.5375 8.5375C17.5625 9.5125 16.3833 10 15 10H11Z" fill="#475569"/>
</svg>
</span><span>Liên kết tài khoản</span>
             </div>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </div>
           <div style={styles.settingItem} onClick= {() => alert("Tính năng đang phát triển")}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>  <span style={{ fontSize: '18px' }}><svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4 16H12V14H4V16ZM4 12H12V10H4V12ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H10L16 6V18C16 18.55 15.8042 19.0208 15.4125 19.4125C15.0208 19.8042 14.55 20 14 20H2ZM9 7V2H2V18H14V7H9ZM2 2V7V2V7V18V2Z" fill="#475569"/>
</svg>
</span><span>Điều khoản chính sách</span>
             </div>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </div>
          {profile?.role === 'store_owner' && (
             <div style={styles.settingItem} onClick={() => router.push('/dashboard')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <span style={{ fontSize: '18px' }}>🏪</span>
                   <span style={{ fontWeight: 700, color: '#FF6A00' }}>Quản lý cửa hàng</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
             </div>
          )}
        </div>

        <div onClick={async () => { await supabase.auth.signOut(); router.push("/"); }} style={styles.logoutBtn}>Đăng xuất</div>
        <p style={{ textAlign: 'center', color: '#64748B', fontSize: '12px', marginBottom: '20px' }}>Phiên bản 2.4.0</p>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { position: 'sticky', top: 0, width: '100%', height: '70px', backgroundColor: '#FFF4DD', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 100, borderBottom: '1px solid rgba(255, 106, 0, 0.1)' },
  headerTitle: { fontSize: '18px', fontWeight: 700, color: '#0F172A' },
  profileCard: { background: '#FFF4DD', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px' },
  avatar: { width: '80px', height: '80px', borderRadius: '50%', border: '2px solid rgba(255, 106, 0, 0.2)', objectFit: 'cover' },
  userName: { fontSize: '20px', fontWeight: 700, color: '#0F172A' },
  userRank: { fontSize: '14px', fontWeight: 500, color: '#FF6A00' },
  btnEditProfile: { width: '100%', padding: '12px', background: 'rgba(255, 106, 0, 0.1)', borderRadius: '12px', border: '1px solid rgba(255, 106, 0, 0.2)', color: '#FF6A00', fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px' },
  statBox: { background: '#FFFFFF', padding: '12px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid rgba(255, 106, 0, 0.1)' },
  statLabel: { fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginTop: '4px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 8px' },
  sectionTitle: { fontSize: '18px', fontWeight: 700, color: '#0F172A' },
  viewAll: { fontSize: '14px', color: '#FF6A00', fontWeight: 600, cursor: 'pointer' },
  horizontalScroll: { display: 'flex', gap: '12px', overflowX: 'auto', padding: '8px 16px 16px' },
  followItem: { flex: '0 0 160px', cursor: 'pointer' },
  followImg: { width: '160px', height: '112px', borderRadius: '12px', objectFit: 'cover', marginBottom: '8px' },
  followName: { fontSize: '14px', fontWeight: 600, color: '#0F172A' },
  settingItem: { background: '#FFFFFF', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255, 106, 0, 0.05)', cursor: 'pointer' },
  logoutBtn: { margin: '24px 16px', padding: '16px', background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FECACA', color: '#EF4444', fontWeight: 700, textAlign: 'center', cursor: 'pointer' }
};