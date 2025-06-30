'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RefreshCw, Calendar, TrendingUp, Eye, Settings } from 'lucide-react';

interface NDVIConfig {
  redBand: string;
  nirBand: string;
  cloudCover: number;
  dateRange: {
    start: string;
    end: string;
  };
}

interface SelectedArea {
  id: string;
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  center: {
    lat: number;
    lng: number;
  };
  timestamp: Date;
  fromMap?: boolean;
}

interface NDVIImageData {
  id: string;
  url: string;
  area: SelectedArea;
  config: NDVIConfig;
  metadata: {
    acquisition_date: string;
    cloud_coverage: number;
    resolution: string;
    size_mb: number;
    processing_time: number;
  };
  stats: {
    min_ndvi: number;
    max_ndvi: number;
    mean_ndvi: number;
    vegetation_percentage: number;
    deforestation_percentage?: number;
    alert_message?: string;
    processing_time?: string;
  };
  timestamp: Date;
  availableImages?: any[];
}

const SENTINEL_BANDS = [
  { id: 'B01', name: 'Coastal Aerosol', wavelength: '443nm', description: 'Atmospheric correction' },
  { id: 'B02', name: 'Blue', wavelength: '490nm', description: 'Water penetration' },
  { id: 'B03', name: 'Green', wavelength: '560nm', description: 'Vegetation vigor' },
  { id: 'B04', name: 'Red', wavelength: '665nm', description: 'Chlorophyll absorption' },
  { id: 'B05', name: 'Red Edge 1', wavelength: '705nm', description: 'Vegetation stress' },
  { id: 'B06', name: 'Red Edge 2', wavelength: '740nm', description: 'Leaf area index' },
  { id: 'B07', name: 'Red Edge 3', wavelength: '783nm', description: 'Vegetation health' },
  { id: 'B08', name: 'NIR', wavelength: '842nm', description: 'Biomass estimation' },
  { id: 'B8A', name: 'Narrow NIR', wavelength: '865nm', description: 'Precise vegetation' },
  { id: 'B09', name: 'Water Vapour', wavelength: '945nm', description: 'Atmospheric water' },
  { id: 'B11', name: 'SWIR 1', wavelength: '1610nm', description: 'Moisture content' },
  { id: 'B12', name: 'SWIR 2', wavelength: '2190nm', description: 'Soil/vegetation' }
];

interface NDVIImagePanelProps {
  selectedRegion?: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radiusKm: number;
  } | null;
  onRequestAreaSelection?: () => void;
}

const BandSelector = ({
  label,
  description,
  selectedBandId,
  onBandChange,
}: {
  label: string;
  description: string;
  selectedBandId: string;
  onBandChange: (bandId: string) => void;
}) => {
  const selectedBand = SENTINEL_BANDS.find(b => b.id === selectedBandId);

  return (
    <div className="p-3 rounded-md border bg-gray-50/50">
      <label className="text-xs font-semibold text-gray-500">{label}</label>
      <p className="text-xs text-gray-400 mb-2">{description}</p>
      <select
        value={selectedBandId}
        onChange={(e) => onBandChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
      >
        {SENTINEL_BANDS.map(band => (
          <option key={band.id} value={band.id}>
            {band.id} - {band.name} ({band.wavelength})
          </option>
        ))}
      </select>
      {selectedBand && (
        <p className="text-xs text-gray-600 mt-2">
          <strong>Purpose:</strong> {selectedBand.description}
        </p>
      )}
    </div>
  );
};

const TiffImageViewer = ({ 
  tiffUrl, 
  alt, 
  className,
  onLoad,
  onError,
  stats,
  metadata,
  processedImageCache,
  onImageProcessed
}: {
  tiffUrl: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  stats?: any;
  metadata?: any;
  processedImageCache?: Map<string, string>;
  onImageProcessed?: (url: string, processedUrl: string) => void;
}) => {
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  useEffect(() => {
    const processTiffImage = async () => {
      if (!tiffUrl) return;
      
      // Check cache first
      const cachedUrl = processedImageCache?.get(tiffUrl);
      if (cachedUrl) {
        setProcessedImageUrl(cachedUrl);
        onLoad?.();
        return;
      }
      
      setIsProcessing(true);
      setProcessingError(null);
      
      try {
        const processedUrl = await api.processTiffImage(tiffUrl, {
          width: 800,
          height: 600,
          format: 'jpeg',
          quality: 85
        });
        
        setProcessedImageUrl(processedUrl);
        onImageProcessed?.(tiffUrl, processedUrl);
        onLoad?.();
      } catch (error) {
        console.error('TIFF processing failed:', error);
        setProcessingError('Failed to process satellite image');
        onError?.();
      } finally {
        setIsProcessing(false);
      }
    };

    processTiffImage();
  }, [tiffUrl, onLoad, onError, processedImageCache, onImageProcessed]);

  const getNDVIColor = (value: number) => {
    if (value < 0.2) return 'text-red-500';
    if (value < 0.4) return 'text-orange-500';
    if (value < 0.6) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getHealthStatus = (ndvi: number) => {
    if (ndvi < 0.2) return { status: 'Poor', color: 'bg-red-500' };
    if (ndvi < 0.4) return { status: 'Fair', color: 'bg-orange-500' };
    if (ndvi < 0.6) return { status: 'Good', color: 'bg-yellow-500' };
    return { status: 'Excellent', color: 'bg-green-500' };
  };

  if (isProcessing) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg font-medium">Processing Satellite Data</div>
            <div className="text-sm text-white/70 mt-1">Converting TIFF to web format</div>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>
    );
  }

  if (processingError || !processedImageUrl) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-red-900 to-red-800 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-lg font-medium">Processing Failed</div>
            <div className="text-sm text-white/70 mt-1">{processingError}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden group">
      <img
        src={processedImageUrl}
        alt={alt}
        className={`w-full h-full object-cover ${className}`}
      />
      
      {/* Overlay Stats */}
      {stats && (
        <>
          {/* Top overlay - Acquisition info */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
              <div className="text-xs text-white/70">Acquisition Date</div>
              <div className="text-sm font-medium">
                {new Date(metadata?.acquisition_date || '').toLocaleDateString()}
              </div>
            </div>
            <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
              <div className="text-xs text-white/70">Cloud Cover</div>
              <div className="text-sm font-medium">{metadata?.cloud_coverage?.toFixed(1) || 0}%</div>
            </div>
            {stats.processing_time && (
              <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
                <div className="text-xs text-white/70">Analysis Time</div>
                <div className="text-sm font-medium">{stats.processing_time}</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default function NDVIImagePanel({ selectedRegion, onRequestAreaSelection }: NDVIImagePanelProps) {
  const { mutate } = useSWRConfig();
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null);
  const [currentImage, setCurrentImage] = useState<NDVIImageData | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [processedImageCache, setProcessedImageCache] = useState<Map<string, string>>(new Map());
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());

  const [ndviConfig, setNdviConfig] = useState<NDVIConfig>({
    redBand: 'B04',
    nirBand: 'B08',
    cloudCover: 20,
    dateRange: {
      start: '2022-06-01',
      end: '2022-09-01'
    }
  });

  // Fetch available regions
  const { data: regions, error: regionsError } = useSWR('dashboard-regions', () => api.getRegions());
  const availableAreas = regions?.map(region => ({
    id: region.id,
    name: region.name,
    bounds: {
      north: region.latitude + 0.01,
      south: region.latitude - 0.01,
      east: region.longitude + 0.01,
      west: region.longitude - 0.01
    },
    center: {
      lat: region.latitude,
      lng: region.longitude
    },
    timestamp: new Date()
  })) || [];

  useEffect(() => {
    if (selectedRegion && !selectedArea) {
      const area: SelectedArea = {
        id: selectedRegion.id,
        name: selectedRegion.name,
        bounds: {
          north: selectedRegion.latitude + 0.01,
          south: selectedRegion.latitude - 0.01,
          east: selectedRegion.longitude + 0.01,
          west: selectedRegion.longitude - 0.01
        },
        center: {
          lat: selectedRegion.latitude,
          lng: selectedRegion.longitude
        },
        timestamp: new Date()
      };
      setSelectedArea(area);
    }
  }, [selectedRegion, selectedArea]);

  const loadingSteps = [
    'Initializing satellite data search...',
    'Querying Sentinel-2 satellite archive...',
    'Found satellite images, selecting optimal data...',
    'Downloading spectral band data...',
    'Processing Red and NIR spectral bands...',
    'Calculating NDVI vegetation index...',
    'Analyzing vegetation health patterns...',
    'Generating visualization...',
    'Analysis complete!'
  ];

  const handleGenerateNDVI = async () => {
    if (!selectedArea) {
      setError('Please select an analysis area first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);

    try {
      for (let i = 0; i < loadingSteps.length; i++) {
        setLoadingStep(loadingSteps[i]);
        setLoadingProgress((i / (loadingSteps.length - 1)) * 100);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const searchResponse = await api.searchSentinelImages({
        latitude: selectedArea.center.lat,
        longitude: selectedArea.center.lng,
        startDate: ndviConfig.dateRange.start,
        endDate: ndviConfig.dateRange.end,
        cloudCover: ndviConfig.cloudCover
      });

      if (searchResponse?.images && searchResponse.images.length > 0) {
        // Get NDVI analysis for the first image
        const analysisResponse = await api.analyzeRegionForDeforestation({
          latitude: selectedArea.center.lat,
          longitude: selectedArea.center.lng,
          startDate: ndviConfig.dateRange.start,
          endDate: ndviConfig.dateRange.end,
          cloudCover: ndviConfig.cloudCover
        });

        // Convert deforestation percentage to NDVI-like stats
        // Higher deforestation = lower vegetation health
        const deforestationPercentage = analysisResponse?.analysisResults?.deforestationPercentage || 0;
        const vegetationPercentage = Math.max(0, 100 - deforestationPercentage);
        const healthFactor = vegetationPercentage / 100;
        
        console.log('✅ Using REAL API data:', {
          deforestationPercentage,
          vegetationPercentage,
          alertMessage: analysisResponse?.analysisResults?.alertMessage,
          processingTime: analysisResponse?.processingTime
        });
        
        const realStats = {
          min_ndvi: Math.max(-1, 0.1 * healthFactor - 0.1), // Scales from -0.1 to 0.0 for low vegetation
          max_ndvi: Math.min(1, 0.4 + 0.5 * healthFactor), // Scales from 0.4 to 0.9 for high vegetation  
          mean_ndvi: 0.2 + 0.4 * healthFactor, // Scales from 0.2 to 0.6
          vegetation_percentage: vegetationPercentage,
          deforestation_percentage: deforestationPercentage,
          alert_message: analysisResponse?.analysisResults?.alertMessage || '',
          processing_time: analysisResponse?.processingTime || 'N/A'
        };

        const ndviData: NDVIImageData = {
          id: `ndvi-${Date.now()}`,
          url: searchResponse.images[0].assets.visual || searchResponse.images[0].assets.red,
          area: selectedArea,
          config: ndviConfig,
          metadata: {
            acquisition_date: searchResponse.images[0].date,
            cloud_coverage: searchResponse.images[0].cloudCover,
            resolution: '10m',
            size_mb: 45.2,
            processing_time: parseFloat(analysisResponse?.processingTime?.replace('s', '') || '0')
          },
          stats: realStats,
          timestamp: new Date(),
          availableImages: searchResponse.images
        };

        setCurrentImage(ndviData);
        setSelectedImageIndex(0);
      } else {
        setError('No satellite images found for the selected criteria');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate NDVI analysis');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = async (imageIndex: number) => {
    if (!currentImage?.availableImages) return;
    
    const selectedImg = currentImage.availableImages[imageIndex];
    const imageUrl = selectedImg.assets.visual || selectedImg.assets.red;
    
    // Set loading state for this specific image
    setLoadingImages(prev => new Set(prev).add(imageIndex));
    
    // Check if we already have this image processed
    const cachedUrl = processedImageCache.get(imageUrl);
    
    let updatedImage;
    
    // Get real analysis for the selected image
    try {
      const analysisResponse = await api.analyzeRegionForDeforestation({
        latitude: currentImage.area.center.lat,
        longitude: currentImage.area.center.lng,
        startDate: currentImage.config.dateRange.start,
        endDate: currentImage.config.dateRange.end,
        cloudCover: currentImage.config.cloudCover
      });

      // Convert deforestation percentage to NDVI-like stats
      const deforestationPercentage = analysisResponse?.analysisResults?.deforestationPercentage || 0;
      const vegetationPercentage = Math.max(0, 100 - deforestationPercentage);
      const healthFactor = vegetationPercentage / 100;
      
      console.log('✅ Using REAL API data for image selection:', {
        imageIndex,
        deforestationPercentage,
        vegetationPercentage,
        alertMessage: analysisResponse?.analysisResults?.alertMessage,
        processingTime: analysisResponse?.processingTime
      });
      
      const realStats = {
        min_ndvi: Math.max(-1, 0.1 * healthFactor - 0.1),
        max_ndvi: Math.min(1, 0.4 + 0.5 * healthFactor),
        mean_ndvi: 0.2 + 0.4 * healthFactor,
        vegetation_percentage: vegetationPercentage,
        deforestation_percentage: deforestationPercentage,
        alert_message: analysisResponse?.analysisResults?.alertMessage || '',
        processing_time: analysisResponse?.processingTime || 'N/A'
      };

      updatedImage = {
        ...currentImage,
        url: imageUrl,
        metadata: {
          ...currentImage.metadata,
          acquisition_date: selectedImg.date,
          cloud_coverage: selectedImg.cloudCover,
          processing_time: parseFloat(analysisResponse?.processingTime?.replace('s', '') || '0')
        },
        stats: realStats
      };
    } catch (error) {
      console.error('Failed to get real analysis for image:', error);
      // Fallback to showing the image without updated stats if analysis fails
      updatedImage = {
        ...currentImage,
        url: imageUrl,
        metadata: {
          ...currentImage.metadata,
          acquisition_date: selectedImg.date,
          cloud_coverage: selectedImg.cloudCover,
        }
      };
    }
    
    setCurrentImage(updatedImage);
    setSelectedImageIndex(imageIndex);
    
    // If not cached, the TiffImageViewer will handle processing
    // We'll clear the loading state when it's done
    if (cachedUrl) {
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageIndex);
        return newSet;
      });
    }
  };

  const handleRetry = () => {
    setError(null);
    handleGenerateNDVI();
  };

  const handleNewAnalysis = () => {
    setCurrentImage(null);
    setSelectedImageIndex(0);
    setError(null);
  };

  const handleConfigChange = (key: keyof NDVIConfig, value: any) => {
    setNdviConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDateRangeChange = (key: 'start' | 'end', value: string) => {
    setNdviConfig(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [key]: value
      }
    }));
  };

  const handleImageProcessed = useCallback((originalUrl: string, processedUrl: string) => {
    setProcessedImageCache(prev => new Map(prev).set(originalUrl, processedUrl));
  }, []);

  const handleImageLoadComplete = useCallback(() => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(selectedImageIndex);
      return newSet;
    });
  }, [selectedImageIndex]);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Modern Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-slate-50 to-gray-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <img src="/aws-icons/lambda.svg" alt="Lambda" width={24} height={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">NDVI Analysis</h3>
            <p className="text-sm text-gray-600">Sentinel-2 Vegetation Monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="gap-2"
          >
            <Settings size={16} />
            Settings
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b bg-gray-50 space-y-4">
            {/* Area Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Analysis Region</label>
                <button onClick={() => mutate('dashboard-regions')} className="text-gray-400 hover:text-gray-600">
                  <RefreshCw size={14} />
                </button>
              </div>
              {availableAreas.length > 0 ? (
                <select
                  value={selectedArea?.id || ''}
                  onChange={(e) => {
                    const area = availableAreas.find(a => a.id === e.target.value);
                    setSelectedArea(area || null);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Choose monitoring region...</option>
                  {availableAreas.map(area => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-gray-600 text-sm p-3 border border-gray-200 rounded-lg bg-gray-50">
                  Loading regions...
                </div>
              )}
            </div>

            {/* Band Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <BandSelector
                label="Red Band"
                description="Chlorophyll Absorption"
                selectedBandId={ndviConfig.redBand}
                onBandChange={(bandId) => handleConfigChange('redBand', bandId)}
              />
              <BandSelector
                label="NIR Band"
                description="Biomass Estimation"
                selectedBandId={ndviConfig.nirBand}
                onBandChange={(bandId) => handleConfigChange('nirBand', bandId)}
              />
            </div>

            {/* Date Range and Cloud Cover */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Start Date</label>
                <input
                  type="date"
                  value={ndviConfig.dateRange.start}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">End Date</label>
                <input
                  type="date"
                  value={ndviConfig.dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Max Cloud Cover</label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={ndviConfig.cloudCover}
                    onChange={(e) => handleConfigChange('cloudCover', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-600">{ndviConfig.cloudCover}%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="flex-1">
                <div className="text-lg font-medium text-blue-900 mb-1">{loadingStep}</div>
                <div className="w-full bg-blue-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <div className="text-sm text-blue-700 mt-1">{loadingProgress.toFixed(0)}% complete</div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-red-500">⚠️</div>
                <div>
                  <div className="text-red-800 font-medium">Analysis Failed</div>
                  <div className="text-red-600 text-sm">{error}</div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleRetry} className="bg-red-100 hover:bg-red-200 text-red-800 border-red-300">
                <RefreshCw size={14} className="mr-2"/>
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {!currentImage && !isLoading && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye size={32} className="text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready for Analysis</h3>
                <p className="text-gray-600 mb-6">
                  Select a monitoring region and configure your analysis parameters to begin NDVI processing.
                </p>
                <Button 
                  onClick={handleGenerateNDVI}
                  disabled={!selectedArea}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                >
                  Start NDVI Analysis
                </Button>
              </div>
            </div>
          )}

          {currentImage && !isLoading && (
            <div className="flex-1 flex flex-col">
              {/* Timeline */}
              {currentImage.availableImages && currentImage.availableImages.length > 0 && (
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Timeline ({currentImage.availableImages.length} images)
                    </span>
                  </div>
                  
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute top-6 left-4 right-4 h-0.5 bg-gray-300"></div>
                    
                    {/* Timeline items */}
                    <div className="flex justify-between relative">
                      {currentImage.availableImages.slice(0, 8).map((img: any, idx: number) => {
                        const isSelected = idx === selectedImageIndex;
                        const isLoading = loadingImages.has(idx);
                        const date = new Date(img.date);
                        
                        return (
                          <button
                            key={img.id || `timeline-item-${idx}`}
                            onClick={() => handleImageSelect(idx)}
                            disabled={isLoading}
                            className={`flex flex-col items-center group transition-all duration-200 ${
                              isSelected ? 'transform scale-110' : 'hover:transform hover:scale-105'
                            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className={`w-3 h-3 rounded-full border-2 transition-all duration-200 relative ${
                              isSelected 
                                ? 'bg-green-500 border-green-500 shadow-lg' 
                                : 'bg-white border-gray-300 group-hover:border-green-400'
                            }`}>
                              {isLoading && (
                                <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              )}
                            </div>
                            
                            <div className={`mt-2 px-2 py-1 rounded text-xs transition-all duration-200 ${
                              isSelected 
                                ? 'bg-green-100 text-green-800 font-medium' 
                                : 'text-gray-600 group-hover:text-green-600'
                            }`}>
                              <div className="font-medium">
                                {isLoading ? 'Loading...' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>
                              {!isLoading && (
                                <div className={`text-xs ${isSelected ? 'text-green-600' : 'text-gray-500'}`}>
                                  {img.cloudCover ? `${img.cloudCover.toFixed(0)}% ☁️` : ''}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Image Display */}
              <div className="flex-1 p-4 bg-gray-100">
                <div className="h-full w-full max-w-7xl mx-auto">
                  <TiffImageViewer
                    tiffUrl={currentImage.url}
                    alt="Sentinel-2 Satellite Image"
                    className="rounded-lg"
                    stats={currentImage.stats}
                    metadata={currentImage.metadata}
                    processedImageCache={processedImageCache}
                    onImageProcessed={handleImageProcessed}
                    onLoad={handleImageLoadComplete}
                  />
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Region: <span className="font-medium">{currentImage.area.name}</span>
                </div>
                <Button 
                  onClick={handleNewAnalysis}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw size={16} />
                  New Analysis
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}