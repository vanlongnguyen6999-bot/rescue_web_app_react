import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "../components/BottomNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EcoEat - Cứu thực phẩm, nhận deal ngon",
  description: "Ứng dụng giải cứu thực phẩm dư thừa, giảm lãng phí và bảo vệ môi trường",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} antialiased bg-[#FCFAF8] text-gray-900`} style={{ margin: 0, padding: 0 }}>
        <div className="app-container" style={{ minHeight: '100vh', position: 'relative', paddingBottom: '80px' }}>
          {children}
          <BottomNav />          
        </div>
      </body>
    </html>
  );
}