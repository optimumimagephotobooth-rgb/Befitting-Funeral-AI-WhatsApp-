import CaseFilters from './CaseFilters';
import { useCases } from '../../store/caseStore';

export default function CaseListPanel() {
  const { cases, loading } = useCases();

  return (
    <section className="rounded-3xl border border-slate-800 bg-dusk/80 p-5 shadow-lg">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Case List</h2>
        <span className="text-xs text-slate-500">{loading ? 'Loading...' : `${cases.length} cases`}</span>
      </header>
      <CaseFilters />
      <div className="space-y-3">
        {cases.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-700 bg-night/40 p-3">
            <p className="text-sm text-slate-400">{item.case_ref ?? 'Case'}</p>
            <p className="text-base font-semibold text-white">{item.deceased_name ?? 'Unknown'}</p>
            <p className="text-xs text-slate-500">{item.status}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

