import type { ReactNode } from 'react';

interface CaseHeaderProps {
  caseRef?: string;
  clientName?: string;
  stage?: string;
  actions?: ReactNode;
  onClose?: () => void;
}

const DEFAULT_STAGE_COLOR = {
  NEW: 'bg-blue-500/20 text-blue-200 border-blue-400/60',
  INTAKE: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60',
  DOCUMENTS: 'bg-cyan-500/20 text-cyan-100 border-cyan-400/60',
  QUOTE: 'bg-amber-500/20 text-amber-100 border-amber-400/60',
  SCHEDULED: 'bg-purple-500/20 text-purple-100 border-purple-400/60',
  SERVICE_DAY: 'bg-rose-500/20 text-rose-100 border-rose-400/60',
  COMPLETED: 'bg-slate-500/20 text-slate-200 border-slate-400/60'
} as const;

export default function CaseHeader({
  caseRef = 'CASE-XXXX',
  clientName = 'Client name',
  stage = 'NEW',
  actions,
  onClose
}: CaseHeaderProps) {
  const stageBadgeColor =
    DEFAULT_STAGE_COLOR[stage as keyof typeof DEFAULT_STAGE_COLOR] ??
    DEFAULT_STAGE_COLOR.NEW;

  return (
    <header className="flex h-[70px] flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-900 px-6 text-slate-100">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">Case reference</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-50">{caseRef}</h1>
          <span className="text-sm text-slate-300">• {clientName}</span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${stageBadgeColor}`}
          >
            {stage}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {actions}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400 hover:text-white transition"
          >
            Exit
          </button>
        )}
      </div>
    </header>
  );
}

