import { useId } from 'react';
import './pos-charts.css';

export type ChartRow = { id: string; label: string; values: number[] };
type Props = { title: string; description: string; rows: ChartRow[]; series: string[]; horizontal?: boolean; money?: boolean; unit?: string; emptyMessage?: string };
const colors = ['#638bff', '#27bda0', '#edb65c'];
export default function PosBarChart({ title, description, rows, series, horizontal = false, money = false, unit = '', emptyMessage = 'No activity recorded for this period.' }: Props) {
  const id = useId();
  const format = (n: number) => (unit ? unit + ' ' : '') + n.toLocaleString('en-US', { minimumFractionDigits: money ? 2 : 0, maximumFractionDigits: money ? 2 : 0 });
  const largest = Math.max(0, ...rows.flatMap(r => r.values));
  const power = 10 ** Math.floor(Math.log10(largest || 1));
  const maximum = ([1, 2, 5, 10].find(n => n * power >= largest) || 10) * power;
  const ticks = Array.from({ length: 5 }, (_, i) => maximum * i / 4).filter((n,i,a) => money || Number.isInteger(n) || i === a.length - 1);
  return <article className="pos-chart" aria-labelledby={id}>
    <h3 id={id}>{title}</h3><p className="pos-chart-caption">{description}</p>
    <div className="pos-chart-legend">{series.map((name,i) => <span key={name}><i style={{ background: colors[i % colors.length] }}/>{name}</span>)}</div>
    {!rows.length ? <p className="pos-chart-empty">{emptyMessage}</p> : <>
      <div className={'pos-chart-plot ' + (horizontal ? 'is-horizontal' : 'is-vertical')} role="group" aria-label={title + ' chart'}>
        {horizontal ? <><div className="pos-chart-h-axis"><span>0</span><span>{format(maximum)}</span></div><div className="pos-chart-h-rows">{rows.map(row => <div className="pos-chart-h-row" key={row.id}><strong>{row.label}</strong><div>{row.values.map((value,i) => <div key={i} className="pos-chart-h-track" tabIndex={0} aria-label={`${row.label}: ${series[i]} ${format(value)}`} title={`${row.label}: ${series[i]} ${format(value)}`}><i style={{ width: `${value / maximum * 100}%`, background: colors[i % colors.length] }}/><span>{format(value)}</span></div>)}</div></div>)}</div></> : <div className="pos-chart-v-scroll"><div className="pos-chart-v-grid"><div className="pos-chart-v-axis">{[...ticks].reverse().map(n => <span style={{ bottom: `${n / maximum * 100}%` }} key={n}>{format(n)}</span>)}</div><div className="pos-chart-columns">{rows.map(row => <div className="pos-chart-column" key={row.id}><div className="pos-chart-column-bars">{row.values.map((value,i) => <div key={i} tabIndex={0} aria-label={`${row.label}: ${series[i]} ${format(value)}`} title={`${row.label}: ${series[i]} ${format(value)}`} className="pos-chart-column-bar" style={{ height: `${value / maximum * 100}%`, background: colors[i % colors.length] }}><span>{format(value)}</span></div>)}</div><span className="pos-chart-column-label">{row.label}</span></div>)}</div></div></div>}
      </div>
      {largest === 0 && <p className="pos-chart-caption">{emptyMessage}</p>}
      <details className="pos-chart-values"><summary>View chart values</summary><div><table><thead><tr><th>Category</th>{series.map(s => <th key={s}>{s}{unit ? ` (${unit})` : ''}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id}><th>{r.label}</th>{r.values.map((v,i) => <td key={i}>{format(v)}</td>)}</tr>)}</tbody></table></div></details>
    </>}
  </article>;
}
