import PosBarChart from './PosBarChart';
type Staff = { id: string; name: string; salesUsd: string; ordersTaken: number; servedOrders: number };
export default function PosStaffCharts({ staff, date }: { staff: Staff[]; date: string }) {
  const sales = [...staff].sort((a,b) => Number(b.salesUsd) - Number(a.salesUsd));
  const orders = [...staff].sort((a,b) => b.ordersTaken - a.ordersTaken);
  return <div className="pos-chart-grid">
    <PosBarChart title="Staff sales performance" description={`${date} · UTC · Paid and room-posted sales by serving staff; excludes cancelled/refunded orders. All staff included.`} horizontal money unit="USD" series={['Sales']} rows={sales.map(s => ({ id: s.id, label: s.name, values: [Number(s.salesUsd)] }))} emptyMessage="No staff sales recorded for this date."/>
    <PosBarChart title="Staff order performance" description={`${date} · UTC · Orders taken versus orders served, including unpaid and reversed orders. These are two views of the same orders, not additive.`} horizontal series={['Taken', 'Served']} rows={orders.map(s => ({ id: s.id, label: s.name, values: [s.ordersTaken, s.servedOrders] }))} emptyMessage="No staff orders recorded for this date."/>
  </div>;
}
