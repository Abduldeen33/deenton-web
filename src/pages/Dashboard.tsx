import { useEffect, useState } from 'react';
import { getDashboard } from '../api/reports';
import Layout from '../components/Layout';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Front Desk Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Arrivals Today" value={data?.arrivalsToday ?? 0} color="blue" />
          <StatCard label="Departures" value={data?.departuresToday ?? 0} color="orange" />
          <StatCard label="In House" value={data?.inHouse ?? 0} color="green" />
          <StatCard label="Occupied" value={data?.occupancy.occupied ?? 0} color="green" />
          <StatCard label="Vacant" value={data?.occupancy.vacant ?? 0} color="slate" />
          <StatCard label="Dirty Rooms" value={data?.occupancy.dirty ?? 0} color="red" />
        </div>

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

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-white">Room Occupancy</h3>
            <span className="text-2xl font-bold text-blue-400">
              {data?.occupancy.occupancyRate}
            </span>
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
      </div>
    </Layout>
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