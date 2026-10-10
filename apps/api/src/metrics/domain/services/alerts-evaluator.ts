import type { Alert, AlertSeverity, AlertType, HeatmapCell } from 'shared';

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  warning: 0,
  info: 1,
  success: 2,
};

const MAX_ALERTS = 3;
const TREND_PCT_THRESHOLD = 15;
const LOW_TRAFFIC_PCT_THRESHOLD = -30;

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export interface AlertsInput {
  currentVisits: number;
  previousVisits: number;
  visitsVariationPct: number;
  peak: HeatmapCell | null;
}

type AlertRule = (input: AlertsInput) => Alert | null;

const RULES: Record<AlertType, AlertRule> = {
  TRAFFIC_PEAK: (input) => {
    const peak = input.peak;
    if (!peak || peak.count === 0) return null;
    return {
      type: 'TRAFFIC_PEAK',
      severity: 'info',
      title: 'Pico de tráfego',
      message: `Pico em ${WEEKDAY_LABELS[peak.weekday]} às ${String(peak.hour).padStart(2, '0')}h (${peak.count} visitas)`,
    };
  },
  NEW_RECORD: (input) => {
    if (input.previousVisits <= 0 || input.currentVisits <= input.previousVisits) return null;
    return {
      type: 'NEW_RECORD',
      severity: 'success',
      title: 'Novo recorde',
      message: `${input.currentVisits} visitas no período (anterior: ${input.previousVisits})`,
    };
  },
  TREND_UP: (input) => {
    if (input.visitsVariationPct <= TREND_PCT_THRESHOLD) return null;
    return {
      type: 'TREND_UP',
      severity: 'success',
      title: 'Tráfego em alta',
      message: `Visitas subiram ${input.visitsVariationPct.toFixed(1)}% vs. período anterior`,
    };
  },
  TREND_DOWN: (input) => {
    if (input.visitsVariationPct >= -TREND_PCT_THRESHOLD) return null;
    return {
      type: 'TREND_DOWN',
      severity: 'warning',
      title: 'Tráfego em queda',
      message: `Visitas caíram ${Math.abs(input.visitsVariationPct).toFixed(1)}% vs. período anterior`,
    };
  },
  LOW_TRAFFIC_DAY: (input) => {
    if (input.visitsVariationPct >= LOW_TRAFFIC_PCT_THRESHOLD) return null;
    return {
      type: 'LOW_TRAFFIC_DAY',
      severity: 'warning',
      title: 'Período fraco',
      message: 'Volume ficou bem abaixo da média do período anterior',
    };
  },
};

export function evaluateAlerts(input: AlertsInput): Alert[] {
  return Object.values(RULES)
    .map((rule) => rule(input))
    .filter((alert): alert is Alert => alert !== null)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, MAX_ALERTS);
}
