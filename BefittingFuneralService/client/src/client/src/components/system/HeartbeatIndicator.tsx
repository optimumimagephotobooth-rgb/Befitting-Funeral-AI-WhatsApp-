import { HeartbeatSnapshot, useHeartbeatStatus } from '../../hooks/useHeartbeatStatus';

function getColor(overall: HeartbeatSnapshot['overall']) {
  switch (overall) {
    case 'ok':
      return {
        dot: 'bg-emerald-500',
        text: 'text-emerald-700'
      };
    case 'degraded':
      return {
        dot: 'bg-amber-500',
        text: 'text-amber-700'
      };
    default:
      return {
        dot: 'bg-rose-500 animate-pulse',
        text: 'text-rose-700'
      };
  }
}

function formatLabel(overall: HeartbeatSnapshot['overall']) {
  if (overall === 'ok') {
    return 'All systems nominal';
  }
  if (overall === 'degraded') {
    return 'Partial outage';
  }
  return 'Disconnected';
}

function buildTooltip(state: HeartbeatSnapshot) {
  return [
    `API: ${state.statuses.api.toUpperCase()}`,
    `Storage: ${state.statuses.storage.toUpperCase()}`,
    `Realtime: ${state.statuses.realtime.toUpperCase()}`
  ].join('\n');
}

export default function HeartbeatIndicator() {
  const heartbeat = useHeartbeatStatus();
  const { dot, text } = getColor(heartbeat.overall);
  const label = formatLabel(heartbeat.overall);

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm"
        title={buildTooltip(heartbeat)}
      >
        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${dot}`} />
        <span className={`text-xs font-medium ${text}`}>{label}</span>
      </div>
      {heartbeat.statuses.realtime === 'down' && (
        <span className="text-[11px] text-amber-600">Offline mode – attempting to reconnect…</span>
      )}
    </div>
  );
}

