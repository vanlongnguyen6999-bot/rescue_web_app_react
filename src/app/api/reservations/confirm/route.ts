import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body?.qr_code) {
    return NextResponse.json(
      { message: "Thiếu mã QR" },
      { status: 400 }
    );
  }

  const qrCode = String(body.qr_code);

  // Lấy cửa hàng của user
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (storeError || !store) {
    return NextResponse.json(
      { message: "Bạn chưa có cửa hàng" },
      { status: 400 }
    );
  }

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .select(
      `
      id,
      status,
      quantity,
      expires_at,
      users:users (
        full_name,
        email
      ),
      products:products (
        id,
        name,
        store_id
      )
    `
    )
    .eq("qr_code", qrCode)
    .maybeSingle();

  if (reservationError || !reservation) {
    return NextResponse.json(
      { message: "Mã không hợp lệ" },
      { status: 404 }
    );
  }

  if (!reservation.products || reservation.products.store_id !== store.id) {
    return NextResponse.json(
      { message: "Mã này không thuộc cửa hàng của bạn" },
      { status: 403 }
    );
  }

  if (reservation.status !== "Reserved") {
    return NextResponse.json(
      { message: "Mã này đã được sử dụng" },
      { status: 400 }
    );
  }

  if (reservation.expires_at) {
    const exp = new Date(reservation.expires_at);
    if (exp.getTime() <= Date.now()) {
      return NextResponse.json(
        { message: "Mã này đã hết hạn" },
        { status: 400 }
      );
    }
  }

  const { error: updateError } = await supabase
    .from("reservations")
    .update({ status: "Completed" })
    .eq("id", reservation.id);

  if (updateError) {
    return NextResponse.json(
      { message: "Không thể xác nhận đơn" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      id: reservation.id,
      status: "Completed",
      quantity: reservation.quantity,
      expires_at: reservation.expires_at,
      users: reservation.users,
      products: reservation.products,
    },
    { status: 200 }
  );
}

