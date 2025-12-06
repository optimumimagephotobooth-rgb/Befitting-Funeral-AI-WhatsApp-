import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchCemeteryPlots, fetchBurialAssignments } from '../services/api';

export default function CemeteryPage() {
  const [assignCaseId, setAssignCaseId] = useState('');
  const plotsQuery = useQuery({
    queryKey: ['cemetery-plots'],
    queryFn: () => fetchCemeteryPlots(),
    staleTime: 1000 * 60 * 5
  });
  const assignmentsQuery = useQuery({
    queryKey: ['burial-assignments', assignCaseId],
    queryFn: () => fetchBurialAssignments(assignCaseId),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(assignCaseId)
  });

  const plots = plotsQuery.data?.data || [];
  const assignments = assignmentsQuery.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Plot map overview</p>
        <p className="mt-2 text-slate-300">
          Use section/row/plot structure to keep the cemetery master data aligned with case assignments and availability.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {plots.map((plot: any) => (
            <div
              key={`${plot.section}-${plot.row}-${plot.plot_number}`}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-200"
            >
              <p className="font-semibold text-white">
                {plot.section} · {plot.row} · {plot.plot_number}
              </p>
              <p className="text-[10px] text-slate-400">Status: {plot.status}</p>
            </div>
          ))}
          {!plots.length && <p className="text-[11px] text-slate-500">No plot data yet.</p>}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Burial assignments</p>
          <div className="mt-2">
            <label className="text-[10px] text-slate-400 uppercase tracking-[0.3em]">Case ID for assignment</label>
            <input
              value={assignCaseId}
              onChange={(event) => setAssignCaseId(event.target.value)}
              placeholder="Enter case id..."
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-200"
            />
          </div>
          <div className="mt-3 space-y-2 text-[11px] text-slate-200">
            {!assignCaseId && (
              <p className="text-[11px] text-slate-500">Provide a case ID to view burial assignments.</p>
            )}
            {assignCaseId && assignmentsQuery.isLoading && (
              <p className="text-[11px] text-slate-500">Loading assignment data…</p>
            )}
            {assignCaseId && !assignmentsQuery.isLoading && assignments.length > 0 && (
              <ul className="space-y-2">
                {assignments.map((burial: any) => (
                  <li key={burial.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="font-semibold text-slate-100">{burial.case_id || 'Case'}</p>
                    <p className="text-[10px] text-slate-400">
                      Plot {`${burial.section || 'N/A'} · ${burial.row || 'N/A'} · ${burial.plot_number || 'N/A'}`}
                    </p>
                    <p className="text-[10px] text-emerald-200">
                      Time: {burial.burial_time ? new Date(burial.burial_time).toLocaleString() : 'TBD'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {assignCaseId && !assignmentsQuery.isLoading && assignments.length === 0 && (
              <p className="text-[11px] text-slate-500">No assignments yet for this case.</p>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Compliance alerts</p>
          <p className="mt-2 text-[11px] text-slate-300">
            Monitor Act 563 requirements, expired permits, or missing grave digger assignments.
          </p>
          <div className="mt-3 flex flex-col gap-2 text-[11px] text-amber-200">
            <div className="rounded-xl border border-amber-500 bg-amber-950/30 p-3">
              Double-booking detected in Section North · Row A · Plot 02.
            </div>
            <div className="rounded-xl border border-rose-500 bg-rose-950/30 p-3">
              Missing release note for BF-2025-134 before burial can proceed.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

