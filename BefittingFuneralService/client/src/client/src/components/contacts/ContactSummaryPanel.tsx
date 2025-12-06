export default function ContactSummaryPanel() {
  return (
    <section className="rounded-3xl border border-slate-800 bg-dusk/80 p-5 shadow-lg">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">Contact Summary</h2>
        <p className="text-xs text-slate-500">Staff-ready info</p>
      </header>
      <div className="space-y-2 text-sm text-slate-300">
        <p>Upcoming contact details will render here.</p>
      </div>
    </section>
  );
}



