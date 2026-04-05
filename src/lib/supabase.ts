import { createClient } from '@supabase/supabase-js';

// Lấy URL và Key từ file .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Kiểm tra nhanh xem đã nhận được Key chưa để tránh lỗi trắng trang mà không biết tại sao
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ LỖI: Thiếu cấu hình Supabase! Hãy kiểm tra lại file .env.local và khởi động lại npm run dev."
  );
}

// Khởi tạo Supabase Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);