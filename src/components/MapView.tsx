"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { useEffect, useState } from "react";

interface StoreMarker {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  deal_count: number;
  has_flash_sale: boolean;
}

interface MapViewProps {
  stores: StoreMarker[];
}

const defaultCenter: [number, number] = [10.776, 106.7]; // HCM

export default function MapView({ stores }: MapViewProps) {
  const [center, setCenter] = useState<[number, number]>(defaultCenter);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCenter([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          // giữ defaultCenter nếu người dùng không cho phép vị trí
        }
      );
    }
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom={true}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Vòng tròn 2km quanh vị trí người dùng (nếu có tọa độ) */}
      {center && (
        <Circle
          center={center}
          radius={2000}
          pathOptions={{ color: "#FF6B00", fillColor: "#FF6B00", fillOpacity: 0.05 }}
        />
      )}

      {stores.map((store) => {
        if (store.lat == null || store.lng == null) return null;
        const position: [number, number] = [store.lat, store.lng];

        return (
          <Marker key={store.id} position={position}>
            <Popup>
              <div className="space-y-1 text-xs">
                <div className="font-semibold text-gray-900">{store.name}</div>
                <div className="text-gray-600">
                  {store.deal_count} deal đang bán
                </div>
                {store.has_flash_sale && (
                  <div className="text-[11px] font-semibold text-red-500">
                    Có Flash Sale cuối ngày 🔥
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

