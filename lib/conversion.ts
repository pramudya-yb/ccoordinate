export function ddToDmsString(dd: number, isLatitude: boolean): string {
  const neg = dd < 0;
  const abs = Math.abs(dd);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = ((minFull - min) * 60).toFixed(3);
  const dir = isLatitude ? (neg ? 'S' : 'N') : (neg ? 'W' : 'E');
  return `${deg}° ${min}′ ${sec}″ ${dir}`;
}

export function ddToDms(dd: number, isLatitude: boolean) {
  const neg = dd < 0;
  const abs = Math.abs(dd);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = parseFloat(((minFull - min) * 60).toFixed(4));
  const dir = isLatitude ? (neg ? 'S' : 'N') : (neg ? 'W' : 'E');
  return { deg, min, sec, dir };
}

export function dmsToDd(deg: number, min: number, sec: number, dir: string): number {
  const dd = deg + min / 60 + sec / 3600;
  return (dir === 'S' || dir === 'W') ? -dd : dd;
}
