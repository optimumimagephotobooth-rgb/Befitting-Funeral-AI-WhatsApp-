import { ToastVariant } from './ToastStack';

export interface NotificationEntry {
  id: string;
  message: string;
  severity: ToastVariant;
  timestamp: string;
  action?: () => void;
}

interface NotificationDrawerProps {
  open: boolean;
  notifications: NotificationEntry[];
  onClose: () => void;
  onSelectEntry?: (entry: NotificationEntry) => void;
}

const severityBadgeStyles: Record<ToastVariant, string> = {
  info: 'bg-slate-100 text-slate-700 border border-slate-200',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200',
  danger: 'bg-rose-50 text-rose-800 border border-rose-200'
};

export default function NotificationDrawer({
  open,
  notifications,
  onClose,
  onSelectEntry
}: NotificationDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 z-50 h-full w-80 bg-white border-l border-slate-200 shadow-2xl flex flex-col"
        aria-label="Notifications"
      >
        <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Recent alerts</p>
            <p className="text-xs text-slate-500">Summaries of unusual activity</p>
          </div>
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-700"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              No unusual activity recorded yet.
            </p>
          ) : (
            <ol className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left space-y-2 hover:bg-slate-50"
                    onClick={() => {
                      if (notification.action) {
                        notification.action();
                      }
                      if (onSelectEntry) {
                        onSelectEntry(notification);
                      }
                      onClose();
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-semibold px-2 py-1 rounded-full ${severityBadgeStyles[notification.severity]}`}
                      >
                        {notification.severity === 'danger'
                          ? 'High'
                          : notification.severity === 'warning'
                          ? 'Medium'
                          : 'Low'}
                      </span>
                      <time className="text-xs text-slate-400">
                        {formatRelativeTime(notification.timestamp)}
                      </time>
                    </div>
                    <p className="text-sm text-slate-800">{notification.message}</p>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </>
  );
}

function formatRelativeTime(timestamp: string) {
  const eventTime = new Date(timestamp).getTime();
  const diffSeconds = Math.max(0, Math.floor((Date.now() - eventTime) / 1000));

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes}m ago`;
  }
  const hours = Math.floor(diffSeconds / 3600);
  return `${hours}h ago`;
}

