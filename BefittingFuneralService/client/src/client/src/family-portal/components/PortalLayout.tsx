import type { ReactNode } from 'react';
import { FamilyPortalView } from '../types';

type PortalLayoutProps = {
  view: FamilyPortalView;
  onNavigate: (view: FamilyPortalView) => void;
  onLogout: () => void;
  caseRef?: string;
  stage?: string;
  status?: string;
  deceasedName?: string;
  children: ReactNode;
  alertCount?: number;
};

const NAVIGATION: { view: FamilyPortalView; label: string }[] = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'documents', label: 'Documents' },
  { view: 'payments', label: 'Payments' },
  { view: 'schedule', label: 'Schedule' },
  { view: 'chat', label: 'Family Chat' }
];

export default function PortalLayout({
  view,
  onNavigate,
  onLogout,
  caseRef,
  stage,
  status,
  deceasedName,
  children,
  alertCount = 0
}: PortalLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex flex-col gap-2 border-b border-slate-800 bg-slate-900 px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Family Portal</p>
          <p className="text-lg font-semibold text-white">
            Case {caseRef || '—'}
            {deceasedName ? ` · ${deceasedName}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-widest text-slate-300">
            Status: {status || 'Loading'}
          </span>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-widest text-slate-300">
            Stage: {stage || 'Awaiting'}
          </span>
          {alertCount > 0 && (
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-300">
              {alertCount} Alerts
            </span>
          )}
          <button
            onClick={onLogout}
            className="rounded-full border border-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-300 transition hover:border-amber-400 hover:text-amber-200"
          >
            Logout
          </button>
        </div>
      </header>
      <nav className="border-b border-slate-800 bg-slate-900 px-6 py-3">
        <div className="flex flex-wrap gap-3">
          {NAVIGATION.map((item) => (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                view === item.view
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}

