import AiDraftToolbar from './AiDraftToolbar';

export default function AiDraftPanel() {
  return (
    <section className="rounded-3xl border border-slate-800 bg-dusk/80 p-5 shadow-lg">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">AI Draft Panel</h2>
        <p className="text-xs text-slate-500">Drafts are generated for staff review only.</p>
      </header>
      <AiDraftToolbar />
      <div className="mt-4 rounded-2xl border border-slate-700 bg-night/70 p-4 text-sm text-slate-300">
        <p>AI drafts appear here after generation.</p>
      </div>
    </section>
  );
}



