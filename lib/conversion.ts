export function ddToDmsString(dd: number, isLatitude: boolean): string {
  const neg = dd < 0;
  const abs = Math.abs(dd);
  let deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  let min = Math.floor(minFull);
  let secNum = parseFloat(((minFull - min) * 60).toFixed(3));
  if (secNum >= 60) {
    secNum -= 60;
    min += 1;
  }
  if (min >= 60) {
    min -= 60;
    deg += 1;
  }
  const sec = secNum.toFixed(3);
  const dir = isLatitude ? (neg ? 'S' : 'N') : (neg ? 'W' : 'E');
  return `${deg}° ${min}′ ${sec}″ ${dir}`;
}

export function ddToDms(dd: number, isLatitude: boolean) {
  const neg = dd < 0;
  const abs = Math.abs(dd);
  let deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  let min = Math.floor(minFull);
  let sec = parseFloat(((minFull - min) * 60).toFixed(4));
  if (sec >= 60) {
    sec -= 60;
    min += 1;
  }
  if (min >= 60) {
    min -= 60;
    deg += 1;
  }
  const dir = isLatitude ? (neg ? 'S' : 'N') : (neg ? 'W' : 'E');
  return { deg, min, sec, dir };
}

export function dmsToDd(deg: number, min: number, sec: number, dir: string): number {
  const dd = Math.abs(deg) + Math.abs(min) / 60 + Math.abs(sec) / 3600;
  const upperDir = (dir || '').toUpperCase().trim();
  return (upperDir === 'S' || upperDir === 'W') ? -dd : dd;
}
