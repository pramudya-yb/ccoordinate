'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { wgs84ToTm3, tm3ToWgs84, TM3_ZONES } from '@/lib/tm3';
import { ddToDmsString, ddToDms, dmsToDd } from '@/lib/conversion';
import Papa from 'papaparse';
import { Navigation, Globe, MapPin, Check, Copy, ChevronDown, UploadCloud, Sun, Moon, Link, Loader2, AlertCircle } from 'lucide-react';

/* ── Shared input style using CSS vars ── */
const inp = 'w-full px-3 py-1.5 text-xs font-mono outline-none bg-[var(--inp-bg)] border-2 border-[var(--border)] text-[var(--text)] transition-all focus:bg-[var(--inp-focus)] focus:text-black focus:shadow-[2px_2px_0px_0px_var(--border)] focus:translate-x-[-1px] focus:translate-y-[-1px]';
const selInp = inp + ' cursor-pointer';

function CopyBtn({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1400); }}
      className="shrink-0 p-1 border-2 border-black dark:border-white bg-white dark:bg-zinc-800 text-black dark:text-white transition-all hover:bg-yellow-400 dark:hover:bg-yellow-500 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shadow-[2px_2px_0px_0px_var(--border)] cursor-pointer">
      {ok ? <Check size={11} className="text-emerald-600 dark:text-emerald-400 font-bold" /> : <Copy size={11} />}
    </button>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-[var(--border)] bg-[var(--inp-bg)] transition-colors hover:bg-[var(--row-hover)]">
      <span className={`text-[9px] font-black uppercase tracking-widest w-[4.8rem] shrink-0 ${accent}`}>{label}</span>
      <span className="font-mono text-[10.5px] text-[var(--text)] flex-1 break-all select-all">{value}</span>
      <CopyBtn value={value} />
    </div>
  );
}

function SectionLabel({ icon: Icon, label, bgClass }: { icon: React.ElementType; label: string; bgClass?: string }) {
  const bg = bgClass ?? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white';
  return (
    <div className={`flex items-center gap-1.5 mb-2 px-2 py-0.5 border-2 text-[9px] font-black uppercase tracking-widest inline-flex max-w-max ${bg}`}>
      <Icon size={10} />
      <span>{label}</span>
    </div>
  );
}

export default function Page() {
  const [dark, setDark] = useState(true);
  // Single source of truth: WGS84 coords
  const [coords, setCoords] = useState({ lat: -6.1754, lon: 106.8272 });

  // Input states tracking raw values to prevent cursor jumps and parse bugs
  const [wgsRaw, setWgsRaw] = useState({ lat: '-6.1754', lon: '106.8272' });
  const [editingWgs, setEditingWgs] = useState(false);

  const [tm3Raw, setTm3Raw] = useState({ x: '', y: '' });
  const [editingTm3, setEditingTm3] = useState(false);

  const [dmsRaw, setDmsRaw] = useState<{
    latDeg: number | '';
    latMin: number | '';
    latSec: number | '';
    latDir: string;
    lonDeg: number | '';
    lonMin: number | '';
    lonSec: number | '';
    lonDir: string;
  }>(() => {
    const la = ddToDms(-6.1754, true), lo = ddToDms(106.8272, false);
    return { latDeg: la.deg, latMin: la.min, latSec: la.sec, latDir: la.dir, lonDeg: lo.deg, lonMin: lo.min, lonSec: lo.sec, lonDir: lo.dir };
  });
  const [editingDms, setEditingDms] = useState(false);

  const [zone, setZone] = useState('49.2');
  const [wgsMode, setWgsMode] = useState<'dd' | 'dms'>('dd');
  const [csvMsg, setCsvMsg] = useState('');
  const [gmapsLink, setGmapsLink] = useState('');
  const [gmapsStatus, setGmapsStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const fileRef = useRef<HTMLInputElement>(null);

  // Apply dark class to <html> — only side-effect that belongs in useEffect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // Derived values from coords
  const tm3Derived = useMemo(() => {
    try {
      const [x, y] = wgs84ToTm3(coords.lat, coords.lon, zone);
      if (isNaN(x) || isNaN(y)) return { x: '', y: '' };
      return { x: x.toFixed(3), y: y.toFixed(3) };
    } catch { return { x: '', y: '' }; }
  }, [coords, zone]);

  const dmsDerived = useMemo(() => {
    const la = ddToDms(coords.lat, true), lo = ddToDms(coords.lon, false);
    return { latDeg: la.deg, latMin: la.min, latSec: la.sec, latDir: la.dir, lonDeg: lo.deg, lonMin: lo.min, lonSec: lo.sec, lonDir: lo.dir };
  }, [coords]);

  // Display values: use raw (user-typed) when editing, derived otherwise
  const wgs = editingWgs ? wgsRaw : { lat: coords.lat.toFixed(6), lon: coords.lon.toFixed(6) };
  const tm3 = editingTm3 ? tm3Raw : tm3Derived;
  const dms = editingDms ? dmsRaw : dmsDerived;

  const onWgs = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingWgs(true);
    setEditingTm3(false);
    setEditingDms(false);
    const currentWgs = { lat: coords.lat.toFixed(6), lon: coords.lon.toFixed(6) };
    const next = { 
      ...(editingWgs ? wgsRaw : currentWgs), 
      [e.target.name]: e.target.value 
    };
    setWgsRaw(next);
    const lat = parseFloat(next.lat), lon = parseFloat(next.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      setCoords({ lat, lon });
    }
  };

  const onDms = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditingDms(true);
    setEditingWgs(false);
    setEditingTm3(false);
    const val = e.target.value;
    const baseDms = editingDms ? dmsRaw : dmsDerived;
    const next = { 
      ...baseDms, 
      [e.target.name]: e.target.type === 'number' ? (val === '' ? '' : parseFloat(val)) : val 
    };
    setDmsRaw(next as typeof dmsRaw);
    
    const latDeg = typeof next.latDeg === 'number' ? next.latDeg : 0;
    const latMin = typeof next.latMin === 'number' ? next.latMin : 0;
    const latSec = typeof next.latSec === 'number' ? next.latSec : 0;
    const lonDeg = typeof next.lonDeg === 'number' ? next.lonDeg : 0;
    const lonMin = typeof next.lonMin === 'number' ? next.lonMin : 0;
    const lonSec = typeof next.lonSec === 'number' ? next.lonSec : 0;
    
    setCoords({ 
      lat: dmsToDd(latDeg, latMin, latSec, next.latDir), 
      lon: dmsToDd(lonDeg, lonMin, lonSec, next.lonDir) 
    });
  };

  const parseGmaps = (url: string) => {
    let decodedUrl = url;
    try {
      decodedUrl = decodeURIComponent(url);
    } catch {}

    const atMatch = decodedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[2]) };
    const bangMatch = decodedUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (bangMatch) return { lat: parseFloat(bangMatch[1]), lon: parseFloat(bangMatch[2]) };
    const queryMatch = decodedUrl.match(/(?:q|query|ll|center)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (queryMatch) return { lat: parseFloat(queryMatch[1]), lon: parseFloat(queryMatch[2]) };
    const pairMatch = decodedUrl.match(/(?:place|search|dir)\/([-+]?\d+\.?\d*),([-+]?\d+\.?\d*)/);
    if (pairMatch) return { lat: parseFloat(pairMatch[1]), lon: parseFloat(pairMatch[2]) };
    return null;
  };

  const onGmapsLink = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setGmapsLink(url);
    
    if (!url) {
      setGmapsStatus('idle');
      return;
    }
    
    setGmapsStatus('processing');
    
    let finalUrl = url;
    const isShortLink = url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps') || url.includes('goo.gl');
    
    if (isShortLink) {
      try {
        const res = await fetch(`/api/resolve-link?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (data.finalUrl) finalUrl = data.finalUrl;
      } catch { /* ignore */ }
    }
    
    const parsed = parseGmaps(finalUrl);
    if (parsed && !isNaN(parsed.lat) && !isNaN(parsed.lon)) {
      setEditingTm3(false);
      setEditingWgs(false);
      setEditingDms(false);
      setCoords(parsed);
      setGmapsStatus('success');
    } else {
      setGmapsStatus('error');
    }
  };

  const onTm3 = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTm3(true);
    setEditingWgs(false);
    setEditingDms(false);
    const next = { 
      ...(editingTm3 ? tm3Raw : tm3Derived), 
      [e.target.name]: e.target.value 
    };
    setTm3Raw(next);
    try {
      const x = parseFloat(next.x), y = parseFloat(next.y);
      if (!isNaN(x) && !isNaN(y)) {
        const [lat, lon] = tm3ToWgs84(x, y, zone);
        if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
          setCoords({ lat, lon });
        }
      }
    } catch { /* ignore */ }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setCsvMsg('Memproses…');
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data as Record<string, string>[]).map(row => {
          try {
            const findVal = (keys: string[]) => {
              const foundKey = Object.keys(row).find(k => keys.includes(k.toLowerCase().trim()));
              return foundKey ? row[foundKey] : undefined;
            };

            const latVal = findVal(['lat', 'latitude', 'lat/y', 'y_lat']);
            const lonVal = findVal(['lon', 'longitude', 'lng', 'lon/x', 'x_lon']);
            const lat = latVal ? parseFloat(latVal) : NaN;
            const lon = lonVal ? parseFloat(lonVal) : NaN;

            if (!isNaN(lat) && !isNaN(lon)) {
              const [x, y] = wgs84ToTm3(lat, lon, zone);
              return { ...row, tm3_x: x.toFixed(3), tm3_y: y.toFixed(3), tm3_zone: zone };
            }

            const xVal = findVal(['x', 'easting', 'tm3_x']);
            const yVal = findVal(['y', 'northing', 'tm3_y']);
            const x = xVal ? parseFloat(xVal) : NaN;
            const y = yVal ? parseFloat(yVal) : NaN;

            if (!isNaN(x) && !isNaN(y)) {
              const [rl, rn] = tm3ToWgs84(x, y, zone);
              return { ...row, wgs84_lat: rl.toFixed(6), wgs84_lon: rn.toFixed(6), tm3_zone: zone };
            }
          } catch { /* skip */ }
          return row;
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }));
        a.download = 'converted.csv'; a.click();
        setCsvMsg(`✓ ${rows.length} baris`);
        if (fileRef.current) fileRef.current.value = '';
      },
      error: () => setCsvMsg('Gagal'),
    });
  };

  const dmsLat = ddToDmsString(coords.lat, true);
  const dmsLon = ddToDmsString(coords.lon, false);
  const curZone = TM3_ZONES.find(z => z.label === zone);

  return (
    <main className="min-h-screen md:h-screen overflow-hidden flex items-start md:items-center justify-center p-2 md:p-6 bg-[var(--bg)] transition-colors duration-300">
      <div className="w-full max-w-5xl h-full md:h-[590px] border-3 border-[var(--border)] bg-[var(--card)] shadow-[8px_8px_0px_0px_var(--border)] transition-all flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="px-4 md:px-6 py-3 border-b-3 border-[var(--border)] bg-indigo-300 dark:bg-indigo-700 text-black dark:text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 border-2 border-black dark:border-white bg-white dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <Navigation size={15} className="text-black dark:text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight uppercase">TM3 Converter</h1>
              <p className="text-[9px] font-extrabold opacity-80 uppercase tracking-widest hidden sm:block">Indonesia · DGN95 / WGS84</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zone */}
            <div className="relative">
              <select value={zone} onChange={e => { setZone(e.target.value); setEditingTm3(false); setEditingWgs(false); setEditingDms(false); }}
                className="appearance-none pl-3 pr-8 py-1 bg-white dark:bg-zinc-800 border-2 border-black dark:border-white rounded-none text-xs text-black dark:text-white font-extrabold outline-none hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-[2px_2px_0px_0px_var(--border)]">
                {TM3_ZONES.map(z => <option key={z.label} value={z.label}>Zone {z.label}</option>)}
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-black dark:text-white pointer-events-none font-bold" />
            </div>
            {/* Theme toggle */}
            <button onClick={() => setDark(d => !d)}
              className="w-7 h-7 border-2 border-black dark:border-white bg-white dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
              {dark ? <Sun size={13} className="text-amber-500 font-bold" /> : <Moon size={13} className="text-blue-600 font-bold" />}
            </button>
          </div>
        </div>

        {/* ── Body: single col mobile, two col desktop ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x-3 divide-[var(--border)] flex-1 overflow-y-auto md:overflow-hidden min-h-0">

          {/* LEFT — Inputs */}
          <div className="px-4 md:px-6 py-4 space-y-4 overflow-y-auto h-full min-h-0">

            {/* WGS84 / Geografis */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <SectionLabel icon={Globe} label="WGS84 Geografis" bgClass="bg-sky-100 text-sky-950 border-sky-900 dark:bg-sky-950/60 dark:text-sky-100 dark:border-sky-300" />
                <div className="flex border-2 border-[var(--border)] bg-white dark:bg-zinc-800">
                  {(['dd', 'dms'] as const).map(m => (
                    <button key={m} onClick={() => { setEditingWgs(false); setEditingDms(false); setWgsMode(m); }}
                      className={`px-3 py-0.5 text-[9px] font-black uppercase transition-colors flex-1 ${wgsMode === m ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {wgsMode === 'dd' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[8px] font-black text-[var(--text)] uppercase tracking-wider mb-1 ml-0.5">Latitude</p>
                    <input type="text" name="lat" value={wgs.lat} onChange={onWgs} className={inp} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-[var(--text)] uppercase tracking-wider mb-1 ml-0.5">Longitude</p>
                    <input type="text" name="lon" value={wgs.lon} onChange={onWgs} className={inp} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'Latitude', fields: ['latDeg', 'latMin', 'latSec'] as const, dir: 'latDir' as const, opts: ['N', 'S'] },
                    { label: 'Longitude', fields: ['lonDeg', 'lonMin', 'lonSec'] as const, dir: 'lonDir' as const, opts: ['E', 'W'] },
                  ].map(({ label, fields, dir, opts }) => (
                    <div key={label}>
                      <p className="text-[8px] font-black text-[var(--text)] uppercase tracking-wider mb-1 ml-0.5">{label}</p>
                      <div className="grid grid-cols-4 gap-1">
                        {fields.map(f => (
                          <input key={f} type="number" name={f} value={dms[f]} onChange={onDms}
                            step={f.endsWith('Sec') ? '0.001' : '1'} placeholder={f.endsWith('Deg') ? '°' : f.endsWith('Min') ? '′' : '″'}
                            className={inp} />
                        ))}
                        <select name={dir} value={dms[dir]} onChange={onDms} className={selInp}>
                          {opts.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Google Maps Link Parser */}
            <div className="relative">
              <SectionLabel icon={Link} label="Google Maps Link" bgClass="bg-red-100 text-red-950 border-red-900 dark:bg-red-950/60 dark:text-red-100 dark:border-red-300" />
              <input 
                type="text" 
                value={gmapsLink} 
                onChange={onGmapsLink} 
                placeholder="Paste link Google Maps (misal: https://maps.app.goo.gl/...)" 
                className={inp + " pr-8"} 
              />
              <div className="absolute right-2.5 top-8.5">
                {gmapsStatus === 'idle' && <Link size={13} className="text-[var(--text)]" />}
                {gmapsStatus === 'processing' && <Loader2 size={13} className="text-yellow-500 animate-spin" />}
                {gmapsStatus === 'success' && <Check size={13} className="text-emerald-500 font-bold" />}
                {gmapsStatus === 'error' && <AlertCircle size={13} className="text-red-500 font-bold" />}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-0.5 bg-[var(--border)]" />
              <span className="text-[9px] font-black text-[var(--text)] uppercase tracking-widest">atau</span>
              <div className="flex-1 h-0.5 bg-[var(--border)]" />
            </div>

            {/* TM3 */}
            <div>
              <SectionLabel icon={MapPin} label="TM3 — Easting / Northing" bgClass="bg-emerald-100 text-emerald-950 border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100 dark:border-emerald-300" />
              <div className="grid grid-cols-2 gap-2">
                {[{ name: 'x', label: 'Easting (X)' }, { name: 'y', label: 'Northing (Y)' }].map(f => (
                  <div key={f.name}>
                    <p className="text-[8px] font-black text-[var(--text)] uppercase tracking-wider mb-1 ml-0.5">{f.label}</p>
                    <input type="number" name={f.name} value={tm3[f.name as 'x' | 'y']} onChange={onTm3} className={inp} />
                  </div>
                ))}
              </div>
            </div>

            {/* Batch CSV */}
            <div>
              <SectionLabel icon={UploadCloud} label="Batch CSV" bgClass="bg-zinc-100 text-zinc-950 border-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-300" />
              <label htmlFor="csv-file"
                className="flex items-center gap-4 px-3 py-1.5 border-2 border-dashed border-[var(--border)] bg-[var(--inp-bg)] cursor-pointer hover:bg-yellow-400/10 dark:hover:bg-yellow-400/5 transition-all shadow-[3px_3px_0px_0px_var(--border)] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none group">
                <div className="w-7 h-7 bg-white dark:bg-zinc-800 border-2 border-black dark:border-white flex items-center justify-center shrink-0">
                  <UploadCloud size={13} className="text-black dark:text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-[var(--text)]">Upload CSV</p>
                  <p className="text-[9px] text-[var(--faint)] font-bold">Header: <code>lat, lon</code> atau <code>x, y</code></p>
                </div>
              </label>
              <input ref={fileRef} id="csv-file" type="file" accept=".csv" onChange={onFile} className="hidden" />
              {csvMsg && <p className={`mt-1 text-[10px] font-black ${csvMsg.startsWith('Gagal') ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{csvMsg}</p>}
            </div>
          </div>

          {/* RIGHT — Results */}
          <div className="px-4 md:px-6 py-4 border-t-3 border-[var(--border)] md:border-t-0 bg-zinc-50 dark:bg-zinc-900/40 flex flex-col justify-between overflow-y-auto h-full min-h-0">
            <div>
              <p className="text-[10px] font-black text-[var(--text)] uppercase tracking-widest mb-3 bg-black dark:bg-white text-white dark:text-black inline-block px-2 py-0.5 border border-black dark:border-white">Hasil Konversi</p>

              <div className="space-y-4">
                {/* Group 1: WGS84 */}
                <div className="space-y-1.5">
                  <p className="text-[8px] font-black text-[var(--text)] uppercase tracking-wider px-1">WGS84 Geografis</p>
                  <Row label="Latitude"  value={coords.lat.toFixed(6)} accent="text-sky-600 dark:text-sky-400 font-extrabold" />
                  <Row label="Longitude" value={coords.lon.toFixed(6)} accent="text-sky-600 dark:text-sky-400 font-extrabold" />
                  <Row label="DMS Lat"   value={dmsLat} accent="text-sky-600 dark:text-sky-400 font-extrabold" />
                  <Row label="DMS Lon"   value={dmsLon} accent="text-sky-600 dark:text-sky-400 font-extrabold" />
                  <Row label="DD Pair"   value={`${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`} accent="text-sky-600 dark:text-sky-400 font-extrabold" />
                </div>

                <div className="border-t-2 border-black dark:border-white border-dashed my-1" />

                {/* Group 2: TM3 */}
                <div className="space-y-1.5">
                  <p className="text-[8px] font-black text-[var(--text)] uppercase tracking-wider px-1">
                    TM3 Zone {zone} · CM {curZone?.meridian}°
                  </p>
                  <Row label="Easting X"  value={tm3.x} accent="text-emerald-600 dark:text-emerald-400 font-extrabold" />
                  <Row label="Northing Y" value={tm3.y} accent="text-emerald-600 dark:text-emerald-400 font-extrabold" />
                  <Row label="X, Y"       value={`${tm3.x}, ${tm3.y}`} accent="text-emerald-600 dark:text-emerald-400 font-extrabold" />
                </div>
              </div>
            </div>

            <p className="text-[9px] font-extrabold text-[var(--faint)] mt-4 shrink-0">© 2026 Coordinate Converter</p>
          </div>
        </div>
      </div>
    </main>
  );
}
