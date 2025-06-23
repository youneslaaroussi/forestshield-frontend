'use client';

import { useState, useEffect } from 'react';

interface Activity {
  id: string;
  type: 'analysis' | 'alert' | 'region' | 'system' | 'error';
  message: string;
  timestamp: Date;
  regionName?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

const activityTemplates = [
  { type: 'analysis', message: 'Analysis started for region {region}', severity: 'low' },
  { type: 'analysis', message: 'Analysis completed for region {region}', severity: 'medium' },
  { type: 'alert', message: 'Deforestation alert detected in {region}', severity: 'high' },
  { type: 'alert', message: 'Critical deforestation threshold exceeded in {region}', severity: 'critical' },
  { type: 'region', message: 'New monitoring region {region} created', severity: 'low' },
  { type: 'region', message: 'Region {region} status updated to active', severity: 'medium' },
  { type: 'system', message: 'Satellite data sync completed', severity: 'low' },
  { type: 'system', message: 'System health check passed', severity: 'low' },
  { type: 'system', message: 'AWS Step Function execution started', severity: 'medium' },
  { type: 'error', message: 'Failed to process images for region {region}', severity: 'high' },
];

const regions = ['Amazon North', 'Amazon South', 'Cerrado Central', 'Atlantic Forest', 'Pantanal', 'Caatinga'];

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'analysis': return '🔍';
    case 'alert': return '🚨';
    case 'region': return '🗺️';
    case 'system': return '⚙️';
    case 'error': return '❌';
    default: return '📋';
  }
};

const getSeverityColor = (severity: Activity['severity']) => {
  switch (severity) {
    case 'low': return 'text-gray-600';
    case 'medium': return 'text-blue-600';
    case 'high': return 'text-orange-600';
    case 'critical': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

const getSeverityBg = (severity: Activity['severity']) => {
  switch (severity) {
    case 'low': return 'bg-gray-50 border-l-gray-300';
    case 'medium': return 'bg-blue-50 border-l-blue-300';
    case 'high': return 'bg-orange-50 border-l-orange-300';
    case 'critical': return 'bg-red-50 border-l-red-300';
    default: return 'bg-gray-50 border-l-gray-300';
  }
};

const formatTimestamp = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLive, setIsLive] = useState(true);

  // Generate initial activities
  useEffect(() => {
    const initialActivities = Array.from({ length: 5 }, (_, i) => {
      const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      return {
        id: `activity-${i}`,
        type: template.type as Activity['type'],
        message: template.message.replace('{region}', region),
        timestamp: new Date(Date.now() - Math.random() * 3600000), // Random time in last hour
        regionName: region,
        severity: template.severity as Activity['severity'],
      };
    });
    setActivities(initialActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
  }, []);

  // Generate new activities periodically
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      
      const newActivity: Activity = {
        id: `activity-${Date.now()}`,
        type: template.type as Activity['type'],
        message: template.message.replace('{region}', region),
        timestamp: new Date(),
        regionName: region,
        severity: template.severity as Activity['severity'],
      };

      setActivities(prev => [newActivity, ...prev.slice(0, 19)]); // Keep only 20 activities
    }, Math.random() * 5000 + 3000); // Random interval between 3-8 seconds

    return () => clearInterval(interval);
  }, [isLive]);

  // Update timestamps every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActivities(prev => [...prev]); // Force re-render to update timestamps
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">Activity Feed</h3>
        <button
          onClick={() => setIsLive(!isLive)}
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            isLive 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {isLive ? 'Live' : 'Paused'}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2">📋</div>
              <p className="text-sm">No recent activity</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className={`border-l-4 p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors animate-in slide-in-from-top duration-300 ${getSeverityBg(activity.severity)}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">{getActivityIcon(activity.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${getSeverityColor(activity.severity)}`}>
                      {activity.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                      {activity.regionName && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {activity.regionName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 