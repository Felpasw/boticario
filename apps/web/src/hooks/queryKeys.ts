export const METRICS_QUERY_KEYS = {
  all: ['metrics'] as const,
  summary: (params?: object) => ['metrics', 'summary', params ?? {}] as const,
  heatmap: (params?: object) => ['metrics', 'heatmap', params ?? {}] as const,
  timeseries: (params?: object) => ['metrics', 'timeseries', params ?? {}] as const,
  dwellDistribution: (params?: object) => ['metrics', 'dwell-distribution', params ?? {}] as const,
  topRecurring: (params?: object) => ['metrics', 'top-recurring', params ?? {}] as const,
};

export const CONNECTIONS_QUERY_KEYS = {
  all: ['connections'] as const,
  list: (params?: object) => ['connections', 'list', params ?? {}] as const,
};
