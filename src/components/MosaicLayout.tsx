'use client';

import { useState, useEffect, useRef } from 'react';
import { Mosaic, MosaicWindow } from 'react-mosaic-component';
import 'react-mosaic-component/react-mosaic-component.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import { Region, api } from '../lib/api';
import MosaicMap, { LeafletMap } from './MosaicMap';
import RegionDetailsPanel from './RegionDetailsPanel';
import MapToolbar from './MapToolbar';
import AlertsPanel from './AlertsPanel';
import ActiveJobsPanel from './ActiveJobsPanel';

type ViewId = 'map' | 'details' | 'alerts' | 'jobs';

const TITLE_MAP: Record<ViewId, string> = {
  map: 'FOREST MONITORING MAP',
  details: 'REGION DETAILS',
  alerts: 'ACTIVE ALERTS',
  jobs: 'ACTIVE ANALYSIS JOBS',
};

export default function MosaicLayout() {
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSatelliteView, setIsSatelliteView] = useState(false);
  const mapRef = useRef<LeafletMap>(null);

  // Load regions on initial mount
  useEffect(() => {
    const loadRegions = async () => {
      try {
        const data = await api.getRegions();
        setRegions(data);
      } catch (err) {
        console.error('Failed to load regions:', err);
        handleError('Failed to load initial region data. Please refresh the page.');
      }
    };
    loadRegions();
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleToggleHeatmap = () => {
    setIsHeatmapVisible(prev => !prev);
  };

  const handleToggleSatellite = () => {
    setIsSatelliteView(prev => !prev);
  };

  const handleToggleCreate = () => {
    setIsCreating(prev => !prev);
  };

  const handleRegionSelected = (region: Region) => {
    setSelectedRegion(region);
  };

  const handleRegionUpdated = (updatedRegion: Region) => {
    setSelectedRegion(updatedRegion);
    setRegions(prev => prev.map(r => r.id === updatedRegion.id ? updatedRegion : r));
  };

  const handleRegionCreated = (newRegion: Region) => {
    setRegions(prev => [...prev, newRegion]);
    setSelectedRegion(newRegion);
  };

  const handleRegionDeleted = (regionId: string) => {
    setSelectedRegion(null);
    setRegions(prev => prev.filter(r => r.id !== regionId));
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const renderTile = (id: ViewId) => {
    switch (id) {
      case 'map':
        return (
          <MosaicWindow
            path={[]}
            title={TITLE_MAP[id]}
            toolbarControls={
              <MapToolbar
                onToggleHeatmap={handleToggleHeatmap}
                isHeatmapVisible={isHeatmapVisible}
                onToggleCreate={handleToggleCreate}
                isCreating={isCreating}
                isSatelliteView={isSatelliteView}
                onToggleSatellite={handleToggleSatellite}
                onZoomIn={() => mapRef.current?.zoomIn()}
                onZoomOut={() => mapRef.current?.zoomOut()}
                onResetView={() => mapRef.current?.setView([-6.0, -53.0], 6)}
                regionCount={regions.length}
              />
            }
          >
            <MosaicMap
              ref={mapRef}
              onRegionSelected={handleRegionSelected}
              onError={handleError}
              isHeatmapVisible={isHeatmapVisible}
              isSatelliteView={isSatelliteView}
              isCreating={isCreating}
              setIsCreating={setIsCreating}
              onRegionCreated={handleRegionCreated}
              regions={regions}
            />
          </MosaicWindow>
        );
      case 'details':
        return (
          <MosaicWindow path={[]} title={TITLE_MAP[id]} toolbarControls={<div></div>}>
            <RegionDetailsPanel
              region={selectedRegion}
              onRegionUpdated={handleRegionUpdated}
              onRegionDeleted={handleRegionDeleted}
              onError={handleError}
            />
          </MosaicWindow>
        );
      case 'alerts':
        return (
          <MosaicWindow path={[]} title={TITLE_MAP[id]} toolbarControls={<div></div>}>
            <AlertsPanel />
          </MosaicWindow>
        );
      case 'jobs':
        return (
          <MosaicWindow path={[]} title={TITLE_MAP[id]} toolbarControls={<div></div>}>
            <ActiveJobsPanel />
          </MosaicWindow>
        );
      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div className="relative h-screen">
      {/* AWS-style custom CSS */}
      <style jsx global>{`
        /* AWS-style mosaic theme overrides */
        .mosaic-blueprint-theme .mosaic-window-toolbar {
          background: #232f3e !important;
          border-bottom: 1px solid #3c4043 !important;
          color: #ffffff !important;
          padding: 8px 16px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          letter-spacing: 0.5px !important;
          text-transform: uppercase !important;
        }
        
        .mosaic-blueprint-theme .mosaic-window-title {
          color: #ffffff !important;
          font-family: 'Amazon Ember', 'Helvetica Neue', sans-serif !important;
        }
        
        .mosaic-blueprint-theme .mosaic-window-body {
          background: #ffffff !important;
          border: 1px solid #d5dbdb !important;
        }
        
        .mosaic-blueprint-theme .mosaic-tile {
          background: #ffffff !important;
        }
        
        .mosaic-blueprint-theme .mosaic-split {
          background: #d5dbdb !important;
        }
        
        .mosaic-blueprint-theme .mosaic-split:hover {
          background: #aab7b8 !important;
        }
        
        /* Region details panel specific styling */
        .mosaic-blueprint-theme .mosaic-window-toolbar:has(+ * [class*="RegionDetails"]) {
          background: #146eb4 !important;
        }
        
        /* Custom styling for left panel */
        .mosaic-blueprint-theme .mosaic-window:first-child .mosaic-window-toolbar {
          background: #146eb4 !important;
          border-right: 2px solid #232f3e !important;
        }
        
        .mosaic-blueprint-theme .mosaic-window:first-child .mosaic-window-body {
          border-right: 2px solid #d5dbdb !important;
          background: #fafafa !important;
        }

        /* AWS-style Button Styling - Override Button Component Styles */
        [data-slot="button"] {
          font-family: 'Amazon Ember', 'Helvetica Neue', sans-serif !important;
          border-radius: 2px !important;
          font-weight: 500 !important;
          transition: all 0.15s ease-in-out !important;
          box-shadow: 0 1px 1px 0 rgba(0, 28, 36, 0.3) !important;
        }

        /* AWS Default Button (Primary) */
        [data-slot="button"]:not(.bg-red-600):not(.border-gray-300):not(.bg-gray-100):not(.text-gray-700):not(.text-blue-600) {
          background: #0972d3 !important;
          border-color: #0558a5 !important;
          color: #ffffff !important;
        }

        [data-slot="button"]:not(.bg-red-600):not(.border-gray-300):not(.bg-gray-100):not(.text-gray-700):not(.text-blue-600):hover {
          background: #0558a5 !important;
          border-color: #034382 !important;
          color: #ffffff !important;
        }

        [data-slot="button"]:not(.bg-red-600):not(.border-gray-300):not(.bg-gray-100):not(.text-gray-700):not(.text-blue-600):active {
          background: #034382 !important;
          border-color: #023760 !important;
          transform: translateY(1px) !important;
        }

        /* AWS Destructive Button (Delete) */
        [data-slot="button"].bg-red-600 {
          background: #d13212 !important;
          border-color: #b22c0e !important;
          color: #ffffff !important;
        }

        [data-slot="button"].bg-red-600:hover {
          background: #b22c0e !important;
          border-color: #a02c0a !important;
          color: #ffffff !important;
        }

        [data-slot="button"].bg-red-600:active {
          background: #a02c0a !important;
          border-color: #8b2309 !important;
          transform: translateY(1px) !important;
        }

        /* AWS Outline Button (Secondary) */
        [data-slot="button"].border-gray-300 {
          background: transparent !important;
          border-color: #0972d3 !important;
          color: #0972d3 !important;
        }

        [data-slot="button"].border-gray-300:hover {
          background: #f0f8ff !important;
          border-color: #0558a5 !important;
          color: #0558a5 !important;
        }

        [data-slot="button"].border-gray-300:active {
          background: #e3f2fd !important;
          border-color: #034382 !important;
          color: #034382 !important;
          transform: translateY(1px) !important;
        }

        /* AWS Secondary Button */
        [data-slot="button"].bg-gray-100 {
          background: #f2f3f3 !important;
          border-color: #d5dbdb !important;
          color: #0f1419 !important;
        }

        [data-slot="button"].bg-gray-100:hover {
          background: #e9ecef !important;
          border-color: #aab7b8 !important;
          color: #0f1419 !important;
        }

        [data-slot="button"].bg-gray-100:active {
          background: #d5dbdb !important;
          border-color: #879596 !important;
          transform: translateY(1px) !important;
        }

        /* AWS Ghost Button */
        [data-slot="button"].text-gray-700:not(.border-gray-300) {
          background: transparent !important;
          border: none !important;
          color: #232f3e !important;
        }

        [data-slot="button"].text-gray-700:not(.border-gray-300):hover {
          background: #f2f3f3 !important;
          color: #0f1419 !important;
        }

        /* AWS Link Button */
        [data-slot="button"].text-blue-600 {
          background: transparent !important;
          border: none !important;
          color: #0972d3 !important;
          text-decoration: underline !important;
          text-underline-offset: 4px !important;
        }

        [data-slot="button"].text-blue-600:hover {
          color: #0558a5 !important;
          text-decoration: underline !important;
        }

        /* Focus states for all buttons */
        [data-slot="button"]:focus-visible {
          outline: 2px solid #0972d3 !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 2px rgba(9, 114, 211, 0.25) !important;
        }

        /* Disabled states for all buttons */
        [data-slot="button"]:disabled {
          background: #f2f3f3 !important;
          border-color: #d5dbdb !important;
          color: #687078 !important;
          cursor: not-allowed !important;
          opacity: 0.6 !important;
          transform: none !important;
        }

        /* AWS-style Input Styling */
        [data-slot="input"], [data-slot="textarea"] {
          font-family: 'Amazon Ember', 'Helvetica Neue', sans-serif !important;
          border: 1px solid #d5dbdb !important;
          border-radius: 2px !important;
          background: #ffffff !important;
          color: #0f1419 !important;
          transition: all 0.15s ease-in-out !important;
          box-shadow: inset 0 1px 2px rgba(0, 28, 36, 0.1) !important;
        }

        [data-slot="input"]:focus, [data-slot="textarea"]:focus {
          outline: none !important;
          border-color: #0972d3 !important;
          box-shadow: 0 0 0 2px rgba(9, 114, 211, 0.25), inset 0 1px 2px rgba(0, 28, 36, 0.1) !important;
        }

        [data-slot="input"]:hover, [data-slot="textarea"]:hover {
          border-color: #aab7b8 !important;
        }

        [data-slot="input"]:disabled, [data-slot="textarea"]:disabled {
          background: #f2f3f3 !important;
          border-color: #d5dbdb !important;
          color: #687078 !important;
          cursor: not-allowed !important;
        }

        /* Legacy input styling for non-component inputs */
        input:not([data-slot]), textarea:not([data-slot]), select:not([data-slot]) {
          font-family: 'Amazon Ember', 'Helvetica Neue', sans-serif !important;
          font-size: 14px !important;
          line-height: 20px !important;
          border: 1px solid #d5dbdb !important;
          border-radius: 2px !important;
          padding: 8px 12px !important;
          background: #ffffff !important;
          color: #0f1419 !important;
          transition: all 0.15s ease-in-out !important;
          box-shadow: inset 0 1px 2px rgba(0, 28, 36, 0.1) !important;
          min-height: 32px !important;
          width: 100% !important;
        }

        input:not([data-slot]):focus, textarea:not([data-slot]):focus, select:not([data-slot]):focus {
          outline: none !important;
          border-color: #0972d3 !important;
          box-shadow: 0 0 0 2px rgba(9, 114, 211, 0.25), inset 0 1px 2px rgba(0, 28, 36, 0.1) !important;
        }

        input:not([data-slot])[type="checkbox"], input:not([data-slot])[type="radio"] {
          width: auto !important;
          margin-right: 8px !important;
        }

        /* AWS-style Label Styling */
        label {
          font-family: 'Amazon Ember', 'Helvetica Neue', sans-serif !important;
          font-size: 14px !important;
          font-weight: 400 !important;
          color: #0f1419 !important;
          margin-bottom: 4px !important;
          display: block !important;
        }

        /* AWS-style Form Group Styling */
        .form-group, .field-group {
          margin-bottom: 16px !important;
        }

        /* AWS-style Toolbar Buttons */
        .mosaic-window-toolbar button {
          background: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #ffffff !important;
          padding: 4px 8px !important;
          margin: 0 2px !important;
          font-size: 12px !important;
          min-height: 24px !important;
        }

        .mosaic-window-toolbar button:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
        }

        .mosaic-window-toolbar button:active {
          background: rgba(255, 255, 255, 0.15) !important;
          transform: none !important;
        }

        /* AWS-style Card/Panel Styling */
        .card, .panel {
          background: #ffffff !important;
          border: 1px solid #d5dbdb !important;
          border-radius: 2px !important;
          box-shadow: 0 1px 1px 0 rgba(0, 28, 36, 0.3) !important;
          padding: 16px !important;
          margin-bottom: 16px !important;
        }

        /* AWS-style Error/Success Messages */
        .alert {
          padding: 12px 16px !important;
          border-radius: 2px !important;
          margin-bottom: 16px !important;
          font-family: 'Amazon Ember', 'Helvetica Neue', sans-serif !important;
          font-size: 14px !important;
        }

        .alert-error {
          background: #fdf2f2 !important;
          border: 1px solid #f5b7b1 !important;
          color: #d13212 !important;
        }

        .alert-success {
          background: #f0f8f0 !important;
          border: 1px solid #b7e4b7 !important;
          color: #037f0c !important;
        }

        .alert-warning {
          background: #fffbf0 !important;
          border: 1px solid #f7dc6f !important;
          color: #8d6e00 !important;
        }

        .alert-info {
          background: #f0f8ff !important;
          border: 1px solid #aed6f1 !important;
          color: #0972d3 !important;
        }
      `}</style>
      {/* Error Message */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[2000] bg-red-50 border border-red-300 text-red-800 px-4 py-3 max-w-md shadow-sm">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1 transition-colors"
              title="Dismiss error"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mosaic Layout */}
      <Mosaic<ViewId>
        renderTile={renderTile}
        initialValue={{
          direction: 'row',
          first: 'details',
          second: {
            direction: 'column',
            first: 'map',
            second: {
                direction: 'row',
                first: 'alerts',
                second: 'jobs',
                splitPercentage: 50,
            },
            splitPercentage: 75,
          },
          splitPercentage: 25,
        }}
        className="mosaic-blueprint-theme"
      />
    </div>
  );
} 