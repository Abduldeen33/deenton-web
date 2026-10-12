import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getGrowthSummary, getGrowthRoadmap } from '../api/growth';

type GrowthItem = {
  id: string;
  title: string;
  summary: string;
  status: 'Planned' | 'In Design' | 'Ready for Build';
};

const statusClasses: Record<string, string> = {
  Planned: 'bg-slate-100 text-slate-700 border-slate-200',
  'In Design': 'bg-amber-100 text-amber-700 border-amber-200',
  'Ready for Build': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export default function Growth() {
  const navigate = useNavigate();
  const [items, setItems] = useState<GrowthItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getGrowthRoadmap(), getGrowthSummary()])
      .then(([roadmap, summaryData]) => {
        setItems(roadmap);
        setSummary(summaryData);
      })
      .catch((error) => {
        console.error('Growth data failed to load', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Phase 4 — Growth</h2>
          <p className="mt-1 text-sm text-slate-500">Direct revenue, guest retention, and distribution expansion.</p>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading growth modules...</p>
        ) : (
          <>
            {summary && (
              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Total initiatives</p>
                  <p className="mt-2 text-3xl font-bold text-slate-800">{summary.total}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Ready</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-600">{summary.ready}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">In design</p>
                  <p className="mt-2 text-3xl font-bold text-amber-600">{summary.inDesign}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Planned</p>
                  <p className="mt-2 text-3xl font-bold text-slate-800">{summary.planned}</p>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/growth/${item.id}`)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-600">{item.id.replace(/-/g, ' ')}</p>
                      <h3 className="mt-1 text-xl font-bold text-slate-800">{item.title}</h3>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusClasses[item.status]}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.summary}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
