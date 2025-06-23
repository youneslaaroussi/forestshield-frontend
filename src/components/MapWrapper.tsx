'use client';

import dynamic from 'next/dynamic';

// Dynamically import the MosaicLayout component to avoid SSR issues
const MosaicLayout = dynamic(() => import('./MosaicLayout'), {
  ssr: false,
  loading: () => <div className="w-full h-screen bg-gray-200 animate-pulse flex items-center justify-center text-gray-600">Loading Forest Shield...</div>
});

export default function MapWrapper() {
  return <MosaicLayout />;
} 