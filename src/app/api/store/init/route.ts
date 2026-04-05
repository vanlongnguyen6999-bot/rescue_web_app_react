import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

interface UserMetadata {
  full_name?: string;
  name?: string;
  role?: string;
}
export async function POST() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const metadata = user.user_metadata as UserMetadata;
  const fullName = metadata?.full_name ?? metadata?.name ?? null;
  const role = metadata?.role ?? 'store_owner'; 
  await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email,
        full_name: fullName,
        role,
      },
      { onConflict: "id" }
    );

  // Tìm cửa hàng hiện có của user
  const { data: existingStore, error: storeError } = await supabase
    .from("stores")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (storeError) {
    return NextResponse.json(
      { message: "Không thể lấy thông tin cửa hàng" },
      { status: 500 }
    );
  }

  if (existingStore) {
    return NextResponse.json(existingStore, { status: 200 });
  }

  // Nếu chưa có, tạo cửa hàng mới
  const defaultName = fullName
    ? `Cửa hàng ${fullName}`
    : `Cửa hàng của ${user.email}`;

  const { data: newStore, error: insertError } = await supabase
    .from("stores")
    .insert({
      owner_id: user.id,
      name: defaultName,
      is_active: true,
    })
    .select("id, name")
    .single();

  if (insertError || !newStore) {
    return NextResponse.json(
      { message: "Không thể tạo cửa hàng" },
      { status: 500 }
    );
  }

  return NextResponse.json(newStore, { status: 200 });
}

