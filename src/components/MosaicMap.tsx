'use client';

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { Map } from 'leaflet';
import { Region, CreateRegionDto, api, HeatmapDataPoint } from '../lib/api';
import HeatmapLayer from './HeatmapLayer';

export type { Map as LeafletMap } from 'leaflet';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons for different region statuses
  const createRegionIcon = (status: Region['status'], deforestationLevel?: number, isNdviMode = false) => {
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
        width: ${isNdviMode ? '40px' : '32px'};
        height: ${isNdviMode ? '40px' : '32px'};
        background: ${color};
        border-radius: 50%;
        border: 3px solid ${isNdviMode ? '#0972d3' : 'rgba(255,255,255,0.9)'};
        box-shadow: 0 0 20px rgba(${color.slice(1,3)}, ${color.slice(3,5)}, ${color.slice(5,7)}, 0.6),
                    0 0 40px rgba(${color.slice(1,3)}, ${color.slice(3,5)}, ${color.slice(5,7)}, 0.3)${isNdviMode ? ', 0 0 60px rgba(9, 114, 211, 0.4)' : ''};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${isNdviMode ? '18px' : '16px'};
        ${isNdviMode ? 'animation: pulse-ndvi 2s infinite;' : ''}
      ">${isNdviMode ? '📊' : '🛰️'}</div>
      ${isNdviMode ? '<style>@keyframes pulse-ndvi { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }</style>' : ''}
    `,
    className: 'custom-region-marker',
    iconSize: [isNdviMode ? 40 : 32, isNdviMode ? 40 : 32],
    iconAnchor: [isNdviMode ? 20 : 16, isNdviMode ? 20 : 16],
  });
};

// MapEvents component to handle map events like heatmap fetching
function MapEvents({ isHeatmapVisible, onDataFetched, onError }: { isHeatmapVisible: boolean, onDataFetched: (data: any[]) => void, onError: (msg: string) => void }) {
  const map = useMap();

  const fetchHeatmapData = async () => {
    if (!isHeatmapVisible) {
      onDataFetched([]); // Clear data if heatmap is not visible
      return;
    }
    try {
      const bounds = map.getBounds();
      const data = await api.getHeatmapData({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
      const points = data.data.map(p => [p.lat, p.lng, p.intensity]);
      onDataFetched(points);
    } catch (error) {
      console.error("Failed to fetch heatmap data:", error);
      onError("Could not load heatmap data for the current view.");
    }
  };

  useMapEvents({
    moveend: fetchHeatmapData,
    zoomend: fetchHeatmapData,
  });

  useEffect(() => {
    fetchHeatmapData();
  }, [isHeatmapVisible]); // Re-fetch when visibility changes

  return null;
}

// MapDeselectHandler component to handle deselection on map click
function MapDeselectHandler({ onRegionDeselected, isCreating }: { onRegionDeselected: () => void, isCreating: boolean }) {
  useMapEvents({
    click() {
      // Only deselect if not in creating mode to avoid conflicts
      if (!isCreating) {
        onRegionDeselected();
      }
    }
  });

  return null;
}

// Custom hook for drag-to-create functionality
function DragCreateHandler({ 
  onRegionCreated,
  isCreating,
  setIsCreating,
  onError
}: { 
  onRegionCreated: (region: Region) => void;
  isCreating: boolean;
  setIsCreating: (creating: boolean) => void;
  onError: (error: string) => void;
}) {
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startPoint: L.LatLng | null;
    currentPoint: L.LatLng | null;
    center: L.LatLng | null;
    radius: number;
  }>({
    isDragging: false,
    startPoint: null,
    currentPoint: null,
    center: null,
    radius: 0
  });

  const map = useMap();

  useMapEvents({
    mousedown(e: any) {
      if (isCreating) {
        e.originalEvent.preventDefault();
        setDragState({
          isDragging: true,
          startPoint: e.latlng,
          currentPoint: e.latlng,
          center: e.latlng,
          radius: 0
        });
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
      }
    },
    mousemove(e: any) {
      if (isCreating && dragState.isDragging && dragState.startPoint) {
        e.originalEvent.preventDefault();
        const radius = dragState.startPoint.distanceTo(e.latlng);
        setDragState(prev => ({
          ...prev,
          currentPoint: e.latlng,
          radius: radius
        }));
      }
    },
    mouseup(e: any) {
      if (isCreating && dragState.isDragging && dragState.startPoint) {
        e.originalEvent.preventDefault();
        const radius = dragState.startPoint.distanceTo(e.latlng);
        const radiusKm = radius / 1000;
        
        if (radius < 100) {
          onError('Minimum radius is 100 meters. Please drag further to create a larger monitoring area.');
        } else if (radiusKm > 50) {
          onError('Maximum radius is 50 kilometers. Please create a smaller monitoring area.');
        } else {
          createRegion(dragState.startPoint, radius);
        }
        
        setDragState({
          isDragging: false,
          startPoint: null,
          currentPoint: null,
          center: null,
          radius: 0
        });
        map.dragging.enable();
        map.scrollWheelZoom.enable();
        setIsCreating(false);
        
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
      }
    }
  });

  const createRegion = async (center: L.LatLng, radiusMeters: number) => {
    try {
      const radiusKm = Math.round(radiusMeters / 1000 * 10) / 10;
      const regionName = `Forest Region near ${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}`;
      
      const regionData: CreateRegionDto = {
        name: regionName,
        latitude: Math.round(center.lat * 10000) / 10000,
        longitude: Math.round(center.lng * 10000) / 10000,
        description: `Monitoring region created at ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)} with ${radiusKm}km radius`,
        radiusKm: Math.max(0.1, Math.min(50, radiusKm)),
        cloudCoverThreshold: 20
      };

      const newRegion = await api.createRegion(regionData);
      onRegionCreated(newRegion);
    } catch (error) {
      console.error('Failed to create region:', error);
      if (error instanceof Error) {
        onError(`Failed to create region: ${error.message}`);
      } else {
        onError('An unknown error occurred while creating the region.');
      }
    }
  };

  // Render the drag preview with modern styling
  if (dragState.isDragging && dragState.center && dragState.radius > 0) {
    const radiusKm = dragState.radius / 1000;
    const isValidRadius = radiusKm >= 0.1 && radiusKm <= 50;
    
    return (
      <>
        <Circle
          center={[dragState.center.lat, dragState.center.lng]}
          radius={dragState.radius}
          pathOptions={{
            color: isValidRadius ? '#00aaff' : '#ff3366',
            fillColor: isValidRadius ? '#00aaff' : '#ff3366',
            fillOpacity: 0.2,
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10',
          }}
        />
        <Marker position={[dragState.center.lat, dragState.center.lng]} icon={L.divIcon({ className: 'leaflet-mouse-marker', iconAnchor: [0, 0], iconSize: [0, 0] })} />
        <div className="leaflet-tooltip" style={{
            position: 'absolute',
            top: `${(map.latLngToContainerPoint(dragState.currentPoint as L.LatLng).y)}px`,
            left: `${(map.latLngToContainerPoint(dragState.currentPoint as L.LatLng).x + 15)}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: '8px 12px',
            border: `2px solid ${isValidRadius ? '#00aaff' : '#ff3366'}`,
            borderRadius: '8px',
            boxShadow: `0 0 20px ${isValidRadius ? 'rgba(0, 170, 255, 0.5)' : 'rgba(255, 51, 102, 0.5)'}`,
            whiteSpace: 'nowrap',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '12px'
        }}>
            Radius: {radiusKm.toFixed(2)} km
        </div>
      </>
    );
  }

  return null;
}

interface MosaicMapProps {
  onRegionSelected: (region: Region) => void;
  onRegionDeselected: () => void;
  onError: (error: string) => void;
  isHeatmapVisible: boolean;
  isSatelliteView: boolean;
  isCreating: boolean;
  setIsCreating: (isCreating: boolean) => void;
  onRegionCreated: (region: Region) => void;
  regions: Region[];
  selectedRegion: Region | null;
  ndviSelectionMode?: boolean;
}

const MosaicMap = forwardRef<Map, MosaicMapProps>(({ 
  onRegionSelected, 
  onRegionDeselected,
  onError,
  isHeatmapVisible,
  isSatelliteView,
  isCreating,
  setIsCreating,
  onRegionCreated,
  regions,
  selectedRegion,
  ndviSelectionMode = false
}, ref) => {
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [heatmapPoints, setHeatmapPoints] = useState<any[]>([]);
  const [mapKey, setMapKey] = useState<number>(Date.now());

  useImperativeHandle(ref, () => mapInstance!, [mapInstance]);

  const defaultCenter: [number, number] = [-6.0, -53.0];

  // Cleanup function for map instance
  useEffect(() => {
    return () => {
      if (mapInstance) {
        try {
          // Get container before removing the map
          const container = mapInstance.getContainer();
          
          // Remove the map instance
          mapInstance.off(); // Remove all event listeners first
          mapInstance.remove(); // Then remove the map
          
          // Leaflet leaves a reference on the container element that causes
          // "Map container is being reused by another instance" if the
          // component is remounted very quickly (e.g. when moving panels or
          // under React 18 strict-mode double mounts). Removing or deleting
          // that property ensures the next initialisation starts cleanly.
          if (container && container.parentNode && (container as any)._leaflet_id !== undefined) {
            try {
              delete (container as any)._leaflet_id;
            } catch {
              (container as any)._leaflet_id = undefined;
            }
          }
        } catch (error) {
          console.warn('Error cleaning up map instance:', error);
        }
      }
    };
  }, [mapInstance]);

  // If the container layout changes, invalidate map size to ensure correct rendering
  useEffect(() => {
    if (mapInstance) {
      // Give the browser a tick to finish layout changes before invalidating
      const timeout = setTimeout(() => {
        try {
          mapInstance.invalidateSize();
        } catch (error) {
          console.warn('Error invalidating map size:', error);
        }
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [mapInstance]);

  const getRegionStatusColor = (region: Region) => {
    const deforestation = region.lastDeforestationPercentage || 0;
    if (deforestation > 15) return '#ff3366'; // bright red
    if (deforestation > 8) return '#ffaa00'; // bright orange
    if (region.status === 'ACTIVE') return '#00ff88'; // bright green
    if (region.status === 'PAUSED') return '#ffaa00'; // bright orange
    return '#00aaff'; // bright blue
  };

  const renderModernRadiusCircles = (region: Region) => {
    // Defensive checks to prevent geometry errors
    if (!region || typeof region.latitude !== 'number' || typeof region.longitude !== 'number' || typeof region.radiusKm !== 'number') {
      console.warn('Invalid region data for rendering circles:', region);
      return null;
    }

    if (!mapInstance) {
      return null;
    }

    try {
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
    } catch (error) {
      console.warn('Error rendering region circles:', error, region);
      return null;
    }
  };
  
  return (
    <div className="relative h-full w-full">
      {/* Add custom CSS for animations and popup styling */}
      <style jsx global>{`
        .leaflet-container {
          background: ${isSatelliteView ? '#0a0a0a' : '#f8f9fa'} !important;
        }

        /* Override Leaflet popup styling for square design */}
        .leaflet-popup-content-wrapper {
          border-radius: 0 !important;
          padding: 0 !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25) !important;
        }
        
        .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }
        
        .leaflet-popup-tip {
          border-radius: 0 !important;
        }
        
        .leaflet-popup-tip-container {
          border-radius: 0 !important;
        }
      `}</style>

      <MapContainer 
        key={mapKey}
        ref={setMapInstance}
        center={defaultCenter} 
        zoom={6} 
        className="h-full w-full"
      >
        {isSatelliteView ? (
          <>
            {/* Satellite Tile Layer */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            />
            {/* Hybrid overlay for labels */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              opacity={0.7}
            />
          </>
        ) : (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
        )}
        
        {isHeatmapVisible && heatmapPoints.length > 0 && <HeatmapLayer points={heatmapPoints} />}

        <MapEvents isHeatmapVisible={isHeatmapVisible} onDataFetched={setHeatmapPoints} onError={onError} />

        <MapDeselectHandler onRegionDeselected={onRegionDeselected} isCreating={isCreating} />

        <DragCreateHandler 
          onRegionCreated={onRegionCreated}
          isCreating={isCreating}
          setIsCreating={setIsCreating}
          onError={onError}
        />

        {regions.map(region => {
          // Defensive check for valid region data
          if (!region || !region.id || typeof region.latitude !== 'number' || typeof region.longitude !== 'number') {
            console.warn('Skipping invalid region:', region);
            return null;
          }

          try {
            const isSelected = selectedRegion?.id === region.id;
            
            return (
              <div key={region.id}>
                <Marker 
                  position={[region.latitude, region.longitude]}
                  icon={createRegionIcon(region.status, region.lastDeforestationPercentage, ndviSelectionMode)}
                  eventHandlers={{
                    click: () => onRegionSelected(region),
                  }}
                >
                  <Popup>
                    <div className={`min-w-[280px] ${isSatelliteView ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'} shadow-xl`}>
                    {/* NDVI Selection Mode Banner */}
                    {ndviSelectionMode && (
                      <div className="bg-blue-600 text-white px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>📊</span>
                          <span className="text-sm font-medium">Click to select for NDVI analysis</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Header Section */}
                    <div className={`px-4 py-3 border-b ${isSatelliteView ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold text-sm ${isSatelliteView ? 'text-white' : 'text-gray-900'}`}>
                          {ndviSelectionMode ? 'NDVI ANALYSIS TARGET' : 'FOREST REGION'}
                        </h3>
                        <div className={`px-2 py-1 text-xs font-medium rounded ${
                          region.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          region.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {region.status}
                        </div>
                      </div>
                      <h4 className={`font-bold text-base mt-1 ${isSatelliteView ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {region.name}
                      </h4>
                    </div>

                    {/* Content Section */}
                    <div className="px-4 py-3">
                      <p className={`text-sm mb-4 ${isSatelliteView ? 'text-gray-300' : 'text-gray-600'}`}>
                        {region.description}
                      </p>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`p-3 ${isSatelliteView ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                          <div className={`text-xs font-medium ${isSatelliteView ? 'text-gray-400' : 'text-gray-500'}`}>
                            MONITORING RADIUS
                          </div>
                          <div className={`text-lg font-bold ${isSatelliteView ? 'text-white' : 'text-gray-900'}`}>
                            {region.radiusKm} km
                          </div>
                        </div>

                        <div className={`p-3 ${isSatelliteView ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                          <div className={`text-xs font-medium ${isSatelliteView ? 'text-gray-400' : 'text-gray-500'}`}>
                            DEFORESTATION RISK
                          </div>
                          <div className={`text-lg font-bold ${
                            (region.lastDeforestationPercentage || 0) > 15 ? 'text-red-500' :
                            (region.lastDeforestationPercentage || 0) > 8 ? 'text-yellow-500' :
                            'text-green-500'
                          }`}>
                            {region.lastDeforestationPercentage?.toFixed(1) ?? 'N/A'}%
                          </div>
                        </div>
                      </div>

                      {/* Last Analysis */}
                      {region.lastAnalysis && (
                        <div className={`mt-4 pt-3 border-t ${isSatelliteView ? 'border-gray-700' : 'border-gray-200'}`}>
                          <div className={`text-xs font-medium ${isSatelliteView ? 'text-gray-400' : 'text-gray-500'}`}>
                            LAST ANALYSIS
                          </div>
                          <div className={`text-sm ${isSatelliteView ? 'text-gray-300' : 'text-gray-700'}`}>
                            {new Date(region.lastAnalysis).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Closing popup content wrapper */}
                    </div>
                  </Popup>
                </Marker>

                {/* Modern radius visualization with selection indicator */}
                {isSelected ? (
                  // Selected region - add highlight
                  <>
                    {renderModernRadiusCircles(region)}
                    <Circle
                      center={[region.latitude, region.longitude]}
                      radius={region.radiusKm * 1000 * 1.1} // Slightly larger outer ring
                      pathOptions={{
                        color: '#0972d3',
                        fillColor: 'transparent',
                        fillOpacity: 0,
                        weight: 4,
                        opacity: 1,
                        dashArray: '5, 5',
                      }}
                    />
                  </>
                ) : (
                  renderModernRadiusCircles(region)
                )}
              </div>
            );
          } catch (error) {
            console.warn('Error rendering region:', error, region);
            return null;
          }
        }).filter(Boolean)}

      </MapContainer>
    </div>
  );
});

MosaicMap.displayName = 'MosaicMap';
export default MosaicMap; 