'use client';

import { useState, useEffect, useRef, useContext } from 'react';
import { Mosaic, MosaicWindow, MosaicContext, MosaicNode } from 'react-mosaic-component';
import 'react-mosaic-component/react-mosaic-component.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import { X, Settings, ChevronDown } from 'lucide-react';
import { Region, api } from '../lib/api';
import MosaicMap, { LeafletMap } from './MosaicMap';
import RegionDetailsPanel from './RegionDetailsPanel';
import MapToolbar from './MapToolbar';
import AlertsPanel from './AlertsPanel';
import ActiveJobsPanel from './ActiveJobsPanel';
import SettingsPanel from './SettingsPanel';
import DashboardStatsPanel from './DashboardStatsPanel';
import ActivityFeed from './ActivityFeed';
import SystemHealthPanel from './SystemHealthPanel';
import LogsPanel from './LogsPanel';

type ViewId = 'map' | 'details' | 'alerts' | 'jobs' | 'settings' | 'activity' | 'health' | 'logs';

const TITLE_MAP: Record<ViewId, string> = {
  map: 'FOREST MONITORING MAP',
  details: 'REGION DETAILS',
  alerts: 'ACTIVE ALERTS',
  jobs: 'ACTIVE ANALYSIS JOBS',
  settings: 'NOTIFICATION SETTINGS',
  activity: 'ACTIVITY FEED',
  health: 'SYSTEM HEALTH',
  logs: 'SYSTEM LOGS',
};

const ICON_MAP: Record<ViewId, string> = {
  map: 'MAP',
  details: 'DTL',
  alerts: 'ALT',
  jobs: 'JOB',
  settings: 'SET',
  activity: 'ACT',
  health: 'HLT',
  logs: 'LOG',
};

export default function MosaicLayout() {
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSatelliteView, setIsSatelliteView] = useState(false);
  const mapRef = useRef<LeafletMap>(null);
  
  // State for managing window visibility and mosaic layout
  const [currentValue, setCurrentValue] = useState<MosaicNode<ViewId> | null>({
    direction: 'row',
    first: {
      direction: 'column',
      first: 'details',
      second: 'health',
      splitPercentage: 60,
    },
    second: {
      direction: 'column',
      first: 'map',
      second: {
        direction: 'row',
        first: {
          direction: 'column',
          first: 'alerts',
          second: 'activity',
          splitPercentage: 50,
        },
        second: {
          direction: 'column',
          first: 'jobs',
          second: {
            direction: 'row',
            first: 'settings',
            second: 'logs',
            splitPercentage: 50,
          },
          splitPercentage: 40,
        },
        splitPercentage: 50,
      },
      splitPercentage: 65,
    },
    splitPercentage: 25,
  });
  
  const [hiddenViews, setHiddenViews] = useState<Set<ViewId>>(new Set());
  const [isWindowMenuOpen, setIsWindowMenuOpen] = useState(false);

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

  const handleRegionDeselected = () => {
    setSelectedRegion(null);
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

  // Functions to handle window management
  const hideWindow = (viewId: ViewId) => {
    setHiddenViews(prev => new Set([...prev, viewId]));
  };

  const showWindow = (viewId: ViewId) => {
    setHiddenViews(prev => {
      const newSet = new Set([...prev]);
      newSet.delete(viewId);
      return newSet;
    });
  };

  const toggleWindowVisibility = (viewId: ViewId) => {
    if (hiddenViews.has(viewId)) {
      showWindow(viewId);
    } else {
      hideWindow(viewId);
    }
  };

  // Custom toolbar controls for each window
  const createCustomToolbarControls = (viewId: ViewId) => {
    return (
      <div className="flex items-center gap-2 left-4 relative">
        <button
          onClick={() => hideWindow(viewId)}
          title="Hide this panel"
          className="mt-0.5"
        >
          <X size={12} />
        </button>
      </div>
    );
  };

  // Function to filter out hidden views from the mosaic tree
  const filterHiddenViews = (node: MosaicNode<ViewId> | null): MosaicNode<ViewId> | null => {
    if (!node) return null;
    
    if (typeof node === 'string') {
      return hiddenViews.has(node) ? null : node;
    }
    
    const first = filterHiddenViews(node.first);
    const second = filterHiddenViews(node.second);
    
    if (!first && !second) return null;
    if (!first) return second;
    if (!second) return first;
    
    return {
      ...node,
      first,
      second,
    };
  };

  const filteredValue = filterHiddenViews(currentValue);

  const renderTile = (id: ViewId, path: any) => {
    const customControls = id === 'map' ? (
      <div className="flex items-center gap-2">
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
        {createCustomToolbarControls(id)}
      </div>
    ) : createCustomToolbarControls(id);

    switch (id) {
      case 'map':
        return (
          <MosaicWindow
            path={path}
            title={TITLE_MAP[id]}
            toolbarControls={customControls}
            createNode={() => 'map'}
          >
            <MosaicMap
              ref={mapRef}
              onRegionSelected={handleRegionSelected}
              onRegionDeselected={handleRegionDeselected}
              onError={handleError}
              isHeatmapVisible={isHeatmapVisible}
              isSatelliteView={isSatelliteView}
              isCreating={isCreating}
              setIsCreating={setIsCreating}
              onRegionCreated={handleRegionCreated}
              regions={regions}
              selectedRegion={selectedRegion}
            />
          </MosaicWindow>
        );
      case 'details':
        return (
          <MosaicWindow path={path} title={TITLE_MAP[id]} toolbarControls={customControls} createNode={() => 'details'}>
            <RegionDetailsPanel
              region={selectedRegion}
              onRegionUpdated={handleRegionUpdated}
              onRegionDeleted={handleRegionDeleted}
              onRegionDeselected={handleRegionDeselected}
              onError={handleError}
            />
          </MosaicWindow>
        );
      case 'alerts':
        return (
          <MosaicWindow path={path} title={TITLE_MAP[id]} toolbarControls={customControls} createNode={() => 'alerts'}>
            <AlertsPanel />
          </MosaicWindow>
        );
      case 'jobs':
        return (
          <MosaicWindow path={path} title={TITLE_MAP[id]} toolbarControls={customControls} createNode={() => 'jobs'}>
            <ActiveJobsPanel />
          </MosaicWindow>
        );
      case 'settings':
        return (
          <MosaicWindow path={path} title={TITLE_MAP[id]} toolbarControls={customControls} createNode={() => 'settings'}>
            <SettingsPanel onError={handleError} />
          </MosaicWindow>
        );
      case 'activity':
        return (
          <MosaicWindow path={path} title={TITLE_MAP[id]} toolbarControls={customControls} createNode={() => 'activity'}>
            <ActivityFeed />
          </MosaicWindow>
        );
      case 'health':
        return (
          <MosaicWindow path={path} title={TITLE_MAP[id]} toolbarControls={customControls} createNode={() => 'health'}>
            <SystemHealthPanel />
          </MosaicWindow>
        );
      case 'logs':
        return (
          <MosaicWindow path={path} title={TITLE_MAP[id]} toolbarControls={customControls} createNode={() => 'logs'}>
            <LogsPanel />
          </MosaicWindow>
        );
      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div className="relative h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-[#232f3e] text-white px-4 py-2 flex items-center justify-between border-b border-[#3c4043] relative z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">ForestShield Dashboard</h1>
          <div className="text-sm text-gray-300">
            {Object.keys(TITLE_MAP).length - hiddenViews.size} of {Object.keys(TITLE_MAP).length} panels visible
          </div>
        </div>
        
        {/* Window Management Dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsWindowMenuOpen(!isWindowMenuOpen);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0972d3] hover:bg-[#0558a5] transition-colors border border-[#0558a5] text-sm font-medium"
            style={{ borderRadius: '2px' }}
          >
            <Settings size={14} />
            <span>Manage Panels</span>
            <ChevronDown size={14} className={`transform transition-transform ${isWindowMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isWindowMenuOpen && (
            <>
              {/* Click outside to close dropdown */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsWindowMenuOpen(false)}
              />
              <div 
                className="absolute right-0 top-full mt-1 bg-white border border-[#d5dbdb] shadow-lg min-w-[320px] z-50"
                style={{ 
                  borderRadius: '2px',
                  boxShadow: '0 1px 1px 0 rgba(0, 28, 36, 0.3), 0 4px 8px 0 rgba(0, 28, 36, 0.15)'
                }}
              >
                <div className="p-4 border-b border-[#d5dbdb] bg-[#f2f3f3]">
                  <h3 className="font-semibold text-[#0f1419] text-sm mb-1">Panel Management</h3>
                  <p className="text-xs text-[#687078]">Show or hide dashboard panels</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {Object.entries(TITLE_MAP).map(([viewId, title]) => (
                    <div
                      key={viewId}
                      className="flex items-center justify-between p-3 hover:bg-[#f2f3f3] border-b border-[#eaeded] last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#232f3e] text-white text-xs font-bold flex items-center justify-center" style={{ borderRadius: '2px' }}>
                          {ICON_MAP[viewId as ViewId]}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-[#0f1419]">{title}</div>
                          <div className="text-xs text-[#687078]">
                            {hiddenViews.has(viewId as ViewId) ? 'Hidden' : 'Visible'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={!hiddenViews.has(viewId as ViewId)}
                          onChange={() => toggleWindowVisibility(viewId as ViewId)}
                          className="w-4 h-4 text-[#0972d3] bg-white border-[#d5dbdb] focus:ring-[#0972d3] focus:ring-2 cursor-pointer"
                          style={{ borderRadius: '2px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-[#d5dbdb] bg-[#f2f3f3]">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setHiddenViews(new Set());
                        setIsWindowMenuOpen(false);
                      }}
                      className="flex-1 px-3 py-1.5 bg-[#0972d3] text-white text-xs font-medium hover:bg-[#0558a5] transition-colors border border-[#0558a5]"
                      style={{ borderRadius: '2px' }}
                    >
                      Show All
                    </button>
                    <button
                      onClick={() => {
                        setHiddenViews(new Set(Object.keys(TITLE_MAP) as ViewId[]));
                        setIsWindowMenuOpen(false);
                      }}
                      className="flex-1 px-3 py-1.5 bg-[#f2f3f3] text-[#0f1419] text-xs font-medium hover:bg-[#e9ecef] transition-colors border border-[#d5dbdb]"
                      style={{ borderRadius: '2px' }}
                    >
                      Hide All
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

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
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
        
        .mosaic-blueprint-theme .mosaic-window-title {
          color: #ffffff !important;
          font-family: 'Amazon Ember', 'Helvetica Neue', sans-serif !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
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

        /* AWS-style Scrollbars */
        ::-webkit-scrollbar {
          width: 12px !important;
          height: 12px !important;
        }

        ::-webkit-scrollbar-track {
          background: #f2f3f3 !important;
          border-radius: 2px !important;
        }

        ::-webkit-scrollbar-thumb {
          background: #aab7b8 !important;
          border-radius: 2px !important;
          border: 2px solid #f2f3f3 !important;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #879596 !important;
        }

        ::-webkit-scrollbar-thumb:active {
          background: #687078 !important;
        }

        ::-webkit-scrollbar-corner {
          background: #f2f3f3 !important;
        }

        /* Firefox scrollbar styling */
        html {
          scrollbar-width: thin !important;
          scrollbar-color: #aab7b8 #f2f3f3 !important;
        }

        /* Custom AWS-style Card styling overrides */
        [data-slot="card"] {
          background: #ffffff !important;
          border: 1px solid #d5dbdb !important;
          border-radius: 2px !important;
          box-shadow: 0 1px 1px 0 rgba(0, 28, 36, 0.3), 0 1px 3px 0 rgba(0, 28, 36, 0.15) !important;
          transition: box-shadow 0.15s ease-in-out !important;
        }

        [data-slot="card"]:hover {
          box-shadow: 0 2px 4px 0 rgba(0, 28, 36, 0.15), 0 4px 8px 0 rgba(0, 28, 36, 0.1) !important;
        }

        /* AWS-style Card borders for different states */
        [data-slot="card"].border-success {
          border-color: #037f0c !important;
          border-left-width: 4px !important;
        }

        [data-slot="card"].border-warning {
          border-color: #8d6e00 !important;
          border-left-width: 4px !important;
        }

        [data-slot="card"].border-error {
          border-color: #d13212 !important;
          border-left-width: 4px !important;
        }

        [data-slot="card"].border-info {
          border-color: #0972d3 !important;
          border-left-width: 4px !important;
        }

        /* AWS-style status badges */
        .status-badge {
          display: inline-flex !important;
          align-items: center !important;
          gap: 4px !important;
          padding: 2px 8px !important;
          border-radius: 12px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }

        .status-badge.verified {
          background: #d4edda !important;
          color: #037f0c !important;
          border: 1px solid #c3e6cb !important;
        }

        .status-badge.pending {
          background: #fff3cd !important;
          color: #8d6e00 !important;
          border: 1px solid #ffeaa7 !important;
        }

        .status-badge.error {
          background: #f8d7da !important;
          color: #d13212 !important;
          border: 1px solid #f5c6cb !important;
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

      <DashboardStatsPanel />

      {/* Mosaic Layout */}
      <div className="flex-1">
        {filteredValue ? (
          <Mosaic<ViewId>
            renderTile={renderTile}
            value={filteredValue}
            onChange={setCurrentValue}
            className="mosaic-blueprint-theme"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-[#f2f3f3]">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#232f3e] text-white text-2xl font-bold flex items-center justify-center mb-4 mx-auto" style={{ borderRadius: '2px' }}>
                SET
              </div>
              <h2 className="text-xl font-semibold text-[#0f1419] mb-2">No Panels Visible</h2>
              <p className="text-[#687078] mb-4">All dashboard panels are currently hidden.</p>
              <button
                onClick={() => setIsWindowMenuOpen(true)}
                className="px-4 py-2 bg-[#0972d3] text-white font-medium hover:bg-[#0558a5] transition-colors border border-[#0558a5]"
                style={{ borderRadius: '2px' }}
              >
                Manage Panels
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 