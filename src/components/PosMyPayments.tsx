import { useEffect, useState } from 'react';
import api from '../api/client';
import { posError, posMoney, posButton } from '../api/pos';
import PosSplitBill from './PosSplitBill';
type Order = { id: string; orderNumber: string; guestName: string; currency: 'USD' | 'SLL'; currencyTotal: string; reversalPending: boolean };
export default function PosMyPayments({ revision, onPaid }: { revision: number; onPaid: (id: string) => void }) {
  const [orders,setOrders]=useState<Order[]>([]),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[selected,setSelected]=useState('');
  useEffect(()=>{const c=new AbortController();api.get<Order[]>('/pos/my-unpaid-orders',{signal:c.signal}).then(r=>{setOrders(r.data);setError('');}).catch(e=>{if(!c.signal.aborted)setError(posError(e));});return()=>c.abort();},[revision,refresh]);
  return <section className="mb-4 rounded border border-slate-300 bg-white p-4"><div className="flex justify-between gap-3"><h3 className="font-semibold">My orders awaiting payment</h3><button className={posButton} onClick={()=>setRefresh(n=>n+1)}>Refresh my payments</button></div><p className="my-2 text-xs">Orders you took or are assigned to serve. Open your cashier shift before recording money received. One payment or multiple methods can be recorded.</p>{error ? <p role="alert" className="text-red-700">{error}</p> : !orders.length ? <p>No unpaid orders assigned to you.</p> : orders.map(o=><div key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3"><span>{o.orderNumber} · {o.guestName} · {posMoney(o.currencyTotal,o.currency)}</span><button disabled={o.reversalPending} className={posButton} onClick={()=>setSelected(o.id)}>{o.reversalPending ? 'Manager review pending' : 'Record payment / split bill'}</button></div>)}{selected && <PosSplitBill id={selected} onClose={()=>setSelected('')} onPaid={()=>{onPaid(selected);setSelected('');setRefresh(n=>n+1);}}/>}</section>;
}
