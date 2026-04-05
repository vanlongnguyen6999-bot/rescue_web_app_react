"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const getNavItemStyle = (path: string): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontSize: '10px',
    color: isActive(path) ? '#FF6A00' : '#94A3B8', // Đổi màu chữ
    gap: '4px',
    textDecoration: 'none',
    flex: 1,
    transition: 'all 0.2s ease' // Hiệu ứng mượt mà
  });

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, width: '100%', height: '75px',
      backgroundColor: 'white', borderTop: '1px solid #E2E8F0',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      paddingBottom: '10px', zIndex: 1000, boxShadow: '0 -2px 10px rgba(0,0,0,0.02)'
    }}>
      
      <Link href="/" style={getNavItemStyle('/')}>
        <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
          <path d="M2 16H5V10H11V16H14V7L8 2.5L2 7V16ZM0 18V6L8 0L16 6V18H9V12H7V18H0Z" 
                fill={isActive('/') ? '#FF6A00' : '#94A3B8'}/>
        </svg>
        <span style={{ fontWeight: isActive('/') ? 800 : 500 }}>Trang chủ</span>
      </Link>

      <Link href="/categories" style={getNavItemStyle('/categories')}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M0 8V0H8V8H0ZM0 18V10H8V18H0ZM10 8V0H18V8H10ZM10 18V10H18V18H10ZM2 6H6V2H2V6ZM12 6H16V2H12V6ZM12 16H16V12H12V16ZM2 16H6V12H2V16Z" 
                fill={isActive('/categories') ? '#FF6A00' : '#94A3B8'}/>
        </svg>
        <span style={{ fontWeight: isActive('/categories') ? 800 : 500 }}>Danh mục</span>
      </Link>

      <Link href="/map" style={getNavItemStyle('/map')}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M12 18L6 15.9L1.35 17.7C1.01667 17.8333 0.708333 17.7958 0.425 17.5875C0.141667 17.3792 0 17.1 0 16.75V2.75C0 2.53333 0.0625 2.34167 0.1875 2.175C0.3125 2.00833 0.483333 1.88333 0.7 1.8L6 0L12 2.1L16.65 0.3C16.9833 0.166667 17.2917 0.204167 17.575 0.4125C17.8583 0.620833 18 0.9 18 1.25V15.25C18 15.4667 17.9375 15.6583 17.8125 15.825C17.6875 15.9917 17.5167 16.1167 17.3 16.2L12 18ZM11 15.55V3.85L7 2.45V14.15L11 15.55ZM13 15.55L16 14.55V2.7L13 3.85V15.55ZM2 15.3L5 14.15V2.45L2 3.45V15.3Z" 
                fill={isActive('/map') ? '#FF6A00' : '#94A3B8'}/>
        </svg>
        <span style={{ fontWeight: isActive('/map') ? 800 : 500 }}>Bản đồ</span>
      </Link>

      <Link href="/my-orders" style={getNavItemStyle('/my-orders')}>
        <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
          <path d="M3 20C2.16667 20 1.45833 19.7083 0.875 19.125C0.291667 18.5417 0 17.8333 0 17V14H3V0L4.5 1.5L6 0L7.5 1.5L9 0L10.5 1.5L12 0L13.5 1.5L15 0L16.5 1.5L18 0V17C18 17.8333 17.7083 18.5417 17.125 19.125C16.5417 19.7083 15.8333 20 15 20H3ZM15 18C15.2833 18 15.5208 17.9042 15.7125 17.7125C15.9042 17.5208 16 17.2833 16 17V3H5V14H14V17C14 17.2833 14.0958 17.5208 14.2875 17.7125C14.4792 17.9042 14.7167 18 15 18ZM6 7V5H12V7H6ZM6 10V8H12V10H6ZM14 7C13.7167 7 13.4792 6.90417 13.2875 6.7125C13.0958 6.52083 13 6.28333 13 6C13 5.71667 13.0958 5.47917 13.2875 5.2875C13.4792 5.09583 13.7167 5 14 5C14.2833 5 14.5208 5.09583 14.7125 5.2875C14.9042 5.47917 15 5.71667 15 6C15 6.28333 14.9042 6.52083 14.7125 6.7125C14.5208 6.90417 14.2833 7 14 7ZM14 10C13.7167 10 13.4792 9.90417 13.2875 9.7125C13.0958 9.52083 13 9.28333 13 9C13 8.71667 13.0958 8.47917 13.2875 8.2875C13.4792 8.09583 13.7167 8 14 8C14.2833 8 14.5208 8.09583 14.7125 8.2875C14.9042 8.47917 15 8.71667 15 9C15 9.28333 14.9042 9.52083 14.7125 9.7125C14.5208 9.90417 14.2833 10 14 10ZM3 18H12V16H2V17C2 17.2833 2.09583 17.5208 2.2875 17.7125C2.47917 17.9042 2.71667 18 3 18ZM2 18C2 18 2 17.9042 2 17.7125C2 17.5208 2 17.2833 2 17V16V18Z" 
                fill={isActive('/my-orders') ? '#FF6A00' : '#94A3B8'}/>
        </svg>
        <span style={{ fontWeight: isActive('/my-orders') ? 800 : 500 }}>Đơn hàng</span>
      </Link>

      <Link href="/profile" style={getNavItemStyle('/profile')}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0ZM2 14H14V13.2C14 13.0167 13.9542 12.85 13.8625 12.7C13.7708 12.55 13.65 12.4333 13.5 12.35C12.6 11.9 11.6917 11.5625 10.775 11.3375C9.85833 11.1125 8.93333 11 8 11C7.06667 11 6.14167 11.1125 5.225 11.3375C4.30833 11.5625 3.4 11.9 2.5 12.35C2.35 12.4333 2.22917 12.55 2.1375 12.7C2.04583 12.85 2 13.0167 2 13.2V14ZM8 6C8.55 6 9.02083 5.80417 9.4125 5.4125C9.80417 5.02083 10 4.55 10 4C10 3.45 9.80417 2.97917 9.4125 2.5875C9.02083 2.19583 8.55 2 8 2C7.45 2 6.97917 2.19583 6.5875 2.5875C6.19583 2.97917 6 3.45 6 4C6 4.55 6.19583 5.02083 6.5875 5.4125C6.97917 5.80417 7.45 6 8 6Z" 
                fill={isActive('/profile') ? '#FF6A00' : '#94A3B8'}/>
        </svg>
        <span style={{ fontWeight: isActive('/profile') ? 800 : 500 }}>Cá nhân</span>
      </Link>
    </nav>
  );
}
export default BottomNav;