"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AddDealForm } from "@/components/AddDealForm";
import { StoreInfoForm } from "@/components/StoreInfoForm";

interface Store {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  opening_hours: string | null;
  business_type: string | null;
}

interface ProductRow {
  id: string;
  name: string;
  quantity: number;
  sale_price: number;
  is_active: boolean;
  reservations_count: number;
}

interface StatSummary {
  activeDeals: number;
  todayReservations: number;
  completedToday: number;
  estimatedRevenue: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      // Lớp bảo vệ: Chỉ cho phép store_owner truy cập
      const userRole = (user.user_metadata as any)?.role;
      if (userRole !== 'store_owner') {
        alert("Bạn không có quyền truy cập trang này.");
        router.replace('/');
        return;
      }

      // Đảm bảo có profile user + cửa hàng ngay trên client, không cần API server
      await supabase
        .from("users")
        .upsert(
          {
            id: user.id,
            email: user.email,
            full_name:
              (user.user_metadata as any)?.full_name ??
              (user.user_metadata as any)?.name ??
              null,
            role: (user.user_metadata as any)?.role ?? "store_owner",
          },
          { onConflict: "id" }
        );

      let { data: storeRow } = await supabase
        .from("stores")
        .select("id, name, address, lat, lng, opening_hours, business_type")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!storeRow) {
        const defaultName = (user.user_metadata as any)?.full_name
          ? `Cửa hàng ${(user.user_metadata as any).full_name}`
          : `Cửa hàng của ${user.email}`;

        const { data: newStore } = await supabase
          .from("stores")
          .insert({
            owner_id: user.id,
            name: defaultName,
            is_active: true,
          })
          .select("id, name, address, lat, lng, opening_hours, business_type")
          .single();

        storeRow = newStore as Store | null;
      }

      if (!storeRow) {
        setStore(null);
        setLoading(false);
        return;
      }

      const storeData = storeRow as Store;
      setStore(storeData);

      const { data: productData } = await supabase
        .from("products")
        .select(
          `
          id,
          name,
          quantity,
          sale_price,
          is_active,
          reservations:reservations(count)
        `
        )
        .eq("store_id", storeData.id);

      const productsMapped: ProductRow[] =
        productData?.map((p: any) => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity,
          sale_price: p.sale_price,
          is_active: p.is_active,
          reservations_count: (p.reservations?.[0]?.count as number) ?? 0,
        })) ?? [];

      setProducts(productsMapped);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayIso = todayStart.toISOString();

      const { data: reservationsData } = await supabase
        .from("reservations")
        .select(
          `
          id,
          status,
          quantity,
          created_at,
          products!inner (
            id,
            sale_price,
            store_id
          )
        `
        )
        .eq("products.store_id", storeData.id) // Lọc đơn hàng thuộc về cửa hàng này
        .gte("created_at", todayIso);

      // Sửa lỗi TypeScript: Ép kiểu dữ liệu trả về từ Supabase (có thể là array hoặc object)
      const mappedReservations = (reservationsData ?? []).map((r: any) => ({
        ...r,
        products: Array.isArray(r.products) ? r.products[0] : r.products
      }));

      setReservations(mappedReservations);
      setLoading(false);
    };

    load();
  }, [router, showForm]);

  const stats: StatSummary = useMemo(() => {
    const activeDeals = products.filter((p) => p.is_active).length;
    let todayReservations = 0;
    let completedToday = 0;
    let estimatedRevenue = 0;

    reservations.forEach((r: any) => {
      const salePrice = r.products?.sale_price ?? 0;
      todayReservations += 1;
      if (r.status === "Completed") {
        completedToday += 1;
      }
      estimatedRevenue += salePrice * r.quantity;
    });

    return {
      activeDeals,
      todayReservations,
      completedToday,
      estimatedRevenue,
    };
  }, [products, reservations]);

  const toggleProductActive = async (id: string, isActive: boolean) => {
    await supabase
      .from("products")
      .update({ is_active: !isActive })
      .eq("id", id);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, is_active: !isActive } : p
      )
    );
  };

  const deleteProduct = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8] pb-4">
      <header className="flex items-center justify-between px-4 pb-3 pt-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"
        >
          ←
        </button>
        <h1 className="text-base font-bold text-gray-900">
          Dashboard cửa hàng
        </h1>
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
          className="text-xs font-medium text-red-500"
        >
          Đăng xuất
        </button>
      </header>

      <main className="space-y-4 px-4">
        {store && !loading && (
          <>
            <StoreInfoForm
              store={store}
              onUpdated={(updated) => setStore(updated)}
            />

            <section className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl border border-[#FF6B00]/40 bg-white p-3">
                <div className="text-gray-500">Deal đang hoạt động</div>
                <div className="mt-1 text-2xl font-extrabold text-[#FF6B00]">
                  {stats.activeDeals}
                </div>
              </div>
              <div className="rounded-2xl border border-[#FF6B00]/40 bg-white p-3">
                <div className="text-gray-500">Đơn hôm nay</div>
                <div className="mt-1 text-2xl font-extrabold text-[#FF6B00]">
                  {stats.todayReservations}
                </div>
              </div>
              <div className="rounded-2xl border border-[#FF6B00]/40 bg-white p-3">
                <div className="text-gray-500">Đơn hoàn tất</div>
                <div className="mt-1 text-2xl font-extrabold text-[#FF6B00]">
                  {stats.completedToday}
                </div>
              </div>
              <div className="rounded-2xl border border-[#FF6B00]/40 bg-white p-3">
                <div className="text-gray-500">Doanh thu ước tính</div>
                <div className="mt-1 text-2xl font-extrabold text-[#FF6B00]">
                  {stats.estimatedRevenue.toLocaleString("vi-VN")}₫
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  Quản lý deal
                </h2>
                <button
                  type="button"
                  onClick={() => setShowForm((v) => !v)}
                  className="rounded-full bg-[#FF6B00] px-3 py-1 text-xs font-semibold text-white"
                >
                  + Tạo deal mới
                </button>
              </div>

              {showForm && (
                <AddDealForm
                  storeId={store.id}
                  onCreated={() => setShowForm(false)}
                />
              )}

              <div className="space-y-2 rounded-2xl bg-white p-3 text-xs shadow-sm">
                {products.length === 0 && (
                  <div className="text-gray-500">
                    Chưa có deal nào. Hãy tạo deal đầu tiên!
                  </div>
                )}
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 border-b border-orange-50 py-2 last:border-0"
                  >
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Còn {p.quantity} suất •{" "}
                        {p.sale_price.toLocaleString("vi-VN")}₫ •{" "}
                        {p.reservations_count} đơn đã giữ
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => toggleProductActive(p.id, p.is_active)}
                        className={`rounded-full px-2 py-1 ${
                          p.is_active
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {p.is_active ? "Đang bán" : "Đã tắt"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(p.id)}
                        className="text-[11px] text-red-500"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  Đơn gần đây
                </h2>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/scan")}
                  className="rounded-full border border-[#FF6B00]/40 px-3 py-1 text-xs font-semibold text-[#FF6B00]"
                >
                  Quét mã QR
                </button>
              </div>

              <div className="space-y-2 rounded-2xl bg-white p-3 text-xs shadow-sm">
                {reservations.length === 0 && (
                  <div className="text-gray-500">
                    Chưa có đơn nào hôm nay.
                  </div>
                )}
                {reservations.slice(0, 10).map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between border-b border-orange-50 py-2 last:border-0"
                  >
                    <div>
                      <div className="text-[11px] text-gray-400">
                        {new Date(r.created_at).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {r.products?.name ?? "Sản phẩm"}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-gray-600">
                      <div>Số lượng: {r.quantity}</div>
                      <div>Trạng thái: {r.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

