type Room = {id:string;roomNumber:string;status:string;housekeepingStatus?:string;roomType?:{name:string}};
type Stay = {id:string;roomId:string;arrivalDate:string;departureDate:string;status:string;guest?:{firstName:string;lastName:string}};
export const roomColors = { Available:'#2563eb', Dirty:'#dc2626', Blocked:'#000000', Occupied:'#16a34a', Reserved:'#b45309', 'Checked out':'#64748b' };
const day=(value:string|Date)=>typeof value==='string'?value.slice(0,10):value.toISOString().slice(0,10);
const ordinal=(value:string|Date)=>Date.parse(day(value)+'T00:00:00Z')/86400000;
const inHouse=(status:string)=>['ARRIVED','STAYOVER','DUE_OUT'].includes(status);
const included=(stay:Stay)=>!['CANCELLED','NO_SHOW'].includes(stay.status);
function status(room:Room){return ['BLOCKED','OUT_OF_ORDER'].includes(room.status)?'Blocked':room.housekeepingStatus==='DIRTY'?'Dirty':['OCCUPIED','DUE_OUT'].includes(room.status)?'Occupied':room.status==='RESERVED'?'Reserved':'Available';}
export default function StayTimeline({rooms,reservations,dates,onSelect}:{rooms:Room[];reservations:Stay[];dates:Date[];onSelect:(room:Room)=>void}){
  const start=ordinal(dates[0]),end=start+dates.length,today=day(new Date());
  const columns={gridTemplateColumns:`250px repeat(${dates.length}, minmax(72px, 1fr))`};
  const groups=rooms.reduce<Record<string,Room[]>>((out,r)=>{(out[r.roomType?.name||'Rooms']??=[]).push(r);return out;},{});
  const staysFor=(room:Room)=>reservations.filter(s=>s.roomId===room.id&&included(s)&&ordinal(s.arrivalDate)<end&&ordinal(s.departureDate)>start);
  const available=(room:Room,date:Date)=>!['BLOCKED','OUT_OF_ORDER'].includes(room.status)&&!(day(date)===today&&(room.housekeepingStatus==='DIRTY'||['OCCUPIED','DUE_OUT'].includes(room.status)))&&!reservations.some(s=>s.roomId===room.id&&included(s)&&ordinal(s.arrivalDate)<=ordinal(date)&&ordinal(s.departureDate)>ordinal(date));
  return <><div className="flex flex-wrap gap-4 p-3 text-xs" aria-label="Room colour legend">{Object.entries(roomColors).map(([name,color])=><span key={name} className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded" style={{backgroundColor:color}}/>{name}</span>)}<span>Stay bars show nights and end at checkout; checkout day is not an extra night. Room badges show current status.</span></div>
  <div className="min-w-[1240px] border bg-white text-[11px]" aria-label="Room stay timeline">
    <div className="grid bg-slate-50 border-b" style={columns}><strong className="p-3">Room / current status</strong>{dates.map(d=><div key={day(d)} className="border-l p-2 text-center"><p>{d.toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'})}</p><strong>{d.toLocaleDateString('en-US',{day:'numeric',month:'short',timeZone:'UTC'})}</strong></div>)}</div>
    {Object.entries(groups).map(([type,group])=><section key={type}><div className="grid bg-slate-100 border-b" style={columns}><strong className="p-2">{type}</strong>{dates.map(d=><span key={day(d)} className="border-l p-2 text-center">{group.filter(r=>available(r,d)).length} available</span>)}</div>
      {group.map(room=><div key={room.id} className="grid border-b" style={columns} data-room={room.roomNumber}><button onClick={()=>onSelect(room)} className="p-2 text-left border-r"><strong>{room.roomNumber} - {type}</strong><span className="block text-white rounded px-2 py-0.5 w-fit mt-1" style={{backgroundColor:roomColors[status(room)]}}>{status(room)}</span>{room.housekeepingStatus==='DIRTY'&&room.status==='OCCUPIED'&&<span>Currently occupied</span>}</button>
        <div className="grid min-h-14" style={{gridColumn:`2 / span ${dates.length}`,gridTemplateColumns:`repeat(${dates.length}, minmax(0,1fr))`}}>
          {dates.map((d,index)=>{const label=['BLOCKED','OUT_OF_ORDER'].includes(room.status)?'Blocked':day(d)===today?status(room):'Available';return <button key={day(d)} aria-label={`${room.roomNumber} ${day(d)} ${label}`} onClick={()=>onSelect(room)} className="border-r border-slate-200 min-h-14" style={{gridRow:1,gridColumn:index+1,backgroundColor:roomColors[label]+'18',borderBottom:`3px solid ${roomColors[label]}`}}/>;})}
          {staysFor(room).map(stay=>{const arrival=ordinal(stay.arrivalDate),departure=ordinal(stay.departureDate),left=Math.max(start,arrival)-start,right=Math.min(end,departure)-start;
            const name=`${stay.guest?.firstName||''} ${stay.guest?.lastName||''}`.trim()||'Guest';const label=inHouse(stay.status)?'Occupied':stay.status==='CHECKED_OUT'?'Checked out':'Reserved';
            return <button key={stay.id} data-stay={stay.id} data-nights={departure-arrival} onClick={()=>onSelect(room)} title={`${name} | ${day(stay.arrivalDate)} to ${day(stay.departureDate)} (checkout) | ${departure-arrival} nights | ${label}`} className="z-10 self-center overflow-hidden whitespace-nowrap text-left text-white px-2 py-2 border-y border-white" style={{gridRow:1,gridColumn:`${left+1} / ${right+1}`,backgroundColor:roomColors[label],borderRadius:'4px',margin:'0 1px'}}>{arrival<start?'← ':''}{name} · {departure-arrival} nights {departure>end?'→':` · Checkout ${day(stay.departureDate)}`}</button>;
          })}
        </div></div>)}
    </section>)}
    {!rooms.length&&<p className="p-6">No rooms match this filter.</p>}
    <div className="grid bg-slate-50" style={columns}><strong className="p-2">Available inventory</strong>{dates.map(d=><span key={day(d)} className="p-2 border-l text-center">{rooms.filter(r=>available(r,d)).length}</span>)}</div>
  </div></>;
}
