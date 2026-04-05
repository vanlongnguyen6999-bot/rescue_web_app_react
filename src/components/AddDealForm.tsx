"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ProductCategory } from "@/types";

interface AddDealFormProps {
  storeId: string;
  onCreated?: () => void;
}

export function AddDealForm({ storeId, onCreated }: AddDealFormProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>("flash_sale");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [originalPrice, setOriginalPrice] = useState<number | "">("");
  const [salePrice, setSalePrice] = useState<number | "">("");
  const [quantity, setQuantity] = useState(10);
  const [expiryDate, setExpiryDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [saleTime, setSaleTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const discountPercent =
    typeof originalPrice === "number" &&
    typeof salePrice === "number" &&
    originalPrice > 0 &&
    salePrice > 0 &&
    salePrice < originalPrice
      ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
      : null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (
      typeof originalPrice !== "number" ||
      typeof salePrice !== "number" ||
      !expiryDate
    ) {
      setError("Vui lòng nhập đầy đủ và đúng định dạng.");
      return;
    }

    if (salePrice >= originalPrice) {
      setError("Giá giảm phải thấp hơn giá gốc.");
      return;
    }

    setLoading(true);

    try {
      let image_url: string | null = null;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const filePath = `${storeId}/${Date.now()}.${fileExt}`;

        // SỬA TÊN BUCKET TẠI ĐÂY: image-products
        const { error: uploadError } = await supabase.storage
          .from("image-products")
          .upload(filePath, imageFile, {
            cacheControl: "3600",
            upsert: true, // Để true để tránh lỗi nếu trùng tên file
          });

        if (uploadError) {
          console.error("Lỗi Storage:", uploadError.message);
          setError(`Lỗi upload ảnh: ${uploadError.message}`);
          setLoading(false);
          return;
        }

        // LẤY URL CÔNG KHAI TỪ BUCKET: image-products
        const { data: publicUrlData } = supabase.storage
          .from("image-products")
          .getPublicUrl(filePath);

        image_url = publicUrlData?.publicUrl ?? null;
      }

      const { error: insertError } = await supabase.from("products").insert({
        store_id: storeId,
        name,
        category,
        image_url,
        original_price: originalPrice,
        sale_price: salePrice,
        quantity,
        expiry_date: expiryDate,
      });

      if (insertError) {
        console.error("Lỗi Database:", insertError.message);
        setError("Không thể tạo deal mới.");
        setLoading(false);
        return;
      }

      setSuccess("Đã đăng deal thành công!");
      // Reset form
      setName("");
      setImageFile(null);
      setImagePreview(null);
      setOriginalPrice("");
      setSalePrice("");
      setQuantity(10);
      setExpiryDate("");
      setPickupTime("");
      setSaleTime("");
      onCreated?.();
    } catch (err) {
      console.error("Lỗi hệ thống:", err);
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-white p-4 text-sm shadow-md"
    >
      <h2 className="text-base font-bold text-gray-900">Tạo deal Flash Sale</h2>

      {/* Tên sản phẩm */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">Tên sản phẩm</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
          placeholder="Combo bánh mì pate dân tổ..."
        />
      </div>

      {/* Loại deal */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">Loại deal</label>
        <div className="flex gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCategory("flash_sale")}
            className={`flex-1 rounded-2xl border px-3 py-2 transition-colors ${
              category === "flash_sale"
                ? "border-transparent bg-[#FF6B00] text-white"
                : "border-gray-200 bg-orange-50 text-[#FF6B00]"
            }`}
          >
            Flash Sale cuối ngày
          </button>
          <button
            type="button"
            onClick={() => setCategory("grocery")}
            className={`flex-1 rounded-2xl border px-3 py-2 transition-colors ${
              category === "grocery"
                ? "border-transparent bg-emerald-500 text-white"
                : "border-gray-200 bg-emerald-50 text-emerald-600"
            }`}
          >
            Hàng cận date
          </button>
        </div>
      </div>

      {/* Ảnh sản phẩm */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">Ảnh sản phẩm</label>
        <div className="flex items-center gap-3">
          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 text-xs text-[#FF6B00] hover:bg-orange-100 transition-colors">
            + Ảnh
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </label>
          {imagePreview && (
            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-orange-100 shadow-sm">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Giá cả */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Giá gốc (VNĐ)</label>
          <input
            type="number"
            min={1000}
            required
            value={originalPrice}
            onChange={(e) => setOriginalPrice(e.target.value ? Number(e.target.value) : "")}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Giá giảm (VNĐ)</label>
          <input
            type="number"
            min={1000}
            required
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value ? Number(e.target.value) : "")}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
          />
        </div>
      </div>

      {discountPercent !== null && (
        <div className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-[#FF6B00] animate-pulse">
          Tiết kiệm khoảng <span>{discountPercent}%</span> so với giá gốc
        </div>
      )}

      {/* Số lượng */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">Số lượng suất</label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-xl font-bold text-[#FF6B00] active:scale-90 transition-transform"
          >
            −
          </button>
          <span className="text-lg font-black text-[#0F172A] w-6 text-center">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B00] text-xl font-bold text-white shadow-lg shadow-orange-200 active:scale-90 transition-transform"
          >
            +
          </button>
        </div>
      </div>

      {/* Thời gian */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Bắt đầu bán</label>
          <input
            type="datetime-local"
            value={saleTime}
            onChange={(e) => setSaleTime(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Hạn nhận hàng</label>
          <input
            type="time"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">Hạn sử dụng sản phẩm</label>
        <input
          type="date"
          required
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
        />
      </div>

      {/* Thông báo lỗi/thành công */}
      {error && <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 font-medium border border-red-100">{error}</div>}
      {success && <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-600 font-bold border border-emerald-100">🎉 {success}</div>}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center rounded-2xl bg-[#FF6B00] py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-orange-200 hover:brightness-110 active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-3 border-white border-t-transparent" />
        ) : (
          "Đăng deal ngay"
        )}
      </button>
    </form>
  );
}