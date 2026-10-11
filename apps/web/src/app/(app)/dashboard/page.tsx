'use client';

import { motion } from 'motion/react';

import { AlertsBanner } from '@/components/dashboards/AlertsBanner';
import { DashboardFilters } from '@/components/dashboards/DashboardFilters';
import { DwellDistributionChart } from '@/components/dashboards/DwellDistributionChart';
import { KpiCards } from '@/components/dashboards/KpiCards';
import { Section } from '@/components/dashboards/Section';
import { SectionHeader } from '@/components/dashboards/SectionHeader';
import { TopRecurringList } from '@/components/dashboards/TopRecurringList';
import { VisitsPerDayChart } from '@/components/dashboards/VisitsPerDayChart';
import { WeekdayHourHeatmap } from '@/components/dashboards/WeekdayHourHeatmap';
import { useDateRange } from '@/hooks/useDateRange';
import metricsDwellDistributionHooks from '@/hooks/useMetricsDwellDistribution';
import metricsHeatmapHooks from '@/hooks/useMetricsHeatmap';
import metricsSummaryHooks from '@/hooks/useMetricsSummary';
import metricsTimeseriesHooks from '@/hooks/useMetricsTimeseries';
import metricsTopRecurringHooks from '@/hooks/useMetricsTopRecurring';
import { fadeUpItemVariants, staggeredContainerVariants } from '@/lib/motionVariants';

export default function DashboardPage() {
  const { from, to } = useDateRange();
  const period = { from, to };

  const summary = metricsSummaryHooks.use(period);
  const timeseries = metricsTimeseriesHooks.use({ ...period, granularity: 'day' });
  const heatmap = metricsHeatmapHooks.use(period);
  const dwell = metricsDwellDistributionHooks.use(period);
  const topRecurring = metricsTopRecurringHooks.use({ ...period, limit: 10 });

  return (
    <motion.div
      className="flex flex-col gap-10"
      variants={staggeredContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.header variants={fadeUpItemVariants} className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">
          Wi-Fi Insights
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Painel da loja</h1>
        <p className="text-sm text-muted-foreground">
          Métricas calculadas a partir das conexões Wi-Fi registradas na loja.
        </p>
      </motion.header>

      <motion.div variants={fadeUpItemVariants}>
        <DashboardFilters />
      </motion.div>

      <Section>
        <AlertsBanner alerts={summary.data?.alerts} />
      </Section>

      <Section>
        <SectionHeader>KPIs do período</SectionHeader>
        <KpiCards summary={summary.data} />
      </Section>

      <Section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <SectionHeader>Visitas por dia</SectionHeader>
          <div className="rounded-lg border border-border/50 bg-background p-4">
            <VisitsPerDayChart series={timeseries.data?.series} />
          </div>
        </div>
        <div>
          <SectionHeader>Dwell em faixas</SectionHeader>
          <div className="rounded-lg border border-border/50 bg-background p-4">
            <DwellDistributionChart distribution={dwell.data} />
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeader>Heatmap · weekday × hora</SectionHeader>
        <div className="rounded-lg border border-border/50 bg-background p-4">
          <WeekdayHourHeatmap matrix={heatmap.data?.matrix} />
        </div>
      </Section>

      <Section>
        <SectionHeader>Top dispositivos recorrentes</SectionHeader>
        <TopRecurringList devices={topRecurring.data?.data} />
      </Section>
    </motion.div>
  );
}
