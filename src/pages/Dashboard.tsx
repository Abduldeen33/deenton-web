import { useEffect, useState } from 'react';
import { getDashboard } from '../api/reports';
import type { DashboardSummary } from '../types';
import { getUser, clearAuth } from '../store/auth';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();
  const navigate = useNavigate();

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Deenton</h1>
            <p className="text-slate-400 text-sm">{user?.propertyName}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-400">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Front Desk Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Arrivals Today" value={data?.arrivalsToday ?? 0} color="blue" />
          <StatCard label="Departures" value={data?.departuresToday ?? 0} color="orange" />
          <StatCard label="In House" value={data?.inHouse ?? 0} color="green" />
          <StatCard label="Occupied" value={data?.occupancy.occupied ?? 0} color="green" />
          <StatCard label="Vacant" value={data?.occupancy.vacant ?? 0} color="slate" />
          <StatCard label="Dirty Rooms" value={data?.occupancy.dirty ?? 0} color="red" />
        </div>

        {/* Revenue and Occupancy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Today's Revenue</p>
            <p className="text-3xl font-bold text-green-400">
              ${data?.todayRevenue.toLocaleString() ?? '0'}
            </p>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Outstanding Balance</p>
            <p className="text-3xl font-bold text-red-400">
              ${data?.outstandingBalance.toLocaleString() ?? '0'}
            </p>
          </div>
        </div>

        {/* Occupancy Bar */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Room Occupancy</h3>
            <span className="text-2xl font-bold text-blue-400">{data?.occupancy.occupancyRate}</span>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{data?.occupancy.totalRooms}</p>
              <p className="text-slate-400 text-xs">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{data?.occupancy.occupied}</p>
              <p className="text-slate-400 text-xs">Occupied</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-400">{data?.occupancy.vacant}</p>
              <p className="text-slate-400 text-xs">Vacant</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">{data?.occupancy.reserved}</p>
              <p className="text-slate-400 text-xs">Reserved</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: any = {
    blue: 'text-blue-400',
    orange: 'text-orange-400',
    green: 'text-green-400',
    red: 'text-red-400',
    slate: 'text-slate-300',
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <p className={`text-3xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-slate-400 text-xs mt-1">{label}</p>
    </div>
  );
}