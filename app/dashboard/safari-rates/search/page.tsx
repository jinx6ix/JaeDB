'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Price {
  id: number; boardBasis: string; ratePerPersonSharing: number|null;
  singleRoomRate: number|null; childRate: number|null; currency: string;
  roomType: { name: string; maxOccupancy: number; hotel: { name: string; stars: number|null; category: string|null; county: { name: string } } };
  season: { name: string; startDate: string; endDate: string };
}
interface County { id: number; name: string; }
const BOARD: Record<string,string> = { RO:'Room Only', BB:'Bed & Breakfast', HB:'Half Board', FB:'Full Board', AI:'All Inclusive' };
function fmt(v: number|null, cur: string) { return v==null?'—':`${cur} ${Number(v).toLocaleString()}`; }

export default function SafariRatesSearchPage() {
  const [counties,setCounties]=useState<County[]>([]);
  const [results,setResults]=useState<Price[]>([]);
  const [loading,setLoading]=useState(false);
  const [searched,setSearched]=useState(false);
  const [nights,setNights]=useState(0);
  const [form,setForm]=useState({county:'',hotel:'',checkin:'',checkout:'',board:''});

  useEffect(()=>{ fetch('/api/safari-rates/counties').then(r=>r.json()).then(setCounties).catch(()=>{}); },[]);
  useEffect(()=>{
    if(form.checkin&&form.checkout){
      const n=Math.max(0,Math.round((new Date(form.checkout).getTime()-new Date(form.checkin).getTime())/86400000));
      setNights(n);
    }
  },[form.checkin,form.checkout]);

  async function search() {
    setLoading(true);setSearched(false);
    const p=new URLSearchParams();
    Object.entries(form).forEach(([k,v])=>{ if(v) p.set(k,v); });
    try {
      const res=await fetch(`/api/safari-rates/search?${p}`);
      setResults(await res.json());
    } catch{}
    setLoading(false);setSearched(true);
  }

  const grouped=results.reduce<Record<string,Price[]>>((acc,p)=>{
    const k=`${p.roomType.hotel.county.name}__${p.roomType.hotel.name}`;
    if(!acc[k])acc[k]=[];acc[k].push(p);return acc;
  },{});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏨 Safari Rates — Search</h1>
          <p className="text-gray-500 text-sm">Contract rates across Kenya destinations</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/safari-rates/hotels" className="btn-secondary text-sm">Manage Hotels</Link>
          <Link href="/dashboard/safari-rates/prices" className="btn-secondary text-sm">Enter Prices</Link>
        </div>
      </div>

      <div className="card">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="col-span-2">
            <label className="label">Destination</label>
            <select className="input" value={form.county} onChange={e=>setForm(f=>({...f,county:e.target.value}))}>
              <option value="">All destinations</option>
              {counties.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Hotel name (partial)</label>
            <input className="input" value={form.hotel} onChange={e=>setForm(f=>({...f,hotel:e.target.value}))}
              onKeyDown={e=>e.key==='Enter'&&search()} placeholder="e.g. Serena, Sopa, Mara…" />
          </div>
          <div>
            <label className="label">Check-in</label>
            <input type="date" className="input" value={form.checkin} onChange={e=>setForm(f=>({...f,checkin:e.target.value}))} />
          </div>
          <div>
            <label className="label">Check-out</label>
            <input type="date" className="input" value={form.checkout} onChange={e=>setForm(f=>({...f,checkout:e.target.value}))} />
          </div>
          <div>
            <label className="label">Board Basis</label>
            <select className="input" value={form.board} onChange={e=>setForm(f=>({...f,board:e.target.value}))}>
              <option value="">All</option>
              {Object.entries(BOARD).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={search} disabled={loading} className="btn-primary w-full">
              {loading?'Searching…':'🔍 Search'}
            </button>
          </div>
        </div>
        {nights>0&&<p className="text-xs text-orange-600 mt-2">📅 {nights} night{nights!==1?'s':''} selected</p>}
      </div>

      {searched&&(
        <div>
          <p className="text-sm text-gray-500 mb-3">{results.length} rate{results.length!==1?'s':''} across {Object.keys(grouped).length} hotel{Object.keys(grouped).length!==1?'s':''}</p>
          {Object.keys(grouped).length===0&&(
            <div className="card text-center py-12 text-gray-400"><p className="text-4xl mb-3">🏕️</p><p>No rates found. Try fewer filters.</p></div>
          )}
          <div className="space-y-4">
            {Object.entries(grouped).map(([key,prices])=>{
              const h=prices[0].roomType.hotel;
              return (
                <div key={key} className="card p-0 overflow-hidden">
                  <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{h.name}</h3>
                        {h.category&&<span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{h.category}</span>}
                      </div>
                      <p className="text-sm text-gray-500">{h.county.name}{h.stars?` · ${'★'.repeat(h.stars)}`:''}</p>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Room Type','Season','Period','Board','Per Person Sharing','Single','Child',nights>0?`${nights}N Total`:''].filter(Boolean).map(h=>(
                          <th key={h} className="text-left px-4 py-2 font-medium text-gray-600 text-xs">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {prices.map(p=>(
                        <tr key={p.id} className="hover:bg-orange-50/50">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{p.roomType.name}</td>
                          <td className="px-4 py-2.5 text-orange-600 font-medium">{p.season.name}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">
                            {new Date(p.season.startDate).toLocaleDateString('en-KE',{day:'2-digit',month:'short'})} – {new Date(p.season.endDate).toLocaleDateString('en-KE',{day:'2-digit',month:'short'})}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{BOARD[p.boardBasis]||p.boardBasis}</td>
                          <td className="px-4 py-2.5 font-mono font-bold text-gray-800">{fmt(p.ratePerPersonSharing,p.currency)}</td>
                          <td className="px-4 py-2.5 font-mono text-gray-600">{fmt(p.singleRoomRate,p.currency)}</td>
                          <td className="px-4 py-2.5 font-mono text-gray-500">{fmt(p.childRate,p.currency)}</td>
                          {nights>0&&<td className="px-4 py-2.5 font-mono font-bold text-green-700">{p.ratePerPersonSharing?`${p.currency} ${(p.ratePerPersonSharing*nights).toLocaleString()}`:'—'}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
