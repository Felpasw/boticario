export default function DashboardPage() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Dashboard em breve
      </h2>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        KPIs, heatmap, timeseries e lista de recorrentes chegam na spec 005. Por enquanto, a sessão
        tá autenticada e o shell protegido.
      </p>
    </section>
  );
}
