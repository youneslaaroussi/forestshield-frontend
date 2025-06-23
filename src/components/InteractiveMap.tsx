'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Region, CreateRegionDto, api } from '../lib/api';
import RegionForm from './RegionForm';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons for different region statuses
const createRegionIcon = (status: Region['status'], deforestationLevel?: number) => {
  let color = '#00ff88'; // bright green for active
  if (status === 'PAUSED') color = '#ffaa00'; // bright orange for paused
  if (status === 'MONITORING') color = '#00aaff'; // bright blue for monitoring
  
  // Adjust color based on deforestation level
  if (deforestationLevel && deforestationLevel > 15) color = '#ff3366'; // bright red for high deforestation
  else if (deforestationLevel && deforestationLevel > 8) color = '#ffaa00'; // bright orange for moderate
  
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid rgba(255,255,255,0.9);
        box-shadow: 0 0 20px rgba(${color.slice(1,3)}, ${color.slice(3,5)}, ${color.slice(5,7)}, 0.6),
                    0 0 40px rgba(${color.slice(1,3)}, ${color.slice(3,5)}, ${color.slice(5,7)}, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
      ">🛰️</div>
    `,
    className: 'custom-region-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Custom hook for map click handling
function MapClickHandler({ 
  onMapClick, 
  isCreatingRegion 
}: { 
  onMapClick: (lat: number, lng: number) => void;
  isCreatingRegion: boolean;
}) {
  useMapEvents({
    click(e) {
      if (isCreatingRegion) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

interface InteractiveMapProps {
  onRegionCreated?: (region: Region) => void;
}

export default function InteractiveMap({ onRegionCreated }: InteractiveMapProps) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [isCreatingRegion, setIsCreatingRegion] = useState(false);
  const [newRegionLocation, setNewRegionLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultCenter: [number, number] = [-6.0, -53.0]; // Amazon region

  // Load existing regions on mount
  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    try {
      const data = await api.getRegions();
      setRegions(data);
    } catch (err) {
      console.error('Failed to load regions:', err);
      setError('Failed to load existing regions');
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setNewRegionLocation({ lat, lng });
    setShowForm(true);
  };

  const handleCreateRegion = async (formData: CreateRegionDto) => {
    if (!newRegionLocation) return;

    setLoading(true);
    try {
      const regionData = {
        ...formData,
        latitude: newRegionLocation.lat,
        longitude: newRegionLocation.lng,
      };
      
      const newRegion = await api.createRegion(regionData);
      setRegions(prev => [...prev, newRegion]);
      setShowForm(false);
      setNewRegionLocation(null);
      setIsCreatingRegion(false);
      onRegionCreated?.(newRegion);
      setError(null);
    } catch (err) {
      console.error('Failed to create region:', err);
      setError('Failed to create region. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setNewRegionLocation(null);
    setIsCreatingRegion(false);
  };

  const toggleCreationMode = () => {
    setIsCreatingRegion(!isCreatingRegion);
    setError(null);
  };

  const getRegionStatusColor = (region: Region) => {
    const deforestation = region.lastDeforestationPercentage || 0;
    if (deforestation > 15) return '#ff3366'; // bright red
    if (deforestation > 8) return '#ffaa00'; // bright orange
    if (region.status === 'ACTIVE') return '#00ff88'; // bright green
    if (region.status === 'PAUSED') return '#ffaa00'; // bright orange
    return '#00aaff'; // bright blue
  };

  const renderModernRadiusCircles = (region: Region) => {
    const color = getRegionStatusColor(region);
    const center: [number, number] = [region.latitude, region.longitude];
    const radius = region.radiusKm * 1000; // Convert km to meters
    
    return (
      <div key={`circles-${region.id}`}>
        {/* Outer detection perimeter */}
        <Circle
          center={center}
          radius={radius}
          pathOptions={{
            color: color,
            fillColor: color,
            fillOpacity: 0.05,
            weight: 2,
            opacity: 0.8,
            dashArray: '10, 5',
          }}
        />
        
        {/* Middle monitoring zone */}
        <Circle
          center={center}
          radius={radius * 0.7}
          pathOptions={{
            color: color,
            fillColor: color,
            fillOpacity: 0.1,
            weight: 1.5,
            opacity: 0.6,
            dashArray: '5, 5',
          }}
        />
        
        {/* Inner core zone */}
        <Circle
          center={center}
          radius={radius * 0.4}
          pathOptions={{
            color: color,
            fillColor: color,
            fillOpacity: 0.15,
            weight: 1,
            opacity: 0.9,
          }}
        />
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Add custom CSS for animations */}
      <style jsx global>{`
        .leaflet-container {
          background: #0a0a0a !important;
        }
      `}</style>

      {/* Control Panel */}
      <div className="absolute top-4 right-4 z-[1000] bg-black/80 backdrop-blur-sm rounded-xl shadow-2xl p-4 border border-gray-700">
        <div className="flex flex-col gap-3">
          <button
            onClick={toggleCreationMode}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              isCreatingRegion 
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/30' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/30'
            }`}
          >
            {isCreatingRegion ? '❌ Cancel Creation' : '🛰️ Create Region'}
          </button>
          
          {isCreatingRegion && (
            <p className="text-sm text-gray-300 text-center">
              Click anywhere on the map to create a monitoring region
            </p>
          )}
          
          <div className="text-xs text-gray-400">
            <div className="font-medium mb-2 text-white">Satellite Legend:</div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-sm shadow-emerald-500/50"></div>
              <span>Active (Low Risk)</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 bg-orange-500 rounded-full shadow-sm shadow-orange-500/50"></div>
              <span>Moderate Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm shadow-red-500/50"></div>
              <span>High Risk</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-4 left-4 z-[1000] bg-red-900/90 backdrop-blur-sm border border-red-700 text-red-100 px-4 py-3 rounded-xl shadow-lg">
          {error}
        </div>
      )}

      {/* Map */}
      <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-2xl">
        <MapContainer 
          center={defaultCenter} 
          zoom={6} 
          scrollWheelZoom={true}
          className={`w-full h-full ${isCreatingRegion ? 'cursor-crosshair' : ''}`}
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
          
          {/* Map click handler */}
          <MapClickHandler 
            onMapClick={handleMapClick}
            isCreatingRegion={isCreatingRegion}
          />
          
          {/* Existing regions */}
          {regions.map((region) => (
            <div key={region.id}>
              <Marker 
                position={[region.latitude, region.longitude]}
                icon={createRegionIcon(region.status, region.lastDeforestationPercentage)}
              >
                <Popup>
                  <div className="p-3 bg-gray-900 text-white rounded-lg">
                    <h3 className="font-bold text-lg text-emerald-400">{region.name}</h3>
                    <p className="text-gray-300 text-sm mb-2">{region.description}</p>
                    <div className="text-xs space-y-1">
                      <div><span className="font-medium text-blue-400">Status:</span> {region.status}</div>
                      <div><span className="font-medium text-blue-400">Radius:</span> {region.radiusKm} km</div>
                      {region.lastDeforestationPercentage && (
                        <div><span className="font-medium text-blue-400">Deforestation:</span> {region.lastDeforestationPercentage}%</div>
                      )}
                      {region.lastAnalysis && (
                        <div><span className="font-medium text-blue-400">Last Analysis:</span> {new Date(region.lastAnalysis).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
              
              {/* Modern radius visualization */}
              {renderModernRadiusCircles(region)}
            </div>
          ))}
          
          {/* Preview for new region */}
          {newRegionLocation && (
            <>
              <Marker 
                position={[newRegionLocation.lat, newRegionLocation.lng]}
                icon={createRegionIcon('MONITORING')}
              />
              <Circle
                center={[newRegionLocation.lat, newRegionLocation.lng]}
                radius={10000} // 10km default radius
                pathOptions={{
                  color: '#00aaff',
                  fillColor: '#00aaff',
                  fillOpacity: 0.2,
                  weight: 2,
                  opacity: 0.8,
                  dashArray: '10, 10',
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {/* Region Form Modal */}
      <RegionForm
        isOpen={showForm}
        initialData={newRegionLocation ? {
          latitude: newRegionLocation.lat,
          longitude: newRegionLocation.lng,
          radiusKm: 10,
          cloudCoverThreshold: 20,
        } : undefined}
        onSubmit={handleCreateRegion}
        onCancel={handleCancelForm}
        loading={loading}
      />
    </div>
  );
} 