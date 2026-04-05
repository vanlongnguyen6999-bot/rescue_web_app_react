"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Product } from "@/types";
import Link from "next/link";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReserving, setIsReserving] = useState(false);

  // 1. Lấy dữ liệu chi tiết từ Supabase
  useEffect(() => {
    const fetchDetail = async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`*, stores ( id, name, address, lat, lng )`)
        .eq("id", id)
        .single();

      if (data) {
        const storeData = Array.isArray(data.stores) ? data.stores[0] : data.stores;
        setProduct({ ...data, store: storeData } as Product);
      }
      setLoading(false);
    };
    fetchDetail();
  }, [id]);

  // 2. Logic Đặt chỗ (Lưu vào bảng reservations)
  const handleReserve = async () => {
  if (!product || product.quantity <= 0) return;

  setIsReserving(true);
  try {
    // 1. Lấy thông tin session hiện tại một cách an toàn
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.user) {
      alert("Vui lòng đăng nhập để thực hiện đặt chỗ!");
      router.push("/auth");
      return;
    }

    const userId = session.user.id; // <--- ĐÂY CHÍNH LÀ ID NGƯỜI MUA HIỆN TẠI
    const qrCode = `ECO-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    // 2. Chèn vào bảng reservations với ID thật
    const { data: newReservation, error: resError } = await supabase
      .from("reservations")
      .insert([{
        product_id: product.id,
        user_id: userId, // <--- Dùng biến userId vừa lấy được
        quantity: 1,
        status: 'Reserved',
        qr_code: qrCode,
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      }])
      .select()
      .single();

    if (resError) throw resError;

    // 3. Giảm số lượng trong kho
    await supabase
      .from("products")
      .update({ quantity: product.quantity - 1 })
      .eq("id", product.id);
    if(newReservation){
        router.push(`/reservations/${newReservation.id}`);
    }

  } catch (err) {
    console.error("Lỗi đặt chỗ:", err);
    alert("Có lỗi xảy ra khi đặt chỗ. Long kiểm tra lại bảng reservations nhé!");
  } finally {
    setIsReserving(false);
  }
};

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF5E2]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF6A00] border-t-transparent"></div>
    </div>
  );

  if (!product) return <div className="p-10 text-center">Món ăn không tồn tại!</div>;

  return (
    <div className="flex min-h-screen flex-col bg-[#FFF5E2] pb-24 relative">
      {/* Nút Quay lại */}
      <button 
        onClick={() => router.back()} 
        className="fixed top-4 left-4 z-40 rounded-full bg-white/90 p-2 shadow-lg backdrop-blur-md active:scale-90 transition-transform"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6"/></svg>
      </button>

      {/* Ảnh bìa */}
      <div className="h-[40vh] w-full">
        <img 
          src={product.image_url?.startsWith('http') ? product.image_url : `/${product.image_url}`} 
          className="h-full w-full object-cover"
          alt={product.name}
        />
      </div>

      {/* Thông tin chi tiết */}
      <main className="flex-1 p-5 -mt-8 relative z-10 bg-[#FFF5E2] rounded-t-[32px] shadow-2xl">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-black text-white bg-[#FF6A00] px-3 py-1 rounded-full uppercase">
            {product.category}
          </span>
          <span className="text-xs font-bold text-red-500">Hạn: {product.expiry_date}</span>
        </div>

        <h1 className="text-2xl font-black text-[#0F172A] mb-2">{product.name}</h1>
        
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl font-black text-[#FF6A00]">{product.sale_price.toLocaleString()}đ</span>
          <span className="text-lg text-gray-400 line-through">{product.original_price.toLocaleString()}đ</span>
        </div>

        {/* Card Cửa hàng */}
        <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-[#E2E8F0] mb-6">
          <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center font-bold text-[#FF6A00]">
            {product.store?.name?.charAt(0)}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm">{product.store?.name}</h4>
            <p className="text-[11px] text-gray-500 truncate">{product.store?.address}</p>
          </div>
          <Link href="/map" className="text-xs font-bold text-[#FF6A00] underline">Bản đồ</Link>
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-lg">Mô tả</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {product.description || "Hãy chung tay cùng EcoEat giải cứu món ngon này để bảo vệ môi trường và tiết kiệm chi phí nhé!"}
          </p>
        </div>
      </main>

      {/* Thanh đặt chỗ cố định */}
      {/* Sửa lại lỗi cú pháp: fixed bottom-[70]px -> fixed bottom-[70px] */}
      <footer className="fixed bottom-[70px] left-0 w-full bg-white/95 backdrop-blur-md p-4 border-t flex items-center gap-4 z-30">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-gray-400">CÒN LẠI: {product.quantity} SUẤT</p>
          <p className="text-xl font-black text-[#FF6A00]">{product.sale_price.toLocaleString()}đ</p>
        </div>
        <button 
          onClick={handleReserve}
          disabled={isReserving || product.quantity === 0}
          className={`px-8 py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${
            isReserving || product.quantity === 0 ? 'bg-gray-300' : 'bg-[#FF6A00] shadow-[#FF6A00]/30'
          }`}
        >
          {isReserving ? "ĐANG XỬ LÝ..." : product.quantity === 0 ? "HẾT SUẤT" : "ĐẶT CHỖ NGAY"}
        </button>
      </footer>
    </div>
  );
}