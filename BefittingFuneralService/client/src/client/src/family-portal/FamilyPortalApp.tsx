import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import PaymentsPage from './pages/PaymentsPage';
import SchedulePage from './pages/SchedulePage';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import PortalLayout from './components/PortalLayout';
import type {
  FamilyCaseSummary,
  FamilyDocument,
  FamilyPayments,
  FamilyScheduleItem,
  FamilyChatMessage,
  FamilyPortalSession,
  FamilyPortalView
} from './types';
import {
  requestFamilyPortalOtp,
  verifyFamilyPortalOtp,
  fetchFamilySummary,
  fetchFamilyDocuments,
  fetchFamilyPayments,
  fetchFamilySchedule,
  fetchFamilyChat,
  uploadFamilyDocument,
  uploadFamilyPayment,
  sendFamilyChat,
  generateFamilyAi
} from './services/api';

const STORAGE_KEY = 'family_portal_session';

const VIEW_PAGES: FamilyPortalView[] = ['dashboard', 'documents', 'payments', 'schedule', 'chat'];

export default function FamilyPortalApp() {
  const [session, setSession] = useState<FamilyPortalSession | null>(null);
  const [view, setView] = useState<FamilyPortalView>('dashboard');
  const [loginStep, setLoginStep] = useState<'request' | 'verify'>('request');
  const [pendingCaseRef, setPendingCaseRef] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [summary, setSummary] = useState<FamilyCaseSummary | null>(null);
  const [documents, setDocuments] = useState<FamilyDocument[]>([]);
  const [payments, setPayments] = useState<FamilyPayments | null>(null);
  const [schedule, setSchedule] = useState<FamilyScheduleItem[]>([]);
  const [chat, setChat] = useState<FamilyChatMessage[]>([]);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: FamilyPortalSession = JSON.parse(stored);
        if (new Date(parsed.expiresAt).getTime() > Date.now()) {
          setSession(parsed);
          setView('dashboard');
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const refreshData = useCallback(async () => {
    if (!session) return;
    setPortalError(null);
    setDataLoading(true);
    try {
      const [summaryData, documentsData, paymentsData, scheduleData, chatData] = await Promise.all([
        fetchFamilySummary(session.caseId),
        fetchFamilyDocuments(session.caseId),
        fetchFamilyPayments(session.caseId),
        fetchFamilySchedule(session.caseId),
        fetchFamilyChat(session.caseId)
      ]);
      setSummary(summaryData);
      setDocuments(documentsData);
      setPayments(paymentsData);
      setSchedule(scheduleData);
      setChat(chatData);
    } catch (error) {
      setPortalError('Unable to sync portal data. Pull to refresh or contact your coordinator.');
    } finally {
      setDataLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refreshData();
  }, [session, refreshData]);

  const handleRequestOtp = async (payload: { caseRef: string; phone?: string; email?: string }) => {
    setLoginError(null);
    setLoginLoading(true);
    try {
      const response = await requestFamilyPortalOtp(payload.caseRef, {
        phone: payload.phone,
        email: payload.email
      });
      setPendingCaseRef(payload.caseRef);
      setPendingToken(response.token);
      setOtpHint(
        response.debug_otp
          ? `OTP (dev): ${response.debug_otp}`
          : response.otp_sent_to
          ? `OTP sent to ${response.otp_sent_to}`
          : 'OTP sent to your registered contact.'
      );
      setLoginStep('verify');
    } catch (error) {
      setLoginError('Unable to request OTP. Double-check your reference or try again later.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    if (!pendingCaseRef || !pendingToken) {
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    try {
      const sessionPayload = await verifyFamilyPortalOtp(pendingCaseRef, otp, pendingToken);
      const normalized: FamilyPortalSession = {
        caseId: sessionPayload.caseId,
        caseRef: pendingCaseRef,
        token: sessionPayload.token,
        expiresAt: sessionPayload.expires_at
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      setSession(normalized);
      setView('dashboard');
      setLoginStep('request');
      setOtpHint(null);
    } catch (error) {
      setLoginError('Invalid OTP. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
    setSummary(null);
    setDocuments([]);
    setPayments(null);
    setSchedule([]);
    setChat([]);
    setLoginStep('request');
    setPendingCaseRef('');
    setPendingToken('');
    setOtpHint(null);
    setPortalError(null);
  };

  const handleDocumentUpload = async (payload: {
    title: string;
    description?: string;
    documentType?: string;
    file_url: string;
  }) => {
    if (!session) return;
    setDocLoading(true);
    setUploadError(null);
    try {
      const response = await uploadFamilyDocument(session.caseId, payload);
      setDocuments(response.documents || []);
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              documents: response.documents || prev.documents
            }
          : prev
      );
    } catch (error) {
      setUploadError('Unable to upload document. Try again shortly.');
    } finally {
      setDocLoading(false);
    }
  };

  const handlePaymentUpload = async (payload: { amount: number; reference?: string; file_url: string }) => {
    if (!session) return;
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const response = await uploadFamilyPayment(session.caseId, payload);
      setPayments(response.payments || payments);
    } catch (error) {
      setPaymentError('Unable to upload payment proof. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!session) return;
    setChatLoading(true);
    setChatError(null);
    try {
      const newMessage = await sendFamilyChat(session.caseId, message);
      setChat((prev) => [...prev, newMessage]);
    } catch (error) {
      setChatError('Message failed to send.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateAi = useCallback(
    async (payload: { prompt: string; style?: string }) => {
      if (!session) {
        throw new Error('No session');
      }
      const suggestion = await generateFamilyAi(session.caseId, payload);
      return suggestion;
    },
    [session]
  );

  const pageContent = useMemo(() => {
    if (!session) {
      return null;
    }
    switch (view) {
      case 'dashboard':
        return (
          <DashboardPage
            summary={summary}
            documents={documents}
            payments={payments}
            schedule={schedule}
            onGenerateAi={handleGenerateAi}
          />
        );
      case 'documents':
        return (
          <DocumentsPage
            documents={documents}
            onUpload={handleDocumentUpload}
            loading={docLoading}
            error={uploadError || undefined}
          />
        );
      case 'payments':
        return (
          <PaymentsPage
            payments={payments}
            onUploadReceipt={handlePaymentUpload}
            loading={paymentLoading}
            error={paymentError || undefined}
          />
        );
      case 'schedule':
        return <SchedulePage schedule={schedule} />;
      case 'chat':
        return (
          <ChatPage
            chat={chat}
            onSend={handleSendMessage}
            sending={chatLoading}
            error={chatError || undefined}
          />
        );
      default:
        return null;
    }
  }, [
    session,
    view,
    summary,
    documents,
    payments,
    schedule,
    chat,
    handleGenerateAi,
    docLoading,
    uploadError,
    paymentLoading,
    paymentError,
    chatLoading,
    chatError
  ]);

  if (!session) {
    return (
      <LoginPage
        step={loginStep}
        loading={loginLoading}
        error={loginError || undefined}
        otpHint={otpHint || undefined}
        pendingCaseRef={pendingCaseRef}
        onRequestOtp={handleRequestOtp}
        onVerifyOtp={handleVerifyOtp}
        onReset={() => {
          setLoginStep('request');
          setPendingToken('');
          setOtpHint(null);
        }}
      />
    );
  }

  return (
    <PortalLayout
      view={view}
      onNavigate={(next) => setView(next)}
      onLogout={handleLogout}
      caseRef={summary?.case_ref || session.caseRef}
      stage={summary?.stage}
      status={summary?.status}
      deceasedName={summary?.deceased_name}
      alertCount={summary?.automationAlerts.length || 0}
    >
      {portalError && (
        <div className="mb-4 rounded-2xl border border-slate-800 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {portalError}
        </div>
      )}
      {dataLoading && (
        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
          Refreshing portal data…
        </div>
      )}
      {pageContent}
    </PortalLayout>
  );
}

