export interface KpiCard {
  label: string;
  value: string;
  hint?: string;
  variation?: { pct: number; direction: 'up' | 'down' | 'flat' };
}

export const MOCK_KPIS: KpiCard[] = [
  {
    label: 'Visitas',
    value: '1.284',
    hint: 'últimos 30 dias',
    variation: { pct: 12.3, direction: 'up' },
  },
  {
    label: 'Visitantes únicos',
    value: '472',
    hint: '66% novos · 34% recorrentes',
    variation: { pct: 2.1, direction: 'down' },
  },
  {
    label: 'Dwell mediano',
    value: '14min',
    hint: 'p50 das sessões < 8h',
    variation: { pct: 4.6, direction: 'up' },
  },
  {
    label: 'Pico diário',
    value: 'Sáb 17h',
    hint: '87 visitas/h',
    variation: { pct: 0, direction: 'flat' },
  },
];

export interface VisitsPerDayEntry {
  day: string;
  total: number;
  recurring: number;
}

const DAYS = Array.from({ length: 30 }, (_, i) => i + 1);
const BASE_SERIES = [
  32, 28, 35, 41, 48, 52, 43, 36, 29, 34, 44, 51, 58, 62, 55, 48, 41, 46, 53, 61, 69, 72, 65, 57,
  49, 54, 63, 71, 78, 84,
];

export const MOCK_VISITS_PER_DAY: VisitsPerDayEntry[] = DAYS.map((day, i) => {
  const total = BASE_SERIES[i] ?? 40;
  return {
    day: `D-${30 - day}`,
    total,
    recurring: Math.round(total * 0.34),
  };
});

export interface HourlyBucket {
  hour: string;
  visits: number;
}

export const MOCK_HOURLY: HourlyBucket[] = [
  { hour: '08h', visits: 12 },
  { hour: '09h', visits: 18 },
  { hour: '10h', visits: 28 },
  { hour: '11h', visits: 36 },
  { hour: '12h', visits: 52 },
  { hour: '13h', visits: 58 },
  { hour: '14h', visits: 44 },
  { hour: '15h', visits: 38 },
  { hour: '16h', visits: 46 },
  { hour: '17h', visits: 68 },
  { hour: '18h', visits: 72 },
  { hour: '19h', visits: 54 },
  { hour: '20h', visits: 32 },
  { hour: '21h', visits: 18 },
];

export const MOCK_WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const MOCK_HOURS = Array.from({ length: 14 }, (_, i) => 8 + i);

const PEAK_PATTERN = [0.1, 0.2, 0.4, 0.5, 0.7, 0.9, 0.6, 0.5, 0.7, 0.95, 1.0, 0.8, 0.4, 0.2];

export const MOCK_HEATMAP: number[][] = MOCK_WEEKDAYS.map((_, weekday) =>
  PEAK_PATTERN.map((intensity, hour) => {
    const weekdayBoost = weekday === 6 ? 1.3 : weekday === 0 ? 0.6 : 1;
    return Math.round(intensity * 60 * weekdayBoost + hour * 0.3);
  }),
);

export interface DwellBucket {
  label: string;
  count: number;
}

export const MOCK_DWELL: DwellBucket[] = [
  { label: '0-5min', count: 112 },
  { label: '5-15min', count: 348 },
  { label: '15-30min', count: 421 },
  { label: '30-60min', count: 196 },
  { label: '60+min', count: 54 },
];

export interface RecurringDevice {
  deviceId: string;
  visits: number;
  lastSeenRelative: string;
  avgDwell: string;
}

export const MOCK_TOP_RECURRING: RecurringDevice[] = [
  { deviceId: '#a3f0…c812', visits: 23, lastSeenRelative: 'há 2h', avgDwell: '26 min' },
  { deviceId: '#b19e…d442', visits: 19, lastSeenRelative: 'ontem', avgDwell: '18 min' },
  { deviceId: '#4c21…9ab7', visits: 17, lastSeenRelative: 'há 3d', avgDwell: '34 min' },
  { deviceId: '#e5fa…1b03', visits: 15, lastSeenRelative: 'há 1d', avgDwell: '12 min' },
  { deviceId: '#7d6c…ff28', visits: 14, lastSeenRelative: 'há 2d', avgDwell: '22 min' },
  { deviceId: '#2b88…6a71', visits: 12, lastSeenRelative: 'há 5h', avgDwell: '28 min' },
  { deviceId: '#90a3…c0de', visits: 11, lastSeenRelative: 'há 1w', avgDwell: '19 min' },
  { deviceId: '#f1e2…3344', visits: 10, lastSeenRelative: 'ontem', avgDwell: '41 min' },
];
