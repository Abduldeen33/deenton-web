import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/client';
import { stationsFor, type Ticket } from '../api/pos';
import { getToken, getUser } from '../store/auth';
import { can } from '../store/permissions';

const QueueContext = createContext<{ tickets: Ticket[]; loading: boolean; error: string; refresh: () => void }>({ tickets: [], loading: true, error: '', refresh: () => {} });
export const usePosQueue = () => useContext(QueueContext);

export default function PosQueueProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const user = getUser();
  const active = !!getToken() && can('view_pos_queue') && stationsFor(user?.role || '').length > 0 &&
    !/^\/(login|menu|book|my-reservation)(\/|$)/.test(pathname);
  const soundAllowed = active && ['KITCHEN', 'RESTAURANT'].includes(user?.role || '');
  const identity = active ? `${user?.id}:${user?.propertyCode}:${user?.role}` : '';
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sound, setSound] = useState(false);
  const [soundError, setSoundError] = useState('');
  const [revision, setRevision] = useState(0);
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => {
    setTickets([]); setError(''); setLoading(!!identity);
    if (!identity) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = await api.get<Ticket[]>('/pos/queue', { signal: controller.signal, timeout: 12000 });
        if (!controller.signal.aborted) { setTickets(result.data); setError(''); }
      } catch {
        if (!controller.signal.aborted) setError('Order alerts disconnected. Retrying…');
      } finally {
        if (!controller.signal.aborted) { setLoading(false); timer = setTimeout(poll, 5000); }
      }
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [identity, revision]);

  useEffect(() => {
    setSound(false); setSoundError('');
    return () => { void audio.current?.close(); audio.current = null; };
  }, [identity, soundAllowed]);

  function beep() {
    if (!soundAllowed || !can('view_pos_queue') || !['KITCHEN', 'RESTAURANT'].includes(getUser()?.role || '')) return;
    const context = audio.current;
    if (!context || context.state !== 'running') {
      setSound(false); setSoundError('Sound paused by your browser. Enable it again.'); return;
    }
    [0, 0.25, 0.5].forEach(delay => {
      const oscillator = context.createOscillator(); const gain = context.createGain();
      const start = context.currentTime + delay;
      oscillator.frequency.value = 880; gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.14, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.19);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(start); oscillator.stop(start + 0.2);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }
  const pendingIds = tickets.filter(t => t.status === 'NEW' || (user?.role === 'RESTAURANT' && t.status === 'READY')).map(t => t.id).join(',');
  useEffect(() => {
    if (!sound || !pendingIds || !soundAllowed) return;
    beep(); const timer = setInterval(beep, 15000);
    return () => clearInterval(timer);
  }, [sound, pendingIds, soundAllowed]);
  async function toggleSound() {
    if (!soundAllowed) return;
    if (sound) { setSound(false); return; }
    try {
      audio.current ||= new AudioContext();
      await audio.current.resume(); setSound(true); setSoundError(''); beep();
    } catch { setSound(false); setSoundError('This browser cannot play alerts. Check the queue on screen.'); }
  }
  return <QueueContext.Provider value={{ tickets, loading, error, refresh: () => setRevision(v => v + 1) }}>
    {children}
    {active && <div className={`fixed ${pathname === '/pos' ? 'bottom-20' : 'bottom-3'} right-3 z-40 max-w-sm rounded-lg border border-indigo-200 bg-white p-3 text-xs text-slate-700 shadow-lg`} aria-live="polite">
      <div className="flex items-center gap-3"><Link to="/pos-queues" className="font-semibold text-indigo-700">Order queues · {tickets.filter(t => t.status === 'NEW').length} new</Link>
        {soundAllowed && <button onClick={() => void toggleSound()} className="rounded border px-2 py-1">{sound ? 'Mute alerts' : 'Enable sound'}</button>}</div>
      {tickets.some(t => t.status === 'READY') && <p className="mt-2 font-semibold text-green-700">{tickets.filter(t => t.status === 'READY').length} ready to serve</p>}
      {error && <p className="mt-2 text-red-700">{error}</p>}
      {soundAllowed && soundError && <p className="mt-2 text-amber-700">{soundError}</p>}
      {soundAllowed && !sound && <p className="mt-1 text-slate-500">Keep this page open and enable sound for alarms.</p>}
    </div>}
  </QueueContext.Provider>;
}
