import { useMutation, useQuery } from '@tanstack/react-query';
import {
  fetchMortuaryBodies,
  releaseMortuaryBody
} from '../services/api';

export default function MortuaryPage() {
  const bodiesQuery = useQuery({
    queryKey: ['mortuary-bodies'],
    queryFn: () => fetchMortuaryBodies(),
    staleTime: 1000 * 60
  });

  const releaseMutation = useMutation({
    mutationFn: (payload: { bodyId: string }) => releaseMortuaryBody(payload),
    onSuccess: () => bodiesQuery.refetch()
  });

  const bodies = (bodiesQuery.data?.data || []) as any[];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Mortuary intake</p>
        <p className="mt-2 text-slate-300">
          Manage body register, storage slots, movement logs, and release approvals from one place.
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
              {bodies.map((body: any) => (
            <div key={body.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-sm font-semibold text-white">{body.name || 'Unknown'}</p>
              <p className="text-[11px] text-slate-400">
                Intake {new Date(body.intake_time).toLocaleString()}
              </p>
              <p className="text-[11px] text-emerald-300">Status: {body.status}</p>
              {body.status !== 'RELEASED' && (
                <button
                  onClick={() => releaseMutation.mutate({ bodyId: body.id })}
                  disabled={releaseMutation.status === 'pending'}
                  className="mt-3 rounded-full border border-emerald-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {releaseMutation.status === 'pending' ? 'Releasing…' : 'Mark released'}
                </button>
              )}
            </div>
          ))}
          {!bodies.length && (
            <span className="text-[11px] text-slate-500">No bodies registered yet.</span>
          )}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Storage log</p>
          <p className="mt-2 text-[11px] text-slate-300">Track fridge slots, temperatures, and durations.</p>
          <ul className="mt-3 space-y-2 text-[11px] text-slate-200">
            <li>Fridge A1 · 4 bodies · Avg temp 2°C</li>
            <li>Fridge B2 · 2 bodies · Avg temp 1°C</li>
            <li>Fridge C3 · 0 bodies · Cleaning scheduled</li>
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Movement log</p>
          <p className="mt-2 text-[11px] text-slate-300">Document transitions between storage, prep, and release.</p>
          <ul className="mt-3 space-y-2 text-[11px] text-slate-200">
            <li>John Doe · Storage → Dressing · 07:50</li>
            <li>Grace Appiah · Storage → Release Prep · 08:45</li>
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Release watch</p>
          <p className="mt-2 text-[11px] text-slate-300">Family verification and release evidence.</p>
          <div className="mt-3 text-[11px] text-emerald-200">
            Pending releases: {bodies.filter((body) => body.status !== 'RELEASED').length}
          </div>
        </section>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">AI condition summary</p>
        <p className="mt-2 text-[11px] text-slate-300">
          Generate briefing notes with AI based on condition logs and personal effects tagging.
        </p>
        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-[11px] text-slate-200">
          <p>Suggestion: Emphasize gentle handling of personalized artifacts and confirm temperature stability.</p>
          <button className="mt-3 rounded-full border border-emerald-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-200">
            Generate AI summary
          </button>
        </div>
      </div>
    </div>
  );
}

