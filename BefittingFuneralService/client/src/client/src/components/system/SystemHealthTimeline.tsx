import { useMemo } from 'react';
import { useHeartbeatStatus } from '../../hooks/useHeartbeatStatus';

const WINDOW_MS = 24 * 60 * 60 * 1000;

const moodColors: Record<string, string> = {
  ok: '#34d399',
  degraded: '#fbbf24',
  down: '#f87171'
};

export default function SystemHealthTimeline() {
  const heartbeat = useHeartbeatStatus();

  const segments = useMemo(() => {
    const now = Date.now();
    const history = heartbeat.history.length
      ? heartbeat.history
      : [
          {
            timestamp: now,
            overall: heartbeat.overall,
            statuses: heartbeat.statuses
          }
        ];

    const items = history
      .filter((entry) => now - entry.timestamp <= WINDOW_MS)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((entry, idx, arr) => {
        const next = arr[idx + 1];
        const end = next ? next.timestamp : now;
        const duration = Math.max(end - entry.timestamp, 1000);
        return {
          key: `${entry.timestamp}-${idx}`,
          duration,
          color: moodColors[entry.overall] || '#d1d5db'
        };
      });

    const total = items.reduce((sum, item) => sum + item.duration, 0) || 1;

    return items.map((item) => ({
      ...item,
      flex: item.duration / total
    }));
  }, [heartbeat]);

  return (
    <div className="w-48" title="Past 24h system health timeline">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
        {segments.map((segment) => (
          <span
            key={segment.key}
            style={{ flex: segment.flex, backgroundColor: segment.color }}
            className="transition-all"
          />
        ))}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
        <span>24h</span>
        <span>now</span>
      </div>
    </div>
  );
}

