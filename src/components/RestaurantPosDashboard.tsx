import PosBarChart from './PosBarChart';
import PosStaffSales from './PosStaffSales';
import { useEffect, useState } from 'react';
import { ReceiptText, CreditCard, Wallet, ChartNoAxesCombined, RefreshCw } from 'lucide-react';
import api from '../api/client';
import { convertPrice, posMoney, posError, type Currency } from '../api/pos';
import { dashboardData, paymentLabels, type DashboardOrder } from './pos-dashboard-data';
type Summary = { orders: DashboardOrder[] };
export default function RestaurantPosDashboard({ currency, rate, revision, onCurrencyChange }: { currency: Currency; rate: string | null; revision: number; onCurrencyChange: (currency: Currency) => void }) {
  const [refresh, setRefresh] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  useEffect(() => { const controller = new AbortController(); setError(''); setLoading(true); api.get<Summary>('/pos/summary',{signal:controller.signal}).then(s=>setSummary(s.data)).catch(e=>{if(!controller.signal.aborted)setError(posError(e));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort(); },[revision,refresh]);
  if(error)return <div className="rp-panel p-4"><p role="alert" className="text-red-700">{error}</p><button className="mt-3 rounded border px-3 py-2" onClick={() => setRefresh(n => n + 1)}>Retry dashboard charts</button></div>;
  if(!summary)return <p className="rp-panel p-4">Loading restaurant dashboard…</p>;
  const {orders}=summary, {totals,blocks,sources}=dashboardData(orders);
  const money=(n:number)=>posMoney(convertPrice(n,currency,rate),currency);
  const sales=orders.filter(o=>['PAID','ROOM_POSTED'].includes(o.billingStatus)).reduce((n,o)=>n+Number(o.total||0),0);
  const sourceTotal=sources.reduce((n,s)=>n+s.count,0);
  let angle=0;
  const segments=sources.map(s=>{const start=angle;angle+=sourceTotal?s.count/sourceTotal*360:0;return `${s.color} ${start}deg ${angle}deg`;}).join(',');
  const statusLabels: Record<string,string> = { PAID: 'Paid', ROOM_POSTED: 'Room posted', AWAITING_PAYMENT: 'Unpaid', ROOM_REQUESTED: 'Room requested', CANCELLED: 'Cancelled', REFUNDED: 'Refunded' };
  const statuses=[...new Set([...Object.keys(statusLabels),...orders.map(o=>o.billingStatus)])].map(status=>({id:status,label:statusLabels[status]||status.replaceAll('_',' '),values:[orders.filter(o=>o.billingStatus===status).length]}));
  const stats=[{label:'Revenue today',value:money(sales),note:'Paid and room-posted orders',icon:ChartNoAxesCombined,color:'purple'}, {label:"Today's orders",value:String(orders.length),note:'All orders created today',icon:ReceiptText,color:'green'}, {label:'Card payments',value:money(totals[1]),note:'Card share of paid orders',icon:CreditCard,color:'blue'}, {label:'Cash payments',value:money(totals[0]),note:'Cash share of paid orders',icon:Wallet,color:'red'}];
  return <section id="restaurant-dashboard" className="rp-dashboard" aria-label="Restaurant dashboard">
    <div className="rp-dashboard-toolbar"><span>Today · {new Date().toLocaleDateString()} <span className="rp-app-badge">Saved POS records</span></span><div className="flex items-center gap-3"><label>Currency <select aria-label="Dashboard currency" className="rounded border px-2 py-1" value={currency} onChange={e=>onCurrencyChange(e.target.value as Currency)}><option value="SLL" disabled={!rate}>Leones</option><option value="USD">USD</option></select></label><button disabled={loading} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={14}/>{loading?'Refreshing…':'Refresh charts'}</button></div></div>
    <div className="rp-stats">{stats.map(({label,value,note,icon:Icon,color})=><article className={`rp-panel rp-metric ${color}`} key={label}><div className="rp-metric-title"><Icon size={17}/><h2>{label}</h2></div><strong>{value}</strong><p>{note}</p><span className="rp-metric-foot">Today's recorded activity</span></article>)}</div>
    <div className="rp-dashboard-grid">
      <PosBarChart title="Payment overview" description={`Paid orders created today, grouped by order time on this device. Room charges and reversed orders excluded. Total ${money(totals.reduce((n,v)=>n+v,0))}.`} money stacked colors={['#2bc77b','#7f8bef','#ffbd45','#9ba4b5']} unit={currency==='SLL'?'Le':'USD'} series={paymentLabels} rows={blocks.map(b=>({...b,values:b.values.map(v=>convertPrice(v,currency,rate))}))} emptyMessage="No paid orders recorded today."/>
      <article className="rp-panel rp-source-card" aria-label="Orders by source"><h3>Orders by source</h3><p className="rp-muted">Today's orders by ordering channel · includes all statuses</p><div className="rp-donut" role="img" aria-label={sourceTotal?sources.map(s=>`${s.label}: ${s.count}`).join(', '):'No orders recorded today'} style={{background:sourceTotal?`conic-gradient(${segments})`:'#eef0f4'}}><div><strong>{sourceTotal}</strong><span>{sourceTotal?'total orders':'No orders yet'}</span></div></div><ul className="rp-source-legend">{sources.map(s=><li key={s.id}><i style={{background:s.color}}/><span>{s.label}</span><strong>{s.count}</strong><small>{sourceTotal?Math.round(s.count/sourceTotal*100):0}%</small></li>)}</ul></article>
      <PosBarChart title="Order status breakdown" description="Today's orders grouped by their current billing status." series={['Orders']} rows={statuses} emptyMessage="No orders recorded today."/>
      <article className="rp-panel rp-recent"><h3>Recent orders</h3><p className="rp-muted">Latest restaurant activity</p>{orders.length?orders.slice(0,6).map(o=><div className="rp-recent-order" key={o.id}><span>{o.guestName||o.serviceLocation||o.orderNumber}<small>{o.orderNumber} · {o.billingStatus.replaceAll('_',' ')}</small></span><strong>{money(Number(o.total||0))}</strong></div>):<p className="rp-empty">No restaurant orders recorded today.</p>}</article>
    </div>
    <p className="rp-dashboard-note">Today's order cohort uses the server's business-day boundary. Payment values use saved USD allocations; Leones figures are a display conversion at the current POS rate, not a cash reconciliation. Staff collection records below retain original currencies and recorded rates.</p>
    <PosStaffSales revision={revision+refresh}/>
  </section>;
}
