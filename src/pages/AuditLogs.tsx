import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

const moduleColors: any = {
  RESERVATIONS: 'bg-blue-900 border-blue-700 text-blue-300',
  BILLING: 'bg-green-900 border-green-700 text-green-300',
  HOUSEKEEPING: 'bg-yellow-900 border-yellow-700 text-yellow-300',
  MAINTENANCE: 'bg-orange-900 border-orange-700 text-orange-300',
  STAFF: 'bg-purple-900 border-purple-700 text-purple-300',
  GUESTS: 'bg-cyan-900 border-cyan-700 text-cyan-300',
  NIGHT_AUDIT: 'bg-slate-700 border-slate-600 text-slate-300',
  EXPENSES: 'bg-red-900 border-red-700 text-red-300',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = (module?: string) => {
    setLoading(true);
    api.get('/audit-logs', { params: module ? { module } : {} })
      .then((res) => setLogs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleFilter = (module: string) => {
    setFilter(module);
    load(module || undefined);
  };

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const modules = ['', 'RESERVATIONS', 'BILLING', 'HOUSEKEEPING', 'MAINTENANCE', 'STAFF', 'GUESTS', 'NIGHT_AUDIT', 'EXPENSES'];

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Audit Logs</h2>
          <p className="text-slate-400 text-sm mt-1">Track all system activity</p>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {modules.map((module) => (
            <button
              key={module}
              onClick={() => handleFilter(module)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === module
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {module === '' ? 'All' : module.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : logs.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
            <p className="text-slate-400">No activity logged yet</p>
            <p className="text-slate-500 text-sm mt-2">Actions will appear here as staff use the system</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded border text-xs font-medium shrink-0 ${moduleColors[log.module] || 'bg-slate-700 border-slate-600 text-slate-300'}`}>
                      {log.module?.replace('_', ' ')}
                    </span>
                    <div>
                      <p className="text-white text-sm font-medium">{log.action}</p>
                      <p className="text-slate-400 text-sm">{log.description}</p>
                      {log.userEmail && (
                        <p className="text-slate-500 text-xs mt-1">By: {log.userEmail}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs shrink-0">{formatDateTime(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}