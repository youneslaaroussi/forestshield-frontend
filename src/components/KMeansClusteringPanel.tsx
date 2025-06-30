'use client';

import React, { useState, useEffect } from 'react';
import { Region, api } from '../lib/api';
import { 
  Image, 
  BarChart3, 
  MapPin, 
  TrendingUp, 
  Activity, 
  RefreshCw, 
  Download, 
  ZoomIn,
  AlertTriangle,
  Loader2,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ScatterChart
} from 'lucide-react';

// Interfaces for the visualization API
interface VisualizationItem {
  chartType: string;
  tileId: string;
  timestamp: string;
  url: string;
  createdAt: string;
  description: string;
}

interface VisualizationsResponse {
  regionId: string;
  regionName: string;
  visualizations: VisualizationItem[];
  totalVisualizations: number;
  retrievedAt: string;
}



// Chart type metadata
const CHART_METADATA = {
  ndvi_red_clusters: {
    icon: <ScatterChart size={16} />,
    color: 'bg-green-100 text-green-700',
    category: 'Scatter Analysis'
  },
  geographic_distribution: {
    icon: <MapPin size={16} />,
    color: 'bg-blue-100 text-blue-700',
    category: 'Geographic'
  },
  feature_distributions: {
    icon: <BarChart3 size={16} />,
    color: 'bg-purple-100 text-purple-700',
    category: 'Distributions'
  },
  cluster_statistics: {
    icon: <Activity size={16} />,
    color: 'bg-orange-100 text-orange-700',
    category: 'Statistics'
  },
  ndvi_nir_clusters: {
    icon: <ScatterChart size={16} />,
    color: 'bg-teal-100 text-teal-700',
    category: 'Scatter Analysis'
  }
};

interface Props {
  selectedRegion?: Region | null;
}

export default function KMeansClusteringPanel({ selectedRegion }: Props) {
  const [visualizations, setVisualizations] = useState<VisualizationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVisualization, setSelectedVisualization] = useState<VisualizationItem | null>(null);
  const [selectedChart, setSelectedChart] = useState<VisualizationItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load visualizations for the selected region
  const loadVisualizations = async (regionId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data: VisualizationsResponse = await api.getRegionVisualizations(regionId);
      setVisualizations(data);
      
      // Auto-select the latest visualization if available
      if (data.visualizations.length > 0) {
        const latestViz = data.visualizations[0]; // Assuming first is latest
        setSelectedVisualization(latestViz);
        
        // Auto-select first chart
        if (latestViz.chartType) {
          setSelectedChart(latestViz);
        }
      }
    } catch (err) {
      console.error('Error loading visualizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load visualizations');
    } finally {
      setIsLoading(false);
    }
  };



  // Effect to load visualizations when region changes
  useEffect(() => {
    if (selectedRegion?.id) {
      loadVisualizations(selectedRegion.id);
    } else {
      setVisualizations(null);
      setSelectedVisualization(null);
      setSelectedChart(null);
    }
  }, [selectedRegion?.id]);

  // Images are directly available via URL, no need to load separately

  const handleRefresh = async () => {
    if (!selectedRegion?.id) return;
    
    setRefreshing(true);
    await loadVisualizations(selectedRegion.id);
    setRefreshing(false);
  };

  const formatTimestamp = (timestamp: string) => {
    // Convert timestamp format "20250630-130221" to readable date
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(9, 11);
    const minute = timestamp.substring(11, 13);
    
    const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    return date.toLocaleString();
  };

  const getCurrentImageUrl = () => {
    return selectedChart?.url || null;
  };

  const isCurrentImageLoading = () => {
    return false; // Images are directly available via URL
  };

  // Navigation functions
  const navigateChart = (direction: 'prev' | 'next') => {
    if (!selectedVisualization || !selectedChart || !visualizations) return;
    
    const currentIndex = visualizations.visualizations.findIndex(c => c.chartType === selectedChart.chartType);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : visualizations.visualizations.length - 1;
    } else {
      newIndex = currentIndex < visualizations.visualizations.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedChart(visualizations.visualizations[newIndex]);
  };

  if (!selectedRegion) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-center p-6">
        <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-sm max-w-md">
          <ScatterChart size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">K-Means Clustering Visualizations</h3>
          <p className="text-sm text-gray-600 mb-4">
            View clustering analysis results including NDVI scatter plots, geographic distributions, and feature histograms.
          </p>
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border">
            <strong>Select a region</strong> from the map or regions list to view available clustering visualizations.
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto mb-3 animate-spin text-blue-600"/>
          <h3 className="text-lg font-semibold text-gray-800">Loading Visualizations</h3>
          <p className="text-sm text-gray-600">Fetching clustering analysis results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center text-red-600 max-w-md">
          <AlertTriangle size={40} className="mx-auto mb-3"/>
          <h3 className="text-lg font-semibold mb-2">Failed to Load Visualizations</h3>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => selectedRegion?.id && loadVisualizations(selectedRegion.id)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!visualizations || visualizations.visualizations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-center p-6">
        <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-sm max-w-md">
          <Image size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Visualizations Available</h3>
          <p className="text-sm text-gray-600 mb-4">
            No clustering analysis visualizations found for region <strong>{selectedRegion.name}</strong>.
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">K-Means Clustering Visualizations</h3>
            <p className="text-sm text-gray-600">
              Region: <strong>{selectedRegion.name}</strong>
              {selectedVisualization && (
                <span className="ml-3 text-gray-500">
                  <Calendar size={12} className="inline mr-1" />
                  {formatTimestamp(selectedVisualization.timestamp)}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Refresh visualizations"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">


        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Chart Type Selector */}
          {visualizations && visualizations.visualizations.length > 1 && (
            <div className="bg-white border-b border-gray-200 p-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                {visualizations.visualizations.map((chart) => {
                  const metadata = CHART_METADATA[chart.chartType as keyof typeof CHART_METADATA];
                  const isSelected = selectedChart?.chartType === chart.chartType;
                  
                  return (
                    <button
                      key={chart.chartType}
                      onClick={() => {
                        setSelectedVisualization(chart);
                        setSelectedChart(chart);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        isSelected
                          ? `${metadata?.color || 'bg-blue-100 text-blue-700'} border border-blue-300`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                      }`}
                    >
                      {metadata?.icon || <Image size={14} />}
                      {chart.chartType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Visualization Display */}
          <div className="flex-1 p-4 overflow-auto">
            {selectedChart && selectedVisualization ? (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                {/* Chart Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">{selectedChart.chartType}</h4>
                      <p className="text-sm text-gray-600 mt-1">{selectedChart.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Navigation */}
                      {visualizations.visualizations.length > 1 && (
                        <div className="flex items-center border border-gray-300 rounded">
                          <button
                            onClick={() => navigateChart('prev')}
                            className="p-1.5 hover:bg-gray-100 transition-colors"
                            title="Previous chart"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="px-2 text-sm text-gray-600 border-x border-gray-300">
                            {visualizations.visualizations.findIndex(c => c.chartType === selectedChart.chartType) + 1} of {visualizations.visualizations.length}
                          </span>
                          <button
                            onClick={() => navigateChart('next')}
                            className="p-1.5 hover:bg-gray-100 transition-colors"
                            title="Next chart"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                      
                      {/* Actions */}
                      <button
                        onClick={() => setIsFullscreen(true)}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                        title="View fullscreen"
                      >
                        <Maximize2 size={16} />
                      </button>
                      
                      {getCurrentImageUrl() && (
                        <a
                          href={getCurrentImageUrl()!}
                          download={`${selectedChart.chartType}-${selectedVisualization.timestamp}.png`}
                          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                          title="Download image"
                        >
                          <Download size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chart Image */}
                <div className="p-4">
                  <div className="relative bg-gray-50 rounded-lg border border-gray-200 min-h-[400px] flex items-center justify-center">
                    {isCurrentImageLoading() ? (
                      <div className="text-center">
                        <Loader2 size={32} className="mx-auto mb-3 animate-spin text-blue-600" />
                        <p className="text-sm text-gray-600">Loading visualization...</p>
                      </div>
                    ) : getCurrentImageUrl() ? (
                      <img
                        src={getCurrentImageUrl()!}
                        alt={selectedChart.chartType}
                        className="max-w-full max-h-full object-contain rounded"
                        onError={(e) => {
                          console.error('Failed to load image:', getCurrentImageUrl());
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-center text-gray-500">
                        <Image size={32} className="mx-auto mb-3" />
                        <p className="text-sm">Failed to load visualization</p>
                        <button
                          onClick={() => window.location.reload()}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                        >
                          Reload page
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                <Eye size={32} className="mx-auto mb-3 text-gray-400" />
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Select a Visualization</h4>
                <p className="text-sm text-gray-600">Choose a chart type to view the clustering analysis results.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && getCurrentImageUrl() && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-2"
            >
              <X size={20} />
            </button>
            <img
              src={getCurrentImageUrl()!}
              alt={selectedChart?.chartType || 'Visualization'}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
} 