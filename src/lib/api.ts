const API_BASE_URL = 'http://localhost:3000';

export interface Region {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string;
  radiusKm: number;
  cloudCoverThreshold: number;
  status: 'ACTIVE' | 'PAUSED' | 'MONITORING';
  createdAt: string;
  lastDeforestationPercentage?: number;
  lastAnalysis?: string;
}

export interface CreateRegionDto {
  name: string;
  latitude: number;
  longitude: number;
  description: string;
  radiusKm: number;
  cloudCoverThreshold: number;
}

export interface DashboardStats {
  totalRegions: number;
  activeAlerts: number;
  avgDeforestation: number;
  imagesProcessed: number;
  activeJobs: number;
  lastUpdate: string;
}

export interface Alert {
  id: string;
  regionId: string;
  regionName: string;
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  deforestationPercentage: number;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface HeatmapDataPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface HeatmapResponse {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  data: HeatmapDataPoint[];
  generatedAt: string;
  periodDays: number;
}

export interface ActiveJob {
  jobId: string;
  regionId: string;
  regionName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: number;
  startTime: string;
  totalImages: number;
  processedImages: number;
}

export interface AlertSubscription {
  email: string;
  subscriptionArn: string;
  status: 'PendingConfirmation' | 'Confirmed' | 'Deleted';
}

export interface AlertSubscriptionsResponse {
  subscriptions: AlertSubscription[];
}

export interface SubscribeResponse {
  message: string;
  subscriptionArn: string;
}

// API Client functions
export const api = {
  // Dashboard endpoints
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
    if (!response.ok) throw new Error('Failed to fetch dashboard stats');
    return response.json();
  },

  async getRegions(status?: string): Promise<Region[]> {
    const url = new URL(`${API_BASE_URL}/dashboard/regions`);
    if (status) url.searchParams.append('status', status);
    
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to fetch regions');
    return response.json();
  },

  async createRegion(regionData: CreateRegionDto): Promise<Region> {
    const response = await fetch(`${API_BASE_URL}/dashboard/regions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regionData),
    });
    if (!response.ok) throw new Error('Failed to create region');
    return response.json();
  },

  async getRegion(regionId: string): Promise<Region> {
    const response = await fetch(`${API_BASE_URL}/dashboard/regions/${regionId}`);
    if (!response.ok) throw new Error('Failed to fetch region');
    return response.json();
  },

  async updateRegion(regionId: string, regionData: Partial<CreateRegionDto>): Promise<Region> {
    const response = await fetch(`${API_BASE_URL}/dashboard/regions/${regionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regionData),
    });
    if (!response.ok) throw new Error('Failed to update region');
    return response.json();
  },

  async deleteRegion(regionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/dashboard/regions/${regionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete region');
  },

  async getAlerts(level?: string, acknowledged?: boolean, limit?: number): Promise<Alert[]> {
    const url = new URL(`${API_BASE_URL}/dashboard/alerts`);
    if (level) url.searchParams.append('level', level);
    if (acknowledged !== undefined) url.searchParams.append('acknowledged', acknowledged.toString());
    if (limit) url.searchParams.append('limit', limit.toString());
    
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to fetch alerts');
    return response.json();
  },

  async acknowledgeAlert(alertId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/dashboard/alerts/${alertId}/acknowledge`, {
      method: 'PUT',
    });
    if (!response.ok) throw new Error('Failed to acknowledge alert');
  },

  async getHeatmapData(bounds: { north: number, south: number, east: number, west: number }, days?: number): Promise<HeatmapResponse> {
    const url = new URL(`${API_BASE_URL}/dashboard/heatmap`);
    url.searchParams.append('north', bounds.north.toString());
    url.searchParams.append('south', bounds.south.toString());
    url.searchParams.append('east', bounds.east.toString());
    url.searchParams.append('west', bounds.west.toString());
    if (days) url.searchParams.append('days', days.toString());

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to fetch heatmap data');
    return response.json();
  },

  async getActiveJobs(status?: 'PENDING' | 'IN_PROGRESS'): Promise<ActiveJob[]> {
    const url = new URL(`${API_BASE_URL}/dashboard/jobs`);
    if (status) url.searchParams.append('status', status);
    
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to fetch active jobs');
    return response.json();
  },

  async triggerAnalysis(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string,
    cloudCover: number
  ): Promise<{ message: string; jobId: string }> {
    const response = await fetch(`${API_BASE_URL}/sentinel/step-functions/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchParams: {
          latitude,
          longitude,
          startDate,
          endDate,
          cloudCover
        }
      }),
    });
    if (!response.ok) throw new Error('Failed to trigger analysis');
    return response.json();
  },

  // Alert subscription endpoints
  async getAlertSubscriptions(): Promise<AlertSubscriptionsResponse> {
    const response = await fetch(`${API_BASE_URL}/dashboard/alerts/subscriptions`);
    if (!response.ok) throw new Error('Failed to fetch alert subscriptions');
    return response.json();
  },

  async subscribeToAlerts(email: string): Promise<SubscribeResponse> {
    const response = await fetch(`${API_BASE_URL}/dashboard/alerts/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error('Failed to subscribe to alerts');
    return response.json();
  },

  async unsubscribeFromAlerts(email: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/dashboard/alerts/unsubscribe?email=${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to unsubscribe from alerts');
  }
}; 