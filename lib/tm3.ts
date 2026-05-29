import proj4 from 'proj4';

export const TM3_ZONES = [
  { label: '46.1', meridian: 91.5 },
  { label: '46.2', meridian: 94.5 },
  { label: '47.1', meridian: 97.5 },
  { label: '47.2', meridian: 100.5 },
  { label: '48.1', meridian: 103.5 },
  { label: '48.2', meridian: 106.5 },
  { label: '49.1', meridian: 109.5 },
  { label: '49.2', meridian: 112.5 },
  { label: '50.1', meridian: 115.5 },
  { label: '50.2', meridian: 118.5 },
  { label: '51.1', meridian: 121.5 },
  { label: '51.2', meridian: 124.5 },
  { label: '52.1', meridian: 127.5 },
  { label: '52.2', meridian: 130.5 },
  { label: '53.1', meridian: 133.5 },
  { label: '53.2', meridian: 136.5 },
  { label: '54.1', meridian: 139.5 },
];

const WGS84 = 'EPSG:4326';
const getTm3Def = (m: number) =>
  `+proj=tmerc +lat_0=0 +lon_0=${m} +k=0.9999 +x_0=200000 +y_0=1500000 +ellps=WGS84 +units=m +no_defs`;

export function wgs84ToTm3(lat: number, lon: number, zoneLabel: string): [number, number] {
  const zone = TM3_ZONES.find(z => z.label === zoneLabel);
  if (!zone) throw new Error(`Invalid TM3 zone: ${zoneLabel}`);
  return proj4(WGS84, getTm3Def(zone.meridian), [lon, lat]) as [number, number];
}

export function tm3ToWgs84(x: number, y: number, zoneLabel: string): [number, number] {
  const zone = TM3_ZONES.find(z => z.label === zoneLabel);
  if (!zone) throw new Error(`Invalid TM3 zone: ${zoneLabel}`);
  const [lon, lat] = proj4(getTm3Def(zone.meridian), WGS84, [x, y]) as [number, number];
  return [lat, lon];
}
