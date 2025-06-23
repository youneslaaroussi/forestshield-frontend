'use client';

import { useState, useEffect, useRef } from 'react';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  service: string;
  message: string;
  metadata?: Record<string, any>;
}

const logTemplates = [
  { level: 'INFO', service: 'API', message: 'Region {region} analysis request received' },
  { level: 'INFO', service: 'Lambda', message: 'Processing satellite images for region {region}' },
  { level: 'INFO', service: 'StepFunction', message: 'Workflow execution started for region {region}' },
  { level: 'WARN', service: 'S3', message: 'High storage usage detected: {usage}% full' },
  { level: 'ERROR', service: 'SatelliteAPI', message: 'Failed to fetch images for region {region}: timeout' },
  { level: 'INFO', service: 'Database', message: 'Region {region} data updated successfully' },
  { level: 'DEBUG', service: 'Auth', message: 'User authentication successful' },
  { level: 'INFO', service: 'SNS', message: 'Alert notification sent for region {region}' },
  { level: 'WARN', service: 'Lambda', message: 'Memory usage approaching limit: {memory}MB' },
  { level: 'ERROR', service: 'Database', message: 'Connection timeout while updating region {region}' },
  { level: 'INFO', service: 'CloudWatch', message: 'Metrics updated for region {region}' },
  { level: 'DEBUG', service: 'API', message: 'Health check completed successfully' },
];

const regions = ['Amazon-North', 'Amazon-South', 'Cerrado-Central', 'Atlantic-Forest'];
const services = ['API', 'Lambda', 'StepFunction', 'S3', 'Database', 'SNS', 'CloudWatch', 'SatelliteAPI'];

const generateLogEntry = (): LogEntry => {
  const template = logTemplates[Math.floor(Math.random() * logTemplates.length)];
  const region = regions[Math.floor(Math.random() * regions.length)];
  const usage = Math.floor(Math.random() * 40 + 60);
  const memory = Math.floor(Math.random() * 500 + 800);

  return {
    id: `log-${Date.now()}-${Math.random()}`,
    timestamp: new Date(),
    level: template.level as LogEntry['level'],
    service: template.service,
    message: template.message
      .replace('{region}', region)
      .replace('{usage}', usage.toString())
      .replace('{memory}', memory.toString()),
    metadata: {
      requestId: `req-${Math.random().toString(36).substr(2, 9)}`,
      executionTime: Math.floor(Math.random() * 1000 + 100),
    }
  };
};

export default function LogsPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Generate initial logs
  useEffect(() => {
    const initialLogs = Array.from({ length: 15 }, () => {
      const log = generateLogEntry();
      log.timestamp = new Date(Date.now() - Math.random() * 3600000); // Random time in last hour
      return log;
    });
    setLogs(initialLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
  }, []);

  // Generate new logs periodically
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const newLog = generateLogEntry();
      setLogs(prev => [newLog, ...prev.slice(0, 99)]); // Keep only 100 logs
    }, Math.random() * 3000 + 1000); // Random interval between 1-4 seconds

    return () => clearInterval(interval);
  }, [isLive]);

  // Filter logs
  useEffect(() => {
    let filtered = logs;

    if (levelFilter !== 'ALL') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    if (serviceFilter !== 'ALL') {
      filtered = filtered.filter(log => log.service === serviceFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.service.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [logs, levelFilter, serviceFilter, searchTerm]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isAutoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, isAutoScroll]);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'DEBUG': return 'text-gray-500 bg-gray-50';
      case 'INFO': return 'text-blue-600 bg-blue-50';
      case 'WARN': return 'text-yellow-600 bg-yellow-50';
      case 'ERROR': return 'text-red-600 bg-red-50';
      case 'FATAL': return 'text-red-800 bg-red-100';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'DEBUG': return '🔍';
      case 'INFO': return 'ℹ️';
      case 'WARN': return '⚠️';
      case 'ERROR': return '❌';
      case 'FATAL': return '💀';
      default: return '📝';
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with controls */}
      <div className="p-4 border-b bg-gray-50 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">System Logs</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAutoScroll(!isAutoScroll)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${isAutoScroll
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              Auto-scroll
            </button>
            <button
              onClick={clearLogs}
              className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${isLive
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              {isLive ? 'Live' : 'Paused'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col items-center gap-3 text-xs">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2 w-full">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Levels</option>
              <option value="DEBUG">Debug</option>
              <option value="INFO">Info</option>
              <option value="WARN">Warning</option>
              <option value="ERROR">Error</option>
              <option value="FATAL">Fatal</option>
            </select>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Services</option>
              {services.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs list */}
      <div className="flex-1 overflow-y-auto font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2">📝</div>
              <p className="text-sm">No logs match your filters</p>
            </div>
          </div>
        ) : (
          <div>
            {filteredLogs.map((log, index) => (
              <div
                key={log.id}
                className={`border-b border-gray-100 p-2 hover:bg-gray-50 transition-colors animate-in slide-in-from-top duration-200 ${index === 0 ? 'bg-blue-50/50' : ''
                  }`}
                style={{ animationDelay: `${index * 20}ms` }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-gray-400 text-xs font-mono flex-shrink-0 w-16">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getLevelColor(log.level)}`}>
                    {log.level}
                  </span>
                  <span className="text-gray-600 font-medium flex-shrink-0 w-20 truncate">
                    {log.service}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 break-words">{log.message}</p>
                    {log.metadata && (
                      <div className="text-gray-500 text-xs mt-1">
                        ID: {log.metadata.requestId} • {log.metadata.executionTime}ms
                      </div>
                    )}
                  </div>
                  <span className="text-sm flex-shrink-0">{getLevelIcon(log.level)}</span>
                </div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="p-2 border-t bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
        <span>Showing {filteredLogs.length} of {logs.length} logs</span>
        <span>Updated {logs.length > 0 ? formatTimestamp(logs[0].timestamp) : 'never'}</span>
      </div>
    </div>
  );
} 