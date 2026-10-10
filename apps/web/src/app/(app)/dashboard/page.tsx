'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { DashboardFilters } from '@/components/dashboards/DashboardFilters';
import { DwellDistributionChart } from '@/components/dashboards/DwellDistributionChart';
import { HourlyTrafficChart } from '@/components/dashboards/HourlyTrafficChart';
import { KpiCards } from '@/components/dashboards/KpiCards';
import {
  MOCK_DWELL,
  MOCK_HEATMAP,
  MOCK_HOURLY,
  MOCK_HOURS,
  MOCK_KPIS,
  MOCK_TOP_RECURRING,
  MOCK_VISITS_PER_DAY,
  MOCK_WEEKDAYS,
} from '@/components/dashboards/mock';
import { TopRecurringList } from '@/components/dashboards/TopRecurringList';
import { VisitsPerDayChart } from '@/components/dashboards/VisitsPerDayChart';
import { WeekdayHourHeatmap } from '@/components/dashboards/WeekdayHourHeatmap';
import { fadeUpItemVariants, staggeredContainerVariants } from '@/lib/motionVariants';

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
      {children}
    </h2>
  );
}

function Section({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.section variants={fadeUpItemVariants} className={className}>
      {children}
    </motion.section>
  );
}

export default function DashboardPage() {
  return (
    <motion.div
      className="flex flex-col gap-10"
      variants={staggeredContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.header variants={fadeUpItemVariants} className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">
          Wi-Fi Insights · últimos 30 dias
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Painel da loja</h1>
        <p className="text-sm text-muted-foreground">
          Dados simulados — a ingestão real chega na spec 005.
        </p>
      </motion.header>

      <motion.div variants={fadeUpItemVariants}>
        <DashboardFilters />
      </motion.div>

      <Section>
        <SectionHeader>KPIs do período</SectionHeader>
        <KpiCards cards={MOCK_KPIS} />
      </Section>

      <Section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <SectionHeader>Visitas por dia</SectionHeader>
          <div className="rounded-lg border border-border/50 bg-background p-4">
            <VisitsPerDayChart data={MOCK_VISITS_PER_DAY} />
          </div>
        </div>
        <div>
          <SectionHeader>Dwell em faixas</SectionHeader>
          <div className="rounded-lg border border-border/50 bg-background p-4">
            <DwellDistributionChart buckets={MOCK_DWELL} />
          </div>
        </div>
      </Section>

      <Section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <SectionHeader>Tráfego por hora (dia típico)</SectionHeader>
          <div className="rounded-lg border border-border/50 bg-background p-4">
            <HourlyTrafficChart data={MOCK_HOURLY} />
          </div>
        </div>
        <div>
          <SectionHeader>Heatmap · weekday × hora</SectionHeader>
          <div className="rounded-lg border border-border/50 bg-background p-4">
            <WeekdayHourHeatmap matrix={MOCK_HEATMAP} weekdays={MOCK_WEEKDAYS} hours={MOCK_HOURS} />
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeader>Top dispositivos recorrentes</SectionHeader>
        <TopRecurringList devices={MOCK_TOP_RECURRING} />
      </Section>
    </motion.div>
  );
}
