'use client';

import { useState, useEffect } from 'react';
import { Region, api } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

interface RegionDetailsPanelProps {
  region: Region | null;
  onRegionUpdated: (region: Region) => void;
  onRegionDeleted: (regionId: string) => void;
  onRegionDeselected: () => void;
  onError: (error: string) => void;
}

export default function RegionDetailsPanel({
  region,
  onRegionUpdated,
  onRegionDeleted,
  onRegionDeselected,
  onError
}: RegionDetailsPanelProps) {
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEditingRegion(region ? { ...region } : null);
  }, [region]);

  if (!region || !editingRegion) {
    return (
      <div className="flex items-center justify-center h-full bg-[#f2f3f3]">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-[#232f3e] text-white text-2xl font-bold flex items-center justify-center mb-4 mx-auto" style={{ borderRadius: '2px' }}>
            DTL
          </div>
          <h3 className="text-lg font-semibold text-[#0f1419] mb-2">No Region Selected</h3>
          <p className="text-[#687078] mb-4">Select a region from the map to view and edit its details.</p>
          <div className="text-sm text-[#687078]">
            <div>• View monitoring status</div>
            <div>• Edit region settings</div>
            <div>• Trigger analysis</div>
          </div>
        </div>
      </div>
    );
  }

  const handleUpdateRegion = async () => {
    if (!editingRegion) return;

    // Validate radius before sending
    if (editingRegion.radiusKm > 50) {
      onError('Radius cannot exceed 50 kilometers');
      return;
    }
    if (editingRegion.radiusKm < 1) {
      onError('Radius must be at least 1 kilometer');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        name: editingRegion.name,
        description: editingRegion.description,
        radiusKm: editingRegion.radiusKm,
        cloudCoverThreshold: editingRegion.cloudCoverThreshold,
      };

      const updatedRegion = await api.updateRegion(editingRegion.id, updateData);
      onRegionUpdated(updatedRegion);
      setEditingRegion(updatedRegion);
    } catch (err) {
      console.error('Failed to update region:', err);
      if (err instanceof Error && err.message.includes('radiusKm')) {
        onError('Radius must be between 1 and 50 kilometers');
      } else {
        onError('Failed to update region');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRegion = async () => {
    if (!editingRegion || !confirm('Are you sure you want to delete this monitoring region?')) return;

    setLoading(true);
    try {
      await api.deleteRegion(editingRegion.id);
      onRegionDeleted(editingRegion.id);
    } catch (err) {
      console.error('Failed to delete region:', err);
      onError('Failed to delete region');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAnalysis = async () => {
    if (!editingRegion) return;

    setLoading(true);
    try {
      // Generate date range for the last 3 months
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 3);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      await api.triggerAnalysis(
        editingRegion.latitude,
        editingRegion.longitude,
        startDateStr,
        endDateStr,
        editingRegion.cloudCoverThreshold
      );
      onError(''); // Clear any previous errors
    } catch (err) {
      console.error('Failed to trigger analysis:', err);
      onError('Failed to trigger analysis');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: Region['status']) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700 border-green-200';
      case 'PAUSED': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'MONITORING': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDeforestationBadgeColor = (percentage?: number) => {
    if (!percentage) return 'bg-gray-100 text-gray-700 border-gray-200';
    if (percentage > 15) return 'bg-red-100 text-red-700 border-red-200';
    if (percentage > 8) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  return (
    <div className="overflow-y-scroll p-6 space-y-6 h-full">
      {/* Header with deselect button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#0f1419]">Region Details</h2>
        <Button
          onClick={onRegionDeselected}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          Deselect
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(editingRegion.status)}`}>
            {editingRegion.status}
          </span>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Deforestation</h3>
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getDeforestationBadgeColor(editingRegion.lastDeforestationPercentage)}`}>
            {editingRegion.lastDeforestationPercentage ? `${editingRegion.lastDeforestationPercentage}%` : 'No data'}
          </span>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Region Name</label>
          <Input
            value={editingRegion.name}
            onChange={(e) => setEditingRegion({ ...editingRegion, name: e.target.value })}
            placeholder="Enter region name"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <Textarea
            value={editingRegion.description}
            onChange={(e) => setEditingRegion({ ...editingRegion, description: e.target.value })}
            placeholder="Describe this monitoring region"
            rows={3}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Radius (km)</label>
            <Input
              type="number"
              min="1"
              max="50"
              step="0.1"
              value={editingRegion.radiusKm}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 1;
                setEditingRegion({ ...editingRegion, radiusKm: Math.min(50, Math.max(1, value)) });
              }}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Max: 50km</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cloud Cover %</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={editingRegion.cloudCoverThreshold}
              onChange={(e) => setEditingRegion({ ...editingRegion, cloudCoverThreshold: parseInt(e.target.value) || 0 })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <h3 className="font-medium text-gray-700">Region Information</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <div><span className="font-medium">Coordinates:</span> {editingRegion.latitude.toFixed(4)}, {editingRegion.longitude.toFixed(4)}</div>
          <div><span className="font-medium">Created:</span> {new Date(editingRegion.createdAt).toLocaleDateString()}</div>
          {editingRegion.lastAnalysis && (
            <div><span className="font-medium">Last Analysis:</span> {new Date(editingRegion.lastAnalysis).toLocaleDateString()}</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t p-6 bg-gray-50 space-y-3">
        <Button
          onClick={handleUpdateRegion}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? 'Updating...' : 'Update Region'}
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleTriggerAnalysis}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? 'Starting...' : 'Trigger Analysis'}
          </Button>
          <Button
            onClick={handleDeleteRegion}
            disabled={loading}
            variant="destructive"
            className="w-full"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
} 