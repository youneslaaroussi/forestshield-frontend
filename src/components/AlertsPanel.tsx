"use client";

import useSWR, { useSWRConfig } from 'swr';
import { api, Alert } from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { cn } from '../lib/utils';
import { Skeleton } from './ui/skeleton';

const alertConfig = {
  CRITICAL: { icon: ShieldAlert, color: 'text-red-600', bgColor: 'bg-red-50' },
  HIGH: { icon: ShieldAlert, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  MODERATE: { icon: ShieldQuestion, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  LOW: { icon: ShieldCheck, color: 'text-blue-600', bgColor: 'bg-blue-50' },
};

const fetcher = () => api.getAlerts(undefined, false); // Fetch only unacknowledged alerts

export default function AlertsPanel() {
  const { data: alerts, error, isLoading } = useSWR('alerts/unacknowledged', fetcher);
  const { mutate } = useSWRConfig();

  const handleAcknowledge = async (alertId: string) => {
    try {
      // Optimistically update the UI
      mutate('alerts/unacknowledged', (currentData: Alert[] | undefined) => 
        currentData?.filter(a => a.id !== alertId) ?? [], 
        false
      );
      await api.acknowledgeAlert(alertId);
      // Trigger a revalidation to get the latest state from the server
      mutate('alerts/unacknowledged');
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      // Optionally, show an error to the user
      // Revert optimistic update on failure
      mutate('alerts/unacknowledged');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-600">
        <AlertCircle className="w-12 h-12 mb-4" />
        <p className="text-lg font-semibold">Failed to load alerts</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <ShieldCheck className="w-12 h-12 mb-4 text-green-500" />
        <p className="text-lg font-semibold">All Clear</p>
        <p className="text-sm">No active alerts at the moment.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-2 space-y-2">
      {alerts.map((alert) => {
        const config = alertConfig[alert.level];
        const Icon = config.icon;
        return (
          <Card key={alert.id} className={cn("rounded-none shadow-sm border-l-4", 
            alert.level === 'CRITICAL' && 'border-red-500',
            alert.level === 'HIGH' && 'border-orange-500',
            alert.level === 'MODERATE' && 'border-yellow-500',
            alert.level === 'LOW' && 'border-blue-500',
          )}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <Icon className={cn("h-6 w-6 flex-shrink-0 mt-1", config.color)} />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{alert.regionName}</p>
                  <p className="text-sm text-gray-600">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-none self-center"
                  onClick={() => handleAcknowledge(alert.id)}
                >
                  Acknowledge
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 