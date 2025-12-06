import { useMemo, useState } from 'react';
import type {
  FamilyCaseSummary,
  FamilyDocument,
  FamilyScheduleItem,
  FamilyPayments,
  FamilyAutomationAlert
} from '../types';

type DashboardPageProps = {
  summary: FamilyCaseSummary | null;
  documents: FamilyDocument[];
  payments: FamilyPayments | null;
  schedule: FamilyScheduleItem[];
  onGenerateAi: (payload: { prompt: string; style?: string }) => Promise<string>;
};

const STYLES = [
  { value: 'formal', label: 'Formal tribute' },
  { value: 'poetic', label: 'Poetic' },
  { value: 'religious', label: 'Religious' },
  { value: 'short', label: 'Short note' }
];

export default function DashboardPage({
  summary,
  documents,
  payments,
  schedule,
  onGenerateAi
}: DashboardPageProps) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('formal');
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const automationAlerts = summary?.automationAlerts || [];
  const upcomingEvent = useMemo(
    () => schedule.find((event) => event.status !== 'COMPLETED'),
    [schedule]
  );

  const handleGenerateAi = async () => {
    if (!prompt.trim()) {
      return;
    }
    setAiError(null);
    setAiLoading(true);
    try {
      const suggestion = await onGenerateAi({ prompt: prompt.trim(), style });
      setAiResult(suggestion);
    } catch (error) {
      setAiError('Unable to generate a suggestion right now. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Status</p>
          <p className="mt-2 text-2xl font-semibold">{summary?.status ?? 'Pending'}</p>
          <p className="text-sm text-slate-400">{summary?.stage ?? 'Waiting for team'}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Outstanding</p>
          <p className="mt-2 text-2xl font-semibold">
            ₵ {(payments?.outstandingBalance ?? 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-slate-400">{payments?.charges.length ?? 0} charges recorded</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Documents</p>
          <p className="mt-2 text-2xl font-semibold">{documents.length}</p>
          <p className="text-sm text-slate-400">family uploads & approvals</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {automationAlerts.slice(0, 3).map((alert: FamilyAutomationAlert) => (
          <article
            key={alert.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
              {alert.severity ? alert.severity.toUpperCase() : 'Info'}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{alert.title}</p>
            <p className="mt-1 text-sm text-slate-400">{alert.description}</p>
          </article>
        ))}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Next event</p>
          {upcomingEvent ? (
            <>
              <p className="mt-2 text-lg font-semibold text-white">{upcomingEvent.label}</p>
              <p className="text-sm text-slate-400">{upcomingEvent.notes}</p>
              <p className="mt-1 text-sm text-slate-400">
                {upcomingEvent.scheduled_start
                  ? new Date(upcomingEvent.scheduled_start).toLocaleString()
                  : 'Time pending'}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No upcoming activity yet.</p>
          )}
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.4em] text-slate-500">AI assistant</p>
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
              {style}
            </span>
          </div>
          <textarea
            className="h-40 w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-emerald-400"
            placeholder="Add the notes you want drafted into a biography, tribute, or remembrance."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <div className="flex items-center gap-3">
            <select
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              className="rounded-full border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm text-white outline-none"
            >
              {STYLES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleGenerateAi}
              disabled={aiLoading}
              className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
            >
              {aiLoading ? 'Generating…' : 'Generate'}
            </button>
          </div>
          {aiError && <p className="text-sm text-rose-300">{aiError}</p>}
          {aiResult && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              {aiResult}
            </div>
          )}
        </article>

        <article className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.4em] text-slate-500">Download centre</p>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
              {documents.length} docs
            </span>
          </div>
          <div className="space-y-2">
            {documents.slice(0, 4).map((doc) => (
              <div
                key={doc.id}
                className="flex items-start justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-white">{doc.title}</p>
                  <p className="text-xs text-slate-500">Uploaded {new Date(doc.created_at).toLocaleString()}</p>
                </div>
                <a
                  href={doc.file_url || '#'}
                  className="text-xs font-semibold uppercase tracking-widest text-emerald-300 transition hover:text-emerald-200"
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              </div>
            ))}
            {documents.length === 0 && (
              <p className="text-xs text-slate-500">Family uploads will appear here once added.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

