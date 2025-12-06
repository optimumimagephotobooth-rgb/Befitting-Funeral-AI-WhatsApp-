interface WorkflowGuardProps {
  stage: string;
  allowedTransitions: string[];
}

export default function WorkflowGuard({ stage, allowedTransitions }: WorkflowGuardProps) {
  if (allowedTransitions.length > 0) {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
        <p className="font-semibold">Stage policy</p>
        <p>
          {stage} can move to {allowedTransitions.join(', ')} once requirements are satisfied.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      <p className="font-semibold text-slate-700">Stage locked</p>
      <p>No further transitions are defined for this stage.</p>
    </div>
  );
}

