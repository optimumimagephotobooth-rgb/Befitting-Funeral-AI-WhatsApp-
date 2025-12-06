import type { FamilyScheduleItem } from '../types';

type SchedulePageProps = {
  schedule: FamilyScheduleItem[];
};

export default function SchedulePage({ schedule }: SchedulePageProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Funeral day timeline</p>
        <p className="text-sm text-slate-400">Updates are published in real-time.</p>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="space-y-3">
          {schedule.length ? (
            schedule.map((item, idx) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-200"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-500">
                  <span>{item.code || `Step ${idx + 1}`}</span>
                  <span className="rounded-full border border-slate-700 px-3 py-1 font-semibold">
                    {item.status}
                  </span>
                </div>
                <p className="text-lg font-semibold text-white">{item.label}</p>
                <p className="text-xs text-slate-400">
                  {item.scheduled_start
                    ? new Date(item.scheduled_start).toLocaleString()
                    : 'Time TBD'}
                </p>
                {item.notes && <p className="text-sm text-slate-400">{item.notes}</p>}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">Timeline will appear once we receive the schedule.</p>
          )}
        </div>
      </div>
    </div>
  );
}

