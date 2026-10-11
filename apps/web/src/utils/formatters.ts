const numberFormatter = new Intl.NumberFormat('pt-BR');
const relativeTimeFormatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

const HOURS_IN_DAY = 24;
const SECONDS_IN_MINUTE = 60;
const MILLIS_IN_HOUR = 1000 * 60 * 60;

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatPercent(ratio: number, fractionDigits = 1): string {
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}

export function formatMinutes(seconds: number | null): string {
  if (seconds === null) return '—';
  return `${Math.round(seconds / SECONDS_IN_MINUTE)} min`;
}

export function formatDeviceId(id: string): string {
  return `#${id.slice(0, 4)}…${id.slice(-4)}`;
}

export function formatRelativeTime(iso: string): string {
  const diffHours = Math.round((new Date(iso).getTime() - Date.now()) / MILLIS_IN_HOUR);
  if (Math.abs(diffHours) < HOURS_IN_DAY) return relativeTimeFormatter.format(diffHours, 'hour');
  return relativeTimeFormatter.format(Math.round(diffHours / HOURS_IN_DAY), 'day');
}

export function formatShortDate(iso: string): string {
  return shortDateFormatter.format(new Date(iso));
}
