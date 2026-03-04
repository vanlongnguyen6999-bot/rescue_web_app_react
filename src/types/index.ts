export type UserRole = "buyer" | "store_owner";

export type ProductCategory = "flash_sale" | "grocery";

export interface Store {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

export interface Product {
  id: string;
  name: string;
  original_price: number;
  sale_price: number;
  quantity: number;
  expiry_date: string;
  category: ProductCategory;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  store: Store;
}


