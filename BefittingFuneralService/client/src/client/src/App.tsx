import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardHomePage from './pages/DashboardHomePage';
import CasesPage from './pages/CasesPage';
import LeadsPage from './pages/LeadsPage';
import MessagesPage from './pages/MessagesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import StaffPage from './pages/StaffPage';
import TemplatesPage from './pages/TemplatesPage';
import CaseDetailPage from './pages/CaseDetailPage';
import ForecastDashboardPage from './pages/ForecastDashboardPage';
import SupervisorPage from './pages/SupervisorPage';
import InventoryPage from './pages/InventoryPage';
import MortuaryPage from './pages/MortuaryPage';
import CemeteryPage from './pages/CemeteryPage';
import AuditPage from './pages/AuditPage';
import { loginStaff, verifyStaffMfa } from './services/auth';
import ToastStack, { ToastPayload, ToastVariant } from './components/ui/ToastStack';
import NotificationDrawer, { NotificationEntry } from './components/ui/NotificationDrawer';
import SystemHeartbeatIndicator from './components/system/HeartbeatIndicator';
import SystemHealthTimeline from './components/system/SystemHealthTimeline';
import { useHeartbeatStatus } from './hooks/useHeartbeatStatus';
import { fetchAutomationAlerts } from './services/api';

type View =
  | 'home'
  | 'cases'
  | 'inventory'
  | 'mortuary'
  | 'cemetery'
  | 'audit'
  | 'forecast'
  | 'supervisor'
  | 'leads'
  | 'messages'
  | 'announcements'
  | 'staff'
  | 'templates';

type StaffProfile = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
};

type CaseRoute = {
  caseId: string | null;
  tab?: string;
};

const getCaseRouteFromLocation = (): CaseRoute => {
  if (typeof window === 'undefined') {
    return { caseId: null };
  }
  const { pathname, search } = window.location;
  const match = pathname.match(/^\/cases\/([^/]+)/);
  if (!match) {
    return { caseId: null };
  }
  const params = new URLSearchParams(search);
  const tab = params.get('tab') || undefined;
  return {
    caseId: decodeURIComponent(match[1]),
    tab
  };
};

const buildCaseDetailUrl = (caseId: string, tab?: string) =>
  `/cases/${encodeURIComponent(caseId)}${tab ? `?tab=${tab}` : ''}`;

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [mfaPending, setMfaPending] = useState<{ staffId: string; otpHint?: string } | undefined>(undefined);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [view, setView] = useState<View>('home');
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [toasts, setToasts] = useState<ToastPayload[]>([]);
  const toastTimers = useRef<Record<string, number>>({});
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const heartbeat = useHeartbeatStatus();
  const [caseRoute, setCaseRoute] = useState<CaseRoute>(() => getCaseRouteFromLocation());
  const lastNonCasePath = useRef<string>(
    typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'
  );
  const queryClientRef = useRef<QueryClient>();

  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchOnWindowFocus: false
        }
      }
    });
  }

  useEffect(() => {
    const token = localStorage.getItem('staff_token');
    const storedProfile = localStorage.getItem('staff_profile');
    if (token && storedProfile) {
      try {
        setStaff(JSON.parse(storedProfile));
      } catch {
        localStorage.removeItem('staff_profile');
      }
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCaseRoute(getCaseRouteFromLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!caseRoute.caseId && typeof window !== 'undefined') {
      lastNonCasePath.current = window.location.pathname + window.location.search;
    }
  }, [caseRoute.caseId]);

  const persistStaffSession = (tokenData: { accessToken?: string; refreshToken?: string; staff?: any }) => {
    if (!tokenData.accessToken || !tokenData.refreshToken || !tokenData.staff) {
      return;
    }
    localStorage.setItem('staff_token', tokenData.accessToken);
    localStorage.setItem('staff_profile', JSON.stringify(tokenData.staff));
    setStaff(tokenData.staff);
    setAuthenticated(true);
  };

  const handleLogin = async ({ phone, password }: { phone: string; password: string }) => {
    setLoginLoading(true);
    setMfaError('');
    try {
      const response = await loginStaff(phone, password);
      if (response.data.mfaRequired && response.data.staffId) {
        setMfaPending({
          staffId: response.data.staffId,
          otpHint: response.data.otp ? `OTP (dev): ${response.data.otp}` : undefined
        });
        return;
      }
      if (response.data.accessToken && response.data.staff && response.data.refreshToken) {
        persistStaffSession(response.data);
      }
    } catch (error) {
      alert('Invalid credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (!mfaPending) return;
    setMfaLoading(true);
    setMfaError('');
    try {
      const response = await verifyStaffMfa(mfaPending.staffId, code);
      if (response.data.accessToken && response.data.staff && response.data.refreshToken) {
        persistStaffSession(response.data);
        setMfaPending(undefined);
        setMfaPending(undefined);
      }
    } catch (error) {
      setMfaError('Invalid OTP. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_profile');
    setAuthenticated(false);
    setStaff(null);
  };

  const markNotificationsRead = useCallback(() => {
    setHasUnreadNotifications(false);
  }, []);

  const toggleNotificationDrawer = useCallback(() => {
    setNotificationDrawerOpen((prev) => {
      const next = !prev;
      if (next) {
        markNotificationsRead();
      }
      return next;
    });
  }, [markNotificationsRead]);

  const navigateToStaff = useCallback(() => {
    setView('staff');
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
  }, []);

  const pushToast = useCallback(
    (message: string, severity: ToastVariant = 'info', action?: () => void) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => {
        const next = [{ id, message, severity, action }, ...prev];
        if (next.length > 4) {
          const removed = next.pop();
          if (removed && toastTimers.current[removed.id]) {
            clearTimeout(toastTimers.current[removed.id]);
            delete toastTimers.current[removed.id];
          }
        }
        return next;
      });

      toastTimers.current[id] = window.setTimeout(() => {
        removeToast(id);
      }, 6000);
    },
    [removeToast]
  );

  const recordAnomalyNotification = useCallback(
    (message: string, severity: ToastVariant) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setNotifications((prev) => {
        const next: NotificationEntry[] = [
          { id, message, severity, timestamp: new Date().toISOString(), action: navigateToStaff },
          ...prev
        ];
        return next.slice(0, 20);
      });
      if (!notificationDrawerOpen) {
        setHasUnreadNotifications(true);
      }
    },
    [notificationDrawerOpen, navigateToStaff]
  );

  const automationAlertsQuery = useQuery({
    queryKey: ['automation-alerts'],
    queryFn: () => fetchAutomationAlerts(),
    staleTime: 1000 * 60,
    refetchInterval: 30_000,
    enabled: authenticated
  });

  const automationSeenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const alerts = automationAlertsQuery.data?.data?.cases || [];
    alerts.forEach((alertGroup: any) => {
      alertGroup.alerts.forEach((alert: any) => {
        if (automationSeenRef.current.has(alert.id)) return;
        automationSeenRef.current.add(alert.id);
        const severity =
          alert.severity === 'high'
            ? 'danger'
            : alert.severity === 'medium'
            ? 'warning'
            : 'info';
        recordAnomalyNotification(`${alert.title} · ${alert.description || ''}`, severity as ToastVariant);
      });
    });
  }, [automationAlertsQuery.data, recordAnomalyNotification]);

  const pages = useMemo(
    () => ({
      home: (
        <DashboardHomePage
          currentStaff={staff}
          currentView={view}
          onAnomalyToast={({ message, severity }) =>
            pushToast(message, severity, navigateToStaff)
          }
          onAnomalyRecord={({ message, severity }) => recordAnomalyNotification(message, severity)}
        />
      ),
      cases: <CasesPage />,
      inventory: <InventoryPage />,
      mortuary: <MortuaryPage />,
      cemetery: <CemeteryPage />,
      forecast: <ForecastDashboardPage />,
      supervisor: <SupervisorPage />,
      leads: <LeadsPage />,
      audit: <AuditPage />,
      messages: <MessagesPage />,
      announcements: <AnnouncementsPage />,
      staff: <StaffPage currentStaff={staff} />,
      templates: <TemplatesPage />
    }),
    [staff, view, pushToast, recordAnomalyNotification, navigateToStaff]
  );

  const handleNavigate = useCallback(
    (nextView: string) => {
      setView(nextView as View);
    },
    [setView]
  );

  const closeCaseDetail = useCallback(() => {
    const fallback = lastNonCasePath.current || '/';
    window.history.pushState({}, '', fallback);
    setCaseRoute(getCaseRouteFromLocation());
  }, []);

  const handleCaseTabChange = useCallback((nextTab: string) => {
    setCaseRoute((prev) => {
      if (!prev.caseId) {
        return prev;
      }
      const nextUrl = buildCaseDetailUrl(prev.caseId, nextTab);
      window.history.replaceState({ caseId: prev.caseId, tab: nextTab }, '', nextUrl);
      return {
        caseId: prev.caseId,
        tab: nextTab
      };
    });
  }, []);

  let content: JSX.Element;

  if (!authenticated) {
    content = (
      <LoginPage
        onLogin={handleLogin}
        loading={loginLoading}
        mfaPending={mfaPending}
        onVerifyOtp={handleVerifyOtp}
        mfaLoading={mfaLoading}
        mfaError={mfaError}
      />
    );
  } else if (caseRoute.caseId) {
    content = (
      <CaseDetailPage
        caseId={caseRoute.caseId}
        tab={caseRoute.tab}
        onClose={closeCaseDetail}
        onTabChange={handleCaseTabChange}
      />
    );
  } else {
    content = (
      <>
        <DashboardLayout currentView={view} onNavigate={handleNavigate} staffRole={staff?.role}>
          {heartbeat.statuses.realtime === 'down' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 text-right">
              Offline mode – attempting to reconnect…
            </div>
          )}
          <div className="flex justify-between items-center px-4 py-2 text-xs text-slate-500">
            <div>
              Signed in as {staff?.name || 'Staff'} · {staff?.role || 'agent'}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end gap-1">
                <SystemHeartbeatIndicator />
                <SystemHealthTimeline />
              </div>
              <button
                type="button"
                onClick={toggleNotificationDrawer}
                className="relative inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:border-slate-400 transition"
              >
                Activity
                {hasUnreadNotifications && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
              <button
                onClick={handleLogout}
                className="text-amber-500 hover:text-amber-400 transition"
              >
                Logout
              </button>
            </div>
          </div>
          {pages[view]}
        </DashboardLayout>
      </>
    );
  }

  return (
    <QueryClientProvider client={queryClientRef.current!}>
      {content}
      <ToastStack toasts={toasts} onDismiss={removeToast} />
      <NotificationDrawer
        open={notificationDrawerOpen}
        notifications={notifications}
        onClose={() => {
          setNotificationDrawerOpen(false);
          markNotificationsRead();
        }}
        onSelectEntry={() => {
          navigateToStaff();
          markNotificationsRead();
        }}
      />
    </QueryClientProvider>
  );
}

export default App;



