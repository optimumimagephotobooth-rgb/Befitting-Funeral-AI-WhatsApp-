import CaseListPanel from '../components/cases/CaseListPanel';
import ConversationPanel from '../components/conversation/ConversationPanel';
import AiDraftPanel from '../components/ai/AiDraftPanel';
import ContactSummaryPanel from '../components/contacts/ContactSummaryPanel';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-night text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.5em] text-slate-500">Befitting Dashboard</p>
          <h1 className="text-4xl font-semibold">AI-assisted Care Flow</h1>
          <p className="text-slate-400">Phase 2/3 interface for cases, conversations, and approvals.</p>
        </header>
        <div className="grid gap-6 lg:grid-cols-3">
          <CaseListPanel />
          <ConversationPanel />
          <ContactSummaryPanel />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <AiDraftPanel />
        </div>
      </div>
    </div>
  );
}



