import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSupervisorIntel, fetchSupervisorVoiceSummary } from '../services/api';

interface SupervisorIntel {
  generatedAt: string;
  aggregates: {
    cases: { active: number; completed: number; inprogress: number };
    automationAlerts: { alerts_24h: number; high_risk_24h: number };
    staffActivity: { actor_name: string; activity_count: number }[];
  };
  summary: {
    overview: string;
    workload: string[];
    risks: { caseRef: string; summary: string }[];
    staffEfficiency: string[];
    actions: string[];
  };
}

export default function SupervisorPage() {
  const [intel, setIntel] = useState<SupervisorIntel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const loadIntel = async () => {
      try {
        setLoading(true);
        const res = await fetchSupervisorIntel();
        setIntel(res.intel);
        setError(null);
      } catch (err) {
        console.error('Failed to load supervisor intel', err);
        setError('Unable to load supervisor intelligence. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    void loadIntel();
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const metrics = [
    {
      label: 'Active Cases',
      value: intel?.aggregates.cases.active ?? '—',
      detail: `${intel?.aggregates.cases.inprogress ?? 0} in progress`
    },
    {
      label: 'High-Risk Cases (48h)',
      value: intel?.aggregates.automationAlerts.high_risk_24h ?? '—',
      detail: 'Flagged by AI briefing'
    },
    {
      label: 'Delayed / Stalled',
      value: intel?.summary.risks?.length ?? '—',
      detail: 'Top risk list'
    },
    {
      label: 'Automation Alerts (24h)',
      value: intel?.aggregates.automationAlerts.alerts_24h ?? '—',
      detail: 'Requires review'
    }
  ];

  const handleDownloadPdf = useCallback(() => {
    window.open('/api/supervisor/intel/pdf', '_blank');
  }, []);

  const handlePlayVoiceSummary = useCallback(async () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceError('Voice playback is not supported in this browser.');
      return;
    }
    try {
      setVoiceLoading(true);
      setVoiceError(null);
      const res = await fetchSupervisorVoiceSummary();
      const transcript = res?.transcript || intel?.summary.overview || 'No summary available.';
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(transcript);
      speechRef.current = utterance;
      utterance.onend = () => {
        setVoiceLoading(false);
        speechRef.current = null;
      };
      utterance.onerror = () => {
        setVoiceLoading(false);
        setVoiceError('Unable to play voice summary.');
        speechRef.current = null;
      };
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Voice summary failed', err);
      setVoiceLoading(false);
      setVoiceError('Unable to play voice summary.');
    }
  }, [intel]);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Supervisor Intelligence</h2>
          <p className="text-sm text-slate-500">
            Executive view powered by Praxion AI. Updated{' '}
            {intel?.generatedAt ? new Date(intel.generatedAt).toLocaleString() : '—'}
          </p>
          {voiceError && <p className="text-xs text-rose-500">{voiceError}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            className="rounded-full border border-purple-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-wide text-purple-600 transition hover:bg-purple-50"
          >
            Download Intel PDF
          </button>
          <button
            onClick={handlePlayVoiceSummary}
            disabled={voiceLoading}
            className="rounded-full border border-purple-200 bg-purple-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
          >
            {voiceLoading ? 'Playing...' : 'Play Voice Summary'}
          </button>
          <div className="rounded-full border border-purple-200 bg-purple-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-purple-600">
            Strategic Mode
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-purple-100 bg-white/90 p-4 shadow-sm shadow-purple-100"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-400">{metric.label}</p>
            <p className="mt-2 text-3xl font-bold text-purple-700">
              {loading ? '…' : metric.value}
            </p>
            <p className="text-sm text-purple-500">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">
            Operational Overview
          </p>
          <p className="mt-3 text-sm text-slate-700 whitespace-pre-line">
            {loading ? 'Generating overview…' : intel?.summary.overview || 'Awaiting AI overview.'}
          </p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">
            Predicted Workload (48h)
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {(intel?.summary.workload || []).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
            {!intel?.summary.workload?.length && <li>Awaiting workload forecast.</li>}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">Top Risks</p>
          <div className="mt-3 space-y-3">
            {(intel?.summary.risks || []).slice(0, 5).map((risk, idx) => (
              <div key={idx} className="rounded-xl border border-red-100 bg-red-50/70 p-3 text-sm text-red-800">
                <p className="font-semibold text-red-900">{risk.caseRef || 'Case'}</p>
                <p>{risk.summary}</p>
              </div>
            ))}
            {!intel?.summary.risks?.length && <p className="text-sm text-slate-500">No risks surfaced.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">
            Staff Efficiency
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {(intel?.summary.staffEfficiency || []).map((item, idx) => (
              <p key={idx} className="rounded-lg bg-slate-50 px-3 py-2">
                {item}
              </p>
            ))}
            {!intel?.summary.staffEfficiency?.length && (
              <p className="text-sm text-slate-500">No staff efficiency notes yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">
          Recommended Action Plan (24–48h)
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {(intel?.summary.actions || []).map((action, idx) => (
            <li key={idx}>{action}</li>
          ))}
          {!intel?.summary.actions?.length && <li>No actions generated yet.</li>}
        </ul>
      </div>
    </section>
  );
}


