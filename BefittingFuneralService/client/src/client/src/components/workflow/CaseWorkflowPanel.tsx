import AIStageSuggestions from './AIStageSuggestions';
import StageHeader from './StageHeader';
import TransitionButtons from './TransitionButtons';
import WorkflowGuard from './WorkflowGuard';
import { WorkflowSummary } from '../../services/workflow';

interface CaseWorkflowPanelProps {
  workflow?: WorkflowSummary | null;
  loading: boolean;
  error?: string | null;
  onTransition: (stage: string) => void;
  transitioningStage?: string | null;
}

export default function CaseWorkflowPanel({
  workflow,
  loading,
  error,
  onTransition,
  transitioningStage
}: CaseWorkflowPanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Loading workflow…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!workflow) {
    return (
      <p className="text-sm text-slate-500">Workflow data not available for this case.</p>
    );
  }

  const { stage, summary } = workflow;

  return (
    <div className="space-y-4">
      <StageHeader
        stage={stage}
        label={summary.label}
        description={summary.description}
        stages={summary.stages}
      />

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
        <p className="text-xs uppercase tracking-wide text-slate-400">Stage requirements</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
          {summary.requirements.map((req) => (
            <li key={req}>{req}</li>
          ))}
        </ul>
      </section>

      <WorkflowGuard stage={stage} allowedTransitions={summary.allowedTransitions} />
      <TransitionButtons
        allowedTransitions={summary.allowedTransitions}
        onTransition={onTransition}
        disabled={!!transitioningStage}
        transitioningStage={transitioningStage}
      />

      <AIStageSuggestions suggestions={summary.aiSuggestions} />
    </div>
  );
}

