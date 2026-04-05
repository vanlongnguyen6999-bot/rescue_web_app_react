import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

interface UserMetadata {
  full_name?: string;
  name?: string;
  role?: string;
}
export async function GET() {
  const supabase = await createServerSupabaseClient();
  // getUser() sẽ tự động làm mới session và gọi setAll() nếu cần
  const { data: { user } } = await supabase.auth.getUser();
  
  // Trả về headers để tránh caching và đảm bảo cookie được gửi đi
  return NextResponse.json(
    { authenticated: !!user },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

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

  // Gọi RPC V2 để cập nhật số lượng và nhận lại lý do chi tiết
  const { data: rpcResult, error: rpcError } = await supabase.rpc('reserve_product', {
    p_product_id: productId,
    p_quantity: quantity
  });

  if (rpcError) {
    console.error(`[POST /api/reservations] RPC Error:`, rpcError);
    return NextResponse.json(
      { message: "Lỗi khi gọi hàm xử lý của database: " + rpcError.message },
      { status: 500 }
    );
  }

  // Xử lý kết quả trả về từ RPC
  if (rpcResult !== 'SUCCESS') {
    let userMessage = "Giữ chỗ thất bại. Vui lòng thử lại.";
    switch (rpcResult) {
      case 'PRODUCT_NOT_FOUND':
        userMessage = "Sản phẩm này không còn tồn tại trong hệ thống.";
        break;
      case 'PRODUCT_INACTIVE':
        userMessage = "Deal này vừa được chủ cửa hàng tạm dừng.";
        break;
      case 'INSUFFICIENT_STOCK':
        userMessage = "Deal vừa được người khác đặt hết. Số lượng không đủ.";
        break;
      default:
        userMessage = `Lỗi từ hệ thống: ${rpcResult}`;
        break;
    }
    return NextResponse.json({ message: userMessage }, { status: 409 });
  }

  const qrCode = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const metadata = user.user_metadata as UserMetadata;
  // Đảm bảo user tồn tại trong bảng public.users để tránh lỗi Foreign Key
  const { error: userSyncError } = await supabase
    .from("users")
    .upsert({
      id: user.id,
      email: user.email,
      full_name: metadata?.full_name ?? metadata?.name ?? null,
      role: metadata?.role ?? 'buyer',
    }, { onConflict: 'id' });

  if (userSyncError) {
    console.error(`[POST /api/reservations] User sync error:`, userSyncError);
    // Vẫn tiếp tục thử insert reservation vì có thể user đã tồn tại sẵn
  }

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .insert({
      user_id: user.id,
      product_id: productId,
      quantity,
      qr_code: qrCode, // Sử dụng mã đã tạo
      status: "Reserved",
      expires_at: expiresAt,
    })
    .select("id, qr_code, expires_at")
    .single();

  if (reservationError || !reservation) {
    console.error(`[POST /api/reservations] Insert reservation error:`, reservationError);
    return NextResponse.json(
      { 
        message: "Không thể tạo đơn giữ chỗ", 
        detail: reservationError?.message,
        hint: reservationError?.hint,
        code: reservationError?.code 
      },
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

