import { QuietThresholdConfig } from '../../settings/quietThresholds';
import { useHeartbeatStatus } from '../../hooks/useHeartbeatStatus';

interface QuietSignalPanelProps {
  quietState: 'normal' | 'warning' | 'alert';
  quietDetail: string;
  quietConfig: QuietThresholdConfig;
  thresholdNote: string;
  syncNote: string;
}

const statusColors: Record<string, string> = {
  ok: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  degraded: 'bg-amber-100 text-amber-700 border border-amber-200',
  down: 'bg-rose-100 text-rose-700 border border-rose-200',
  unknown: 'bg-slate-100 text-slate-600 border border-slate-200'
};

export default function QuietSignalPanel({
  quietState,
  quietDetail,
  quietConfig,
  thresholdNote,
  syncNote
}: QuietSignalPanelProps) {
  const heartbeat = useHeartbeatStatus();

  const statusEntries = [
    { label: 'API', key: 'api' },
    { label: 'Storage', key: 'storage' },
    { label: 'Realtime', key: 'realtime' }
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Quiet Signals & Health</h3>
          <p className="text-xs text-slate-500">Heartbeat + quiet-period thresholds</p>
        </div>
        <span
          className={`px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] rounded-full ${
            quietState === 'normal'
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : quietState === 'warning'
              ? 'bg-amber-100 text-amber-700 border border-amber-200'
              : 'bg-rose-100 text-rose-700 border border-rose-200'
          }`}
        >
          {quietState === 'normal'
            ? 'Activity steady'
            : quietState === 'warning'
            ? 'Quiet warning'
            : 'Quiet alert'}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Heartbeat levels</p>
          <div className="grid grid-cols-2 gap-2">
            {statusEntries.map((entry) => {
              const status = heartbeat.statuses[entry.key as keyof typeof heartbeat.statuses] || 'unknown';
              return (
                <div
                  key={entry.key}
                  className={`rounded-xl p-3 text-xs font-semibold text-slate-900 ${statusColors[status] ?? statusColors.unknown}`}
                >
                  <p>{entry.label}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.2em]">{status}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">Last checked: {heartbeat.lastChecked ? new Date(heartbeat.lastChecked).toLocaleTimeString() : 'Pending'}</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Quiet thresholds</p>
          <ul className="space-y-1 text-sm text-slate-600">
            <li>
              <strong className="text-slate-900">Business warning:</strong> {quietConfig.businessWarningHours}h
            </li>
            <li>
              <strong className="text-slate-900">Business alert:</strong> {quietConfig.businessAlertHours}h
            </li>
            <li>
              <strong className="text-slate-900">Off-hours warning:</strong> {quietConfig.offHoursWarningHours}h
            </li>
            <li>
              <strong className="text-slate-900">Off-hours alert:</strong> {quietConfig.offHoursAlertHours}h
            </li>
          </ul>
          <p className="text-xs text-slate-500">{thresholdNote}</p>
          <p className="text-xs text-slate-500">{syncNote}</p>
          <p className="text-sm text-slate-700">
            <strong className="text-slate-900">Quiet detail:</strong> {quietDetail}
          </p>
        </div>
      </div>
    </section>
  );
}

