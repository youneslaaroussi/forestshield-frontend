'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { RefreshCw, Mail, Check, X, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useAlertSubscriptions } from '../hooks/useAlertSubscriptions';

interface SettingsPanelProps {
  onError?: (error: string) => void;
}

export default function SettingsPanel({ onError }: SettingsPanelProps) {
  const [newEmail, setNewEmail] = useState('');
  const {
    subscriptions,
    loading,
    error,
    refreshing,
    subscribing,
    unsubscribing,
    subscribe,
    unsubscribe,
    refresh,
    clearError
  } = useAlertSubscriptions();

  // Handle errors from the hook
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  const handleRefresh = async () => {
    await refresh();
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      await subscribe(newEmail);
      setNewEmail('');
      clearError(); // Clear any previous errors
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to subscribe email');
    }
  };

  const handleUnsubscribe = async (email: string) => {
    if (!confirm(`Are you sure you want to unsubscribe ${email}?`)) {
      return;
    }

    try {
      await unsubscribe(email);
      clearError(); // Clear any previous errors
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to unsubscribe email');
    }
  };

  const isVerified = (status: string) => status === 'Confirmed';

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return { label: 'Verified', className: 'verified' };
      case 'PendingConfirmation':
        return { label: 'Pending', className: 'pending' };
      default:
        return { label: 'Unknown', className: 'error' };
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-shrink-0 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        </div>
        <div className="flex-1 p-4 pt-0">
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded animate-pulse"></div>
            <div className="h-20 bg-gray-100 rounded animate-pulse"></div>
            <div className="h-20 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-4 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

              {/* Subscribe Form - Fixed */}
        <div className="flex-shrink-0 p-4">
          <Card className="p-4 border-info">
          <form onSubmit={handleSubscribe} className="space-y-4">
            <div>
              <Label htmlFor="email">Subscribe to Alert Notifications</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={subscribing}
                  className="flex-1"
                />
                <Button type="submit" disabled={subscribing || !newEmail.trim()}>
                  <Plus className="w-4 h-4 mr-2" />
                  {subscribing ? 'Adding...' : 'Subscribe'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>

      {/* Subscriptions List - Scrollable */}
      <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
        <div className="flex-shrink-0 mb-3">
          <h4 className="text-sm font-medium text-gray-700">
            Active Subscriptions ({subscriptions.length})
          </h4>
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
          <div className="space-y-3 pr-1">
            {subscriptions.length === 0 ? (
              <Card className="p-6 text-center">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No email subscriptions</p>
                <p className="text-sm text-gray-500 mt-1">
                  Add an email address above to receive forest alert notifications
                </p>
              </Card>
            ) : (
              subscriptions.map((subscription) => {
                const statusInfo = getStatusDisplay(subscription.status);
                const verified = isVerified(subscription.status);
                
                return (
                  <Card 
                    key={subscription.email} 
                    className={`p-4 ${verified ? 'border-success' : 'border-warning'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900 truncate">{subscription.email}</span>
                          <div className={`status-badge ${statusInfo.className} flex-shrink-0`}>
                            {verified ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            {statusInfo.label}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                          <p>Status: {subscription.status}</p>
                          <p>Subscription ARN: {subscription.subscriptionArn.split(':').pop()}</p>
                          {!verified && (
                            <p className="text-yellow-600">Please check your email to confirm subscription</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <Button
                          onClick={() => handleUnsubscribe(subscription.email)}
                          variant="outline"
                          size="sm"
                          disabled={unsubscribing === subscription.email}
                        >
                          {unsubscribing === subscription.email ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-600" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 