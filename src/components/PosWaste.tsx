import { useEffect, useRef, useState, type FormEvent } from 'react';
import api from '../api/client';
import { getUser } from '../store/auth';
import { posButton, posField, posPrimary, posError, posMoney, requestKey } from '../api/pos';
type Ingredient = { id: string; name: string; department: string; unit: string };
type Waste = { id: string; itemName: string; department: string; quantity: string; unit: string; reason: string; note: string; costUsd: string | null; createdAt: string };
export default function PosWaste({ ingredients }: { ingredients: Ingredient[] }) {
  const u=getUser(), executive=['CEO','SUPER_ADMIN','ADMIN'].includes(u?.role || '');
  const allowed=executive || u?.accessLevel==='MANAGER' && ['RESTAURANT','KITCHEN','BAR'].includes(u?.role || '');
  const available=ingredients.filter(i=>executive || i.department===(u?.role==='BAR'?'BAR':'KITCHEN'));
  const [item,setItem]=useState(''),[quantity,setQuantity]=useState(''),[reason,setReason]=useState('SPOILAGE'),[note,setNote]=useState('');
  const [rows,setRows]=useState<Waste[]>([]),[limited,setLimited]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const pending=useRef<{body:string;key:string}|null>(null),working=useRef(false);
  async function load(){try{const r=await api.get('/pos/waste');setRows(r.data.rows);setLimited(r.data.limited);}catch(e){setError(posError(e));}}
  useEffect(()=>{if(allowed)void load();},[allowed]);
  if(!allowed)return null;
  async function submit(e:FormEvent){
    e.preventDefault();if(working.current)return;
    const data={inventoryItemId:item,quantity:Number(quantity),reason,note:note.trim()},body=JSON.stringify(data);
    if(pending.current?.body!==body)pending.current={body,key:requestKey()};
    if(!window.confirm('Deduct this wasted quantity from stock? Do not record food already deducted by a POS order again.'))return;
    working.current=true;setBusy(true);setError('');setMessage('');
    try{await api.post('/pos/waste',{...data,requestKey:pending.current.key});pending.current=null;setQuantity('');setNote('');setMessage('Waste recorded and stock updated.');await load();}
    catch(e){setError(posError(e)+' If the response was lost, retry unchanged; do not enter the same waste twice.');}
    finally{working.current=false;setBusy(false);}
  }
  const known=rows.reduce((n,r)=>n+Number(r.costUsd || 0),0);
  return <section className="space-y-3 rounded border p-3" aria-label="Stock wastage">
    <h3 className="font-semibold">Stock wastage · last 30 days</h3>
    <p className="text-xs">Record spoiled, expired or damaged unused stock and preparation losses. Food already deducted for an order is handled by the order reversal workflow—do not deduct it twice. Costs use recorded ingredient cost, not menu selling price.</p>
    {error&&<p role="alert" className="text-red-700">{error}</p>}{message&&<p role="status">{message}</p>}
    <form onSubmit={submit}><fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
      <label>Stock item<select aria-label="Waste stock item" required className={posField} value={item} onChange={e=>setItem(e.target.value)}><option value="">Choose ingredient</option>{available.map(i=><option key={i.id} value={i.id}>{i.name} · {i.department} ({i.unit})</option>)}</select></label>
      <label>Quantity in stock units<input aria-label="Waste quantity" type="number" required min="0.01" max="999999" step="0.01" className={posField} value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
      <label>Reason<select aria-label="Waste reason" className={posField} value={reason} onChange={e=>setReason(e.target.value)}>{['SPOILAGE','EXPIRED','DAMAGED','PREPARATION_LOSS'].map(r=><option key={r} value={r}>{r.replaceAll('_',' ')}</option>)}</select></label>
      <label>Explanation<input aria-label="Waste explanation" required minLength={3} maxLength={500} className={posField} value={note} onChange={e=>setNote(e.target.value)}/></label><button className={posPrimary}>Record stock waste</button>
    </fieldset></form>
    <button className={posButton} onClick={()=>void load()}>Refresh waste</button>
    <p>Known waste cost: {posMoney(known,'USD')}{rows.some(r=>r.costUsd===null)&&' · Incomplete: some ingredient costs are unknown.'}{limited&&' · Latest 1,000 entries only.'}</p>
    <div className="overflow-auto"><table className="w-full text-left text-xs"><thead><tr>{['Date','Item / department','Quantity','Reason / note','Cost USD'].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td className="p-2">{new Date(r.createdAt).toLocaleString()}</td><td>{r.itemName} · {r.department}</td><td>{r.quantity} {r.unit}</td><td>{r.reason} · {r.note}</td><td>{r.costUsd===null?'Unknown':posMoney(r.costUsd,'USD')}</td></tr>)}</tbody></table></div>
  </section>;
}
