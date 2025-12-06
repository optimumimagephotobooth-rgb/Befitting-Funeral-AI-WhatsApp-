  const analyseLead = async (lead: LeadRecord) => {
    const key = lead.referral_code;
    setAnalysisLoading((prev) => ({ ...prev, [key]: true }));
    setAnalysisError((prev) => ({ ...prev, [key]: '' }));
    try {
      const payload = {
        channel: lead.channel || 'referral',
        message: lead.message || `Lead from ${lead.name || 'Unknown'} (${lead.phone_number})`,
        metadata: lead
      };
      const res = await fetchLeadAnalysis(payload);
      setAnalysis((prev) => ({ ...prev, [key]: res.analysis }));
    } catch (err) {
      setAnalysisError((prev) => ({ ...prev, [key]: 'Analysis failed. Try again.' }));
    } finally {
      setAnalysisLoading((prev) => ({ ...prev, [key]: false }));
    }
  };
import { useEffect, useMemo, useState } from 'react';
import { fetchLeads, fetchLeadAnalysis } from '../services/api';

interface LeadRecord {
  referral_code: string;
  status: string;
  phone_number: string;
  name: string;
  created_at: string;
  channel?: string;
  message?: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<Record<string, any>>({});
  const [analysisLoading, setAnalysisLoading] = useState<Record<string, boolean>>({});
  const [analysisError, setAnalysisError] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchLeads({ limit: 15 })
      .then((payload) => setLeads(payload.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Leads</h2>
        <p className="text-sm text-slate-500">{leads.length} recent referrals</p>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">
          Loading leads…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {leads.map((lead) => {
            const key = lead.referral_code;
            const ai = analysis[key];
            return (
              <article key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{lead.name || 'Anonymous'}</h3>
                    <p className="text-sm text-slate-500">{lead.phone_number}</p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>{new Date(lead.created_at).toLocaleDateString()}</p>
                    <p>{new Date(lead.created_at).toLocaleTimeString()}</p>
                  </div>
                </header>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                  <div>
                    <dt className="uppercase tracking-wide">Referral Code</dt>
                    <dd className="text-sm font-semibold text-slate-900">{lead.referral_code}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide">Status</dt>
                    <dd className="text-sm font-semibold">{lead.status}</dd>
                  </div>
                </dl>
                <div className="mt-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">Notes</p>
                  <p>{lead.message || 'No lead note captured yet.'}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => analyseLead(lead)}
                    disabled={analysisLoading[key]}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-500 hover:text-slate-900 disabled:opacity-50"
                  >
                    {analysisLoading[key] ? 'Analysing…' : 'Run AI Analysis'}
                  </button>
                  {analysisError[key] && <p className="text-xs text-rose-500">{analysisError[key]}</p>}
                </div>
                {ai && (
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
                      <span>Urgency: {ai.urgency}/5</span>
                      <span>Service: {ai.serviceType}</span>
                      <span>Tone: {ai.tone}</span>
                    </div>
                    <div className="mt-2 space-y-2 text-sm">
                      <p className="font-semibold text-slate-800">Key Details</p>
                      <ul className="text-slate-600">
                        <li>Name: {ai.keyDetails?.name || '—'}</li>
                        <li>Location: {ai.keyDetails?.location || '—'}</li>
                        <li>Date: {ai.keyDetails?.date || '—'}</li>
                        <li>Notes: {ai.keyDetails?.notes || '—'}</li>
                      </ul>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Suggested Reply
                      </p>
                      <p className="mt-1 whitespace-pre-line rounded-lg bg-white p-3 text-slate-700 shadow-inner">
                        {ai.suggestedReply}
                      </p>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

