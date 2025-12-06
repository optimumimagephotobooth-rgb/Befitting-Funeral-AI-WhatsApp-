interface ForecastIndicatorProps {
  riskScore?: number;
  level?: string;
  summary?: string;
  indicators?: string[];
  loading?: boolean;
}

const LEVEL_COLORS: Record<string, string> = {
  high: 'bg-rose-600/20 text-rose-200 border-rose-500/60',
  medium: 'bg-amber-500/20 text-amber-100 border-amber-400/60',
  low: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/60',
  calm: 'bg-slate-600/20 text-slate-200 border-slate-400/60'
};

export default function ForecastIndicator({
  riskScore = 0,
  level = 'calm',
  summary,
  indicators = [],
  loading
}: ForecastIndicatorProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
        Calculating forecast…
      </div>
    );
  }

  const badgeColor = LEVEL_COLORS[level] || LEVEL_COLORS.calm;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Case forecast</p>
          <p className="text-lg font-semibold text-white">{summary || 'Monitoring case stability.'}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${badgeColor}`}>
          {level} · {Math.round(riskScore)}%
        </span>
      </div>
      {indicators.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          {indicators.map((indicator) => (
            <li key={indicator}>{indicator}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

