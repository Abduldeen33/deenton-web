import { useState } from 'react';
import { convertPrice, posMoney, posButton as button, posField as field, posPrimary as primary, requestKey, type Currency } from '../api/pos';
export type RecipePart = { inventoryItemId: string; quantity: number };
export type Modifier = { id: string; name: string; min: number; max: number; options: { id: string; name: string; priceUsd: number; recipe?: RecipePart[] }[] };
export type CustomLine = { menuItemId?: string; options?: string[]; cookingNotes?: string; allergyNotes?: string; course?: number };
export type OptionItem = { id: string; name: string; price: string; modifiers?: Modifier[]; menuType?: string };
export const menuLabels: Record<string, string> = { REGULAR: 'Regular menu', CORPORATE_CONFERENCE: 'Corporate / Conference', BRUNCH: 'Brunch', PROGRAM: 'Program / Event' };

export default function PosItemOptions<T extends OptionItem>({ item, currency, rate, onAdd, onClose }: { item: T; currency: Currency; rate: string | null; onAdd: (line: T & CustomLine) => void; onClose: () => void }) {
  const [options, setOptions] = useState<string[]>([]), [cookingNotes, setCooking] = useState(''), [allergyNotes, setAllergy] = useState(''), [course, setCourse] = useState(1);
  const groups = item.modifiers || [];
  const selected = groups.flatMap(g => g.options).filter(o => options.includes(o.id));
  const cents = Math.round(Number(item.price) * 100) + selected.reduce((sum, o) => sum + Math.round(o.priceUsd * 100), 0);
  const valid = groups.every(g => { const n = g.options.filter(o => options.includes(o.id)).length; return n >= g.min && n <= g.max; });
  return <div role="dialog" aria-modal="true" aria-label="Customize item" className="fixed inset-0 z-50 overflow-auto bg-black/40 p-4"><form className="mx-auto max-w-lg rounded-lg bg-white p-5 space-y-4 text-sm" onSubmit={e => { e.preventDefault(); if (!valid) return; onAdd({ ...item, id: requestKey(), menuItemId: item.id, name: [item.name, ...selected.map(o => o.name)].join(' · '), price: (cents / 100).toFixed(2), options, cookingNotes, allergyNotes, course }); }}>
    <h2 className="font-semibold text-lg">{item.name}</h2>
    {groups.map(group => <fieldset key={group.id} className="rounded border p-3"><legend>{group.name} · choose {group.min}–{group.max}</legend>{group.options.map(o => <label key={o.id} className="flex justify-between py-2 gap-3"><span><input type="checkbox" checked={options.includes(o.id)} onChange={e => setOptions(current => e.target.checked ? group.max === 1 ? [...current.filter(id => !group.options.some(option => option.id === id)), o.id] : [...current, o.id] : current.filter(id => id !== o.id))} /> {o.name}</span><span>+{posMoney(convertPrice(o.priceUsd, currency, rate), currency)}</span></label>)}</fieldset>)}
    <label className="block">Cooking preferences<input maxLength={300} value={cookingNotes} onChange={e => setCooking(e.target.value)} placeholder="e.g. medium, no onions" className={field} /></label>
    <label className="block">Allergy notes<input maxLength={300} value={allergyNotes} onChange={e => setAllergy(e.target.value)} placeholder="Discuss allergies with your server" className={field} /></label><p className="text-xs text-amber-800">Notes alert the preparation team; they are not a guarantee that a dish is allergen-free.</p>
    <label className="block">Course<select aria-label="Course" className={field} value={course} onChange={e => setCourse(Number(e.target.value))}>{[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>Course {n}</option>)}</select></label>
    <p className="font-semibold">Unit price: {posMoney(convertPrice(cents / 100, currency, rate), currency)}</p><div className="flex gap-3"><button type="button" onClick={onClose} className={button}>Cancel</button><button disabled={!valid} className={primary}>Add configured item</button></div>
  </form></div>;
}
