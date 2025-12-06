interface StaffStatusToggleProps {
  isActive: boolean;
  disabled?: boolean;
  busy?: boolean;
  onToggle: () => void;
}

export default function StaffStatusToggle({ isActive, disabled, busy, onToggle }: StaffStatusToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || busy}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
        isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
      } ${disabled || busy ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80'}`}
    >
      {busy ? 'Saving…' : isActive ? 'Active' : 'Disabled'}
    </button>
  );
}


