'use client';
import { useRef } from 'react';

interface Props {
  bookingsByStatus: { status: string; _count: number }[];
  topTours: { label: string; count: number }[];
  vouchersByType: { type: string; _count: number }[];
  monthly: Record<string,number>;
  totalRevenue: number;
  totalPaid: number;
}

const STATUS_COLORS: Record<string,string> = {
  ENQUIRY:'#f59e0b', QUOTED:'#3b82f6', CONFIRMED:'#22c55e',
  IN_PROGRESS:'#6366f1', COMPLETED:'#94a3b8', CANCELLED:'#ef4444',
};
const VOUCHER_COLORS: Record<string,string> = { HOTEL:'#3b82f6', VEHICLE:'#22c55e', FLIGHT:'#0ea5e9' };

function BarChart({ data, color='#f97316', label }: { data: {label:string;value:number}[]; color?:string; label:string }) {
  const max = Math.max(...data.map(d=>d.value), 1);
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{label}</p>
      <div className="space-y-2">
        {data.map(d=>(
          <div key={d.label}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-600 truncate max-w-[70%]">{d.label}</span>
              <span className="font-medium text-gray-700">{d.value}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className="h-2.5 rounded-full transition-all" style={{ width:`${(d.value/max)*100}%`, backgroundColor:color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ data, colors }: { data:{label:string;value:number}[]; colors:Record<string,string> }) {
  const total = data.reduce((s,d)=>s+d.value,0);
  if (total===0) return <p className="text-gray-400 text-sm text-center py-4">No data</p>;
  let offset = 0;
  const slices = data.map(d=>{
    const pct = d.value / total;
    const slice = { label:d.label, value:d.value, pct, offset };
    offset += pct;
    return slice;
  });

  // SVG donut
  const R = 60, r = 35, cx = 70, cy = 70;
  function arc(pct: number, off: number) {
    const start = (off * 2 * Math.PI) - Math.PI/2;
    const end   = ((off+pct) * 2 * Math.PI) - Math.PI/2;
    const x1=cx+R*Math.cos(start), y1=cy+R*Math.sin(start);
    const x2=cx+R*Math.cos(end),   y2=cy+R*Math.sin(end);
    const xi=cx+r*Math.cos(end),   yi=cy+r*Math.sin(end);
    const xj=cx+r*Math.cos(start), yj=cy+r*Math.sin(start);
    const lg = pct>0.5?1:0;
    return `M${x1},${y1} A${R},${R} 0 ${lg},1 ${x2},${y2} L${xi},${yi} A${r},${r} 0 ${lg},0 ${xj},${yj} Z`;
  }

  return (
    <div className="flex items-center gap-6">
      <svg width={140} height={140}>
        {slices.map(s=>(
          <path key={s.label} d={arc(s.pct,s.offset)} fill={colors[s.label]||'#94a3b8'} stroke="#fff" strokeWidth={2} />
        ))}
      </svg>
      <div className="space-y-2">
        {slices.map(s=>(
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-sm" style={{backgroundColor:colors[s.label]||'#94a3b8'}} />
            <span className="text-gray-600">{s.label}</span>
            <span className="font-bold text-gray-800">{s.value}</span>
            <span className="text-gray-400">({Math.round(s.pct*100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueBar({ monthly }: { monthly: Record<string,number> }) {
  const entries = Object.entries(monthly).slice(-8);
  const max = Math.max(...entries.map(([,v])=>v), 1);
  if (entries.length===0) return <p className="text-gray-400 text-sm text-center py-4">No data yet</p>;
  return (
    <div className="flex items-end gap-2 h-32">
      {entries.map(([label,value])=>(
        <div key={label} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-orange-400 rounded-t" style={{ height:`${(value/max)*100}%`, minHeight:'4px' }} />
          <span className="text-xs text-gray-500 writing-mode-vertical truncate" style={{fontSize:'10px'}}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsCharts({ bookingsByStatus, topTours, vouchersByType, monthly, totalRevenue, totalPaid }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  function printReport() {
    window.print();
  }

  return (
    <div ref={printRef}>
      {/* Print button */}
      <div className="flex justify-end no-print mb-2">
        <button onClick={printReport} className="btn-secondary text-sm">🖨️ Print / Save PDF</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bookings by status - donut */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Bookings by Status</h2>
          <DonutChart
            data={bookingsByStatus.map(s=>({ label:s.status, value:s._count }))}
            colors={STATUS_COLORS}
          />
        </div>

        {/* Revenue bar chart */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Monthly Revenue (USD)</h2>
          <RevenueBar monthly={monthly} />
          <div className="mt-3 flex gap-4 text-xs text-gray-500">
            <span>Billed: <strong className="text-gray-800">USD {totalRevenue.toLocaleString()}</strong></span>
            <span>Collected: <strong className="text-green-700">USD {totalPaid.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Top tours */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Top Tour Packages</h2>
          {topTours.length===0 ? (
            <p className="text-gray-400 text-sm">No data yet</p>
          ) : (
            <BarChart data={topTours.map(t=>({label:t.label,value:t.count}))} color="#f97316" label="Bookings per tour" />
          )}
        </div>

        {/* Vouchers by type */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Vouchers Issued by Type</h2>
          <DonutChart
            data={vouchersByType.map(v=>({ label:v.type, value:v._count }))}
            colors={VOUCHER_COLORS}
          />
        </div>
      </div>
    </div>
  );
}
