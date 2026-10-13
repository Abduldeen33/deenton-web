import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/client';
import { posError, stationsFor, type Ticket } from '../api/pos';
import { getToken, getUser } from '../store/auth';
import { can } from '../store/permissions';
import PosReceipt, { type ReceiptTarget } from './PosReceipt';

type PrintAlert = ReceiptTarget & {orderNumber:string;guestName?:string;serviceLocation?:string};
const QueueContext = createContext<{ tickets: Ticket[]; loading: boolean; error: string; lastUpdated: number | null; refresh: () => void }>({ tickets: [], loading: true, error: '', lastUpdated: null, refresh: () => {} });
export const usePosQueue = () => useContext(QueueContext);

export default function PosQueueProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const user = getUser();
  const queueAllowed = can('view_pos_queue') && stationsFor(user?.role || '').length > 0;
  const printAllowed = ['ADMIN','SUPER_ADMIN','CEO','RESTAURANT','KITCHEN','BAR'].includes(user?.role || '');
  const active = !!getToken() && (queueAllowed || printAllowed) && !/^\/(login|menu|book|my-reservation)(\/|$)/.test(pathname);
  // Existing sound policy: Kitchen and Restaurant only; Bar has printable visual alerts.
  const soundAllowed = active && ['KITCHEN', 'RESTAURANT'].includes(user?.role || '');
  const identity = active ? `${user?.id}:${user?.propertyCode}:${user?.role}:${user?.accessLevel}` : '';
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [prints,setPrints] = useState<PrintAlert[]>([]),[hasMore,setHasMore] = useState(false),[printError,setPrintError] = useState('');
  const [printTarget,setPrintTarget] = useState<ReceiptTarget|null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [sound, setSound] = useState(false), [soundError, setSoundError] = useState('');
  const [revision, setRevision] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  useEffect(()=>{setTickets([]);setLastUpdated(null);setPrints([]);setPrintTarget(null);setHasMore(false);setError('');setPrintError('');},[identity]);
  useEffect(()=>{const refresh=()=>setRevision(v=>v+1);window.addEventListener('pos-ticket-printed',refresh);return()=>window.removeEventListener('pos-ticket-printed',refresh);},[]);
  useEffect(() => {
    setLoading(!!identity && queueAllowed);
    if (!identity) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      await Promise.all([
        queueAllowed ? api.get<Ticket[]>('/pos/queue',{signal:controller.signal,timeout:12000}).then(r=>{if(!controller.signal.aborted){
          if(!Array.isArray(r.data) || r.data.some(t=>!t || typeof t.id!=='string' || !['NEW','PREPARING','READY','DONE'].includes(t.status) || !['KITCHEN','BAR','FRONT_DESK'].includes(t.station) || !Number.isFinite(Date.parse(t.createdAt)) || !t.order || typeof t.order.id!=='string' || typeof t.order.orderNumber!=='string' || !Array.isArray(t.order.items) || t.order.items.some(i=>!i || typeof i.name!=='string' || !Number.isFinite(Number(i.quantity))))) {setError('Kitchen/order data could not be read. Refresh or ask an administrator to check the backend. Retrying…');return;}
          setTickets(r.data);setLastUpdated(Date.now());setError('');
        }}).catch(e=>{if(!controller.signal.aborted)setError(`Order alerts disconnected: ${posError(e)} Retrying…`);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);}) : Promise.resolve(),
        printAllowed ? api.get<{orders:PrintAlert[];hasMore:boolean}>('/pos/print-alerts',{signal:controller.signal,timeout:12000}).then(r=>{if(!controller.signal.aborted){
          if(!r.data || !Array.isArray(r.data.orders) || r.data.orders.some(p=>!p || typeof p.id!=='string' || typeof p.orderNumber!=='string' || !['RESTAURANT_TICKET','KITCHEN','BAR'].includes(p.copy))) {setPrintError('Print alert data could not be read. Check the backend update. Retrying…');return;}
          setPrints(r.data.orders);setHasMore(r.data.hasMore);setPrintError('');
        }}).catch(e=>{if(!controller.signal.aborted)setPrintError(`Print alerts disconnected: ${posError(e)} Retrying…`);}) : Promise.resolve(),
      ]);
      if (!controller.signal.aborted) {setLoading(false);timer=setTimeout(poll,5000);}
    }
    void poll();return()=>{controller.abort();clearTimeout(timer);};
  },[identity,revision,queueAllowed,printAllowed]);
  useEffect(() => {
    setSound(false); setSoundError('');
    return () => { void audio.current?.close(); audio.current = null; };
  }, [identity, soundAllowed]);
  function beep() {
    if (!soundAllowed || !['KITCHEN','RESTAURANT'].includes(getUser()?.role || '')) return;
    const context=audio.current;
    if (!context || context.state !== 'running') {setSound(false);setSoundError('Sound paused by your browser. Enable it again.');return;}
    [660,880,660].forEach((frequency,i)=>{
      const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+i*.23;
      oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.12,start+.03);gain.gain.exponentialRampToValueAtTime(.001,start+.2);
      oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+.21);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    });
  }
  const pendingIds=prints.map(p=>p.id+':'+p.copy).join(',');
  useEffect(()=>{if(!sound||!pendingIds||!soundAllowed)return;beep();const timer=setInterval(beep,2500);return()=>clearInterval(timer);},[sound,pendingIds,soundAllowed]);
  async function toggleSound() {
    if (!soundAllowed)return;
    if (sound){setSound(false);return;}
    try{audio.current ||= new AudioContext();await audio.current.resume();setSound(true);setSoundError('');}
    catch{setSound(false);setSoundError('This browser cannot play alerts. Check unprinted tickets on screen.');}
  }
  return <QueueContext.Provider value={{tickets,loading,error,lastUpdated,refresh:()=>setRevision(v=>v+1)}}>
    {children}
    {active && <div className={`fixed ${pathname==='/pos'?'bottom-20':'bottom-3'} right-3 z-40 max-w-[min(360px,calc(100vw-24px))] rounded-lg border border-indigo-200 bg-white p-3 text-xs text-slate-700 shadow-lg`} aria-live="polite">
      <div className="flex flex-wrap items-center gap-3"><Link to={queueAllowed?'/pos-queues':'/pos'} className="font-semibold text-indigo-700">{queueAllowed?`Order queues · ${tickets.filter(t=>t.status==='NEW').length} new`:'Restaurant order tickets'}</Link>{soundAllowed && <button onClick={()=>void toggleSound()} className="rounded border px-2 py-1">{sound?'Mute alerts':'Enable sound'}</button>}</div>
      {printAllowed && <details className="mt-2" open={prints.length>0}><summary className="cursor-pointer font-semibold">Unprinted tickets: {prints.length}{hasMore?' +':''}</summary><div className="mt-2 max-h-36 space-y-2 overflow-auto">{prints.map(p=><div key={p.id+':'+p.copy} className="flex items-center justify-between gap-2"><span>{p.orderNumber}<small className="block">{p.serviceLocation||p.guestName||p.copy.replaceAll('_',' ')}</small></span><button className="shrink-0 rounded border px-2 py-1" onClick={()=>setPrintTarget({id:p.id,copy:p.copy})}>Print ticket</button></div>)}</div></details>}
      {tickets.some(t=>t.status==='READY') && <p className="mt-2 font-semibold text-green-700">{tickets.filter(t=>t.status==='READY').length} ready to serve</p>}
      {error && <p className="mt-2 text-red-700">{error}</p>}
      {printError && <p className="mt-2 text-red-700">{printError}</p>}
      {soundAllowed && soundError && <p className="mt-2 text-amber-700">{soundError}</p>}
      {soundAllowed && <p className="mt-1 text-slate-500">{sound?'Repeats until each ticket print is confirmed.':'Enable sound and keep this page open for repeating print alerts.'}</p>}
    </div>}
    {active && printTarget && <PosReceipt target={printTarget} onClose={()=>setPrintTarget(null)}/>}
  </QueueContext.Provider>;
}
