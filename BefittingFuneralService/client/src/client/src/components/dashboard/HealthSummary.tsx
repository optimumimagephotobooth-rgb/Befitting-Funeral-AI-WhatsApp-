interface HealthSummaryProps {
  pulseLabel: string;
  quietState: 'normal' | 'warning' | 'alert';
  quietDetail: string;
  anomalyNotes: string[];
  thresholdNote: string;
  syncNote: string;
  quietLoading?: boolean;
}

const quietStateClasses: Record<HealthSummaryProps['quietState'], string> = {
  normal: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border border-amber-200',
  alert: 'bg-rose-100 text-rose-700 border border-rose-200'
};

export function HealthSummary({
  pulseLabel,
  quietState,
  quietDetail,
  anomalyNotes,
  thresholdNote,
  syncNote,
  quietLoading
}: HealthSummaryProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">System Health Summary</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Live status across cases, staff, and quiet-period detectors.
          </p>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${quietStateClasses[quietState]}`}>
          {quietLoading ? 'Syncing…' : quietState === 'normal' ? 'Stable cadence' : quietState === 'warning' ? 'Early quiet' : 'Quiet alert'}
        </span>
      </header>

      <ul className="space-y-2 text-sm text-slate-700">
        <li>
          <strong className="text-slate-900">Pulse:</strong> {pulseLabel}
        </li>
        <li>
          <strong className="text-slate-900">Quiet window:</strong> {quietDetail}
        </li>
        <li>
          <strong className="text-slate-900">Thresholds:</strong> {thresholdNote}
        </li>
        <li>
          <strong className="text-slate-900">Org sync:</strong> {syncNote}
        </li>
        {anomalyNotes.length > 0 ? (
          <li>
            <strong className="text-slate-900">Recent anomalies:</strong>{' '}
            {anomalyNotes.join(' · ')}
          </li>
        ) : (
          <li>
            <strong className="text-slate-900">Recent anomalies:</strong> None detected
          </li>
        )}
      </ul>
    </section>
  );
}

