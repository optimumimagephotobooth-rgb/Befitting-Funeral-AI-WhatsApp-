interface HeartbeatIndicatorProps {
  lastEventLabel: string;
  mood: 'normal' | 'quiet' | 'spiky';
  quietDetail: string;
  anomalies: string[];
  series: number[]; // length 48, oldest->newest
}

const moodClasses: Record<HeartbeatIndicatorProps['mood'], string> = {
  normal: 'text-emerald-600 bg-emerald-50 border border-emerald-200',
  quiet: 'text-amber-600 bg-amber-50 border border-amber-200',
  spiky: 'text-rose-600 bg-rose-50 border border-rose-200'
};

export function HeartbeatIndicator({
  lastEventLabel,
  mood,
  quietDetail,
  anomalies,
  series
}: HeartbeatIndicatorProps) {
  const max = Math.max(...series, 1);
  const moodLabel =
    mood === 'normal' ? 'Stable pulse' : mood === 'quiet' ? 'Soft pulse' : 'Spiky pulse';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">24h heartbeat</h3>
          <p className="text-xs text-slate-500">{lastEventLabel}</p>
        </div>
        <span className={`px-3 py-1 text-[11px] font-semibold rounded-full ${moodClasses[mood]}`}>
          {moodLabel}
        </span>
      </div>

      <div className="flex items-end gap-[2px] h-16">
        {series.map((value, idx) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            className={`flex-1 rounded-sm ${
              mood === 'spiky' ? 'bg-rose-400/70' : 'bg-emerald-400/70'
            }`}
            style={{ height: `${(value / max) * 100}%` }}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs text-slate-600">
        <p>
          <strong className="text-slate-900">Quiet detector:</strong> {quietDetail}
        </p>
        <p>
          <strong className="text-slate-900">Anomalies:</strong>{' '}
          {anomalies.length ? anomalies.join(' · ') : 'None in the last 48h'}
        </p>
      </div>
    </section>
  );
}

