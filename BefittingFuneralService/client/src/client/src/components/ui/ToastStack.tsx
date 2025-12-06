export type ToastVariant = 'info' | 'warning' | 'danger';

export interface ToastPayload {
  id: string;
  message: string;
  severity: ToastVariant;
  action?: () => void;
}

interface ToastStackProps {
  toasts: ToastPayload[];
  onDismiss: (id: string) => void;
}

const severityStyles: Record<ToastVariant, string> = {
  info: 'bg-slate-900 text-white border border-slate-800',
  warning: 'bg-amber-100 text-amber-900 border border-amber-200',
  danger: 'bg-rose-100 text-rose-900 border border-rose-200'
};

export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (!toasts.length) {
    return null;
  }

  const handleToastClick = (toast: ToastPayload) => {
    if (toast.action) {
      toast.action();
    }
    onDismiss(toast.id);
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={`w-72 text-left rounded-xl px-4 py-3 shadow-lg backdrop-blur transition hover:scale-[1.01] ${severityStyles[toast.severity]}`}
          onClick={() => handleToastClick(toast)}
        >
          <div className="flex items-start justify-between gap-3 text-sm font-medium">
            <span>{toast.message}</span>
            <span className="text-xs opacity-70">View</span>
          </div>
        </button>
      ))}
    </div>
  );
}

