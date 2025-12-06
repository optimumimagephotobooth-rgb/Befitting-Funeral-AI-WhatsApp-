interface CaseOverviewPanelProps {
  caseRef: string;
  contactName?: string | null;
  contactPhone?: string | null;
  stageLabel?: string;
  funeralDate?: string | null;
  packageName?: string | null;
  totalAmount?: number | null;
  suggestedNextStep?: string | null;
  onCall?: () => void;
  onWhatsapp?: () => void;
  onAddNote?: () => void;
}

export default function CaseOverviewPanel({
  caseRef,
  contactName,
  contactPhone,
  stageLabel = 'Current stage',
  funeralDate,
  packageName,
  totalAmount,
  suggestedNextStep = 'Confirm intake details with family head.',
  onCall,
  onWhatsapp,
  onAddNote
}: CaseOverviewPanelProps) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Primary contact</p>
          <p className="text-lg font-semibold text-white">
            {contactName || 'Unknown contact'}
          </p>
          <p className="text-sm text-slate-400">
            {contactPhone || 'No number on file'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <button
              onClick={onCall}
              className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:border-slate-500"
            >
              Call
            </button>
            <button
              onClick={onWhatsapp}
              className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:border-slate-500"
            >
              WhatsApp
            </button>
            <button
              onClick={onAddNote}
              className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:border-slate-500"
            >
              Add note
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Case summary</p>
          <dl className="mt-2 space-y-1 text-sm text-slate-300">
            <div className="flex justify-between">
              <dt>Stage</dt>
              <dd className="font-semibold text-slate-50">{stageLabel}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Service date</dt>
              <dd>{funeralDate ? new Date(funeralDate).toLocaleDateString() : 'TBD'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Package</dt>
              <dd>{packageName || 'Not set'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Estimated total</dt>
              <dd>{totalAmount ? `GHS ${totalAmount.toFixed(2)}` : '—'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Suggested next step</p>
        <p className="mt-2 text-sm text-slate-300">{suggestedNextStep}</p>
        <p className="mt-4 text-[11px] uppercase tracking-wide text-slate-500">
          Case ID · {caseRef}
        </p>
      </div>
    </section>
  );
}

