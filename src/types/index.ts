export type UserRole = "buyer" | "store_owner";

export type ProductCategory = "flash_sale" | "grocery";

export interface Store {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  opening_hours: string | null;
  business_type: string | null;
  image_url: string | null;
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
  description: string | null;
}


