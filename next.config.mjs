/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Ép Next.js không dùng cache cũ bị lỗi
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;