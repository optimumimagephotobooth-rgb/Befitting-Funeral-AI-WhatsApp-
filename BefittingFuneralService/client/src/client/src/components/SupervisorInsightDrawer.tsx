import React from 'react';

type Insight = {
  riskScore?: number;
  summary?: string;
  action?: string;
  tags?: string[];
};

type Props = {
  insight: Insight | null;
};

export default function SupervisorInsightDrawer({ insight }: Props) {
  const riskScore = insight?.riskScore ?? 0;
  const riskColor =
    riskScore > 70 ? 'from-rose-500 to-rose-700' : riskScore >= 40 ? 'from-amber-400 to-amber-600' : 'from-emerald-400 to-emerald-600';

  return (
    <aside className="pointer-events-none fixed right-0 top-0 z-40 h-full w-80 bg-black/40">
      <div className="pointer-events-auto flex h-full w-full flex-col justify-between border-l border-slate-800 bg-slate-950/90 p-4 shadow-lg">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Supervisor AI</p>
          <div className="mt-4">
            <div
              className={`flex w-full items-center justify-between rounded-full bg-gradient-to-r ${riskColor} p-3 text-sm font-semibold text-white`}
            >
              <span>Risk {Math.round(riskScore)}</span>
              <span>{riskScore > 75 ? 'High' : riskScore > 40 ? 'Medium' : 'Low'}</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-200">{insight?.summary || 'Monitoring operational risks…'}</p>
          <p className="mt-2 text-xs text-slate-400">{insight?.action || 'Awaiting new observations.'}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(insight?.tags || []).map((tag) => (
              <span key={tag} className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-300">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button className="rounded-full border border-emerald-500 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
            View Case
          </button>
          <button className="rounded-full border border-slate-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
            Fix Allocation
          </button>
          <button className="rounded-full border border-slate-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
            Update Work Order
          </button>
        </div>
      </div>
    </aside>
  );
}

