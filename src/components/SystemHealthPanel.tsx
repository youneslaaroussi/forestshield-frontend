'use client';

import { useState, useEffect } from 'react';

interface HealthMetric {
  id: string;
  name: string;
  value: string | number;
  unit?: string;
  status: 'healthy' | 'warning' | 'critical';
  description: string;
  trend?: 'up' | 'down' | 'stable';
}

interface ServiceStatus {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  responseTime: number;
  uptime: string;
}

interface LambdaFunction {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  invocations: number;
  duration: number;
  memory: number;
  errors: number;
  sparklineData: number[];
}

const generateRandomLatency = () => Math.round(50 + Math.random() * 200);
const generateRandomUptime = () => `${(99.5 + Math.random() * 0.5).toFixed(2)}%`;
const generateSparklineData = () => Array.from({ length: 20 }, () => Math.random() * 100);

// Tiny Lambda sparkline component
const LambdaSparkline = ({ data, color = '#3b82f6' }: { data: number[]; color?: string }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 60; // 60px wide
    const y = 20 - (d / max) * 15; // 20px high, 15px for data
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="60" height="20" className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default function SystemHealthPanel() {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([
    {
      id: 'api-latency',
      name: 'API Latency',
      value: generateRandomLatency(),
      unit: 'ms',
      status: 'healthy',
      description: 'Average response time for API calls',
      trend: 'stable'
    },
    {
      id: 'error-rate',
      name: 'Error Rate',
      value: 0.2,
      unit: '%',
      status: 'healthy',
      description: 'Percentage of failed requests',
      trend: 'down'
    },
    {
      id: 'queue-length',
      name: 'Job Queue',
      value: 3,
      unit: 'jobs',
      status: 'healthy',
      description: 'Pending analysis jobs in queue',
      trend: 'stable'
    },
    {
      id: 'disk-usage',
      name: 'Storage',
      value: 67,
      unit: '%',
      status: 'warning',
      description: 'S3 bucket usage percentage',
      trend: 'up'
    }
  ]);

  const [lambdaFunctions, setLambdaFunctions] = useState<LambdaFunction[]>([
    { 
      name: 'satellite-processor', 
      status: 'healthy', 
      invocations: 245, 
      duration: 1234, 
      memory: 512, 
      errors: 0,
      sparklineData: generateSparklineData()
    },
    { 
      name: 'deforestation-analyzer', 
      status: 'healthy', 
      invocations: 89, 
      duration: 2567, 
      memory: 1024, 
      errors: 2,
      sparklineData: generateSparklineData()
    },
    { 
      name: 'alert-processor', 
      status: 'warning', 
      invocations: 34, 
      duration: 456, 
      memory: 256, 
      errors: 1,
      sparklineData: generateSparklineData()
    },
    { 
      name: 'region-updater', 
      status: 'healthy', 
      invocations: 12, 
      duration: 789, 
      memory: 512, 
      errors: 0,
      sparklineData: generateSparklineData()
    }
  ]);

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setHealthMetrics(prev => prev.map(metric => {
        let newValue = metric.value;
        let newStatus = metric.status;
        let newTrend = metric.trend;

        switch (metric.id) {
          case 'api-latency':
            newValue = generateRandomLatency();
            newStatus = Number(newValue) > 200 ? 'warning' : Number(newValue) > 400 ? 'critical' : 'healthy';
            newTrend = Number(newValue) > Number(metric.value) ? 'up' : Number(newValue) < Number(metric.value) ? 'down' : 'stable';
            break;
          case 'error-rate':
            newValue = Math.max(0, Number(metric.value) + (Math.random() - 0.5) * 0.1);
            newValue = Math.round(Number(newValue) * 100) / 100;
            newStatus = Number(newValue) > 1 ? 'warning' : Number(newValue) > 3 ? 'critical' : 'healthy';
            break;
          case 'queue-length':
            newValue = Math.max(0, Number(metric.value) + Math.floor((Math.random() - 0.5) * 3));
            newStatus = Number(newValue) > 10 ? 'warning' : Number(newValue) > 20 ? 'critical' : 'healthy';
            break;
          case 'disk-usage':
            newValue = Math.min(100, Math.max(0, Number(metric.value) + (Math.random() - 0.5) * 2));
            newValue = Math.round(Number(newValue));
            newStatus = Number(newValue) > 80 ? 'warning' : Number(newValue) > 95 ? 'critical' : 'healthy';
            break;
        }

        return { ...metric, value: newValue, status: newStatus, trend: newTrend };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Update Lambda functions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLambdaFunctions(prev => prev.map(func => ({
        ...func,
        invocations: Math.max(0, func.invocations + Math.floor((Math.random() - 0.3) * 10)),
        duration: Math.max(100, func.duration + Math.floor((Math.random() - 0.5) * 200)),
        errors: Math.max(0, func.errors + (Math.random() > 0.9 ? 1 : Math.random() > 0.95 ? -1 : 0)),
        sparklineData: [...func.sparklineData.slice(1), Math.random() * 100],
        status: func.errors > 5 ? 'error' : func.duration > 3000 ? 'warning' : 'healthy'
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: 'healthy' | 'warning' | 'critical' | 'online' | 'degraded' | 'offline' | 'error') => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'warning':
      case 'degraded':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'critical':
      case 'offline':
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return '✓';
      case 'warning':
      case 'degraded':
        return '⚠';
      case 'critical':
      case 'offline':
      case 'error':
        return '✕';
      default:
        return '○';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable' | undefined) => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      case 'stable': return '→';
      default: return '';
    }
  };

  const getMetricColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return 'text-green-700';
      case 'warning': return 'text-orange-700';
      case 'critical': return 'text-red-700';
      default: return 'text-gray-700';
    }
  };

  const overallHealth = healthMetrics.every(m => m.status === 'healthy') && lambdaFunctions.every(f => f.status === 'healthy') ? 'healthy' : 
                      healthMetrics.some(m => m.status === 'critical') || lambdaFunctions.some(f => f.status === 'error') ? 'critical' : 'warning';

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-4 border-b bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
          <div className={`flex items-center gap-2 px-3 py-1.5 border-2 ${getStatusColor(overallHealth)}`}>
            <span className="font-bold">{getStatusIcon(overallHealth)}</span>
            <span className="capitalize font-semibold">{overallHealth}</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Performance Metrics */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500"></span>
            Performance Metrics
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {healthMetrics.map((metric) => (
              <div key={metric.id} className="bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 ${
                      metric.status === 'healthy' ? 'bg-green-500' : 
                      metric.status === 'warning' ? 'bg-orange-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700">{metric.name}</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-400">{getTrendIcon(metric.trend)}</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-2xl font-bold ${getMetricColor(metric.status)}`}>
                    {metric.value}
                  </span>
                  {metric.unit && <span className="text-sm text-gray-500 font-medium">{metric.unit}</span>}
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{metric.description}</p>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold ${
                    metric.status === 'healthy' ? 'bg-green-100 text-green-800' :
                    metric.status === 'warning' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {metric.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lambda Functions Health */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-purple-500"></span>
            AWS Lambda Functions
          </h4>
          <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
            {lambdaFunctions.map((func, index) => (
              <div key={func.name} className={`p-4 hover:bg-gray-50 transition-colors ${
                index !== lambdaFunctions.length - 1 ? 'border-b border-gray-100' : ''
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 ${
                      func.status === 'healthy' ? 'bg-green-500' :
                      func.status === 'warning' ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-semibold text-gray-900">{func.name}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold ${getStatusColor(func.status)}`}>
                      {func.status.toUpperCase()}
                    </span>
                  </div>
                  <LambdaSparkline 
                    data={func.sparklineData} 
                    color={func.status === 'healthy' ? '#10b981' : func.status === 'warning' ? '#f59e0b' : '#ef4444'} 
                  />
                </div>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">Invocations</span>
                    <div className="font-semibold text-gray-900">{func.invocations}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration</span>
                    <div className="font-semibold text-gray-900">{func.duration}ms</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Memory</span>
                    <div className="font-semibold text-gray-900">{func.memory}MB</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Errors</span>
                    <div className={`font-semibold ${func.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>{func.errors}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Infrastructure Status */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-teal-500"></span>
            Infrastructure
          </h4>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-lg font-bold">🌐</span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Network Connection</span>
                    <div className="text-xs text-gray-500 mt-0.5">Global connectivity status</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-green-700 font-semibold">CONNECTED</div>
                  <div className="text-xs text-gray-500 mt-0.5">99.9% uptime</div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 flex items-center justify-center">
                    <span className="text-orange-600 text-lg font-bold">📡</span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">AWS Region</span>
                    <div className="text-xs text-gray-500 mt-0.5">Primary deployment region</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-700 font-semibold">US-EAST-1</div>
                  <div className="text-xs text-gray-500 mt-0.5">N. Virginia</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 