import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import PaymentRegister from '../components/PaymentRegister';
import PaymentReceipt from '../components/PaymentReceipt';
import api from '../api/client';
import { can } from '../store/permissions';
import '../components/finance.css';

const categories = { JET_SKI:'Jet-ski', POOL_CHILD:'Swimming pool - child', POOL_ADULT:'Swimming pool - adult', ATV:'ATV bike', KAYAKING:'Kayaking', PHOTOSHOOT:'Photoshoot', ENTRANCE:'Guest entrance fee' };
const initial = () => ({category:'JET_SKI',customer:'',quantity:'1',amount:'',currency:'SLL',exchangeRate:'',method:'CASH',reference:''});
const field='block w-full border rounded p-2 mt-1';
export default function ServicePayments(){
  const [form,setForm]=useState(initial),[rate,setRate]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState(''),[version,setVersion]=useState(0);
  const requestKey=useRef(''),locked=useRef(false);
  useEffect(()=>{const abort=new AbortController();api.get('/billing/settings',{signal:abort.signal}).then(r=>{if(!abort.signal.aborted){const saved=r.data.posExchangeRate?String(r.data.posExchangeRate):'';setRate(saved);setForm(f=>({...f,exchangeRate:saved}));}}).catch(()=>{if(!abort.signal.aborted)setError('Could not load the saved rate. Enter the agreed exchange rate manually.');}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});return()=>abort.abort();},[]);
  function change(key:keyof ReturnType<typeof initial>,value:string){setForm(f=>({...f,[key]:value}));}
  async function save(event:React.FormEvent){event.preventDefault();if(locked.current)return;locked.current=true;setBusy(true);setError('');requestKey.current ||= crypto.randomUUID();try{
    const result=await api.post('/billing/service-payments',{...form,quantity:Number(form.quantity),amount:Number(form.amount),exchangeRate:form.exchangeRate?Number(form.exchangeRate):undefined,idempotencyKey:requestKey.current});
    requestKey.current='';setReceipt(result.data.id);setForm({...initial(),exchangeRate:rate});setVersion(v=>v+1);
  }catch(e:any){setError(String(e.response?.data?.message||'Unable to confirm payment. Retry the same details to avoid a duplicate.'));}finally{locked.current=false;setBusy(false);}}
  return <Layout><main className="finance-page p-5 text-sm"><header className="flex flex-wrap justify-between gap-3"><div><h1 className="text-lg font-semibold">Front Desk payments</h1><p>Activities, pool access, entrance fees and guest payments.</p></div>{can('view_billing')&&<Link className="finance-action finance-primary" to="/billing">Check-in guest / room-bill payment</Link>}</header>
    {can('record_payments')?<form onSubmit={save} className="my-4 rounded border bg-white p-4"><h2 className="font-semibold">Record service payment</h2><p className="text-xs my-2">Enter the total actually received for the whole quantity, not the unit price. Check-in payments must use the guest's room bill above.</p>{error&&<p role="alert" className="text-red-700">{error}</p>}
      <fieldset disabled={busy||loading} className="grid gap-3 md:grid-cols-3">
        <label>Service<select aria-label="Payment service" className={field} value={form.category} onChange={e=>change('category',e.target.value)}>{Object.entries(categories).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
        <label>Customer / guest name<input required maxLength={160} aria-label="Service customer" className={field} value={form.customer} onChange={e=>change('customer',e.target.value)}/></label>
        <label>Quantity / people<input required type="number" min={1} max={10000} step={1} aria-label="Service quantity" className={field} value={form.quantity} onChange={e=>change('quantity',e.target.value)}/></label>
        <label>Currency<select aria-label="Service currency" className={field} value={form.currency} onChange={e=>{change('currency',e.target.value);change('amount','');}}><option value="SLL">Leones</option><option value="USD">USD</option></select></label>
        <label>Total amount received<input required type="number" min="0.01" max="99999999.99" step="0.01" aria-label="Service amount" className={field} value={form.amount} onChange={e=>change('amount',e.target.value)}/></label>
        <label>Leones per USD (editable)<input type="number" min="0.0001" max="999999.9999" step="0.0001" required={form.currency==='SLL'} list="service-rates" aria-label="Service exchange rate" className={field} value={form.exchangeRate} onChange={e=>change('exchangeRate',e.target.value)}/><datalist id="service-rates">{rate&&<option value={rate}>Hotel saved rate</option>}</datalist></label>
        <label>Method<select aria-label="Service method" className={field} value={form.method} onChange={e=>change('method',e.target.value)}>{['CASH','CARD','BANK_TRANSFER','ORANGE_MONEY','AFRIMONEY','MOBILE_MONEY'].map(m=><option key={m}>{m}</option>)}</select></label>
        <label>Reference (optional)<input maxLength={200} aria-label="Service reference" className={field} value={form.reference} onChange={e=>change('reference',e.target.value)}/></label>
        <button className="finance-action finance-primary self-end" type="submit">{busy?'Recording...':'Record service payment'}</button>
      </fieldset><p className="mt-3">USD equivalent: {form.currency==='USD'?Number(form.amount||0).toFixed(2):Number(form.exchangeRate)>0?(Number(form.amount||0)/Number(form.exchangeRate)).toFixed(2):'Enter a rate'}. The exchange rate and received-by name are saved on the receipt.</p>
    </form>:<p className="my-4">View-only transaction access. Payments are recorded by authorised cashiers.</p>}
    <PaymentRegister key={version}/>{receipt&&<PaymentReceipt id={receipt} onClose={()=>setReceipt('')}/>}</main></Layout>;
}
