import { useMemo } from 'react';
import { useForecastDashboard } from '../hooks/useForecastDashboard';

const levelColors: Record<string, string> = {
  high: 'text-rose-500 bg-rose-500/10 border border-rose-500/40',
  medium: 'text-amber-500 bg-amber-500/10 border border-amber-500/40',
  low: 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/40',
  calm: 'text-slate-400 bg-slate-700/20 border border-slate-600/40'
};

const parseMetadata = (metadata: any) => {
  if (!metadata) return {};
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }
  return metadata;
};

export default function ForecastDashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } = useForecastDashboard();
  const distribution = data?.distribution || [];
  const latestForecasts = data?.latestForecasts || [];
  const recentEvents = data?.recentEvents || [];
  const recentHints = data?.recentHints || [];

  const totalCases = useMemo(
    () => distribution.reduce((sum, entry) => sum + (entry.count || 0), 0),
    [distribution]
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading forecast dashboard…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Unable to load forecast analytics.{' '}
        <button className="underline" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Intelligence</p>
            <h1 className="text-2xl font-semibold text-slate-900">Cross-Case Forecast Dashboard</h1>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:border-slate-400 transition"
            disabled={isFetching}
          >
            Refresh
          </button>
        </div>
        <p className="text-sm text-slate-500">
          Live view of all cases ranked by risk level, AI supervisor hints, and forecast trends.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {distribution.map((item) => {
          const color = levelColors[item.level] || levelColors.calm;
          const percentage = totalCases ? Math.round((item.count / totalCases) * 100) : 0;
          return (
            <div key={item.level} className={`rounded-2xl bg-white p-4 shadow-sm ${color}`}>
              <p className="text-xs uppercase tracking-wide opacity-70">{item.level}</p>
              <p className="text-2xl font-semibold">{item.count}</p>
              <p className="text-xs opacity-80">{percentage}% of monitored cases</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Highest Risk Cases</p>
        {latestForecasts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No forecasts logged yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Case</th>
                  <th className="px-3 py-2 text-left">Stage</th>
                  <th className="px-3 py-2 text-left">Risk</th>
                  <th className="px-3 py-2 text-left">Summary</th>
                  <th className="px-3 py-2 text-left">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestForecasts
                  .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
                  .slice(0, 10)
                  .map((forecast) => (
                    <tr key={forecast.case_id}>
                      <td className="px-3 py-2 font-semibold text-slate-900">{forecast.case_ref}</td>
                      <td className="px-3 py-2">{forecast.stage || forecast.status || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${levelColors[forecast.level] || ''}`}>
                          {forecast.level} · {Math.round(forecast.risk_score)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500">{forecast.summary}</td>
                      <td className="px-3 py-2 text-xs text-slate-400">
                        {new Date(forecast.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Forecast Timeline</p>
            <span className="text-xs text-slate-400">Last 50 events</span>
          </div>
          <div className="mt-4 space-y-3 max-h-[320px] overflow-y-auto">
            {recentEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No recent forecast events.</p>
            ) : (
              recentEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{event.case_ref}</span>
                    <time>{new Date(event.created_at).toLocaleString()}</time>
                  </div>
                  <p className="text-sm text-slate-900">
                    {event.summary} · <strong>{event.level}</strong> ({Math.round(event.risk_score)}%)
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Supervisor Hints</p>
            <span className="text-xs text-slate-400">Latest 20</span>
          </div>
          <div className="mt-4 space-y-3 max-h-[320px] overflow-y-auto">
            {recentHints.length === 0 ? (
              <p className="text-sm text-slate-500">No supervisor hints yet.</p>
            ) : (
              recentHints.map((hint, index) => {
                const meta = parseMetadata(hint.metadata);
                return (
                  <div key={`${hint.case_id}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{hint.case_ref}</span>
                      <time>{new Date(hint.created_at).toLocaleString()}</time>
                    </div>
                    <p className="text-sm text-slate-900">
                      {meta?.hints?.[0]?.message || meta?.summary || 'AI supervisor update'}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

