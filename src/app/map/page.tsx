"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Store } from "@/types";
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import type { Icon as LeafletIconType, DivIcon as LeafletDivIconType } from 'leaflet';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false });

export default function MapPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [storeIcon, setStoreIcon] = useState<LeafletIconType | null>(null);
  const [userIcon, setUserIcon] = useState<LeafletDivIconType | null>(null);

  useEffect(() => {
    import('leaflet').then((L) => {
      const sIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      setStoreIcon(sIcon);

      const uIcon = L.divIcon({
        html: `<div style="background-color: #3B82F6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      setUserIcon(uIcon);
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => setUserPos([21.0285, 105.8542])
      );
    }

    const fetchStores = async () => {
      const { data } = await supabase.from("stores").select("*").eq("is_active", true);
      if (data) setStores(data as Store[]);
      setLoading(false);
    };
    fetchStores();
  }, []);

  if (loading) return (
    <div style={styles.loadingContainer}>
      <div style={styles.spinner} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => router.back()} style={styles.backBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 style={styles.title}>BẢN ĐỒ GIẢI CỨU</h1>
        <div style={{ width: '40px' }} />
      </header>

      <main style={styles.main}>
        <MapContainer 
          center={userPos || [21.0285, 105.8542]} 
          zoom={15} 
          style={styles.mapFrame}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {userPos && userIcon && (
            <>
              <Circle center={userPos} radius={200} pathOptions={{ color: '#3B82F6', weight: 1, fillColor: '#3B82F6', fillOpacity: 0.1 }} />
              <Marker position={userPos} icon={userIcon}>
                <Popup>Vị trí của bạn</Popup>
              </Marker>
            </>
          )}

          {stores.map((store) => (
            store.lat && store.lng && storeIcon && (
              <Marker key={store.id} position={[store.lat, store.lng]} icon={storeIcon}>
                <Popup>
                  <div style={styles.popupContent}>
                    <strong style={{ color: '#FF6A00' }}>{store.name}</strong>
                    <button onClick={() => router.push(`/store/${store.id}`)} style={styles.popupBtn}>
                      XEM NGAY
                    </button>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>

        <div style={styles.searchFloating}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input type="text" placeholder="Tìm cửa hàng giải cứu..." style={styles.searchInput} />
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { backgroundColor: '#FCFAF8', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { position: 'relative', height: '70px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #F1F5F9', zIndex: 1001 },
  title: { fontSize: '15px', fontWeight: 900, color: '#0F172A', letterSpacing: '0.5px' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  main: { flex: 1, position: 'relative' },
  mapFrame: { width: '100%', height: '100%' },
  loadingContainer: { display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCFAF8' },
  spinner: { width: '32px', height: '32px', border: '4px solid #FF6A00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  searchFloating: { position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', width: '90%', background: 'white', padding: '12px 16px', borderRadius: '16px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 1000, border: '1px solid #F1F5F9' },
  searchInput: { border: 'none', outline: 'none', flex: 1, fontSize: '13px', fontWeight: 600, color: '#0F172A' },
  popupContent: { textAlign: 'center' },
  popupBtn: { marginTop: '8px', background: '#FF6A00', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }
};