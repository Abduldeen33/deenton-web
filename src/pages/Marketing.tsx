import { useEffect, useState, type FormEvent } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

const emptyCampaign = { name: '', subject: '', htmlBody: '<h2>Hello {{firstName}},</h2><p>We would love to welcome you back to {{propertyName}}.</p>', audience: 'ALL_GUESTS', scheduledAt: '' };

const audienceLabel: Record<string, string> = {
  ALL_GUESTS: 'All subscribed guests',
  PAST_GUESTS: 'Past guests',
  UPCOMING_GUESTS: 'Guests with upcoming reservations',
};

export default function Marketing() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [form, setForm] = useState(emptyCampaign);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try { setCampaigns((await api.get('/marketing/campaigns')).data); }
    catch { setMessage('Could not load marketing campaigns.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const createCampaign = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setMessage('');
    try {
      await api.post('/marketing/campaigns', { ...form, scheduledAt: form.scheduledAt || undefined });
      setForm(emptyCampaign); setMessage('Campaign saved.'); await load();
    } catch (error: any) { setMessage(error.response?.data?.message || 'Could not save the campaign.'); }
    finally { setSaving(false); }
  };

  const sendNow = async (campaign: any) => {
    if (!window.confirm(`Send “${campaign.name}” now to its selected audience? This cannot be undone.`)) return;
    setMessage('');
    try {
      const result = (await api.post(`/marketing/campaigns/${campaign.id}/send`)).data;
      setMessage(`Campaign processed: ${result.sent ?? 0} sent, ${result.failed ?? 0} failed.`); await load();
    } catch (error: any) { setMessage(error.response?.data?.message || 'Campaign could not be sent.'); }
  };

  return <Layout><div className="p-6 max-w-6xl mx-auto">
    <div className="mb-6"><h2 className="text-2xl font-bold text-slate-800">Automated Marketing</h2><p className="text-slate-500 text-sm mt-1">Create email campaigns for subscribed guests. Scheduled campaigns send automatically while the backend is running.</p></div>
    {message && <div className="mb-5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">{message}</div>}
    <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
      <form onSubmit={createCampaign} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 h-fit">
        <div><h3 className="font-semibold text-slate-800">New email campaign</h3><p className="text-xs text-slate-400 mt-1">Use {'{{firstName}}'}, {'{{lastName}}'}, and {'{{propertyName}}'} to personalize messages.</p></div>
        <label className="block text-sm font-medium text-slate-700">Campaign name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Weekend return offer" /></label>
        <label className="block text-sm font-medium text-slate-700">Audience<select value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">{Object.entries(audienceLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="block text-sm font-medium text-slate-700">Email subject<input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="A special offer from {{propertyName}}" /></label>
        <label className="block text-sm font-medium text-slate-700">Email content (HTML supported)<textarea required rows={8} value={form.htmlBody} onChange={e => setForm({ ...form, htmlBody: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" /></label>
        <label className="block text-sm font-medium text-slate-700">Schedule for later <span className="font-normal text-slate-400">(optional)</span><input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <button disabled={saving} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : form.scheduledAt ? 'Schedule campaign' : 'Save draft'}</button>
      </form>
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-semibold text-slate-800">Campaigns</h3><p className="text-xs text-slate-400 mt-1">Only guests with a valid email and marketing consent are included.</p></div>
        {loading ? <p className="p-6 text-sm text-slate-400">Loading campaigns…</p> : campaigns.length === 0 ? <p className="p-10 text-center text-sm text-slate-400">No campaigns yet. Create your first one on the left.</p> : <div className="divide-y divide-slate-100">{campaigns.map(campaign => <div key={campaign.id} className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="font-semibold text-slate-800">{campaign.name}</p><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${campaign.status === 'SENT' ? 'bg-emerald-100 text-emerald-700' : campaign.status === 'SCHEDULED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{campaign.status}</span></div><p className="mt-1 text-sm text-slate-500">{campaign.subject}</p><p className="mt-1 text-xs text-slate-400">{audienceLabel[campaign.audience]} · {campaign._count?.deliveries || 0} delivery records{campaign.scheduledAt ? ` · scheduled ${new Date(campaign.scheduledAt).toLocaleString()}` : ''}</p></div>{campaign.status !== 'SENT' && <button onClick={() => void sendNow(campaign)} className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">Send now</button>}</div>)}</div>}
      </section>
    </div>
  </div></Layout>;
}
