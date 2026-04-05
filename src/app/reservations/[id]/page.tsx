"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ReservationDetail {
  id: string;
  qr_code: string;
  quantity: number;
  status: string;
  expires_at: string;
  products: {
    name: string;
    image_url: string | null;
    discount_price: number;
    stores: {
      name: string;
      address: string;
      phone: string;
    } | null;
  } | null;
}

export default function ReservationDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [order, setOrder] = useState<ReservationDetail | null>(null);
  const [showZoom, setShowZoom] = useState<boolean>(false);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("reservations")
        .select(`
          id, qr_code, quantity, status, expires_at,
          products (
            name, image_url, discount_price,
            stores ( name, address, phone )
          )
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error("Lỗi lấy chi tiết đơn hàng:", error.message);
      } else {
        setOrder(data as unknown as ReservationDetail);
      }
    };
    fetchOrderDetails();
  }, [id]);

  if (!order) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748B' }}>
        Đang tải thông tin đơn hàng...
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#F8F7F5', minHeight: '100vh', paddingBottom: '120px' }}>
      <header style={{ height: '70px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,106,0,0.1)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          <button onClick={() => router.push('/')} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Xác nhận đơn hàng</h1>
          <div style={{ width: '40px' }} />
        </div>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}> 
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '80px', height: '80px', background: '#DCFCE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Đặt chỗ thành công!</h2>
          <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(255,106,0,0.1)', borderRadius: '99px', color: '#FF6A00', fontWeight: 600, fontSize: '14px', marginTop: '8px' }}>
            Mã đơn hàng: {order.qr_code}
          </div>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,106,0,0.1)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Mã QR của bạn</h3>
          <div style={{ width: '220px', height: '220px', position: 'relative', margin: '20px 0', cursor: 'pointer' }} onClick={() => setShowZoom(true)}>
            <div style={{ width: '100%', height: '100%', padding: '12px', background: 'white', borderRadius: '12px', outline: '2px solid #F1F5F9', zIndex: 1 }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${order.qr_code}`} alt="QR" style={{ width: '100%' }} />
            </div>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', boxShadow: '0px 10px 15px -3px #FED7AA', borderRadius: '12px', zIndex: 0 }}></div>
          </div>
          <button onClick={() => setShowZoom(true)} style={{ background: 'none', border: 'none', color: '#FF6A00', fontWeight: 600, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M12.45 13.5L7.725 8.775C7.35 9.075 6.91875 9.3125 6.43125 9.4875C5.94375 9.6625 5.425 9.75 4.875 9.75C3.5125 9.75 2.35938 9.27813 1.41562 8.33438C0.471875 7.39063 0 6.2375 0 4.875C0 3.5125 0.471875 2.35938 1.41562 1.41562C2.35938 0.471875 3.5125 0 4.875 0C6.2375 0 7.39063 0.471875 8.33438 1.41562C9.27813 2.35938 9.75 3.5125 9.75 4.875C9.75 5.425 9.6625 5.94375 9.4875 6.43125C9.3125 6.91875 9.075 7.35 8.775 7.725L13.5 12.45L12.45 13.5ZM4.875 8.25C5.8125 8.25 6.60938 7.92188 7.26562 7.26562C7.92188 6.60938 8.25 5.8125 8.25 4.875C8.25 3.9375 7.92188 3.14062 7.26562 2.48438C6.60938 1.82812 5.8125 1.5 4.875 1.5C3.9375 1.5 3.14062 1.82812 2.48438 2.48438C1.82812 3.14062 1.5 3.9375 1.5 4.875C1.5 5.8125 1.82812 6.60938 2.48438 7.26562C3.14062 7.92188 3.9375 8.25 4.875 8.25ZM4.125 7.125V5.625H2.625V4.125H4.125V2.625H5.625V4.125H7.125V5.625H5.625V7.125H4.125Z" fill="#FF6A00"/>
             </svg> Phóng to mã QR
          </button>
        </div>

        <div style={{ marginTop: '24px' }}>
          <div style={{ background: '#FFF7ED', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,106,0,0.05)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 15H11V9H9V15ZM10 7C10.2833 7 10.5208 6.90417 10.7125 6.7125C10.9042 6.52083 11 6.28333 11 6C11 5.71667 10.9042 5.47917 10.7125 5.2875C10.5208 5.09583 10.2833 5 10 5C9.71667 5 9.47917 5.09583 9.2875 5.2875C9.09583 5.47917 9 5.71667 9 6C9 6.28333 9.09583 6.52083 9.2875 6.7125C9.47917 6.90417 9.71667 7 10 7ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2333 18 14.125 17.225 15.675 15.675C17.225 14.125 18 12.2333 18 10C18 7.76667 17.225 5.875 15.675 4.325C14.125 2.775 12.2333 2 10 2C7.76667 2 5.875 2.775 4.325 4.325C2.775 5.875 2 7.76667 2 10C2 12.2333 2.775 14.125 4.325 15.675C5.875 17.225 7.76667 18 10 18Z" fill="#FF6A00"/>
              </svg>
              <span style={{ fontWeight: 700, fontSize: '18px' }}>Lưu ý nhận hàng</span>
            </div>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#475569', marginBottom: '12px' }}><svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="6" height="6" rx="3" fill="#FF6A00"/></svg>Vui lòng đến cửa hàng trước: <b>{new Date(order.expires_at).toLocaleTimeString('vi-VN')}</b> hôm nay.</p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#475569', marginBottom: '12px' }}><svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="6" height="6" rx="3" fill="#FF6A00"/>
            </svg>Đơn hàng sẽ được tự động huỷ nếu bạn đến quá hẹn 30 phút.</p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#475569', marginBottom: '12px' }}><svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="6" height="6" rx="3" fill="#FF6A00"/>
            </svg>Liên hệ nhân viên tại quầy nếu đơn hàng có vấn đề</p>
          </div>

          <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Thông tin cửa hàng</h3>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                <svg width="14" height="17" viewBox="0 0 14 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.66667 8.33333C7.125 8.33333 7.51736 8.17014 7.84375 7.84375C8.17014 7.51736 8.33333 7.125 8.33333 6.66667C8.33333 6.20833 8.17014 5.81597 7.84375 5.48958C7.51736 5.16319 7.125 5 6.66667 5C6.20833 5 5.81597 5.16319 5.48958 5.48958C5.16319 5.81597 5 6.20833 5 6.66667C5 7.125 5.16319 7.51736 5.48958 7.84375C5.81597 8.17014 6.20833 8.33333 6.66667 8.33333ZM6.66667 14.4583C8.36111 12.9028 9.61806 11.4896 10.4375 10.2188C11.2569 8.94792 11.6667 7.81944 11.6667 6.83333C11.6667 5.31944 11.184 4.07986 10.2188 3.11458C9.25347 2.14931 8.06944 1.66667 6.66667 1.66667C5.26389 1.66667 4.07986 2.14931 3.11458 3.11458C2.14931 4.07986 1.66667 5.31944 1.66667 6.83333C1.66667 7.81944 2.07639 8.94792 2.89583 10.2188C3.71528 11.4896 4.97222 12.9028 6.66667 14.4583ZM6.66667 16.6667C4.43056 14.7639 2.76042 12.9965 1.65625 11.3646C0.552083 9.73264 0 8.22222 0 6.83333C0 4.75 0.670139 3.09028 2.01042 1.85417C3.35069 0.618055 4.90278 0 6.66667 0C8.43056 0 9.98264 0.618055 11.3229 1.85417C12.6632 3.09028 13.3333 4.75 13.3333 6.83333C13.3333 8.22222 12.7812 9.73264 11.6771 11.3646C10.5729 12.9965 8.90278 14.7639 6.66667 16.6667Z" fill="#FF6A00"/>
                </svg>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{order.products?.stores?.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{order.products?.stores?.address}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.125 15C12.3889 15 10.6736 14.6215 8.97917 13.8646C7.28472 13.1076 5.74306 12.0347 4.35417 10.6458C2.96528 9.25694 1.89236 7.71528 1.13542 6.02083C0.378472 4.32639 0 2.61111 0 0.875C0 0.625 0.0833333 0.416667 0.25 0.25C0.416667 0.0833333 0.625 0 0.875 0H4.25C4.44444 0 4.61806 0.0659722 4.77083 0.197917C4.92361 0.329861 5.01389 0.486111 5.04167 0.666667L5.58333 3.58333C5.61111 3.80556 5.60417 3.99306 5.5625 4.14583C5.52083 4.29861 5.44444 4.43056 5.33333 4.54167L3.3125 6.58333C3.59028 7.09722 3.92014 7.59375 4.30208 8.07292C4.68403 8.55208 5.10417 9.01389 5.5625 9.45833C5.99306 9.88889 6.44444 10.2882 6.91667 10.6562C7.38889 11.0243 7.88889 11.3611 8.41667 11.6667L10.375 9.70833C10.5 9.58333 10.6632 9.48958 10.8646 9.42708C11.066 9.36458 11.2639 9.34722 11.4583 9.375L14.3333 9.95833C14.5278 10.0139 14.6875 10.1146 14.8125 10.2604C14.9375 10.4062 15 10.5694 15 10.75V14.125C15 14.375 14.9167 14.5833 14.75 14.75C14.5833 14.9167 14.375 15 14.125 15ZM2.52083 5L3.89583 3.625L3.54167 1.66667H1.6875C1.75694 2.23611 1.85417 2.79861 1.97917 3.35417C2.10417 3.90972 2.28472 4.45833 2.52083 5ZM9.97917 12.4583C10.5208 12.6944 11.0729 12.8819 11.6354 13.0208C12.1979 13.1597 12.7639 13.25 13.3333 13.2917V11.4583L11.375 11.0625L9.97917 12.4583Z" fill="#FF6A00"/>
                </svg>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{order.products?.stores?.phone}</div>
              </div>
            </div>
            <img src={order.products?.image_url || ""} style={{ width: '70px', height: '70px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #eee' }} />
          </div>
        </div>
      </main>

      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: 'white', padding: '16px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'center', zIndex: 1000 }}>
        <button onClick={() => router.push('/')} style={{ width: '90%', maxWidth: '400px', padding: '16px', borderRadius: '12px', background: '#FF6A00', color: 'white', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '16px', cursor: 'pointer' }}>
          <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 16H5V10H11V16H14V7L8 2.5L2 7V16ZM0 18V6L8 0L16 6V18H9V12H7V18H0Z" fill="white"/>
          </svg>
          Quay lại Trang chủ
        </button>
      </div>

      {showZoom && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }} onClick={() => setShowZoom(false)}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>Mã QR của bạn</h3>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${order.qr_code}`} style={{ width: '100%', borderRadius: '12px' }} />
            <button onClick={() => setShowZoom(false)} style={{ marginTop: '20px', width: '100%', padding: '14px', border: 'none', background: '#F1F5F9', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}