import { useEffect, useState } from 'react';
import api from '../api/client';

const fmt=(n:any)=>Number(n??0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
export default function PayrollRow({employee,row,period,readOnly,busy,save,approve,action,payer,pay,print}:any){
  const [values,setValues]=useState({baseSalary:row?.baseSalary??employee.baseSalary,allowances:row?.allowances??'0',deductions:row?.deductions??'0',currency:row?.currency??employee.currency,exchangeRate:row?.exchangeRate??'',notes:row?.notes??'',bonusType:row?.bonusType??'FIXED',bonusValue:row?.bonusValue??'0',taxMode:row?.taxMode??(row?'MANUAL':'SL_RESIDENT_2026')});
  const editable=!readOnly&&(!row||['DRAFT','REJECTED'].includes(row.status));
  const [preview,setPreview]=useState<any>(null),[error,setError]=useState('');
  const payload={...values,employeeId:employee.id,period,version:row?.version,baseSalary:Number(values.baseSalary),allowances:Number(values.allowances),deductions:Number(values.deductions),bonusValue:Number(values.bonusValue),exchangeRate:values.exchangeRate?Number(values.exchangeRate):undefined};
  const signature=JSON.stringify(payload);
  useEffect(()=>{
    if(!editable)return;
    const controller=new AbortController();setPreview(null);setError('');
    const timer=setTimeout(()=>{api.post('/hr/payroll-preview',JSON.parse(signature),{signal:controller.signal}).then(r=>{if(!controller.signal.aborted)setPreview({key:signature,data:r.data});}).catch(e=>{if(!controller.signal.aborted)setError(String(e.response?.data?.message||'Unable to calculate payroll.'));});},300);
    return()=>{clearTimeout(timer);controller.abort();};
  },[signature,editable]);
  const calculated=editable?(preview?.key===signature?preview.data:null):row;
  const field=(key:'baseSalary'|'allowances'|'deductions'|'exchangeRate'|'bonusValue')=><input aria-label={`${key} ${employee.employeeNo}`} disabled={!editable||busy} type="number" min="0" step={key==='exchangeRate'||key==='bonusValue'&&values.bonusType==='PERCENT'?'0.0001':'0.01'} value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})}/>;
  const automatic=values.taxMode==='SL_RESIDENT_2026';
  return <tr>
    <td>{employee.employeeNo}<small>{employee.name}</small></td>
    <td><select aria-label={`Currency ${employee.employeeNo}`} disabled={!editable||busy} value={values.currency} onChange={e=>setValues({...values,currency:e.target.value})}><option value="SLL">NLe (SLE)</option><option>USD</option></select></td>
    <td>{field('baseSalary')}</td><td>{field('allowances')}</td>
    <td><select aria-label={`Bonus type ${employee.employeeNo}`} disabled={!editable||busy} value={values.bonusType} onChange={e=>setValues({...values,bonusType:e.target.value,bonusValue:'0'})}><option value="FIXED">Fixed amount</option><option value="PERCENT">% of basic</option></select>{field('bonusValue')}<small>Bonus: {calculated?fmt(calculated.bonusAmount):'—'}</small></td>
    <td>{calculated?<><small>{fmt(calculated.overtimeHours)} approved hours</small><strong>{fmt(calculated.overtimeAmount)}</strong></>:'—'}</td><td>{field('deductions')}</td><td>{field('exchangeRate')}</td>
    <td><select aria-label={`Tax mode ${employee.employeeNo}`} disabled={!editable||busy} value={values.taxMode} onChange={e=>setValues({...values,taxMode:e.target.value})}><option value="SL_RESIDENT_2026">SL resident monthly · 2026</option><option value="MANUAL">Manual / special case</option></select>
      {calculated&&<><small>PAYE: {fmt(calculated.paye)}</small><small>Employee NASSIT: {fmt(calculated.employeeNassit)}</small><small>Employer NASSIT: {fmt(calculated.employerNassit)} (not deducted)</small>{automatic&&<small>Taxable: NLe {fmt(calculated.taxableIncomeLe)} · PAYE: NLe {fmt(calculated.payeLe)}</small>}</>}
    </td>
    <td>{calculated?<><small>Gross: {fmt(calculated.grossPay)}</small><strong>{fmt(calculated.netPay)}</strong></>:<small>{error||'Calculating…'}</small>}</td>
    <td><input aria-label={`Payroll notes ${employee.employeeNo}`} disabled={!editable||busy} maxLength={1000} value={values.notes} onChange={e=>setValues({...values,notes:e.target.value})}/></td>
    <td><strong>{row?.status||'NOT PREPARED'}</strong>
      {editable&&<button disabled={busy||!calculated} onClick={()=>save(payload)}>Save draft</button>}
      {!readOnly&&row?.status==='DRAFT'&&<button disabled={busy} onClick={()=>action(row,'SUBMITTED')}>Submit saved draft</button>}
      {approve&&row?.status==='SUBMITTED'&&<><button disabled={busy} onClick={()=>action(row,'APPROVED')}>Approve payroll</button><button disabled={busy} onClick={()=>action(row,'REJECTED')}>Reject payroll</button></>}
      {payer&&row?.status==='APPROVED'&&<button disabled={busy} onClick={()=>pay(row)}>Record salary payment</button>}
      {row&&<button onClick={()=>print(row.id)}>Payslip</button>}
    </td>
  </tr>;
}
