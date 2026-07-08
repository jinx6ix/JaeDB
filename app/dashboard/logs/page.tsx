'use client';
import { useEffect, useState, useRef } from 'react';
import SearchInput from '@/components/SearchInput';

interface LogEntry {
  id: string;
  level: string;
  message: string;
  context: string | null;
  userId: string | null;
  userEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const levelStyles: Record<string, { bg: string; text: string; badge: string; icon: string }> = {
  ERROR: { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-700 border border-red-200', icon: '⛔' },
  WARN: { bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700 border border-yellow-200', icon: '⚠️' },
  INFO: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700 border border-blue-200', icon: 'ℹ️' },
  DEBUG: { bg: 'bg-gray-50', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-600 border border-gray-200', icon: '🔍' },
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-KE', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function formatFullTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-KE', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function ContextViewer({ context }: { context: string | null }) {
  if (!context) return null;

  let parsed: any = null;
  try { parsed = JSON.parse(context); } catch { parsed = { raw: context }; }

  return (
    <div className="mt-2">
      <p className="text-xs font-bold text-gray-500 uppercase mb-1">Context Data</p>
      <div className="overflow-auto max-h-64 scrollbar-thin">
        <pre className="p-3 bg-[#1e1e1e] text-green-400 rounded-lg text-xs leading-relaxed whitespace-pre-wrap break-all">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function LogDetailPanel({ log, onClose }: { log: LogEntry; onClose: () => void }) {
  const style = levelStyles[log.level] || levelStyles.INFO;
  const parsedContext = log.context ? (() => {
    try { return JSON.parse(log.context); } catch { return null; }
  })() : null;

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-lg text-sm font-bold ${style.badge}`}>{style.icon} {log.level}</span>
          <span className="text-sm text-gray-500">Log Details</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 transition-colors">×</button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase">Timestamp</p>
          <p className="text-sm font-mono text-gray-800 mt-1">{formatFullTime(log.createdAt)}</p>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-500 uppercase">Message</p>
          <p className={`text-sm font-mono mt-1 p-3 rounded-lg border ${style.bg}`}>{log.message}</p>
        </div>

        {log.userEmail && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">User</p>
            <p className="text-sm text-gray-800 mt-1">{log.userEmail}</p>
          </div>
        )}

        {log.ipAddress && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">IP Address</p>
            <p className="text-sm font-mono text-gray-800 mt-1">{log.ipAddress}</p>
          </div>
        )}

        {log.userAgent && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">User Agent</p>
            <p className="text-xs text-gray-600 mt-1 break-all">{log.userAgent}</p>
          </div>
        )}

        {log.context && <ContextViewer context={log.context} />}

        <div>
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Raw JSON</p>
          <div className="overflow-auto max-h-48 scrollbar-thin">
            <pre className="p-3 bg-gray-100 rounded text-xs text-gray-600 whitespace-pre-wrap break-all">
              {JSON.stringify({
                id: log.id,
                level: log.level,
                message: log.message,
                context: parsedContext,
                userId: log.userId,
                userEmail: log.userEmail,
                ipAddress: log.ipAddress,
                userAgent: log.userAgent,
                createdAt: log.createdAt,
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [levelFilter, setLevelFilter] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [connected, setConnected] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  // Persist a live-filter of SSE-pushed rows so the dropdown doesn't disappear
  // every time we hit the API. The text filter is applied to the in-memory list
  // and to whatever the API returns.
  const bottomRef = useRef<HTMLDivElement>(null);
  const logsScrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchLogs = async (reset = false) => {
    try {
      const params = new URLSearchParams();
      if (levelFilter) params.set('level', levelFilter);
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (reset) params.set('offset', '0');
      params.set('limit', '200');

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      setLogs(reset ? data.logs : prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const newLogs = data.logs.filter((l: LogEntry) => !existingIds.has(l.id));
        return [...prev, ...newLogs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      });
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce the text query — only re-fetch when the user has paused typing for 250ms.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    fetchLogs(true);
  }, [levelFilter, debouncedQuery]);

  useEffect(() => {
    const es = new EventSource('/api/logs/stream');
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
          setConnected(true);
        } else if (data.type === 'logs') {
          setLogs(prev => {
            const existingIds = new Set(prev.map(l => l.id));
            const newLogs = data.logs.filter((l: LogEntry) => !existingIds.has(l.id));
            if (newLogs.length === 0) return prev;
            return [...prev, ...newLogs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          });
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (autoScroll && logsScrollRef.current && bottomRef.current) {
      logsScrollRef.current.scrollTop = logsScrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleClearLogs = async () => {
    if (!confirm('Delete all logs? This cannot be undone.')) return;
    const res = await fetch('/api/logs', { method: 'DELETE' });
    if (res.ok) {
      setLogs([]);
      setTotal(0);
      setSelectedLog(null);
    }
  };

  const handleClearOld = async (daysOld: number) => {
    if (!confirm(`Delete logs older than ${daysOld} days?`)) return;
    const before = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch(`/api/logs?before=${before}`, { method: 'DELETE' });
    if (res.ok) {
      fetchLogs(true);
      setSelectedLog(null);
    }
  };

  const errorCount = logs.filter(l => l.level === 'ERROR').length;
  const warnCount = logs.filter(l => l.level === 'WARN').length;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Fixed Header - does not scroll with content */}
      <div className="shrink-0 bg-white border-b shadow-sm z-20">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Application Logs</h1>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={connected ? 'Live' : 'Disconnected'} />
            <span className="text-sm text-gray-500">{total} total</span>
            {errorCount > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">{errorCount} errors</span>}
            {warnCount > 0 && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">{warnCount} warnings</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search message, email, context…"
              widthClass="w-72"
            />
            <select value={levelFilter} onChange={e => { setLevelFilter(e.target.value); setLoading(true); }} className="input text-sm">
              <option value="">All Levels</option>
              <option value="ERROR">ERROR</option>
              <option value="WARN">WARN</option>
              <option value="INFO">INFO</option>
              <option value="DEBUG">DEBUG</option>
            </select>
            <label className="flex items-center gap-1 text-sm text-gray-600">
              <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="rounded" />
              Auto-scroll
            </label>
            <button onClick={() => fetchLogs(true)} className="btn-secondary text-sm">↻ Refresh</button>
            <div className="relative group">
              <button className="btn-danger text-sm">🗑 Clear</button>
              <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-40">
                <button onClick={handleClearLogs} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600">Delete all logs</button>
                <button onClick={() => handleClearOld(1)} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Older than 1 day</button>
                <button onClick={() => handleClearOld(7)} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Older than 7 days</button>
                <button onClick={() => handleClearOld(30)} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Older than 30 days</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel - Log List (scrolls independently) */}
        <div
          ref={logsScrollRef}
          className="flex-1 overflow-y-auto bg-gray-50 scrollbar-thin"
        >
          {loading && logs.length === 0 ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p>No logs yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b shadow-sm z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-24">Time</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-16">Level</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-40">User</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => {
                  const style = levelStyles[log.level] || levelStyles.INFO;
                  const isSelected = selectedLog?.id === log.id;
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(isSelected ? null : log)}
                      className={`${style.bg} hover:shadow-md transition-all cursor-pointer ${isSelected ? 'ring-2 ring-orange-400 ring-inset' : ''}`}
                    >
                      <td className="px-3 py-2 text-xs text-gray-500 font-mono whitespace-nowrap">{formatTime(log.createdAt)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${style.badge}`}>{log.level}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap truncate max-w-40">
                        {log.userEmail || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <p className={`font-mono text-sm truncate max-w-md ${style.text}`} title={log.message}>{log.message}</p>
                        {selectedLog?.id !== log.id && log.context && (
                          <p className="text-xs text-gray-400 mt-0.5">📎 Has context</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div ref={bottomRef} className="h-px" />
        </div>

        {/* Right Panel - Detail View (scrolls independently) */}
        <div className="w-[420px] shrink-0">
          {selectedLog ? (
            <LogDetailPanel log={selectedLog} onClose={() => setSelectedLog(null)} />
          ) : (
            <div className="h-full bg-white rounded-lg border shadow-sm flex flex-col items-center justify-center text-gray-400 m-3">
              <p className="text-4xl mb-3">👆</p>
              <p className="text-sm">Select a log entry to view details</p>
              <p className="text-xs mt-1">Context and full data will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}