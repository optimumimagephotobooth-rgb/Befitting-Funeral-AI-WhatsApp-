import { useEffect, useMemo, useState } from 'react';
import { fetchCases, fetchCaseDetails, fetchCaseEvents } from '../services/api';
import CaseDocumentsPanel from '../components/cases/CaseDocumentsPanel';
import CaseChargesPanel from '../components/cases/CaseChargesPanel';
import CaseWorkflowPanel from '../components/workflow/CaseWorkflowPanel';
import { fetchCaseWorkflow, transitionCaseStage, WorkflowSummary } from '../services/workflow';

interface CaseRecord {
  id: string;
  case_ref: string;
  status: string;
  stage?: string | null;
  created_at: string;
  updated_at: string;
  contact_name?: string | null;
  contact_phone?: string | null;
}

interface CaseContact {
  name?: string | null;
  phone_number?: string | null;
}

interface CaseDetailPayload {
  case: CaseRecord;
  contact?: CaseContact | null;
  messages: {
    id: string | number;
    direction: string;
    body: string;
    created_at?: string;
  }[];
}

interface CaseEvent {
  id: string | number;
  event_type: string;
  stage: string;
  metadata: string | Record<string, unknown> | null;
  created_at: string;
}

type CaseTab = 'overview' | 'messages' | 'documents' | 'charges' | 'timeline' | 'workflow';

export default function CasesPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState<CaseDetailPayload | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [caseEvents, setCaseEvents] = useState<CaseEvent[]>([]);
  const [eventLoading, setEventLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<CaseTab>('overview');
  const [workflow, setWorkflow] = useState<WorkflowSummary | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [transitioningStage, setTransitioningStage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchCases({ page, limit: 10, status: statusFilter || undefined })
      .then((payload) => {
        setCases(payload.data);
        setTotal(payload.pagination.total);
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / 10)), [total]);
  const filteredCases = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return cases;
    return cases.filter(
      (caseItem) =>
        caseItem.case_ref.toLowerCase().includes(term) ||
        (caseItem.contact_name?.toLowerCase().includes(term) ?? false) ||
        (caseItem.contact_phone?.toLowerCase().includes(term) ?? false)
    );
  }, [cases, searchTerm]);

  const staffProfile = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('staff_profile') || 'null');
    } catch {
      return null;
    }
  }, []);
  const canManageDocuments =
    staffProfile?.role === 'admin' ||
    staffProfile?.role === 'coordinator' ||
    staffProfile?.role === 'director';

  const workflowStages = ['NEW', 'INTAKE', 'DOCUMENTS', 'QUOTE', 'SCHEDULED', 'SERVICE_DAY', 'COMPLETED'];
  const tabs: { key: CaseTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'messages', label: 'Messages' },
    { key: 'documents', label: 'Documents' },
    { key: 'charges', label: 'Charges' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'workflow', label: 'Workflow' }
  ];

  const handleRowClick = async (caseId: string) => {
    setCaseLoading(true);
    setEventLoading(true);
    setWorkflowLoading(true);
    setWorkflowError(null);
    try {
      const [caseResp, eventsResp, workflowResp] = await Promise.all([
        fetchCaseDetails(caseId),
        fetchCaseEvents(caseId, { limit: 30 }),
        fetchCaseWorkflow(caseId)
      ]);
      setSelectedCase(caseResp.data);
      setCaseEvents(eventsResp.data);
      setWorkflow(workflowResp);
      setActiveTab('overview');
    } catch (err: any) {
      setWorkflowError(err?.response?.data?.error || 'Unable to load workflow data.');
    } finally {
      setCaseLoading(false);
      setEventLoading(false);
      setWorkflowLoading(false);
    }
  };

  const closeCase = () => {
    setSelectedCase(null);
    setCaseEvents([]);
    setWorkflow(null);
    setWorkflowError(null);
    setActiveTab('overview');
  };

  const handleStageTransition = async (nextStage: string) => {
    if (!selectedCase) return;
    setTransitioningStage(nextStage);
    setWorkflowError(null);
    try {
      const result = await transitionCaseStage(String(selectedCase.case.id), nextStage);
      setSelectedCase((prev) =>
        prev
          ? {
              ...prev,
              case: {
                ...prev.case,
                stage: result.case.stage,
                status: result.case.status
              }
            }
          : prev
      );
      setWorkflow({
        stage: result.case.stage,
        summary: result.workflow
      });
      if (result.timelineEvent) {
        setCaseEvents((prev) => [result.timelineEvent, ...prev]);
      }
      setCases((prev) =>
        prev.map((caseItem) =>
          caseItem.id === result.case.id
            ? { ...caseItem, stage: result.case.stage, status: result.case.status }
            : caseItem
        )
      );
    } catch (err: any) {
      setWorkflowError(err?.response?.data?.error || 'Unable to change stage.');
    } finally {
      setTransitioningStage(null);
    }
  };

  const selectedCaseStage = selectedCase ? selectedCase.case.stage || selectedCase.case.status : null;

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Cases</h2>
          <p className="text-sm text-slate-500">
            Paginated list of WhatsApp cases with contact info and status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">
            Status:
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              className="ml-2 rounded-md border border-slate-300 bg-white py-1 px-2 text-sm"
            >
              <option value="">All</option>
              {workflowStages.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <input
            type="search"
            placeholder="Search by case ref or contact"
            className="px-3 py-1 rounded-lg border border-slate-300 text-sm focus:border-amber-400 focus:outline-none"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center text-slate-500">
          Loading cases…
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Case ref</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCases.map((caseItem) => (
                  <tr
                    key={caseItem.id}
                    className="transition hover:bg-slate-50 cursor-pointer"
                    onClick={() => handleRowClick(caseItem.id)}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">{caseItem.case_ref}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-xs font-semibold">
                        {caseItem.stage || caseItem.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {caseItem.contact_name || caseItem.contact_phone || 'Unknown contact'}
                    </td>
                    <td className="px-4 py-3">{new Date(caseItem.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-500">
              Showing {filteredCases.length} of {total} total cases
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="px-3 py-1 rounded-lg border border-slate-300 text-sm text-slate-600 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                className="px-3 py-1 rounded-lg border border-slate-300 text-sm text-slate-600 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {selectedCase && (
        <div className="fixed inset-0 z-30 flex items-center justify-center px-4 py-6">
          <div className="fixed inset-0 bg-slate-900/70" onClick={closeCase} />
          <div className="relative z-40 flex h-[90vh] w-full max-w-6xl flex-col rounded-3xl bg-white shadow-2xl">
            <>
                  <header className="flex flex-col gap-2 border-b border-slate-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Case reference</p>
                      <h3 className="text-2xl font-semibold text-slate-900">
                        {selectedCase.case.case_ref}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {(selectedCaseStage || 'NEW')} ·{' '}
                        {selectedCase.contact?.name ||
                          selectedCase.case.contact_name ||
                          'No contact'}{' '}
                        ·{' '}
                        {selectedCase.contact?.phone_number ||
                          selectedCase.case.contact_phone ||
                          'No phone'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {selectedCaseStage || 'NEW'}
                      </span>
                      <button
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                        onClick={closeCase}
                      >
                        Close
                      </button>
                    </div>
                  </header>
                  <nav className="flex gap-1 border-b border-slate-100 px-6">
                    {tabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-3 text-sm font-semibold ${
                          activeTab === tab.key
                            ? 'text-amber-600 border-b-2 border-amber-500'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                  <div className="flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto px-6 py-4 space-y-4">
                      {activeTab === 'overview' && (
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                              <p className="text-xs uppercase tracking-wide text-slate-400">Contact</p>
                              <p className="text-lg font-semibold text-slate-900">
                                {selectedCase.contact?.name ||
                                  selectedCase.case.contact_name ||
                                  'Unknown contact'}
                              </p>
                              <p className="text-sm text-slate-500">
                                {selectedCase.contact?.phone_number ||
                                  selectedCase.case.contact_phone ||
                                  'No phone on file'}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                              <p className="text-xs uppercase tracking-wide text-slate-400">Case timeline</p>
                              <p className="text-sm text-slate-600">
                                Created {new Date(selectedCase.case.created_at).toLocaleString()}
                              </p>
                              <p className="text-sm text-slate-600">
                                Updated {new Date(selectedCase.case.updated_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {workflow?.summary && (
                            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                              <p className="text-xs uppercase tracking-wide text-slate-400">Stage requirements</p>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                                {workflow.summary.requirements.map((req) => (
                                  <li key={req}>{req}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'messages' && (
                        <div className="space-y-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400">Recent messages</p>
                          {caseLoading ? (
                            <p className="text-sm text-slate-500">Loading messages…</p>
                          ) : selectedCase.messages.length === 0 ? (
                            <p className="text-sm text-slate-500">No messages logged yet.</p>
                          ) : (
                            selectedCase.messages.map((message) => (
                              <div
                                key={message.id}
                                className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                              >
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  {message.direction}
                                </p>
                                <p className="text-sm text-slate-800">{message.body}</p>
                                {message.created_at && (
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    {new Date(message.created_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {activeTab === 'documents' && (
                        <CaseDocumentsPanel
                          caseId={String(selectedCase.case.id)}
                          canManage={canManageDocuments}
                        />
                      )}

                      {activeTab === 'charges' && (
                        <CaseChargesPanel
                          caseId={String(selectedCase.case.id)}
                          canManage={canManageDocuments}
                        />
                      )}

                      {activeTab === 'timeline' && (
                        <div className="space-y-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400">Case events</p>
                          {eventLoading ? (
                            <p className="text-sm text-slate-500">Loading events…</p>
                          ) : caseEvents.length === 0 ? (
                            <p className="text-sm text-slate-500">No events logged yet.</p>
                          ) : (
                            caseEvents.map((event) => (
                              <div
                                key={event.id}
                                className="rounded-xl border border-slate-100 bg-white p-3 text-xs text-slate-500"
                              >
                                <p className="text-sm font-semibold text-slate-800">{event.event_type}</p>
                                <p>Stage: {event.stage}</p>
                                {event.metadata && (
                                  <p className="text-[11px] text-slate-500">
                                    {typeof event.metadata === 'string'
                                      ? event.metadata
                                      : JSON.stringify(event.metadata)}
                                  </p>
                                )}
                                <p className="mt-1 text-[10px] text-slate-400">
                                  {new Date(event.created_at).toLocaleString()}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {activeTab === 'workflow' && (
                        <CaseWorkflowPanel
                          workflow={workflow}
                          loading={workflowLoading}
                          error={workflowError || undefined}
                          onTransition={handleStageTransition}
                          transitioningStage={transitioningStage}
                        />
                      )}
                    </div>
                  </div>
            </>
          </div>
        </div>
      )}
    </section>
  );
}

