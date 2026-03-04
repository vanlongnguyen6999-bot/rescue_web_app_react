"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface StoreInfoFormProps {
  store: {
    id: string;
    name: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
  };
  onUpdated: (store: StoreInfoFormProps["store"]) => void;
}

export function StoreInfoForm({ store, onUpdated }: StoreInfoFormProps) {
  const [name, setName] = useState(store.name);
  const [address, setAddress] = useState(store.address ?? "");
  const [lat, setLat] = useState<string>(
    store.lat != null ? String(store.lat) : ""
  );
  const [lng, setLng] = useState<string>(
    store.lng != null ? String(store.lng) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ định vị.");
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      () => {
        setError("Không lấy được vị trí hiện tại.");
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const latNum = lat ? Number(lat) : null;
    const lngNum = lng ? Number(lng) : null;

    try {
      const { data, error: updateError } = await supabase
        .from("stores")
        .update({
          name: name.trim() || store.name,
          address: address.trim() || null,
          lat: latNum,
          lng: lngNum,
        })
        .eq("id", store.id)
        .select("id, name, address, lat, lng")
        .single();

      if (updateError || !data) {
        setError("Không thể lưu thông tin cửa hàng.");
        return;
      }

      onUpdated({
        id: data.id,
        name: data.name,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
      });
      setSuccess("Đã lưu thông tin cửa hàng.");
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl bg-white p-4 text-sm shadow-md"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          Thông tin cửa hàng
        </h2>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="rounded-full border border-[#FF6B00]/40 px-3 py-1 text-[11px] font-semibold text-[#FF6B00]"
        >
          Lấy vị trí hiện tại
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">
          Tên cửa hàng
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">
          Địa chỉ hiển thị cho khách
        </label>
        <textarea
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
          placeholder="Ví dụ: 123 Lê Lợi, Quận 1, TP.HCM"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">
            Vĩ độ (lat)
          </label>
          <input
            type="number"
            step="0.000001"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
            placeholder="10.76..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">
            Kinh độ (lng)
          </label>
          <input
            type="number"
            step="0.000001"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
            placeholder="106.7..."
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-600">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center rounded-xl bg-[#FF6B00] py-2 text-sm font-semibold text-white shadow-md shadow-orange-200 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {saving && (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        Lưu thông tin
      </button>
    </form>
  );
}

