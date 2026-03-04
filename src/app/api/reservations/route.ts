import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body || !body.product_id || !body.quantity) {
    return NextResponse.json(
      { message: "Thiếu product_id hoặc quantity" },
      { status: 400 }
    );
  }

  const productId = String(body.product_id);
  const quantity = Number(body.quantity) || 1;

  if (quantity <= 0) {
    return NextResponse.json(
      { message: "Số lượng không hợp lệ" },
      { status: 400 }
    );
  }

  // Lấy thông tin sản phẩm hiện tại
  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .select("id, quantity, is_active, expiry_date")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return NextResponse.json(
      { message: "Sản phẩm không tồn tại" },
      { status: 404 }
    );
  }

  if (!product.is_active) {
    return NextResponse.json(
      { message: "Deal này đã tạm dừng" },
      { status: 400 }
    );
  }

  if (product.quantity < quantity) {
    return NextResponse.json(
      { message: "Không đủ số lượng còn lại" },
      { status: 400 }
    );
  }

  // Không cho giữ chỗ nếu đã hết hạn sử dụng
  if (product.expiry_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(product.expiry_date as string);
    if (expiry.getTime() < today.getTime()) {
      return NextResponse.json(
        { message: "Deal này đã hết hạn." },
        { status: 400 }
      );
    }
  }

  // Cập nhật quantity với optimistic concurrency để giảm race condition
  const {
    data: updatedProduct,
    error: updateError,
  } = await supabase
    .from("products")
    .update({ quantity: product.quantity - quantity })
    .eq("id", productId)
    .eq("quantity", product.quantity)
    .select("id")
    .single();

  if (updateError || !updatedProduct) {
    return NextResponse.json(
      { message: "Deal vừa được đặt hết. Vui lòng chọn deal khác." },
      { status: 409 }
    );
  }

  const qrCode = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const {
    data: reservation,
    error: reservationError,
  } = await supabase
    .from("reservations")
    .insert({
      user_id: user.id,
      product_id: productId,
      quantity,
      qr_code: qrCode,
      status: "Reserved",
      expires_at: expiresAt,
    })
    .select("id, qr_code, expires_at")
    .single();

  if (reservationError || !reservation) {
    return NextResponse.json(
      { message: "Không thể tạo đơn giữ chỗ" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      reservation_id: reservation.id,
      qr_code: reservation.qr_code,
      expires_at: reservation.expires_at,
    },
    { status: 200 }
  );
}

