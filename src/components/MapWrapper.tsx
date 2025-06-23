'use client';

import dynamic from 'next/dynamic';
import { Component, ErrorInfo, ReactNode } from 'react';
import { useState } from 'react';

// Error boundary class component to catch Leaflet errors
class MapErrorBoundary extends Component<
  { children: ReactNode; mapKey: number; onError?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; mapKey: number; onError?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  componentDidUpdate(prevProps: { mapKey: number }) {
    // Reset error state when mapKey changes (parent is forcing a restart)
    if (prevProps.mapKey !== this.props.mapKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  static getDerivedStateFromError(error: Error) {
    // Handle both Leaflet errors we've seen
    if (error.message?.includes('Map container is being reused by another instance') ||
        error.message?.includes('Cannot read properties of undefined (reading \'appendChild\')') ||
        error.message?.includes('Cannot read properties of undefined (reading \'intersects\')')) {
      return { hasError: true, error };
    }
    // For other errors, let them bubble up
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (error.message?.includes('Map container is being reused by another instance') ||
        error.message?.includes('Cannot read properties of undefined (reading \'appendChild\')') ||
        error.message?.includes('Cannot read properties of undefined (reading \'intersects\')')) {
      console.warn('Leaflet error caught:', error.message);
      // Trigger recovery after a short delay
      setTimeout(() => {
        this.props.onError?.();
      }, 200);
    } else {
       // Re-throw other errors
       throw error;
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen bg-gray-200 animate-pulse flex items-center justify-center text-gray-600">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Reinitializing Map...</div>
            <div className="text-sm">Please wait a moment</div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Dynamically import the MosaicLayout component to avoid SSR issues
const MosaicLayout = dynamic(() => import('./MosaicLayout'), {
  ssr: false,
  loading: () => <div className="w-full h-screen bg-gray-200 animate-pulse flex items-center justify-center text-gray-600">Loading Forest Shield...</div>
});

export default function MapWrapper() {
  const [mapKey, setMapKey] = useState(Date.now());

  const handleError = () => {
    console.log('Forcing complete map restart...');
    setMapKey(Date.now());
  };

  return (
    <MapErrorBoundary mapKey={mapKey} onError={handleError}>
      <MosaicLayout key={mapKey} />
    </MapErrorBoundary>
  );
} 