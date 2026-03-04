import type { Product } from "@/types";
import Link from "next/link";
import { differenceInCalendarDays, parseISO } from "date-fns";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const expiryDate = parseISO(product.expiry_date);
  const daysToExpiry = differenceInCalendarDays(expiryDate, new Date());
  const discountPercent = Math.round(
    ((product.original_price - product.sale_price) / product.original_price) *
      100
  );

  const isLowStock = product.quantity <= 3;
  const isExpirySoon = daysToExpiry <= 1;

  const categoryBadge =
    product.category === "flash_sale"
      ? {
          label: "FLASH SALE",
          className: "bg-red-500 text-white",
        }
      : {
          label: "GROCERY",
          className: "bg-emerald-500 text-white",
        };

  return (
    <Link
      href={`/deal/${product.id}`}
      className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-40 w-full overflow-hidden">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-orange-50 text-sm text-orange-400">
            Không có ảnh
          </div>
        )}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${categoryBadge.className}`}
        >
          {categoryBadge.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
            {product.name}
          </h3>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 line-through">
              {product.original_price.toLocaleString("vi-VN")}₫
            </span>
            <span className="text-base font-extrabold text-[#FF6B00]">
              {product.sale_price.toLocaleString("vi-VN")}₫
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-[#FF6B00]">
              Giảm {discountPercent}%
            </span>
            <span
              className={`text-xs font-medium ${
                isLowStock ? "text-red-500" : "text-gray-500"
              }`}
            >
              Còn {product.quantity} suất
            </span>
          </div>
          <div
            className={`text-[11px] ${
              isExpirySoon ? "text-red-500" : "text-orange-500"
            }`}
          >
            HSD: {expiryDate.toLocaleDateString("vi-VN")}
          </div>
        </div>

        <div className="mt-auto space-y-2 pt-1">
          <p className="text-[11px] text-gray-500">
            {product.store.name} • {product.store.address}
          </p>
          <button
            type="button"
            className="w-full rounded-xl bg-[#FF6B00] py-2 text-xs font-semibold text-white shadow-sm shadow-orange-200"
          >
            Giữ chỗ
          </button>
        </div>
      </div>
    </Link>
  );
}

