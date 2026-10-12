export const PERIOD_EXAMPLE = {
  from: '2026-09-11T00:00:00.000Z',
  to: '2026-10-11T00:00:00.000Z',
};

export const SUMMARY_EXAMPLE = {
  period: PERIOD_EXAMPLE,
  kpis: {
    visits: { value: 2837, variation: { pct: 18.87, direction: 'up' } },
    uniqueVisitors: { value: 1881, variation: { pct: 19.05, direction: 'up' } },
    recurringRate: { value: 0.029, variation: { pct: 0, direction: 'flat' } },
    dwellMedianSeconds: { value: 900, variation: { pct: -0.22, direction: 'flat' } },
  },
  alerts: [
    {
      type: 'TRAFFIC_PEAK',
      severity: 'info',
      title: 'Pico de tráfego',
      message: 'Pico em Seg às 13h (28 visitas)',
    },
  ],
};

export const HEATMAP_EXAMPLE = {
  period: PERIOD_EXAMPLE,
  matrix: [
    { weekday: 0, hour: 12, count: 28 },
    { weekday: 0, hour: 13, count: 25 },
    { weekday: 1, hour: 12, count: 42 },
  ],
};

export const TIMESERIES_EXAMPLE = {
  period: PERIOD_EXAMPLE,
  granularity: 'day',
  series: [
    {
      bucket: '2026-09-11T00:00:00.000Z',
      visits: 72,
      uniqueVisitors: 54,
      newVisitors: 48,
      recurringVisitors: 6,
    },
    {
      bucket: '2026-09-12T00:00:00.000Z',
      visits: 85,
      uniqueVisitors: 63,
      newVisitors: 51,
      recurringVisitors: 12,
    },
  ],
};

export const DWELL_EXAMPLE = {
  period: PERIOD_EXAMPLE,
  buckets: [
    { label: '0-5min', lowerSeconds: 0, upperSeconds: 300, count: 93 },
    { label: '5-15min', lowerSeconds: 300, upperSeconds: 900, count: 1324 },
    { label: '15-30min', lowerSeconds: 900, upperSeconds: 1800, count: 1035 },
    { label: '30-60min', lowerSeconds: 1800, upperSeconds: 3600, count: 307 },
    { label: '60+min', lowerSeconds: 3600, upperSeconds: null, count: 78 },
  ],
  totalWithDwell: 2837,
};

export const TOP_RECURRING_EXAMPLE = {
  period: PERIOD_EXAMPLE,
  data: [
    {
      deviceId: 'da4364ec-242c-4271-b485-28155a8d7ddf',
      visitCount: 29,
      firstSeenInPeriodAt: '2026-09-11T17:28:00.000Z',
      lastSeenAt: '2026-10-09T19:17:00.000Z',
      avgDwellSeconds: 1056.4,
    },
  ],
};
