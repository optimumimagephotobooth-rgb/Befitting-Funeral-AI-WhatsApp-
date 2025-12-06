import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchOverallStats, OverallStats } from '../services/analytics';
import { fetchDashboardAutomations, resolveAutomationAlert, fetchPaymentAudits } from '../services/api';
import { listStaffEvents, StaffEvent } from '../services/staff';
import { subscribeStaffEvents, unsubscribeChannel } from '../services/supabaseRealtime';
import { defaultQuietThresholds } from '../settings/quietThresholds';
import type { QuietThresholdConfig } from '../settings/quietThresholds';
import { useRealtimeQuietThresholds } from '../store/quietThresholdSync';
import { HealthSummary } from '../components/dashboard/HealthSummary';
import { HeartbeatIndicator } from '../components/dashboard/HeartbeatIndicator';
import QuietSignalPanel from '../components/dashboard/QuietSignalPanel';
import { ActivityHeatmap } from '../components/dashboard/ActivityHeatmap';

interface StatusPayload {
  status: string;
  message?: string;
}

interface DashboardHomePageProps {
  currentStaff?: { role?: string | null } | null;
  currentView?: string;
  onAnomalyToast?: (payload: { message: string; severity: 'warning' | 'danger' }) => void;
  onAnomalyRecord?: (payload: {
    message: string;
    severity: 'warning' | 'danger';
    timestamp?: string;
  }) => void;
}

const BUSINESS_START_HOUR = 6; // 6 AM local
const BUSINESS_END_HOUR = 21; // 9 PM local
const QUIET_KEYS: (keyof QuietThresholdConfig)[] = [
  'businessWarningHours',
  'businessAlertHours',
  'offHoursWarningHours',
  'offHoursAlertHours'
];

interface AutomationDashboardData {
  totalAlerts: number;
  byType: Record<string, number>;
  cases: {
    caseId: string;
    caseRef: string;
    alerts: {
      id: string;
      key: string;
      type: string;
      severity: string;
      title: string;
      description: string;
      recommendedAction?: string | null;
    }[];
  }[];
}

export default function DashboardHomePage({
  currentStaff,
  currentView,
  onAnomalyToast,
  onAnomalyRecord
}: DashboardHomePageProps) {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [analytics, setAnalytics] = useState<OverallStats | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [events, setEvents] = useState<StaffEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [automationData, setAutomationData] = useState<AutomationDashboardData | null>(null);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [automationUpdatedAt, setAutomationUpdatedAt] = useState<string | null>(null);
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const automationIntervalRef = useRef<number | null>(null);
  const [paymentAudits, setPaymentAudits] = useState<{ caseEvents: any[]; staffEvents: any[] }>({
    caseEvents: [],
    staffEvents: []
  });
  const [paymentAuditsLoading, setPaymentAuditsLoading] = useState(false);
  const [paymentAuditsError, setPaymentAuditsError] = useState('');

  const {
    config: quietConfig,
    updatedAt: quietUpdatedAt,
    loading: quietSyncLoading,
    error: quietSyncError
  } = useRealtimeQuietThresholds({ readOnly: true });
  const canViewActivity = currentStaff?.role === 'admin';
  const anomalyToastTracker = useRef<Record<string, number>>({});
  const anomalyRecordTracker = useRef<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/admin/dashboard/status')
      .then((response) => response.json())
      .then((payload) => setStatus(payload))
      .catch(() =>
        setStatus({ status: 'unavailable', message: 'Unable to reach backend API.' })
      )
      .finally(() => setStatusLoading(false));
  }, []);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const stats = await fetchOverallStats();
        setAnalytics(stats);
        setAnalyticsError(null);
      } catch (error: any) {
        console.error('Failed to fetch analytics', error);
        setAnalytics(null);
        setAnalyticsError(
          error?.response?.data?.error || 'Unable to load analytics data right now.'
        );
      } finally {
        setAnalyticsLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const loadEvents = useCallback(async () => {
    if (!canViewActivity) {
      return;
    }
    setEventsLoading(true);
    setEventsError(null);
    try {
      const response = await listStaffEvents(1, 200);
      setEvents(response.data);
    } catch (error: any) {
      console.error('Failed to load recent activity', error);
      setEventsError(
        error?.response?.data?.error || 'Unable to load staff activity at the moment.'
      );
    } finally {
      setEventsLoading(false);
    }
  }, [canViewActivity]);

  const loadAutomations = useCallback(async () => {
    try {
      setAutomationLoading(true);
      const payload = await fetchDashboardAutomations();
      setAutomationData(payload);
      setAutomationUpdatedAt(new Date().toISOString());
    } catch (error) {
      console.error('Failed to load automation alerts', error);
    } finally {
      setAutomationLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAutomations();
    automationIntervalRef.current = window.setInterval(() => {
      void loadAutomations();
    }, 60_000);
    return () => {
      if (automationIntervalRef.current) {
        clearInterval(automationIntervalRef.current);
      }
    };
  }, [loadAutomations]);

  const loadPaymentAudits = useCallback(async () => {
    try {
      setPaymentAuditsLoading(true);
      setPaymentAuditsError('');
      const res = await fetchPaymentAudits(10);
      setPaymentAudits(res?.data || { caseEvents: [], staffEvents: [] });
    } catch (error) {
      console.error('Failed to fetch payment audits', error);
      setPaymentAuditsError('Unable to load payment audit history.');
    } finally {
      setPaymentAuditsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPaymentAudits();
  }, [loadPaymentAudits]);

  const handleResolveAlert = useCallback(
    async (caseId: string, alertId: string) => {
      try {
        setResolvingAlertId(alertId);
        await resolveAutomationAlert(caseId, alertId);
        await loadAutomations();
      } catch (error) {
        console.error('Failed to resolve alert', error);
      } finally {
        setResolvingAlertId(null);
      }
    },
    [loadAutomations]
  );

  useEffect(() => {
    if (!canViewActivity) {
      setEvents([]);
      return;
    }
    void loadEvents();
  }, [canViewActivity, loadEvents]);

  useEffect(() => {
    if (!canViewActivity) {
      return;
    }

    const channel = subscribeStaffEvents((payload) => {
      if (payload.eventType === 'INSERT') {
        void loadEvents();
      }
    });

    return () => {
      unsubscribeChannel(channel);
    };
  }, [canViewActivity, loadEvents]);

  const activityAnomalies = useMemo(() => {
    if (!canViewActivity) {
      return [];
    }

    const windowMs = 2 * 60 * 1000; // 2 minutes
    const now = Date.now();
    const withinWindow = (event: StaffEvent) =>
      now - new Date(event.created_at).getTime() <= windowMs;

    const resets = events.filter(
      (event) => event.action === 'STAFF_RESET_PASSWORD' && withinWindow(event)
    ).length;
    const deactivations = events.filter(
      (event) =>
        event.action === 'STAFF_STATUS_CHANGE' &&
        event.metadata?.to === false &&
        withinWindow(event)
    ).length;
    const promotions = events.filter(
      (event) =>
        event.action === 'STAFF_ROLE_CHANGE' &&
        typeof event.metadata?.to === 'string' &&
        event.metadata?.to.toLowerCase() === 'admin' &&
        withinWindow(event)
    ).length;

    const anomalies: ActivityAnomaly[] = [];
    if (resets >= 3) {
      anomalies.push({
        id: 'reset-surge',
        type: 'danger',
        message: `${resets} password resets in the last 2 minutes`
      });
    }
    if (deactivations >= 2) {
      anomalies.push({
        id: 'deactivation-surge',
        type: 'warning',
        message: `${deactivations} staff deactivations in the last 2 minutes`
      });
    }
    if (promotions >= 1) {
      anomalies.push({
        id: 'admin-promotion',
        type: 'warning',
        message: `${promotions} role promotion${
          promotions > 1 ? 's' : ''
        } to admin in the last 2 minutes`
      });
    }

    const latestEventTimestamp = events[0]
      ? new Date(events[0].created_at).getTime()
      : null;
    const hoursSinceLastEvent = latestEventTimestamp
      ? (now - latestEventTimestamp) / (60 * 60 * 1000)
      : Infinity;

    const thresholds = getQuietThresholds(new Date(), quietConfig);

    if (hoursSinceLastEvent >= thresholds.alertHours) {
      anomalies.push({
        id: 'quiet-prolonged',
        type: 'danger',
        message: formatQuietMessage(hoursSinceLastEvent, thresholds.contextLabel)
      });
    } else if (hoursSinceLastEvent >= thresholds.warningHours) {
      anomalies.push({
        id: 'quiet-warning',
        type: 'warning',
        message: formatQuietMessage(hoursSinceLastEvent, thresholds.contextLabel)
      });
    }

    return anomalies;
  }, [canViewActivity, events, quietConfig]);

  const healthSummary = useMemo(() => {
    const lastEvent = events.length ? events[0] : null;
    const lastEventDate = lastEvent ? new Date(lastEvent.created_at) : null;
    const pulseLabel = lastEventDate
      ? `Last activity ${formatRelativeTime(lastEventDate)}`
      : 'No staff activity recorded yet';

    const quietAnomaly = activityAnomalies.find((anomaly) =>
      anomaly.id === 'quiet-warning' || anomaly.id === 'quiet-prolonged'
    );

    const quietState: 'normal' | 'warning' | 'alert' = quietAnomaly
      ? quietAnomaly.id === 'quiet-prolonged'
        ? 'alert'
        : 'warning'
      : 'normal';

    const minutesSinceLastEvent = lastEventDate
      ? Math.max(0, Math.round((Date.now() - lastEventDate.getTime()) / 60000))
      : null;

    const quietDetail = quietAnomaly
      ? quietAnomaly.message
      : minutesSinceLastEvent != null
        ? minutesSinceLastEvent < 5
          ? 'Recent activity within thresholds'
          : `Quiet for ${formatDuration(minutesSinceLastEvent)} (within sensitivity limits)`
        : 'Awaiting first activity sample';

    const thresholdCustom = QUIET_KEYS.some(
      (key) => quietConfig[key] !== defaultQuietThresholds[key]
    );
    const thresholdNote = thresholdCustom
      ? 'Custom sensitivity active for this organization.'
      : 'Using default quiet-period sensitivity.';

    const syncNote = quietSyncError
      ? 'Org settings sync unavailable.'
      : quietUpdatedAt
        ? `Org settings synced ${formatRelativeTime(quietUpdatedAt)}`
        : 'Org settings not synced yet.';

    const anomalyNotes = activityAnomalies
      .filter((anomaly) => !anomaly.id.startsWith('quiet'))
      .slice(0, 3)
      .map((anomaly) => anomaly.message);

    return {
      pulseLabel,
      quietState,
      quietDetail,
      anomalyNotes,
      thresholdNote,
      syncNote,
      quietLoading: quietSyncLoading
    };
  }, [activityAnomalies, events, quietConfig, quietUpdatedAt, quietSyncError, quietSyncLoading]);

  const heartbeatData = useMemo(() => {
    const now = Date.now();
    const buckets = new Array(48).fill(0);
    events.forEach((event) => {
      const eventTime = new Date(event.created_at).getTime();
      const diffHours = Math.floor((now - eventTime) / 3600000);
      if (diffHours >= 0 && diffHours < 48) {
        const bucketIndex = 47 - diffHours;
        buckets[bucketIndex] += 1;
      }
    });

    const nonQuietAnomalies = activityAnomalies
      .filter((anomaly) => !anomaly.id.startsWith('quiet'))
      .map((anomaly) => anomaly.message);

    const mood: 'normal' | 'quiet' | 'spiky' =
      healthSummary.quietState === 'alert' || healthSummary.quietState === 'warning'
        ? 'quiet'
        : nonQuietAnomalies.length
        ? 'spiky'
        : 'normal';

    return {
      lastEventLabel: healthSummary.pulseLabel,
      mood,
      quietDetail: healthSummary.quietDetail,
      anomalies: nonQuietAnomalies,
      series: buckets
    };
  }, [activityAnomalies, events, healthSummary]);

  const activityHeatmap = useMemo(() => {
    const now = Date.now();
    const hoursPerDay = 24;
    const days = 7;
    const matrix = Array.from({ length: days }, () => Array(hoursPerDay).fill(0));

    events.forEach((event) => {
      const eventTime = new Date(event.created_at).getTime();
      const diffHours = Math.floor((now - eventTime) / 3600000);
      if (diffHours >= 0 && diffHours < days * hoursPerDay) {
        const diffDays = Math.floor(diffHours / hoursPerDay);
        const hour = hoursPerDay - 1 - (diffHours % hoursPerDay);
        const rowIndex = days - 1 - diffDays;
        if (rowIndex >= 0 && rowIndex < days) {
          matrix[rowIndex][hour] += 1;
        }
      }
    });

    const maxValue = Math.max(1, ...matrix.map((row) => Math.max(...row)));
    const labels = Array.from({ length: days }, (_, idx) => {
      const dayDate = new Date(now - (days - 1 - idx) * 24 * 3600000);
      return dayDate.toLocaleDateString(undefined, { weekday: 'short' });
    });

    return { matrix, maxValue, labels };
  }, [events]);

  useEffect(() => {
    if (!onAnomalyToast || currentView === 'staff' || !activityAnomalies.length) {
      return;
    }

    const now = Date.now();
    activityAnomalies.forEach((anomaly) => {
      const key = `${anomaly.id}:${anomaly.message}`;
      const lastShown = anomalyToastTracker.current[key] || 0;
      const cooldownMs = 60 * 1000; // 1 minute
      if (now - lastShown >= cooldownMs) {
        anomalyToastTracker.current[key] = now;
        onAnomalyToast({
          message: anomaly.message,
          severity: anomaly.type === 'danger' ? 'danger' : 'warning'
        });
      }
    });
  }, [activityAnomalies, onAnomalyToast, currentView]);

  const paymentAuditEvents = useMemo(() => {
    const parseMeta = (meta: any) => {
      if (!meta) return {};
      if (typeof meta === 'string') {
        try {
          return JSON.parse(meta);
        } catch {
          return {};
        }
      }
      return meta;
    };

    const normalizedCaseEvents = (paymentAudits.caseEvents || []).map((event) => {
      const meta = parseMeta(event.metadata);
      return {
        id: `case-${event.id}`,
        type: event.event_type,
        timestamp: event.created_at,
        amount: meta.amount,
        method: meta.method,
        paymentType: meta.paymentType,
        staffName: meta.staffName || null,
        details: meta
      };
    });

    const normalizedStaffEvents = (paymentAudits.staffEvents || []).map((event) => {
      const meta = parseMeta(event.metadata);
      return {
        id: `staff-${event.id}`,
        type: event.event_type,
        timestamp: event.created_at,
        amount: meta.amount,
        method: meta.method,
        paymentType: meta.paymentType,
        staffName: event.actor_name || meta.staffName || null,
        details: meta
      };
    });

    const combined = [...normalizedCaseEvents, ...normalizedStaffEvents];
    return combined.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [paymentAudits]);

  useEffect(() => {
    if (!onAnomalyRecord || !activityAnomalies.length) {
      return;
    }

    const now = Date.now();
    activityAnomalies.forEach((anomaly) => {
      const key = `${anomaly.id}:${anomaly.message}`;
      const lastRecorded = anomalyRecordTracker.current[key] || 0;
      const recordCooldownMs = 30 * 1000;
      if (now - lastRecorded >= recordCooldownMs) {
        anomalyRecordTracker.current[key] = now;
        onAnomalyRecord({
          message: anomaly.message,
          severity: anomaly.type === 'danger' ? 'danger' : 'warning',
          timestamp: new Date().toISOString()
        });
      }
    });
  }, [activityAnomalies, onAnomalyRecord]);

  const caseCardDescription = analytics
    ? `${analytics.cases.active} active · ${analytics.cases.completed} completed`
    : 'Waiting for analytics…';

  const cards = [
    {
      title: 'Backend health',
      value: statusLoading ? 'Loading…' : status?.status || 'unknown',
      detail: status?.message || 'API heartbeat',
      accent: 'text-slate-900'
    },
    {
      title: 'Total cases',
      loading: analyticsLoading,
      value: analytics?.cases.total ?? '—',
      detail: caseCardDescription,
      meta: analytics ? `${analytics.cases.conversionRate}% conversion` : null,
      accent: 'text-amber-500'
    },
    {
      title: 'Contacts',
      loading: analyticsLoading,
      value: analytics?.contacts.total ?? '—',
      detail: analytics ? `+${analytics.contacts.new} new this week` : 'Tracking families & leads',
      accent: 'text-emerald-500'
    },
    {
      title: 'Messages',
      loading: analyticsLoading,
      value: analytics?.messages.total ?? '—',
      detail: analytics
        ? `${analytics.messages.inbound} inbound · ${analytics.messages.outbound} outbound`
        : 'Conversation volume',
      meta: analytics ? `Avg ${analytics.messages.averagePerCase} per case` : null,
      accent: 'text-indigo-500'
    },
    {
      title: 'Referrals',
      loading: analyticsLoading,
      value: analytics?.referrals.total ?? '—',
      detail: analytics
        ? `${analytics.referrals.used} successful referrals`
        : 'Referral performance',
      meta: analytics ? `${analytics.referrals.conversionRate}% conversion` : null,
      accent: 'text-rose-500'
    }
  ];

  const automationMetrics = [
    { key: 'stale', label: 'Stale Communication' },
    { key: 'stalled', label: 'Stage Stalled' },
    { key: 'missingDocs', label: 'Missing Documents' },
    { key: 'transport', label: 'Transport Pending' },
    { key: 'highRisk', label: 'High Risk (AI)' }
  ] as const;

  const operationalAlertsCard = (
    <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">Operational Alerts</p>
          <p className="text-2xl font-bold text-amber-700">
            {automationLoading ? 'Loading…' : automationData?.totalAlerts ?? 0}
          </p>
          <p className="text-sm text-amber-800">Live automation intelligence</p>
        </div>
        <button
          onClick={() => loadAutomations()}
          className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 transition hover:bg-amber-200/70"
        >
          Refresh now
        </button>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-amber-800 sm:grid-cols-2 lg:grid-cols-5">
        {automationMetrics.map((metric) => (
          <div key={metric.key} className="rounded-xl border border-amber-200 bg-white/80 p-3 shadow-inner">
            <p className="text-[11px] uppercase tracking-wide text-amber-500">{metric.label}</p>
            <p className="text-lg font-semibold text-amber-700">
              {automationData?.byType?.[metric.key] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {(automationData?.cases || []).slice(0, 5).map((caseBundle) => (
          <div
            key={caseBundle.caseId}
            className="rounded-2xl border border-amber-200 bg-white/80 p-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-amber-900">{caseBundle.caseRef || caseBundle.caseId}</p>
                <p className="text-xs text-amber-600">{caseBundle.alerts.length} alert(s)</p>
              </div>
              <button
                onClick={() => window.open(`/cases/${caseBundle.caseId}`, '_blank')}
                className="text-xs font-semibold text-amber-600 underline-offset-4 hover:underline"
              >
                Open case →
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {caseBundle.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-sm text-amber-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{alert.title}</p>
                    <button
                      onClick={() => handleResolveAlert(caseBundle.caseId, alert.id)}
                      disabled={resolvingAlertId === alert.id}
                      className="text-xs font-semibold text-amber-700 underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      {resolvingAlertId === alert.id ? 'Resolving…' : 'Resolve'}
                    </button>
                  </div>
                  {alert.description && <p className="text-xs text-amber-700">{alert.description}</p>}
                  {alert.recommendedAction && (
                    <p className="text-xs text-amber-800">Action: {alert.recommendedAction}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {!automationData?.cases?.length && !automationLoading && (
          <p className="text-sm text-amber-700">No automation alerts. Operations steady.</p>
        )}
      </div>

      <p className="mt-4 text-xs text-amber-600">
        Auto-refresh every 60s · Last updated{' '}
        {automationUpdatedAt ? new Date(automationUpdatedAt).toLocaleTimeString() : '—'}
      </p>
    </div>
  );

  const paymentAuditCard = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Payment audits</p>
          <p className="text-2xl font-bold text-slate-900">{paymentAuditEvents.length}</p>
          <p className="text-sm text-slate-600">Recent audit trail for payment actions</p>
        </div>
        <button
          onClick={() => loadPaymentAudits()}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {paymentAuditsLoading && <p className="text-sm text-slate-500">Loading payment audits…</p>}
        {!paymentAuditsLoading && paymentAuditsError && (
          <p className="text-sm text-rose-600">{paymentAuditsError}</p>
        )}
        {!paymentAuditsLoading && !paymentAuditsError && paymentAuditEvents.length === 0 && (
          <p className="text-sm text-slate-500">No payment audit events yet.</p>
        )}
        {!paymentAuditsLoading &&
          paymentAuditEvents.slice(0, 5).map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
                <span>{event.type.replace(/_/g, ' ')}</span>
                <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
              </div>
              <p className="font-semibold text-slate-900">
                {event.amount ? `GHS ${event.amount.toFixed(2)}` : 'Amount pending'}
              </p>
              <p className="text-[11px] text-slate-500">
                {event.method || 'Method unknown'}
                {event.paymentType ? ` · ${event.paymentType}` : ''}
                {event.staffName ? ` · handled by ${event.staffName}` : ''}
              </p>
            </div>
          ))}
      </div>
    </div>
  );

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Dashboard overview</h2>
        <p className="text-sm text-slate-500">Live snapshot of system health and activity.</p>
      </header>

      {operationalAlertsCard}
      {paymentAuditCard}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <HealthSummary {...healthSummary} />
        <HeartbeatIndicator {...heartbeatData} />
        <QuietSignalPanel
          quietState={healthSummary.quietState}
          quietDetail={healthSummary.quietDetail}
          quietConfig={quietConfig || defaultQuietThresholds}
          thresholdNote={healthSummary.thresholdNote}
          syncNote={healthSummary.syncNote}
        />
      </div>

      <ActivityHeatmap
        matrix={activityHeatmap.matrix}
        maxValue={activityHeatmap.maxValue}
        labels={activityHeatmap.labels}
      />

      {analyticsError && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-600">
          {analyticsError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            detail={card.detail}
            meta={card.meta}
            loading={Boolean(card.loading)}
            accent={card.accent}
          />
        ))}
      </div>

      {canViewActivity && (
        <RecentActivityWidget
          events={events}
          loading={eventsLoading}
          error={eventsError}
          onRetry={loadEvents}
          anomalies={activityAnomalies}
        />
      )}
    </section>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  detail?: string | null;
  meta?: string | null;
  loading?: boolean;
  accent?: string;
}

function StatCard({ title, value, detail, meta, loading, accent }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 shadow-sm bg-white space-y-1">
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className={`text-3xl font-bold ${accent ?? 'text-slate-900'}`}>
        {loading ? 'Loading…' : value}
      </p>
      {detail && <p className="text-xs text-slate-500">{detail}</p>}
      {meta && <p className="text-[11px] text-slate-400">{meta}</p>}
    </div>
  );
}

interface ActivityAnomaly {
  id: string;
  type: 'warning' | 'danger';
  message: string;
}

interface RecentActivityWidgetProps {
  events: StaffEvent[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  anomalies: ActivityAnomaly[];
}

function RecentActivityWidget({
  events,
  loading,
  error,
  onRetry,
  anomalies
}: RecentActivityWidgetProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <p className="text-sm font-semibold text-slate-900">Recent admin activity</p>
          <p className="text-xs text-slate-500">Live feed from staff actions</p>
        </div>
        <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
          <span className="mr-1 h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Live
        </span>
      </div>

      {anomalies.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-2">
          {anomalies.map((alert) => (
            <span
              key={alert.id}
              className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                alert.type === 'danger'
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}
            >
              {alert.message}
            </span>
          ))}
        </div>
      )}

      {loading && (
        <div className="px-4 py-6 text-sm text-slate-500">Loading recent activity…</div>
      )}

      {error && (
        <div className="px-4 py-4 text-sm text-rose-600">
          <p className="font-semibold">Unable to load activity.</p>
          <p className="text-xs text-rose-500 mt-1">{error}</p>
          <button
            type="button"
            className="mt-2 inline-flex items-center rounded border border-rose-400 px-3 py-1 text-xs font-semibold text-rose-600"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="px-4 py-6 text-sm text-slate-500">No staff activity yet today.</div>
      )}

      {!loading && !error && events.length > 0 && (
        <ol className="divide-y divide-slate-100">
          {events.map((event) => (
            <li
              key={event.id}
              className={`px-4 py-3 text-sm text-slate-700 ${
                isAnomalyEvent(event) ? 'bg-amber-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <p>
                  <span className="font-semibold">
                    {event.actor_name || event.actor_email || 'System'}
                  </span>{' '}
                  {formatEventAction(event)}{' '}
                  <span className="font-semibold">
                    {event.target_name || event.target_email || 'Unknown staff'}
                  </span>
                </p>
                <time className="text-xs text-slate-400">
                  {new Date(event.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </time>
              </div>
              {event.metadata?.fields?.length ? (
                <p className="text-xs text-slate-400">
                  Fields changed: {(event.metadata.fields as string[]).join(', ')}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function formatEventAction(event: StaffEvent) {
  switch (event.action) {
    case 'STAFF_CREATE':
      return 'added';
    case 'STAFF_ROLE_CHANGE':
      return 'changed the role of';
    case 'STAFF_STATUS_CHANGE':
      return event.metadata?.to ? 'activated' : 'deactivated';
    case 'STAFF_RESET_PASSWORD':
      return 'reset the password for';
    case 'STAFF_UPDATE':
      return 'updated';
    default:
      return event.action.toLowerCase().replace(/_/g, ' ');
  }
}

function isAnomalyEvent(event: StaffEvent) {
  if (event.action === 'STAFF_RESET_PASSWORD') {
    return true;
  }

  if (event.action === 'STAFF_STATUS_CHANGE' && event.metadata?.to === false) {
    return true;
  }

  if (
    event.action === 'STAFF_ROLE_CHANGE' &&
    typeof event.metadata?.to === 'string' &&
    event.metadata.to.toLowerCase() === 'admin'
  ) {
    return true;
  }

  return false;
}

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!remaining) {
    return `${hours}h`;
  }
  return `${hours}h ${remaining}m`;
}

function formatRelativeTime(timestamp: string | Date) {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) {
    return 'just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function getQuietThresholds(now: Date, quietConfig: QuietThresholdConfig) {
  const day = now.getDay();
  const hour = now.getHours();
  const isWeekend = day === 0 || day === 6;
  const inBusinessHours = hour >= BUSINESS_START_HOUR && hour < BUSINESS_END_HOUR;

  if (isWeekend) {
    return {
      warningHours: quietConfig.offHoursWarningHours,
      alertHours: quietConfig.offHoursAlertHours,
      contextLabel: 'weekend quiet period'
    };
  }

  if (!inBusinessHours) {
    return {
      warningHours: quietConfig.offHoursWarningHours,
      alertHours: quietConfig.offHoursAlertHours,
      contextLabel: 'off-hours quiet period'
    };
  }

  return {
    warningHours: quietConfig.businessWarningHours,
    alertHours: quietConfig.businessAlertHours,
    contextLabel: 'business hours'
  };
}

function formatQuietMessage(hoursSinceLastEvent: number, contextLabel: string) {
  if (!isFinite(hoursSinceLastEvent)) {
    return `No staff activity recorded yet (${contextLabel})`;
  }

  const rounded = Math.floor(hoursSinceLastEvent);
  return `Quiet for ${rounded}h (${contextLabel})`;
}


