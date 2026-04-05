import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface ProductInfo {
  id: string;
  name: string;
  store_id: string;
}
interface ReservationRow {
  id: string;
  status: string;
  quantity: number;
  expires_at: string;
  user_id: string;
  products: ProductInfo | ProductInfo[] | null;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const qrCodeInput: string | undefined = body?.qrCode || body?.qr_code;
    if (!qrCodeInput) {
      return NextResponse.json({ message: "Thiếu mã QR" }, { status: 400 });
    }

    const formattedCode = qrCodeInput.trim().toUpperCase();
    const { data, error: findError } = await supabase
      .from("reservations")
      .select(`
        id, status, quantity, expires_at, user_id,
        products:products (id, name, store_id)
      `)
      .eq("qr_code", formattedCode)
      .single();

    const reservation = data as unknown as ReservationRow;
    if (findError || !reservation) {
      return NextResponse.json({ message: "Mã nhận hàng không tồn tại" }, { status: 404 });
    }
    const currentStatus = reservation.status.toLowerCase();
    if (currentStatus === "completed" || currentStatus === "success") {
      return NextResponse.json({ message: "Mã này đã được xác nhận trước đó" }, { status: 400 });
    }
    const { error: updateError } = await supabase
      .from("reservations")
      .update({ status: "Completed" })
      .eq("id", reservation.id);
    if (updateError) throw updateError;

    const productData = Array.isArray(reservation.products) 
      ? reservation.products[0] 
      : reservation.products;
    try {
      await supabase.from("notifications").insert({
        user_id: reservation.user_id,
        title: "Giao dịch thành công!",
        message: `Món "${productData?.name || 'Sản phẩm'}" đã được xác nhận. Chúc bạn ngon miệng!`
      });
    } catch (notifErr) {
      console.error("Lỗi gửi thông báo (không chặn luồng chính):", notifErr);
    }
    return NextResponse.json({
      product_name: productData?.name || "Sản phẩm không tên",
      quantity: reservation.quantity,
      status: "Completed"
    }, { status: 200 });
  } catch (err) {
    console.error("Lỗi API Confirm:", err);
    return NextResponse.json({ message: "Lỗi hệ thống khi xử lý mã" }, { status: 500 });
  }
}