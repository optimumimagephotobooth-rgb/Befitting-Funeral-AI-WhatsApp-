interface TransitionButtonsProps {
  allowedTransitions: string[];
  onTransition: (stage: string) => void;
  disabled?: boolean;
  transitioningStage?: string | null;
}

export default function TransitionButtons({
  allowedTransitions,
  onTransition,
  disabled,
  transitioningStage
}: TransitionButtonsProps) {
  if (allowedTransitions.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No further transitions available. The case is at its terminal stage.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {allowedTransitions.map((stage) => (
        <button
          key={stage}
          disabled={disabled}
          onClick={() => onTransition(stage)}
          className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
        >
          {transitioningStage === stage ? 'Transitioning…' : `Move to ${stage}`}
        </button>
      ))}
    </div>
  );
}

