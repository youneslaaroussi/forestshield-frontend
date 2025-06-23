'use client';

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create modern satellite-style marker
const createSatelliteIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        background: #00ff88;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid rgba(255,255,255,0.9);
        box-shadow: 0 0 20px rgba(0, 255, 136, 0.6),
                    0 0 40px rgba(0, 255, 136, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
        animation: pulse 2s infinite;
      ">🛰️</div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      </style>
    `,
    className: 'custom-satellite-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

export default function Map() {
  const position: [number, number] = [51.505, -0.09];

  return (
    <div className="relative">
      {/* Add custom CSS for modern styling */}
      <style jsx>{`
        .leaflet-container {
          background: #0a0a0a !important;
        }
      `}</style>

      <div className="w-full h-[500px] rounded-lg overflow-hidden shadow-2xl">
        <MapContainer 
          center={position} 
          zoom={13} 
          scrollWheelZoom={false}
          className="w-full h-full"
        >
          {/* Satellite Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          
          {/* Hybrid overlay for labels */}
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            opacity={0.7}
          />
          
          <Marker position={position} icon={createSatelliteIcon()}>
            <Popup>
              <div className="p-3 bg-gray-900 text-white rounded-lg">
                <h3 className="font-bold text-lg text-emerald-400">Satellite Location</h3>
                <p className="text-gray-300 text-sm">Modern satellite-style marker with enhanced visuals</p>
              </div>
            </Popup>
          </Marker>
          
          {/* Modern radar-style detection circles */}
          <Circle
            center={position}
            radius={2000}
            pathOptions={{
              color: '#00ff88',
              fillColor: '#00ff88',
              fillOpacity: 0.05,
              weight: 2,
              opacity: 0.8,
              dashArray: '10, 5',
            }}
          />
          
          <Circle
            center={position}
            radius={1400}
            pathOptions={{
              color: '#00ff88',
              fillColor: '#00ff88',
              fillOpacity: 0.1,
              weight: 1.5,
              opacity: 0.6,
              dashArray: '5, 5',
            }}
          />
          
          <Circle
            center={position}
            radius={800}
            pathOptions={{
              color: '#00ff88',
              fillColor: '#00ff88',
              fillOpacity: 0.15,
              weight: 1,
              opacity: 0.9,
            }}
          />
        </MapContainer>
      </div>
    </div>
  );
} 