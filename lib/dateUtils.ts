export function toLocalDateStr(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isToday(date: Date | string): boolean {
  return toLocalDateStr(new Date(date)) === toLocalDateStr(new Date());
}

export function todayDateStr(): string {
  return toLocalDateStr(new Date());
}