'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { wgs84ToTm3, tm3ToWgs84, TM3_ZONES } from '@/lib/tm3';
import { ddToDmsString, ddToDms, dmsToDd } from '@/lib/conversion';
import Papa from 'papaparse';
import { Navigation, Globe, MapPin, Check, Copy, ChevronDown, UploadCloud, Sun, Moon } from 'lucide-react';

/* ── Shared input style using CSS vars ── */
const inp = 'w-full px-2.5 py-2 rounded-lg text-xs font-mono outline-none transition-all bg-[var(--inp-bg)] border border-[var(--inp-border)] text-[var(--text)] focus:ring-2 focus:ring-[var(--inp-focus)] focus:border-[var(--inp-focus)]';
const selInp = inp + ' cursor-pointer';

function CopyBtn({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1400); }}
      className="shrink-0 p-0.5 rounded transition-all hover:opacity-70">
      {ok ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} className="text-[var(--faint)]" />}
    </button>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded transition-colors hover:bg-[var(--row-hover)]">
      <span className={`text-[9px] font-bold uppercase tracking-widest w-16 shrink-0 ${accent}`}>{label}</span>
      <span className="font-mono text-[11px] text-[var(--text)] flex-1 truncate opacity-80">{value}</span>
      <CopyBtn value={value} />
    </div>
  );
}

function SectionLabel({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon size={10} className={color} />
      <span className={`text-[9px] font-bold uppercase tracking-widest ${color}`}>{label}</span>
    </div>
  );
}

export default function Page() {
  const [dark, setDark] = useState(true);
  // Single source of truth: WGS84 coords
  const [coords, setCoords] = useState({ lat: -6.1754, lon: 106.8272 });
  // TM3 inputs are kept as strings to allow free typing; synced from coords when not actively editing
  const [tm3Raw, setTm3Raw] = useState({ x: '', y: '' });
  const [editingTm3, setEditingTm3] = useState(false);
  const [zone, setZone] = useState('48.2');
  const [wgsMode, setWgsMode] = useState<'dd' | 'dms'>('dd');
  const [dmsRaw, setDmsRaw] = useState(() => {
    const la = ddToDms(-6.1754, true), lo = ddToDms(106.8272, false);
    return { latDeg: la.deg, latMin: la.min, latSec: la.sec, latDir: la.dir, lonDeg: lo.deg, lonMin: lo.min, lonSec: lo.sec, lonDir: lo.dir };
  });
  const [csvMsg, setCsvMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Apply dark class to <html> — only side-effect that belongs in useEffect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // Derived TM3 from coords (used when not editing TM3 directly)
  const tm3Derived = useMemo(() => {
    try {
      const [x, y] = wgs84ToTm3(coords.lat, coords.lon, zone);
      return { x: x.toFixed(3), y: y.toFixed(3) };
    } catch { return { x: '', y: '' }; }
  }, [coords, zone]);

  // Derived DMS from coords (used when not editing DMS directly)
  const dmsDerived = useMemo(() => {
    const la = ddToDms(coords.lat, true), lo = ddToDms(coords.lon, false);
    return { latDeg: la.deg, latMin: la.min, latSec: la.sec, latDir: la.dir, lonDeg: lo.deg, lonMin: lo.min, lonSec: lo.sec, lonDir: lo.dir };
  }, [coords]);

  // Display values: use raw (user-typed) when editing, derived otherwise
  const tm3 = editingTm3 ? tm3Raw : tm3Derived;
  const dms = wgsMode === 'dms' ? dmsRaw : dmsDerived;

  const onWgs = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTm3(false);
    setCoords(p => ({ ...p, [e.target.name]: parseFloat(e.target.value) || 0 }));
  };

  const onDms = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditingTm3(false);
    const next = { ...dmsDerived, [e.target.name]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value };
    setDmsRaw(next);
    setCoords({ lat: dmsToDd(next.latDeg, next.latMin, next.latSec, next.latDir), lon: dmsToDd(next.lonDeg, next.lonMin, next.lonSec, next.lonDir) });
  };

  const onTm3 = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTm3(true);
    const next = { ...tm3Raw, [e.target.name]: e.target.value };
    setTm3Raw(next);
    try {
      const x = parseFloat(next.x), y = parseFloat(next.y);
      if (!isNaN(x) && !isNaN(y)) { const [lat, lon] = tm3ToWgs84(x, y, zone); setCoords({ lat, lon }); }
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
            const lat = parseFloat(row.lat ?? row.latitude), lon = parseFloat(row.lon ?? row.longitude);
            if (!isNaN(lat) && !isNaN(lon)) { const [x, y] = wgs84ToTm3(lat, lon, zone); return { ...row, tm3_x: x.toFixed(3), tm3_y: y.toFixed(3), tm3_zone: zone }; }
            const x = parseFloat(row.x ?? row.easting ?? row.tm3_x), y = parseFloat(row.y ?? row.northing ?? row.tm3_y);
            if (!isNaN(x) && !isNaN(y)) { const [rl, rn] = tm3ToWgs84(x, y, zone); return { ...row, wgs84_lat: rl.toFixed(6), wgs84_lon: rn.toFixed(6), tm3_zone: zone }; }
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
    <main className="min-h-screen bg-[var(--bg)] flex items-start md:items-center justify-center p-3 md:p-6 transition-colors duration-300">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-80 h-80 rounded-full blur-[100px]" style={{ background: 'var(--glow1)' }} />
        <div className="absolute -bottom-20 right-1/4 w-64 h-64 rounded-full blur-[80px]" style={{ background: 'var(--glow2)' }} />
      </div>

      <div className="relative w-full max-w-3xl">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] backdrop-blur-2xl shadow-xl overflow-hidden">

          {/* ── Header ── */}
          <div className="px-4 md:px-5 py-3 border-b border-[var(--divider)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Navigation size={15} className="text-blue-500" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-[var(--text)] tracking-tight">TM3 Converter</h1>
                <p className="text-[9px] font-semibold text-blue-500/60 uppercase tracking-[0.15em] hidden sm:block">Indonesia · DGN95 / WGS84</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Zone */}
              <div className="relative">
                <select value={zone} onChange={e => { setZone(e.target.value); setEditingTm3(false); }}
                  className="appearance-none pl-2 pr-6 py-1.5 bg-[var(--inp-bg)] border border-[var(--inp-border)] rounded-lg text-xs text-[var(--text)] outline-none focus:border-[var(--inp-focus)] transition-all cursor-pointer">
                  {TM3_ZONES.map(z => <option key={z.label} value={z.label}>Zone {z.label}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
              </div>
              {/* Theme toggle */}
              <button onClick={() => setDark(d => !d)}
                className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--inp-bg)] flex items-center justify-center hover:border-blue-500/40 transition-all">
                {dark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-blue-500" />}
              </button>
            </div>
          </div>

          {/* ── Body: single col mobile, two col desktop ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-[var(--divider)]">

            {/* LEFT — Inputs */}
            <div className="px-4 md:px-5 py-4 space-y-4">

              {/* WGS84 / Geografis */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SectionLabel icon={Globe} label="WGS84 Geografis" color="text-blue-500/70" />
                  <div className="flex rounded-md overflow-hidden border border-[var(--border)]">
                    {(['dd', 'dms'] as const).map(m => (
                      <button key={m} onClick={() => { if (m === 'dms') setDmsRaw(dmsDerived); setWgsMode(m); }}
                        className={`px-2 py-0.5 text-[9px] font-bold uppercase transition-colors ${wgsMode === m ? 'bg-blue-500/20 text-blue-500' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {wgsMode === 'dd' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[8px] font-bold text-blue-500/50 uppercase tracking-widest mb-1 ml-0.5">Latitude</p>
                      <input type="number" name="lat" value={coords.lat} onChange={onWgs} step="0.000001" className={inp} />
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-blue-500/50 uppercase tracking-widest mb-1 ml-0.5">Longitude</p>
                      <input type="number" name="lon" value={coords.lon} onChange={onWgs} step="0.000001" className={inp} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[
                      { label: 'Latitude', fields: ['latDeg', 'latMin', 'latSec'] as const, dir: 'latDir' as const, opts: ['N', 'S'] },
                      { label: 'Longitude', fields: ['lonDeg', 'lonMin', 'lonSec'] as const, dir: 'lonDir' as const, opts: ['E', 'W'] },
                    ].map(({ label, fields, dir, opts }) => (
                      <div key={label}>
                        <p className="text-[8px] font-bold text-blue-500/50 uppercase tracking-widest mb-1 ml-0.5">{label}</p>
                        <div className="grid grid-cols-4 gap-1.5">
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

              {/* Divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-[var(--divider)]" />
                <span className="text-[8px] font-bold text-[var(--faint)] uppercase tracking-widest">atau</span>
                <div className="flex-1 h-px bg-[var(--divider)]" />
              </div>

              {/* TM3 */}
              <div>
                <SectionLabel icon={MapPin} label="TM3 — Easting / Northing" color="text-teal-500/70" />
                <div className="grid grid-cols-2 gap-2">
                  {[{ name: 'x', label: 'Easting (X)' }, { name: 'y', label: 'Northing (Y)' }].map(f => (
                    <div key={f.name}>
                      <p className="text-[8px] font-bold text-teal-500/50 uppercase tracking-widest mb-1 ml-0.5">{f.label}</p>
                      <input type="number" name={f.name} value={tm3[f.name as 'x' | 'y']} onChange={onTm3} className={inp} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Batch CSV */}
              <div>
                <SectionLabel icon={UploadCloud} label="Batch CSV" color="text-[var(--muted)]" />
                <label htmlFor="csv-file"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-[var(--border)] cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group">
                  <div className="w-7 h-7 rounded-lg bg-[var(--inp-bg)] border border-[var(--border)] flex items-center justify-center shrink-0 group-hover:border-blue-500/30 transition-all">
                    <UploadCloud size={13} className="text-[var(--muted)] group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--muted)] group-hover:text-[var(--text)] transition-colors">Upload CSV</p>
                    <p className="text-[9px] text-[var(--faint)]">Header: <code>lat, lon</code> atau <code>x, y</code></p>
                  </div>
                </label>
                <input ref={fileRef} id="csv-file" type="file" accept=".csv" onChange={onFile} className="hidden" />
                {csvMsg && <p className={`mt-1.5 text-[10px] font-semibold ${csvMsg.startsWith('Gagal') ? 'text-red-500' : 'text-emerald-500'}`}>{csvMsg}</p>}
              </div>
            </div>

            {/* RIGHT — Results */}
            <div className="px-4 md:px-5 py-4 border-t border-[var(--divider)] md:border-t-0 flex flex-col">
              <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3">Hasil Konversi</p>

              <div className="space-y-0.5 flex-1">
                <p className="text-[8px] font-bold text-blue-500/60 uppercase tracking-widest px-2 mb-1">WGS84</p>
                <Row label="Latitude"  value={coords.lat.toFixed(6)} accent="text-blue-500/60" />
                <Row label="Longitude" value={coords.lon.toFixed(6)} accent="text-blue-500/60" />
                <Row label="DMS Lat"   value={dmsLat} accent="text-blue-500/60" />
                <Row label="DMS Lon"   value={dmsLon} accent="text-blue-500/60" />
                <Row label="DD Pair"   value={`${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`} accent="text-blue-500/60" />

                <div className="my-2 h-px bg-[var(--divider)]" />

                <p className="text-[8px] font-bold text-teal-500/60 uppercase tracking-widest px-2 mb-1">
                  TM3 Zone {zone} · CM {curZone?.meridian}°
                </p>
                <Row label="Easting X"  value={tm3.x} accent="text-teal-500/60" />
                <Row label="Northing Y" value={tm3.y} accent="text-teal-500/60" />
                <Row label="X, Y"       value={`${tm3.x}, ${tm3.y}`} accent="text-teal-500/60" />
              </div>

              <p className="text-[9px] text-[var(--faint)] mt-3">© 2026 Coordinate Converter</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
