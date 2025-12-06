import { StaffEvent } from '../../services/staff';

interface StaffActivityTimelineProps {
  events: StaffEvent[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}

function formatAction(event: StaffEvent): string {
  switch (event.action) {
    case 'STAFF_CREATE':
      return 'created staff account for';
    case 'STAFF_ROLE_CHANGE':
      return 'changed the role of';
    case 'STAFF_STATUS_CHANGE':
      return event.metadata?.to ? 'activated' : 'deactivated';
    case 'STAFF_RESET_PASSWORD':
      return 'reset the password of';
    case 'STAFF_UPDATE':
      return 'updated';
    default:
      return event.action.toLowerCase().replace(/_/g, ' ');
  }
}

export default function StaffActivityTimeline({
  events,
  loading,
  error,
  onRetry
}: StaffActivityTimelineProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Loading recent staff activity…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
        <div className="font-semibold">Failed to load staff activity.</div>
        <div className="text-xs mt-1">{error}</div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center rounded border border-rose-400 px-3 py-1 text-xs font-semibold text-rose-600"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        No staff activity yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Recent Staff Activity
      </h3>
      <ol className="mt-4 space-y-3">
        {events.map((event) => {
          const actor = event.actor_name || event.actor_email || 'System';
          const target = event.target_name || event.target_email || 'Target unknown';
          const timestamp = new Date(event.created_at).toLocaleString();
          const actionDescription = formatAction(event);
          const metadataDetails = event.metadata?.fields?.length
            ? `Fields: ${(event.metadata.fields as string[]).join(', ')}`
            : null;

          return (
            <li key={event.id} className="flex gap-3">
              <div className="h-2 w-2 rounded-full bg-slate-300 mt-2" />
              <div className="text-sm text-slate-600">
                <div className="text-slate-800">
                  <span className="font-semibold">{actor}</span> {actionDescription}{' '}
                  <span className="font-semibold">{target}</span>
                </div>
                {metadataDetails && (
                  <div className="text-xs text-slate-400">{metadataDetails}</div>
                )}
                <div className="text-xs text-slate-400">{timestamp}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

