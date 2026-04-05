"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { useEffect, useState, useMemo } from "react";
import L from "leaflet";

// 1. Sửa lỗi Icon hiển thị mà không dùng 'any' (Vượt qua no-explicit-any)
if (typeof window !== "undefined") {
  // Ép kiểu qua Interface mở rộng - An toàn 100%
  const defaultIconPrototype = L.Icon.Default.prototype as L.Icon.Default & {
    _getIconUrl?: string;
  };
  
  delete defaultIconPrototype._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

// 2. Định nghĩa Interface chuẩn
export interface StoreMarker {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  deal_count: number;
  has_flash_sale: boolean;
}

export interface MapViewProps {
  stores: StoreMarker[];
  userCoords: [number, number] | null; // Cặp Tuple [lat, lng]
}

const defaultCenter: L.LatLngTuple = [21.0285, 105.8542]; // Hà Nội

// 3. ChangeView: Component cập nhật camera bản đồ
function ChangeView({ center }: { center: L.LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    // Ép kiểu Tuple để map.setView không phàn nàn
    if (center && Array.isArray(center)) {
        map.setView(center as L.LatLngTuple, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// 4. MapView component
export function MapView({ stores, userCoords }: MapViewProps) {
  
  // KHÔNG dùng useState cho center nữa. (Xóa lỗi cascading renders)
  // Chúng ta tính toán giá trị mapCenter trực tiếp mỗi lần render.
  const mapCenter: L.LatLngExpression = useMemo(() => {
    return userCoords || defaultCenter;
  }, [userCoords]);

  // 5. useMemo cho userIcon để đảm bảo nó chỉ chạy ở Client
  const userIcon = useMemo(() => {
    if (typeof window === "undefined") return null;
    return L.divIcon({
      // Dùng divIcon mới chạy được mã SVG
      html: `<svg width="25" height="41" viewBox="0 0 10 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.66667 5.83333C4.9875 5.83333 5.26215 5.7191 5.49062 5.49062C5.7191 5.26215 5.83333 4.9875 5.83333 4.66667C5.83333 4.34583 5.7191 4.07118 5.49062 3.84271C5.26215 3.61424 4.9875 3.5 4.66667 3.5C4.34583 3.5 4.07118 3.61424 3.84271 3.84271C3.61424 4.07118 3.5 4.34583 3.5 4.66667C3.5 4.9875 3.61424 5.26215 3.84271 5.49062C4.07118 5.7191 4.34583 5.83333 4.66667 5.83333ZM4.66667 10.1208C5.85278 9.03194 6.73264 8.04271 7.30625 7.15312C7.87986 6.26354 8.16667 5.47361 8.16667 4.78333C8.16667 3.72361 7.82882 2.8559 7.15312 2.18021C6.47743 1.50451 5.64861 1.16667 4.66667 1.16667C3.68472 1.16667 2.8559 1.50451 2.18021 2.18021C1.50451 2.8559 1.16667 3.72361 1.16667 4.78333C1.16667 5.47361 1.45347 6.26354 2.02708 7.15312C2.60069 8.04271 3.48056 9.03194 4.66667 10.1208ZM4.66667 11.6667C3.10139 10.3347 1.93229 9.09757 1.15937 7.95521C0.386458 6.81285 0 5.75556 0 4.78333C0 3.325 0.469097 2.16319 1.40729 1.29792C2.34549 0.432639 3.43194 0 4.66667 0C5.90139 0 6.98785 0.432639 7.92604 1.29792C8.86424 2.16319 9.33333 3.325 9.33333 4.78333C9.33333 5.75556 8.94688 6.81285 8.17396 7.95521C7.40104 9.09757 6.23194 10.3347 4.66667 11.6667Z" fill="#FF6A00"/>
        </svg>`,
      className: "", 
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
  }, []);

  return (
    <div className="h-full w-full relative" style={{ minHeight: "350px" }}>
      <MapContainer 
        center={mapCenter} // Dùng mapCenter vừa tính ở trên
        zoom={14} 
        className="h-full w-full"
      >
        <ChangeView center={mapCenter} /> 
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Vị trí của người dùng */}
        {userCoords && userIcon && (
          <>
            <Marker position={userCoords} icon={userIcon}>
              <Popup>
                <div className="font-semibold text-orange-600 text-xs">Vị trí của bạn</div>
              </Popup>
            </Marker>
            <Circle
              center={userCoords}
              radius={1000} // Bán kính 1km
              pathOptions={{ color: "#FF6A00", fillColor: "#FF6A00", fillOpacity: 0.1, weight: 1 }}
            />
          </>
        )}

        {/* Các cửa hàng */}
        {stores.map((store) => {
          if (store.lat === null || store.lng === null) return null;
          const position: [number, number] = [store.lat, store.lng];

          return (
            <Marker key={store.id} position={position}>
              <Popup>
                <div className="space-y-1 p-1" style={{ minWidth: '120px' }}>
                  <div className="font-bold text-[#0F172A] text-sm leading-tight">{store.name}</div>
                  <div className="flex items-center justify-between pt-1 mt-1 border-t border-gray-100">
                    <span className="text-[#FF6A00] font-bold text-xs">
                      {store.deal_count} deal đang bán
                    </span>
                    {store.has_flash_sale && <span className="animate-pulse">🔥</span>}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}