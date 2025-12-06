import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import CaseHeader from '../components/cases/CaseHeader';
import CaseSidebarTabs from '../components/cases/CaseSidebarTabs';
import CaseWorkspace from '../components/cases/CaseWorkspace';
import CaseOverviewPanel from '../components/cases/CaseOverviewPanel';
import CaseMessagesPanel from '../components/cases/CaseMessagesPanel';
import CaseDocumentsPanel from '../components/cases/CaseDocumentsPanel';
import CaseChargesPanel from '../components/cases/CaseChargesPanel';
import CaseTimelinePanel from '../components/cases/CaseTimelinePanel';
import AlertHistoryPanel from '../components/cases/AlertHistoryPanel';
import CaseWorkflowPanel from '../components/workflow/CaseWorkflowPanel';
import CaseSettingsPanel from '../components/cases/CaseSettingsPanel';
import ForecastIndicator from '../components/cases/ForecastIndicator';
import AISupervisorHints from '../components/cases/AISupervisorHints';
import FuneralEquipmentPanel from '../components/funeralDay/FuneralEquipmentPanel';
import SupervisorInsightDrawer from '../components/SupervisorInsightDrawer';
import TrainingDashboard from '../components/TrainingDashboard';
import TrainingOverlay from '../components/TrainingOverlay';
import TombstoneWorkOrderPanel from '../components/funeralDay/TombstoneWorkOrderPanel';
import ToastStack, { ToastPayload } from '../components/ui/ToastStack';
import {
  useCaseDetailQuery,
  useCaseTimelineQuery,
  useCaseWorkflowQuery,
  useCaseDocumentsQuery,
  useCaseChargesQuery,
  useCaseNotesQuery,
  useCaseForecastQuery,
  useCaseSupervisorQuery,
  CaseDetailRecord,
  CaseEventRecord
} from '../hooks/caseDetailQueries';
import { useFuneralDay } from '../hooks/useFuneralDay';
import useSupervisorAI from '../hooks/useSupervisorAI';
import useTrainingEngine from '../hooks/useTrainingEngine';
import {
  createCaseNote,
  generateDraftMessage,
  sendDraftMessage,
  fetchDraftReply,
  fetchCaseSummary,
  fetchCaseAttention,
  fetchCaseDeepBriefing,
  fetchCaseAutomations,
  resolveAutomationAlert,
  fetchCaseCompliance,
  updateComplianceChecklistItem,
  updateComplianceDocument,
  requestPaymentConfirmation,
  autoDetectPayment,
  fetchFuneralBriefing,
  fetchFuneralDay,
  saveFuneralEvent,
  updateFuneralEventStatus,
  updateFuneralEventTask,
  upsertFuneralStaff,
  upsertFuneralVehicle,
  upsertFuneralVenue,
  fetchCaseInventory,
  checkoutInventoryReservation,
  checkinInventoryReservation
} from '../services/api';
import {
  subscribeMessagesForCase,
  subscribeCaseEventsForCase,
  unsubscribeChannel
} from '../services/supabaseRealtime';

const CASE_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'messages', label: 'Messages' },
  { key: 'documents', label: 'Documents' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'charges', label: 'Charges' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'workflow', label: 'Workflow' },
  { key: 'funeral-day', label: 'Funeral Day Operations' },
  { key: 'settings', label: 'Settings' }
] as const;

type CaseTabKey = (typeof CASE_TABS)[number]['key'];

interface CaseDetailPageProps {
  caseId: string;
  tab?: string;
  onClose: () => void;
  onTabChange?: (tab: CaseTabKey) => void;
}

interface TimelineRecord {
  id?: string | number;
  title?: string;
  message?: string;
  timestamp?: string | Date;
  type?: string;
  event_type?: string;
  created_at?: string | Date;
  [key: string]: any;
}

const SUPERVISOR_LABELS: Record<string, string> = {
  documents: 'Documents',
  charges: 'Charges',
  logistics: 'Logistics',
  missing_info: 'Info',
  insight: 'Insight'
};

type FuneralEvent = {
  id: string;
  code?: string;
  label?: string;
  status?: string;
  sequence_order?: number;
  scheduled_start?: string;
  scheduled_end?: string;
  notes?: string;
  metadata?: Record<string, any>;
  case_id?: string;
  status_message?: string;
};

type FuneralTask = {
  id: string;
  event_id?: string;
  label?: string;
  description?: string;
  status?: string;
  assigned_staff_name?: string;
  metadata?: Record<string, any>;
  case_id?: string;
  assigned_staff_id?: string;
  notes?: string;
  completed_at?: string;
};

type FuneralStaffAssignment = {
  id: string;
  role?: string;
  staff_name?: string;
  name_override?: string;
  case_id?: string;
  staff_id?: string;
  contact_phone?: string;
  metadata?: Record<string, any>;
  notes?: string;
};

type FuneralVehicle = {
  id: string;
  vehicle_type?: string;
  driver_name?: string;
  from_location?: string;
  to_location?: string;
  case_id?: string;
  driver_phone?: string;
  departure_time?: string;
  arrival_time?: string;
  metadata?: Record<string, any>;
  vehicle_label?: string;
  notes?: string;
  status?: string;
};

type FuneralVenue = {
  id: string;
  venue_type?: string;
  name?: string;
  address?: string;
  case_id?: string;
  contact_person?: string;
  contact_phone?: string;
  metadata?: Record<string, any>;
  notes?: string;
  status?: string;
};

type FuneralDayPayload = {
  events: FuneralEvent[];
  tasks: FuneralTask[];
  staff: FuneralStaffAssignment[];
  vehicles: FuneralVehicle[];
  venues: FuneralVenue[];
  venueChecklist: any[];
};

function describeCaseEvent(
  eventType?: string,
  metadata?: Record<string, any> | null,
  fallback: string = 'Event logged'
) {
  const title = metadata?.title || metadata?.summary || metadata?.description;
  const staffName = metadata?.staffName || metadata?.resolvedByName;
  const status = metadata?.status;
  switch (eventType) {
    case 'AUTOMATION_ALERT':
      return `Automation alert triggered${title ? `: ${title}` : ''}`;
    case 'AUTOMATION_ALERT_RESOLVED':
      return `Automation alert resolved${title ? `: ${title}` : ''}${
        staffName ? ` by ${staffName}` : ''
      }`;
    case 'COMPLIANCE_CHECKLIST_UPDATED': {
      const label = metadata?.category || metadata?.item_key || 'Compliance item';
      if (status === 'completed') {
        return `${label} completed`;
      }
      if (status === 'waived') {
        return `${label} waived`;
      }
      return `${label} updated`;
    }
    case 'COMPLIANCE_DOCUMENT_UPDATED': {
      const label = metadata?.label || metadata?.document_type || 'Compliance document';
      if (status === 'verified') {
        return `${label} verified`;
      }
      if (status === 'waived') {
        return `${label} waived`;
      }
      if (status === 'submitted') {
        return `${label} submitted`;
      }
      return `${label} updated`;
    }
    default:
      return fallback;
  }
}

const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log('CDP:', ...args);
  }
};

function sanitizeTab(tab?: string | null): CaseTabKey {
  const fallback: CaseTabKey = 'overview';
  if (!tab) return fallback;
  const match = CASE_TABS.find((entry) => entry.key === tab);
  return (match?.key as CaseTabKey) ?? fallback;
}

export default function CaseDetailPage({
  caseId,
  tab,
  onClose,
  onTabChange
}: CaseDetailPageProps) {
  const [activeTab, setActiveTab] = useState<CaseTabKey>(() => sanitizeTab(tab));
  const queryClient = useQueryClient();
  const [intelligenceToasts, setIntelligenceToasts] = useState<ToastPayload[]>([]);
  const toastTimers = useRef<Record<string, number>>({});
  const lastForecastLevelRef = useRef<string | null>(null);
  const lastSupervisorEventRef = useRef<string | null>(null);
  const lastSupervisorHintRef = useRef<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [composerDraftError, setComposerDraftError] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [draftReply, setDraftReply] = useState<any>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editedDraftText, setEditedDraftText] = useState('');
  const [draftError, setDraftError] = useState('');
  const [caseSummary, setCaseSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState('');
  const [summaryWordCount, setSummaryWordCount] = useState(0);
  const [summaryStage, setSummaryStage] = useState('');
  const [attentionItems, setAttentionItems] = useState<any[]>([]);
  const [attentionLoading, setAttentionLoading] = useState(false);
  const [attentionError, setAttentionError] = useState('');
  const [attentionGeneratedAt, setAttentionGeneratedAt] = useState('');
  const [deepBriefing, setDeepBriefing] = useState<any | null>(null);
  const [deepBriefingLoading, setDeepBriefingLoading] = useState(false);
  const [deepBriefingError, setDeepBriefingError] = useState('');
  const [automationAlerts, setAutomationAlerts] = useState<any[]>([]);
  const [automationHistory, setAutomationHistory] = useState<any[]>([]);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [automationError, setAutomationError] = useState('');
  const [complianceData, setComplianceData] = useState<{ checklist: any[]; documents: any[]; gate?: any }>({
    checklist: [],
    documents: [],
    gate: null
  });
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceError, setComplianceError] = useState('');
  const [complianceBusyItem, setComplianceBusyItem] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [autoDetectResult, setAutoDetectResult] = useState<any | null>(null);
  const [eventStatusLoading, setEventStatusLoading] = useState(false);
  const [taskStatusLoading, setTaskStatusLoading] = useState(false);
  const [funeralBriefing, setFuneralBriefing] = useState<any | null>(null);
  const [funeralBriefingLoading, setFuneralBriefingLoading] = useState(false);
  const [funeralBriefingError, setFuneralBriefingError] = useState('');
  const [funeralBriefingTimestamp, setFuneralBriefingTimestamp] = useState('');
  const [intelligenceCopyStatus, setIntelligenceCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const setMessageInput = setDraftText;
  const [caseInventory, setCaseInventory] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState('');
  const [inventoryActionLoadingId, setInventoryActionLoadingId] = useState<string | null>(null);
  const staffProfile = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('staff_profile');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Unable to parse staff profile', error);
      return null;
    }
  }, []);
  const localStaffId = staffProfile?.id || null;
  const supervisorInsight = useSupervisorAI(caseId);
  const { modules: trainingModules, progress: trainingProgress } = useTrainingEngine(localStaffId ?? '');
  const trainingLesson = trainingModules?.[0] || null;
  const [staffEditDraft, setStaffEditDraft] = useState<FuneralStaffAssignment | null>(null);
  const [vehicleEditDraft, setVehicleEditDraft] = useState<FuneralVehicle | null>(null);
  const [venueEditDraft, setVenueEditDraft] = useState<FuneralVenue | null>(null);
  const warningToastRef = useRef<string | null>(null);
  const automationSeverityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    automationAlerts.forEach((alert) => {
      const key = alert.severity || 'unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [automationAlerts]);

  const formatSlaCountdown = useCallback((dueAt?: string) => {
    if (!dueAt) return 'No SLA set';
    const dueDate = new Date(dueAt);
    const diffMs = dueDate.getTime() - Date.now();
    if (diffMs <= 0) {
      return 'Overdue';
    }
    const minutes = Math.floor(diffMs / (60 * 1000));
    if (minutes < 60) {
      return `Due in ${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    return `Due in ${hours}h ${minutes % 60}m`;
  }, []);

  const upcomingSlaAlerts = useMemo(() => {
    return automationAlerts
      .filter((alert) => alert.slaDueAt)
      .sort(
        (a, b) =>
          new Date(a.slaDueAt as string).getTime() - new Date(b.slaDueAt as string).getTime()
      )
      .slice(0, 3);
  }, [automationAlerts]);

  const automationSeverityKeyOrder = ['high', 'medium', 'low', 'unknown'];

  const loadAutomationAlerts = useCallback(async () => {
    try {
      setAutomationLoading(true);
      setAutomationError('');
      const res = await fetchCaseAutomations(caseId);
      setAutomationAlerts(res?.alerts || []);
      setAutomationHistory(res?.history || []);
    } catch (error) {
      console.error('Failed to load automation alerts', error);
      setAutomationError('Unable to load automation alerts.');
    } finally {
      setAutomationLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void loadAutomationAlerts();
  }, [loadAutomationAlerts]);

  const loadComplianceData = useCallback(async () => {
    try {
      setComplianceLoading(true);
      setComplianceError('');
      const res = await fetchCaseCompliance(caseId);
      setComplianceData(res?.data || { checklist: [], documents: [], gate: null });
    } catch (error) {
      console.error('Failed to load compliance data', error);
      setComplianceError('Unable to load compliance checklist.');
    } finally {
      setComplianceLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void loadComplianceData();
  }, [loadComplianceData]);

  const loadCaseInventory = useCallback(async () => {
    try {
      setInventoryLoading(true);
      setInventoryError('');
      const res = await fetchCaseInventory(caseId);
      setCaseInventory(res?.data || []);
    } catch (error) {
      console.error('Failed to load case inventory', error);
      setInventoryError('Unable to load assigned assets.');
    } finally {
      setInventoryLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void loadCaseInventory();
  }, [loadCaseInventory]);


  const handleChecklistAction = useCallback(
    async (item: any, status: 'completed' | 'waived') => {
      if (!item?.id) return;
      const payload: { status?: string; waivedReason?: string } = {};
      payload.status = status;
      if (status === 'waived') {
        const reason = window.prompt('Why are you waiving this compliance item?');
        payload.waivedReason = reason || '';
      }
      setComplianceBusyItem(item.id);
      try {
        await updateComplianceChecklistItem(caseId, item.id, payload);
        await loadComplianceData();
      } catch (error) {
        console.error('Failed to update checklist item', error);
        setComplianceError('Unable to update checklist item.');
      } finally {
        setComplianceBusyItem(null);
      }
    },
    [caseId, loadComplianceData]
  );

  const handleDocumentAction = useCallback(
    async (doc: any, status: 'verified' | 'waived') => {
      if (!doc?.id) return;
      const payload: { status?: string; waivedReason?: string } = {};
      payload.status = status;
      if (status === 'waived') {
        const reason = window.prompt('Why are you waiving this document requirement?');
        payload.waivedReason = reason || '';
      }
      setComplianceBusyItem(doc.id);
      try {
        await updateComplianceDocument(caseId, doc.id, payload);
        await loadComplianceData();
      } catch (error) {
        console.error('Failed to update document status', error);
        setComplianceError('Unable to update document status.');
      } finally {
        setComplianceBusyItem(null);
      }
    },
    [caseId, loadComplianceData]
  );

  const handleResolveAutomationAlert = useCallback(
    async (alertId: string) => {
      try {
        await resolveAutomationAlert(caseId, alertId);
        await loadAutomationAlerts();
      } catch (error) {
        console.error('Failed to resolve automation alert', error);
        setAutomationError('Failed to resolve alert. Please try again.');
      }
    },
    [caseId, loadAutomationAlerts]
  );

  const caseDetailQuery = useCaseDetailQuery(caseId);
  useEffect(() => {
    const messageChannel = subscribeMessagesForCase(caseId, (payload) => {
      if (payload.eventType !== 'INSERT') {
        return;
      }
      const newMessage = payload.new;
      if (!newMessage) return;
      queryClient.setQueryData<CaseDetailRecord | undefined>(['case-detail', caseId], (current) => {
        if (!current) return current;
        const exists = current.messages.some((msg) => String(msg.id) === String(newMessage.id));
        if (exists) return current;
        return {
          ...current,
          messages: [...current.messages, newMessage]
        };
      });
    });

    return () => {
      unsubscribeChannel(messageChannel);
    };
  }, [caseId, queryClient]);

  useEffect(() => {
    const timelineChannel = subscribeCaseEventsForCase(caseId, (payload) => {
      if (payload.eventType !== 'INSERT') {
        return;
      }
      const newEvent = payload.new;
      if (!newEvent) return;
      queryClient.setQueryData<CaseEventRecord[] | undefined>(['case-timeline', caseId], (current) => {
        const list = current || [];
        const exists = list.some((evt) => String(evt.id) === String(newEvent.id));
        if (exists) return list;
        return [newEvent, ...list];
      });
      // also refresh workflow summary if stage change event occurs
      if (newEvent.event_type === 'STAGE_CHANGE') {
        queryClient.invalidateQueries({ queryKey: ['case-workflow', caseId] });
        queryClient.invalidateQueries({ queryKey: ['case-detail', caseId] });
      }
    });

    return () => {
      unsubscribeChannel(timelineChannel);
    };
  }, [caseId, queryClient]);
  const timelineQuery = useCaseTimelineQuery(caseId);
  const workflowQuery = useCaseWorkflowQuery(caseId);
  const documentsQuery = useCaseDocumentsQuery(caseId);
  const chargesQuery = useCaseChargesQuery(caseId);
  const notesQuery = useCaseNotesQuery(caseId);
  const forecastQuery = useCaseForecastQuery(caseId);
  const supervisorQuery = useCaseSupervisorQuery(caseId);
  const supervisorHints = useMemo(
    (): { type: string; message: string }[] => {
      const hints = supervisorQuery.data?.hints || [];
      return hints.map((hint: { type?: string; message?: string }) => ({
        type: hint?.type || 'insight',
        message: hint?.message || 'Supervisor watch updated.'
      }));
    },
    [supervisorQuery.data]
  );
  const addNoteMutation = useMutation({
    mutationFn: async (noteBody: string) => {
      await createCaseNote(caseId, { body: noteBody });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-notes', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-timeline', caseId] });
    }
  });
  const dismissIntelligenceToast = useCallback((id: string) => {
    setIntelligenceToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = toastTimers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete toastTimers.current[id];
    }
  }, []);

  const pushIntelligenceToast = useCallback(
    (payload: Omit<ToastPayload, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setIntelligenceToasts((prev) => {
        const next = [{ id, ...payload }, ...prev];
        return next.slice(0, 4);
      });
      toastTimers.current[id] = window.setTimeout(() => {
        dismissIntelligenceToast(id);
      }, 6000);
    },
    [dismissIntelligenceToast]
  );

  const handleInventoryCheckout = useCallback(
    async (reservationId: string) => {
      setInventoryActionLoadingId(reservationId);
      try {
        await checkoutInventoryReservation(reservationId, { staffId: localStaffId });
        pushIntelligenceToast({
          severity: 'info',
          message: 'Marked asset as checked out.'
        });
        await loadCaseInventory();
      } catch (error) {
        console.error('Inventory checkout failed', error);
        pushIntelligenceToast({
          severity: 'danger',
          message: 'Unable to check out asset.'
        });
      } finally {
        setInventoryActionLoadingId(null);
      }
    },
    [loadCaseInventory, localStaffId, pushIntelligenceToast]
  );

  const handleInventoryCheckin = useCallback(
    async (reservationId: string) => {
      setInventoryActionLoadingId(reservationId);
      try {
        await checkinInventoryReservation(reservationId, { staffId: localStaffId });
        pushIntelligenceToast({
          severity: 'info',
          message: 'Asset marked as returned.'
        });
        await loadCaseInventory();
      } catch (error) {
        console.error('Inventory checkin failed', error);
        pushIntelligenceToast({
          severity: 'danger',
          message: 'Unable to mark asset returned.'
        });
      } finally {
        setInventoryActionLoadingId(null);
      }
    },
    [loadCaseInventory, localStaffId, pushIntelligenceToast]
  );

  useEffect(
    () => () => {
      Object.values(toastTimers.current).forEach((timer) => clearTimeout(timer));
    },
    []
  );

  useEffect(() => {
    const watchHint = supervisorHints.find((hint) => hint.type !== 'insight');
    if (!watchHint) return;
    if (lastSupervisorHintRef.current === watchHint.message) return;
    lastSupervisorHintRef.current = watchHint.message;
    pushIntelligenceToast({
      severity: 'info',
      message: `Supervisor watch · ${watchHint.message}`
    });
  }, [pushIntelligenceToast, supervisorHints]);

  useEffect(() => {
    setActiveTab(sanitizeTab(tab));
  }, [tab]);

  useEffect(() => {
    debugLog('Mounted CaseDetailPage', { caseId });
    return () => {
      debugLog('Unmounted CaseDetailPage', { caseId });
    };
  }, [caseId]);

  const sideTabs = useMemo(() => [...CASE_TABS], []);
  const tabLabelMap = useMemo(() => {
    return CASE_TABS.reduce<Record<string, string>>((acc, tab) => {
      acc[tab.key] = tab.label;
      return acc;
    }, {});
  }, []);

  const handleTabSelect = (nextTab: string) => {
    const safeTab = sanitizeTab(nextTab);
    setActiveTab(safeTab);
    debugLog('Tab changed', { caseId, safeTab });
    onTabChange?.(safeTab);
  };

  async function requestDraft(messageText: string) {
    try {
      setDraftLoading(true);
      setDraftReply(null);
      setDraftError('');

      const caseContext = {
        caseId,
        caseDetail: caseDetailQuery.data,
        conversationHistory: caseDetailQuery.data?.messages || []
      };

      const result = await fetchDraftReply(
        messageText,
        caseContext,
        caseDetailQuery.data?.case?.stage || 'NEW'
      );
      setDraftReply(result?.draft || result);
    } catch (err) {
      setDraftError('AI draft could not be generated.');
      console.error('Draft request failed:', err);
    } finally {
      setDraftLoading(false);
    }
  }

  async function generateCaseSummary() {
    try {
      setSummaryLoading(true);
      setSummaryError('');
      setCaseSummary(null);

      const res = await fetchCaseSummary(caseId);
      const text = res?.summary?.summary || null;
      setCaseSummary(text);
      setSummaryGeneratedAt(res?.summary?.generatedAt || '');
      setSummaryWordCount(res?.summary?.wordCount || 0);
      setSummaryStage(res?.summary?.stage || '');
    } catch (error) {
      console.error('Error generating case summary:', error);
      setSummaryError('AI case summary could not be generated.');
    } finally {
      setSummaryLoading(false);
    }
  }

  async function generateAttentionPanel() {
    try {
      setAttentionLoading(true);
      setAttentionError('');
      const res = await fetchCaseAttention(caseId);
      setAttentionItems(res?.attention?.items || []);
      setAttentionGeneratedAt(new Date().toISOString());
    } catch (error) {
      console.error('Error generating attention items:', error);
      setAttentionError('AI could not analyse attention items.');
    } finally {
      setAttentionLoading(false);
    }
  }

  async function generateDeepBriefingPanel() {
    try {
      setDeepBriefingLoading(true);
      setDeepBriefingError('');
      const res = await fetchCaseDeepBriefing(caseId);
      setDeepBriefing(res?.briefing || null);
    } catch (error) {
      console.error('Error generating deep AI briefing:', error);
      setDeepBriefingError('AI could not generate the deep briefing.');
    } finally {
      setDeepBriefingLoading(false);
    }
  }

  const copyIntelligencePack = useCallback(async () => {
    try {
      const sections = [
        'AI Case Summary',
        caseSummary || 'Summary not generated yet.',
        '',
        'Attention Items',
        attentionItems.length
          ? attentionItems.map((item) => `• ${item.category || 'General'}: ${item.item}`).join('\n')
          : 'No attention items generated yet.',
        '',
        'Deep Briefing Risk Grade',
        deepBriefing?.briefing?.riskGrade || 'Not available'
      ];
      await navigator.clipboard.writeText(sections.join('\n'));
      setIntelligenceCopyStatus('copied');
      setTimeout(() => setIntelligenceCopyStatus('idle'), 2500);
    } catch (error) {
      console.error('Unable to copy intelligence pack', error);
      setIntelligenceCopyStatus('error');
      setTimeout(() => setIntelligenceCopyStatus('idle'), 2500);
    }
  }, [caseSummary, attentionItems, deepBriefing]);

  const caseRecord = caseDetailQuery.data?.case;
  const contact =
    caseDetailQuery.data?.contact || caseRecord?.contact || null;
  const handleRequestPayment = useCallback(async () => {
    const amount =
      caseRecord?.deposit_amount ?? caseRecord?.total_amount ?? 0;
    setPaymentLoading(true);
    setPaymentError('');
    setPaymentMessage('');
    try {
      const res = await requestPaymentConfirmation(caseId, amount, 'deposit');
      setPaymentMessage(res?.data?.message || 'Payment instructions sent.');
    } catch (error) {
      console.error('Failed to request payment instructions', error);
      setPaymentError('Unable to request payment instructions.');
    } finally {
      setPaymentLoading(false);
    }
  }, [caseId, requestPaymentConfirmation, caseRecord]);

  const handleAutoDetectPayment = useCallback(async () => {
    const phone = contact?.phone_number || '';
    const amount =
      caseRecord?.deposit_amount ?? caseRecord?.total_amount ?? 0;
    if (!phone) {
      setPaymentError('Contact phone number is required to auto detect payment.');
      return;
    }
    setPaymentLoading(true);
    setPaymentError('');
    setAutoDetectResult(null);
    try {
      const res = await autoDetectPayment(caseId, phone, amount);
      setAutoDetectResult(res?.data || res);
    } catch (error) {
      console.error('Auto payment detect failed', error);
      setPaymentError('Unable to auto detect payment.');
    } finally {
      setPaymentLoading(false);
    }
  }, [caseId, autoDetectPayment, contact, caseRecord]);
  const messages = caseDetailQuery.data?.messages ?? [];
  const stageFromCase = caseRecord?.stage || caseRecord?.status || 'NEW';
  const workflowStage = workflowQuery.data?.stage || stageFromCase;
  const assignedStaffName =
    (caseRecord && (caseRecord as any).assigned_staff_name) || 'Unassigned';
  const resolvedAutomationEvents = automationHistory
    .filter((alert) => alert.resolvedAt)
    .map((alert) => ({
      id: `automation-${alert.id}`,
      type: 'AUTOMATION_ALERT_RESOLVED',
      timestamp: alert.resolvedAt,
      description: `${alert.title} resolved`,
      metadata: { severity: alert.severity, automationKey: alert.key }
    }));

  const timelineEvents =
    (timelineQuery.data || []).map((event) => {
      const safeEvent = (event || {}) as TimelineRecord;
      let metadata = safeEvent.metadata || null;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch {
          metadata = safeEvent.metadata;
        }
      }
      const fallbackDescription =
        metadata?.description ||
        metadata?.title ||
        metadata?.note ||
        metadata?.notePreview ||
        safeEvent.event_type ||
        'Event logged';
      const description = describeCaseEvent(safeEvent.event_type, metadata, fallbackDescription);
      return {
        id: String(safeEvent.id ?? safeEvent.created_at ?? `generated-${Date.now()}`),
        type: safeEvent.event_type ?? 'EVENT',
        timestamp: String(safeEvent.created_at ?? new Date().toISOString()),
        description,
        metadata
      };
    }) ?? [];

  const mergedTimelineEvents = [...resolvedAutomationEvents, ...timelineEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const complianceEvents = timelineEvents
    .filter((event) => (event.type || '').startsWith('COMPLIANCE'))
    .map((event) => ({
      id: event.id,
      title: event.description,
      description: event.metadata?.description || null,
      severity: event.metadata?.severity || 'medium',
      timestamp: event.timestamp
    }));

  const normalizedMessages = messages.map((message) => {
    const rawDirection = message.direction?.toLowerCase?.() || 'inbound';
    const direction =
      rawDirection === 'incoming'
        ? 'inbound'
        : rawDirection === 'outgoing'
        ? 'outbound'
        : rawDirection;
    return {
      id: String(message.id),
      direction,
      body: message.body,
      timestamp: message.created_at,
      author: message.author || undefined
    };
  });
  const groupedAttention = useMemo(() => {
    const map = new Map<string, any[]>();
    attentionItems.forEach((item) => {
      const category = (item?.category || 'General').trim();
      if (!map.has(category)) {
        map.set(category, []);
      }
      map.get(category)?.push(item);
    });
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }, [attentionItems]);

  const funeralDayQuery = useFuneralDay(caseId);
  const funeralDayPayload: FuneralDayPayload =
    (funeralDayQuery.data as FuneralDayPayload | undefined) || {
      events: [],
      tasks: [],
      staff: [],
      vehicles: [],
      venues: [],
      venueChecklist: []
    };
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const eventComplianceWarnings = useMemo(() => {
    const gate = complianceData.gate || { blockingChecklist: [], blockingDocuments: [] };
    const warningsMap: Record<string, string[]> = {};
    for (const item of [...gate.blockingChecklist, ...gate.blockingDocuments]) {
      const key = `${item.required_stage || item.metadata?.requiredStage || 'general'}`.toUpperCase();
      warningsMap[key] = warningsMap[key] || [];
      warningsMap[key].push(item.description || item.item_key || item.alert_type || 'Compliance requirement');
    }
    return warningsMap;
  }, [complianceData.gate]);

  useEffect(() => {
    if (!selectedEventId && funeralDayPayload.events.length) {
      setSelectedEventId(funeralDayPayload.events[0].id);
    }
  }, [funeralDayPayload.events, selectedEventId]);

  const selectedEvent = useMemo(
    () => funeralDayPayload.events.find((evt) => evt.id === selectedEventId) || funeralDayPayload.events[0] || null,
    [funeralDayPayload.events, selectedEventId]
  );
  const selectedTasks = useMemo(
    () => funeralDayPayload.tasks.filter((task) => task.event_id === selectedEvent?.id),
    [funeralDayPayload.tasks, selectedEvent]
  );
  const selectedEventWarnings = useMemo(() => {
    if (!selectedEvent) return [];
    const key = `${selectedEvent.code || selectedEvent.label || 'general'}`.toUpperCase();
    return eventComplianceWarnings[key] || [];
  }, [eventComplianceWarnings, selectedEvent]);
  const eventInventory = useMemo(() => {
    if (!caseInventory.length) return [];
    if (!selectedEvent) return caseInventory;
    const referenceTime =
      selectedEvent.scheduled_start
        ? new Date(selectedEvent.scheduled_start).getTime()
        : selectedEvent.scheduled_end
        ? new Date(selectedEvent.scheduled_end).getTime()
        : Date.now();
    return caseInventory.filter((inventoryItem) => {
      const from = inventoryItem.reserved_from ? new Date(inventoryItem.reserved_from).getTime() : null;
      const to = inventoryItem.reserved_to ? new Date(inventoryItem.reserved_to).getTime() : null;
      if (!from || !to) return true;
      return referenceTime >= from && referenceTime <= to;
    });
  }, [caseInventory, selectedEvent]);

  const startStaffEdit = useCallback(
    (assignment: FuneralStaffAssignment) => {
      setStaffEditDraft({
        ...assignment,
        name_override: assignment.name_override || assignment.staff_name
      });
    },
    []
  );

  const startVehicleEdit = useCallback((vehicle: FuneralVehicle) => {
    setVehicleEditDraft({ ...vehicle, driver_name: vehicle.driver_name || '' });
  }, []);

  const startVenueEdit = useCallback((venue: FuneralVenue) => {
    setVenueEditDraft({ ...venue, name: venue.name || '' });
  }, []);

  const saveStaffAssignment = useCallback(async () => {
    if (!staffEditDraft) return;
    try {
      await upsertFuneralStaff(caseId, {
        id: staffEditDraft.id,
        case_id: staffEditDraft.case_id || caseId,
        role: staffEditDraft.role,
        name_override: staffEditDraft.name_override,
        staff_id: staffEditDraft.staff_id,
        contact_phone: staffEditDraft.contact_phone,
        metadata: staffEditDraft.metadata || {}
      });
      await funeralDayQuery.refetch();
      pushIntelligenceToast({
        severity: 'info',
        message: `Staff saved · ${staffEditDraft.role || 'Assignment'} updated for this event.`
      });
    } catch (error) {
      console.error('Failed to save staff assignment', error);
      pushIntelligenceToast({
        severity: 'danger',
        message: 'Staff save failed · Could not persist the assignment change.'
      });
    } finally {
      setStaffEditDraft(null);
    }
  }, [caseId, funeralDayQuery, pushIntelligenceToast, staffEditDraft]);

  const saveVehicleAssignment = useCallback(async () => {
    if (!vehicleEditDraft) return;
    try {
      await upsertFuneralVehicle(caseId, {
        id: vehicleEditDraft.id,
        case_id: vehicleEditDraft.case_id || caseId,
        driver_name: vehicleEditDraft.driver_name,
        driver_phone: vehicleEditDraft.driver_phone,
        vehicle_label: vehicleEditDraft.vehicle_label,
        metadata: vehicleEditDraft.metadata || {}
      });
      await funeralDayQuery.refetch();
      pushIntelligenceToast({
        severity: 'info',
        message: `Vehicle saved · ${vehicleEditDraft.vehicle_type || 'Vehicle'} updated.`
      });
    } catch (error) {
      console.error('Failed to save vehicle', error);
      pushIntelligenceToast({
        severity: 'danger',
        message: 'Vehicle save failed · Unable to persist the vehicle update.'
      });
    } finally {
      setVehicleEditDraft(null);
    }
  }, [caseId, funeralDayQuery, pushIntelligenceToast, vehicleEditDraft]);

  const saveVenueAssignment = useCallback(async () => {
    if (!venueEditDraft) return;
    try {
      await upsertFuneralVenue(caseId, {
        id: venueEditDraft.id,
        case_id: venueEditDraft.case_id || caseId,
        name: venueEditDraft.name,
        address: venueEditDraft.address,
        contact_person: venueEditDraft.contact_person,
        contact_phone: venueEditDraft.contact_phone,
        metadata: venueEditDraft.metadata || {}
      });
      await funeralDayQuery.refetch();
      pushIntelligenceToast({
        severity: 'info',
        message: `Venue saved · ${venueEditDraft.venue_type || 'Venue'} updated.`
      });
    } catch (error) {
      console.error('Failed to save venue', error);
      pushIntelligenceToast({
        severity: 'danger',
        message: 'Venue save failed · Unable to persist the venue update.'
      });
    } finally {
      setVenueEditDraft(null);
    }
  }, [caseId, funeralDayQuery, pushIntelligenceToast, venueEditDraft]);

  useEffect(() => {
    if (selectedEventWarnings.length === 0) {
      warningToastRef.current = null;
      return;
    }
    const key = `${selectedEvent?.id || 'event'}-${selectedEventWarnings.join('|')}`;
    if (warningToastRef.current === key) return;
    warningToastRef.current = key;
    pushIntelligenceToast({
      severity: 'warning',
      message: `${selectedEvent?.label || 'Selected event'} has ${selectedEventWarnings.length} compliance alert(s).`
    });
  }, [selectedEvent, selectedEventWarnings, pushIntelligenceToast]);

  const eventAutomationAlerts = useMemo(() => {
    if (!selectedEvent) return [];
    const id = `${selectedEvent.id}`;
    return automationAlerts.filter((alert) => {
      const meta = alert.metadata || {};
      const matches =
        String(alert.eventId || alert.event_id || '').includes(id) ||
        String(meta.eventId || meta.event_id || '').includes(id);
      return matches;
    });
  }, [automationAlerts, selectedEvent]);

  const complianceAutomationAlerts = useMemo(() => {
    return automationAlerts.filter((alert) => {
      const meta = alert.metadata || {};
      const category = String(alert.category || meta.category || '').toLowerCase();
      const reason = String(meta.reason || meta.description || '').toLowerCase();
      return category.includes('compliance') || reason.includes('compliance');
    });
  }, [automationAlerts]);

  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const handleEventStatusChange = useCallback(
    async (eventId: string, updates: any) => {
      setEventStatusLoading(true);
      try {
        await updateFuneralEventStatus(eventId, updates);
        await funeralDayQuery.refetch();
      } catch (error) {
        console.error('Failed to update event status', error);
      } finally {
        setEventStatusLoading(false);
      }
    },
    [funeralDayQuery]
  );

  const handleTaskUpdate = useCallback(
    async (taskId: string, status: 'DONE' | 'SKIPPED') => {
      setTaskStatusLoading(true);
      try {
        await updateFuneralEventTask(taskId, { status, completed_at: status === 'DONE' ? new Date().toISOString() : null });
        await funeralDayQuery.refetch();
      } catch (error) {
        console.error('Failed to update task', error);
      } finally {
        setTaskStatusLoading(false);
      }
    },
    [funeralDayQuery]
  );

  const generateFuneralBriefing = useCallback(async () => {
    setFuneralBriefingLoading(true);
    setFuneralBriefingError('');
    setFuneralBriefingTimestamp('');
    try {
      const res = await fetchFuneralBriefing(caseId);
      const payload = res?.data || res || {};
      const briefing = payload?.briefing || payload;
      if (!briefing) {
        throw new Error('No briefing returned');
      }
      setFuneralBriefing({ ...payload, briefing });
      setFuneralBriefingTimestamp(payload.generatedAt || briefing.generatedAt || new Date().toISOString());
    } catch (error) {
      console.error('Failed to generate funeral briefing', error);
      setFuneralBriefingError('Unable to generate briefing.');
    } finally {
      setFuneralBriefingLoading(false);
    }
  }, [caseId]);

  const deriveAttentionSeverity = useCallback((category: string, itemText: string) => {
    const text = `${category} ${itemText}`.toLowerCase();
    if (text.includes('risk') || text.includes('time') || text.includes('urgent')) {
      return 'high';
    }
    if (text.includes('missing') || text.includes('task') || text.includes('decision')) {
      return 'medium';
    }
    return 'low';
  }, []);
  const attentionTargetTab = useCallback((category: string, itemText: string): CaseTabKey => {
    const text = `${category} ${itemText}`.toLowerCase();
    if (text.includes('document') || text.includes('form') || text.includes('template')) {
      return 'documents';
    }
    if (text.includes('payment') || text.includes('charge') || text.includes('invoice')) {
      return 'charges';
    }
    if (text.includes('message') || text.includes('chat') || text.includes('whatsapp')) {
      return 'messages';
    }
    if (text.includes('timeline') || text.includes('event')) {
      return 'timeline';
    }
    return 'workflow';
  }, []);
  const formatStatusTime = useCallback((timestamp: string) => {
    if (!timestamp) return 'Not run';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const draftDisplayText =
    draftReply == null
      ? null
      : typeof draftReply === 'string'
      ? draftReply
      : draftReply.reply || (isEditingDraft ? editedDraftText : 'No draft text available.');

  const overviewError = caseDetailQuery.isError;
  const forecastData = forecastQuery.data;

  const handleGenerateDraft = async () => {
    try {
      setDraftLoading(true);
      setComposerDraftError(null);
      const response = await generateDraftMessage(caseId, { prompt: draftText });
      const newDraft = response.data?.draft || '';
      setDraftText(newDraft);
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Unable to generate draft. Please try again.';
      setComposerDraftError(message);
    } finally {
      setDraftLoading(false);
    }
  };

  const handleSendDraft = async () => {
    if (!draftText.trim()) {
      setComposerDraftError('Draft cannot be empty.');
      return;
    }
    try {
      setSendLoading(true);
      setComposerDraftError(null);
      await sendDraftMessage(caseId, { body: draftText.trim() });
      setDraftText('');
      queryClient.invalidateQueries({ queryKey: ['case-detail', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-timeline', caseId] });
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Unable to send message.';
      setComposerDraftError(message);
    } finally {
      setSendLoading(false);
    }
  };

  const onAcceptDraft = () => {
    if (!draftReply) return;

    const text =
      typeof draftReply === 'string'
        ? draftReply
        : typeof draftReply?.reply === 'string'
        ? draftReply.reply
        : '';

    if (!text) {
      return;
    }

    setMessageInput(text);
    setDraftReply(null);
  };

  const onEditDraft = () => {
    if (!draftReply) return;

    const initial =
      typeof draftReply === 'string'
        ? draftReply
        : typeof draftReply?.reply === 'string'
        ? draftReply.reply
        : '';

    if (!initial) {
      return;
    }

    setEditedDraftText(initial);
    setIsEditingDraft(true);
  };

  useEffect(() => {
    const level = forecastData?.level;
    if (!level || forecastQuery.isFetching) {
      return;
    }
    if (lastForecastLevelRef.current === null) {
      lastForecastLevelRef.current = level;
      return;
    }
    if (lastForecastLevelRef.current !== level) {
      const severity = level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'info';
      pushIntelligenceToast({
        message: `Forecast now ${level.toUpperCase()}: ${forecastData?.summary || 'Risk level changed.'}`,
        severity
      });
    }
    lastForecastLevelRef.current = level;
  }, [forecastData?.level, forecastData?.summary, forecastQuery.isFetching, pushIntelligenceToast]);

  useEffect(() => {
    const latestEvent = timelineEvents[0] as TimelineRecord | undefined;
    if (!latestEvent || latestEvent.event_type !== 'SUPERVISOR_HINT') {
      return;
    }
    const eventId = String(latestEvent.id ?? latestEvent.created_at);
    if (lastSupervisorEventRef.current === eventId) {
      return;
    }
    lastSupervisorEventRef.current = eventId;
    const hintMessage =
      latestEvent.metadata?.hints?.[0]?.message ||
      latestEvent.metadata?.summary ||
      'AI Supervisor shared a new hint.';
    pushIntelligenceToast({
      message: hintMessage,
      severity: 'info'
    });
  }, [timelineEvents, pushIntelligenceToast]);

  return (
    <>
      <SupervisorInsightDrawer insight={supervisorInsight} />
      <TrainingOverlay lesson={trainingLesson} />
      <div className="flex h-screen w-screen bg-slate-950 text-slate-100">
        <CaseSidebarTabs tabs={sideTabs} activeTab={activeTab} onSelect={handleTabSelect} />

        <div className="flex min-w-0 flex-1 flex-col">
        <CaseHeader
          caseRef={(caseRecord?.case_ref || caseId || 'CASE').toUpperCase()}
          clientName={contact?.name || 'Loading client…'}
          stage={workflowStage}
          onClose={onClose}
          actions={
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button className="rounded-full border border-slate-600 px-3 py-1.5 font-semibold text-slate-200 hover:border-slate-400 transition">
                Add note
              </button>
              <button className="rounded-full border border-slate-600 px-3 py-1.5 font-semibold text-slate-200 hover:border-slate-400 transition">
                Assign staff
              </button>
              <button className="rounded-full border border-slate-600 px-3 py-1.5 font-semibold text-slate-200 hover:border-slate-400 transition">
                Mark completed
              </button>
            </div>
          }
        />

        {(activeTab as string) === 'details' && (
          <div className="mt-4">
            <div className="mb-3 grid gap-2 text-xs text-slate-400 md:grid-cols-3">
              <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-2">
                <p className="font-semibold uppercase tracking-wide text-slate-300">Summary</p>
                <p className="text-slate-100">{formatStatusTime(summaryGeneratedAt)}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-2">
                <p className="font-semibold uppercase tracking-wide text-slate-300">Attention</p>
                <p className="text-slate-100">{formatStatusTime(attentionGeneratedAt)}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-2">
                <p className="font-semibold uppercase tracking-wide text-slate-300">Deep Briefing</p>
                <p className="text-slate-100">
                  {formatStatusTime(deepBriefing?.generatedAt || '')}
                </p>
              </div>
            </div>
            <button
              onClick={generateCaseSummary}
              disabled={summaryLoading}
              className="rounded bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
            >
              {summaryLoading ? 'Generating...' : 'Generate AI Case Summary'}
            </button>
            {summaryError && (
              <div className="mt-2 text-sm text-red-400">
                {summaryError}
              </div>
            )}
            <button
              onClick={generateAttentionPanel}
              disabled={attentionLoading}
              className="ml-3 rounded border border-red-400 px-4 py-2 text-sm font-semibold text-red-200 transition hover:border-red-200 hover:text-white disabled:opacity-50"
            >
              {attentionLoading ? 'Analysing...' : 'Analyse Attention Items'}
            </button>
            <button
              onClick={generateDeepBriefingPanel}
              disabled={deepBriefingLoading}
              className="ml-3 rounded border border-purple-400 px-4 py-2 text-sm font-semibold text-purple-200 transition hover:border-purple-200 hover:text-white disabled:opacity-50"
            >
              {deepBriefingLoading ? 'Generating briefing...' : 'Generate Deep AI Briefing'}
            </button>
            {attentionError && (
              <div className="mt-2 text-sm text-red-400">
                {attentionError}
              </div>
            )}
            {deepBriefingError && (
              <div className="mt-2 text-sm text-rose-300">
                {deepBriefingError}
              </div>
            )}
            <div className="mt-4 w-full rounded-xl border border-amber-400/60 bg-amber-500/10 p-4 text-amber-100">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-200">
                    Intelligence Pack
                  </p>
                  <p className="text-sm text-amber-50">
                    Bundles the latest AI summary + attention insights for coordinators.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => window.open(`/api/cases/${caseId}/intelligence/pdf`, '_blank')}
                    className="rounded bg-amber-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-900 transition hover:bg-amber-500"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={copyIntelligencePack}
                    className="rounded border border-amber-300/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-100 transition hover:bg-amber-400/10"
                  >
                    Copy Brief
                  </button>
                </div>
              </div>
              {intelligenceCopyStatus === 'copied' && (
                <p className="mt-2 text-xs text-amber-200">Copied to clipboard.</p>
              )}
              {intelligenceCopyStatus === 'error' && (
                <p className="mt-2 text-xs text-red-200">
                  Unable to copy intelligence pack. Please try again.
                </p>
              )}
            </div>
          </div>
        )}

        {(activeTab as string) === 'details' && caseSummary && (
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-slate-100">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              AI Case Summary
            </h4>
            <div className="mb-3 space-y-1 text-xs text-slate-400">
              {summaryGeneratedAt && (
                <div>Generated at: {new Date(summaryGeneratedAt).toLocaleString()}</div>
              )}
              {summaryWordCount > 0 && <div>Word count: {summaryWordCount}</div>}
              {summaryStage && <div>Stage analysed: {summaryStage}</div>}
            </div>
            <div className="mt-2 whitespace-pre-line text-base leading-6 text-slate-100">{caseSummary}</div>
            <button
              onClick={() => window.open(`/api/cases/${caseId}/summary/pdf`, '_blank')}
              className="mt-3 rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Download Summary PDF
            </button>
          </div>
        )}

        {(activeTab as string) === 'details' && attentionItems.length > 0 && (
          <div className="mt-4 rounded-2xl border border-red-700 bg-red-950/40 p-5 text-red-100 shadow-md shadow-red-900/20">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-red-300">
                Areas That Need Attention
              </h4>
              <span className="text-xs text-red-200/80">
                {attentionItems.length} item{attentionItems.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {groupedAttention.map((group) => (
                <div key={group.category}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-200">{group.category}</p>
                  <ul className="mt-1 space-y-1">
                    {group.items.map((item, index) => {
                      const severity = deriveAttentionSeverity(group.category, item.item);
                      const severityStyles =
                        severity === 'high'
                          ? 'bg-red-500 shadow-red-500/40'
                          : severity === 'medium'
                          ? 'bg-amber-400 shadow-amber-400/40'
                          : 'bg-slate-300 shadow-slate-300/30';
                      return (
                        <li key={`${group.category}-${index}`} className="space-y-1 rounded-lg bg-red-900/20 p-2 text-sm">
                          <div className="flex items-start gap-2">
                            <span className={`mt-1 h-2 w-2 rounded-full shadow ${severityStyles}`} />
                            <span className="text-red-100/90">{item.item}</span>
                          </div>
                          <div className="pl-4">
                            {(() => {
                              const targetTab = attentionTargetTab(group.category, item.item);
                              return (
                                <button
                                  onClick={() => handleTabSelect(targetTab)}
                                  className="text-xs font-semibold text-red-200 underline-offset-4 hover:text-white hover:underline"
                                >
                                  Go to {tabLabelMap[targetTab]}
                                </button>
                              );
                            })()}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            <button
              onClick={() => window.open(`/api/cases/${caseId}/attention/pdf`, '_blank')}
              className="mt-3 rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              Download Attention PDF
            </button>
          </div>
        )}

        {(activeTab as string) === 'details' && (
          <div className="mt-4 rounded-2xl border border-amber-400 bg-amber-50/60 p-5 text-amber-900 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">
                  Automation Alerts
                </p>
                <p className="text-sm text-amber-700">Live workflow rules for this case.</p>
              </div>
              <button
                onClick={() => loadAutomationAlerts()}
                className="rounded-full border border-amber-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 transition hover:bg-amber-100"
              >
                Refresh
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em]">
              {automationSeverityKeyOrder.map((key) => {
                const count = automationSeverityCounts[key] || 0;
                const label = `${key} ${count}`;
                const styles =
                  key === 'high'
                    ? 'bg-red-600 text-white'
                    : key === 'medium'
                    ? 'bg-amber-400 text-amber-900'
                    : key === 'low'
                    ? 'bg-slate-300 text-slate-900'
                    : 'bg-slate-200 text-slate-900';
                return (
                  <span key={key} className={`rounded-full px-3 py-1 font-semibold ${styles}`}>
                    {label}
                  </span>
                );
              })}
            </div>
            {upcomingSlaAlerts.length > 0 && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-white/80 p-3 text-xs text-amber-700">
                <p className="font-semibold uppercase tracking-[0.2em] text-amber-500">Upcoming SLAs</p>
                <ul className="mt-2 space-y-1">
                  {upcomingSlaAlerts.map((alert) => (
                    <li key={`sla-${alert.id}`} className="flex items-center justify-between">
                      <span>{alert.title}</span>
                      <span className="font-semibold text-amber-800">{formatSlaCountdown(alert.slaDueAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {automationError && (
              <p className="mt-2 text-xs text-red-600">{automationError}</p>
            )}
            <div className="mt-3 space-y-2">
              {automationLoading && <p className="text-sm text-amber-700">Loading alerts…</p>}
              {!automationLoading && automationAlerts.length === 0 && (
                <p className="text-sm text-amber-700">No automation alerts for this case.</p>
              )}
              {automationAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-sm text-amber-900"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{alert.title}</p>
                    <button
                      onClick={() => handleResolveAutomationAlert(alert.id)}
                      className="text-xs font-semibold text-amber-700 underline-offset-4 hover:underline"
                    >
                      Resolve
                    </button>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Assets for this event</p>
                      <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">
                        {eventInventory.length} items
                      </span>
                    </div>
                    {eventInventory.length === 0 ? (
                      <p className="mt-2 text-[11px] text-slate-500">No assets reserved yet.</p>
                    ) : (
                      <ul className="mt-3 space-y-2 text-[11px] text-slate-300">
                        {eventInventory.slice(0, 3).map((reservation) => (
                          <li key={reservation.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                            <p className="font-semibold text-slate-100">{reservation.item_name}</p>
                            <p className="text-[10px] text-slate-500">
                              {reservation.category} · {reservation.reserved_quantity} unit(s) ·{' '}
                              {reservation.status || 'Reserved'}
                            </p>
                          </li>
                        ))}
                        {eventInventory.length > 3 && (
                          <li className="text-[10px] text-slate-500">…and more assets reserved</li>
                        )}
                      </ul>
                    )}
                    <p className="mt-2 text-[10px] text-slate-500">
                      Data automatically flows from reservations and inventory events.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Supervisor watch</p>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-emerald-400">
                        {supervisorHints.length > 0 ? `${supervisorHints.length} tips` : 'idle'}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {supervisorHints.length === 0 ? (
                        <p className="text-[11px] text-slate-500">No supervisor alerts at the moment.</p>
                      ) : (
                        supervisorHints.slice(0, 3).map((hint, index: number) => (
                          <div
                            key={`${hint.type}-${index}`}
                            className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-200"
                          >
                            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-400">
                              {SUPERVISOR_LABELS[hint.type] || 'Insight'}
                            </span>
                            <p className="mt-1 text-sm text-slate-100">{hint.message}</p>
                          </div>
                        ))
                      )}
                      {supervisorHints.length > 3 && (
                        <p className="text-[10px] text-amber-200/80">…and {supervisorHints.length - 3} more</p>
                      )}
                    </div>
                  </div>
                  {alert.description && (
                    <p className="text-xs text-amber-700">{alert.description}</p>
                  )}
                  {alert.recommendedAction && (
                    <p className="text-xs text-amber-800">Action: {alert.recommendedAction}</p>
                  )}
                </div>
              ))}
            </div>
            {automationHistory.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-white/70 p-3 text-sm text-amber-900">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
                  Recently Resolved
                </p>
                <ul className="mt-2 space-y-1 text-xs text-amber-700">
                  {automationHistory.slice(0, 5).map((alert) => (
                    <li key={alert.id}>
                      <span className="font-semibold text-amber-900">{alert.title}</span> · resolved{' '}
                      {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() : 'recently'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {(activeTab as string) === 'details' && (
          <div className="mt-4">
            <AlertHistoryPanel
              automationHistory={automationHistory.map((alert) => ({
                id: alert.id,
                title: alert.title,
                description: alert.description,
                severity: alert.severity,
                resolvedAt: alert.resolvedAt,
                resolvedBy: alert.resolvedBy
              }))}
              complianceEvents={complianceEvents}
            />
          </div>
        )}

        {(activeTab as string) === 'details' && (
          <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-5 text-slate-100 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Compliance</p>
                <p className="text-sm text-slate-300">Checklist & documents ensuring stage gates</p>
              </div>
              {complianceLoading && <span className="text-xs text-slate-400">Refreshing…</span>}
            </div>
            {complianceError && (
              <p className="mt-2 text-xs text-rose-500">{complianceError}</p>
            )}
            {!complianceLoading && (
              <>
                {complianceData.gate && (
                  <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-400">
                    <p>
                      Gate status: {complianceData.gate.passed ? 'Ready' : 'Blocked'} ·{' '}
                      {complianceData.gate.blockingChecklist.length} checklist /{' '}
                      {complianceData.gate.blockingDocuments.length} document blockers
                    </p>
                  </div>
                )}

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <section>
                    <h5 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Checklist
                    </h5>
                    <div className="mt-2 space-y-2">
                      {complianceData.checklist.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-slate-100">{item.description || item.category}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.status === 'completed' ? 'bg-emerald-600 text-emerald-50' : item.status === 'waived' ? 'bg-amber-500 text-amber-50' : 'bg-slate-700 text-slate-100'}`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em]">
                            {['completed', 'waived'].map((action) => (
                              <button
                                key={action}
                                disabled={complianceBusyItem === item.id || item.status === action}
                                onClick={() =>
                                  handleChecklistAction(item, action as 'completed' | 'waived')
                                }
                                className="rounded-full border border-slate-600 px-3 py-1 text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {action === 'waived' ? 'Waive' : 'Mark complete'}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      {complianceData.checklist.length === 0 && (
                        <p className="text-xs text-slate-400">No checklist items available.</p>
                      )}
                    </div>
                  </section>
                  <section>
                    <h5 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Documents
                    </h5>
                    <div className="mt-2 space-y-2">
                      {complianceData.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-slate-100">{doc.label || doc.document_type}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${doc.status === 'verified' ? 'bg-emerald-600 text-emerald-50' : doc.status === 'waived' ? 'bg-amber-500 text-amber-50' : 'bg-slate-700 text-slate-100'}`}>
                              {doc.status}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em]">
                            {['verified', 'waived'].map((action) => (
                              <button
                                key={action}
                                disabled={complianceBusyItem === doc.id || doc.status === action}
                                onClick={() =>
                                  handleDocumentAction(doc, action as 'verified' | 'waived')
                                }
                                className="rounded-full border border-slate-600 px-3 py-1 text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {action === 'waived' ? 'Waive' : 'Verify'}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      {complianceData.documents.length === 0 && (
                        <p className="text-xs text-slate-400">No document requirements defined.</p>
                      )}
                    </div>
                  </section>
                </div>
              </>
            )}
          </div>
        )}

        {(activeTab as string) === 'details' && deepBriefing?.briefing && (
          <div className="mt-4 rounded-2xl border border-purple-700 bg-purple-900/25 p-5 text-purple-50 shadow-lg shadow-purple-900/30">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-200">Deep AI Briefing</p>
                <p className="text-lg font-semibold text-purple-50">Operational Intelligence</p>
              </div>
              <div className="text-xs text-purple-200/80">
                <div>
                  Generated:{' '}
                  {deepBriefing.generatedAt ? new Date(deepBriefing.generatedAt).toLocaleString() : 'Unknown'}
                </div>
                <div>Tokens: ~{Math.max(summaryWordCount, 700)}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 text-sm leading-6 md:grid-cols-2">
              <div className="rounded-xl border border-purple-700/60 bg-purple-950/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">Overview</p>
                <p className="mt-2 text-purple-50/90">{deepBriefing.briefing.overview}</p>
              </div>
              <div className="rounded-xl border border-purple-700/60 bg-purple-950/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">Emotional Tone Scan</p>
                <p className="mt-2 text-purple-50/90">{deepBriefing.briefing.emotionalTone}</p>
              </div>
              <div className="rounded-xl border border-purple-700/60 bg-purple-950/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">Family Dynamics</p>
                <p className="mt-2 text-purple-50/90">{deepBriefing.briefing.familyDynamics}</p>
              </div>
              <div className="rounded-xl border border-purple-700/60 bg-purple-950/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">Operational Strategy</p>
                <p className="mt-2 text-purple-50/90">{deepBriefing.briefing.operationalStrategy}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-purple-300/60 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-purple-100">
                Risk Grade: {deepBriefing.briefing.riskGrade || 'Unknown'}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => window.open(`/api/cases/${caseId}/briefing/deep/pdf`, '_blank')}
                  className="rounded bg-purple-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-purple-500"
                >
                  Download Briefing PDF
                </button>
                <button
                  onClick={() => setDeepBriefing(null)}
                  className="text-xs font-semibold text-purple-200 underline-offset-4 hover:text-white hover:underline"
                >
                  Clear briefing
                </button>
              </div>
            </div>
          </div>
        )}

        <CaseWorkspace>
          {overviewError ? (
            <div className="rounded-2xl border border-rose-600 bg-rose-950/40 p-6 text-sm text-rose-200">
              Unable to load case details. Please try again.
            </div>
          ) : activeTab === 'overview' ? (
            <div className="space-y-4">
              <CaseOverviewPanel
                caseRef={caseRecord?.case_ref || caseId}
                contactName={contact?.name}
                contactPhone={contact?.phone_number}
                stageLabel={workflowStage}
                funeralDate={(caseRecord as any)?.funeral_date || null}
                packageName={(caseRecord as any)?.package_name || null}
                totalAmount={(caseRecord as any)?.total_amount || null}
                suggestedNextStep={
                  workflowQuery.data?.summary?.requirements?.[0] ||
                  'Review intake summary with coordinator.'
                }
                onAddNote={() => debugLog('Add note clicked')}
                onCall={() => debugLog('Call contact clicked')}
                onWhatsapp={() => debugLog('WhatsApp contact clicked')}
              />
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-900/60 p-4 text-sm text-emerald-100 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Payment follow-up</p>
                  <p className="text-base font-semibold text-white">
                    {caseRecord?.deposit_amount
                      ? `Deposit: GHS ${caseRecord.deposit_amount.toFixed(2)}`
                      : caseRecord?.total_amount
                      ? `Total: GHS ${caseRecord.total_amount.toFixed(2)}`
                      : 'Amount not defined'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRequestPayment}
                    disabled={paymentLoading}
                    className="rounded-full border border-emerald-400 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-700/80 disabled:opacity-60"
                  >
                    {paymentLoading ? 'Sending…' : 'Send instructions'}
                  </button>
                  <button
                    onClick={handleAutoDetectPayment}
                    disabled={paymentLoading}
                    className="rounded-full border border-emerald-400 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-700/80 disabled:opacity-60"
                  >
                    {paymentLoading ? 'Checking…' : 'Auto detect'}
                  </button>
                </div>
              </div>
              {paymentMessage && <p className="mt-2 text-xs text-emerald-200">{paymentMessage}</p>}
              {autoDetectResult?.verified && (
                <p className="mt-2 text-xs text-emerald-200">
                  Detected {autoDetectResult.method} · GHS {autoDetectResult.amount}
                </p>
              )}
              {paymentError && <p className="mt-2 text-xs text-rose-300">{paymentError}</p>}
            </div>
              <ForecastIndicator
                loading={forecastQuery.isLoading}
                riskScore={forecastData?.riskScore}
                level={forecastData?.level}
                summary={forecastData?.summary}
                indicators={forecastData?.indicators}
              />
              <AISupervisorHints hints={supervisorHints} loading={supervisorQuery.isLoading} />
            </div>
          ) : activeTab === 'messages' ? (
            <CaseMessagesPanel
              messages={normalizedMessages}
              loading={caseDetailQuery.isLoading}
              draftText={draftText}
              draftError={composerDraftError}
              generating={draftLoading}
              sending={sendLoading}
              stage={workflowStage}
              onDraftChange={setDraftText}
              onGenerateDraft={handleGenerateDraft}
              onSendDraft={handleSendDraft}
              onUploadAttachment={() => debugLog('Upload attachment')}
              onAnnotate={(messageId) => debugLog('Annotate message', { messageId })}
            />
          ) : activeTab === 'documents' ? (
            <CaseDocumentsPanel
              caseId={caseId}
              canManage
              documents={documentsQuery.data}
              loading={documentsQuery.isLoading}
              error={
                documentsQuery.isError && documentsQuery.error instanceof Error
                  ? documentsQuery.error.message
                  : undefined
              }
              onRefresh={() => documentsQuery.refetch()}
            />
          ) : activeTab === 'inventory' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Case inventory</p>
                  <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">
                    {caseInventory.length} reserved item(s)
                  </span>
                </div>
                {inventoryLoading ? (
                  <p className="mt-3 text-xs text-slate-400">Loading assigned assets…</p>
                ) : caseInventory.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-400">No assets linked to this case yet.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {caseInventory.map((reservation) => (
                      <div
                        key={reservation.id}
                        className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200 md:grid-cols-3 md:items-center"
                      >
                        <div>
                          <p className="font-semibold text-white">{reservation.item_name}</p>
                          <p className="text-[11px] text-slate-400">
                            {reservation.category} · {reservation.reserved_quantity} unit(s)
                          </p>
                        </div>
                        <div className="text-[10px] text-emerald-200">
                          Status: {reservation.status || 'RESERVED'}
                          {reservation.reserved_from && (
                            <>
                              <br />
                              {new Date(reservation.reserved_from).toLocaleDateString()}{' '}
                              {reservation.reserved_to &&
                                `– ${new Date(reservation.reserved_to).toLocaleDateString()}`}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          {reservation.status === 'RESERVED' && (
                            <button
                              type="button"
                              onClick={() => handleInventoryCheckout(reservation.id)}
                              disabled={inventoryActionLoadingId === reservation.id}
                              className="rounded-full border border-emerald-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200 transition hover:bg-emerald-700/30 disabled:opacity-50"
                            >
                              {inventoryActionLoadingId === reservation.id ? 'Processing…' : 'Checkout'}
                            </button>
                          )}
                          {reservation.status === 'CHECKED_OUT' && (
                            <button
                              type="button"
                              onClick={() => handleInventoryCheckin(reservation.id)}
                              disabled={inventoryActionLoadingId === reservation.id}
                              className="rounded-full border border-slate-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-emerald-400 disabled:opacity-50"
                            >
                              {inventoryActionLoadingId === reservation.id ? 'Processing…' : 'Return'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {inventoryError && <p className="mt-2 text-xs text-rose-400">{inventoryError}</p>}
              </div>
            </div>
          ) : activeTab === 'charges' ? (
            <CaseChargesPanel
              caseId={caseId}
              canManage
              initialCharges={chargesQuery.data}
              loading={chargesQuery.isLoading}
              onRefresh={() => chargesQuery.refetch()}
            />
          ) : activeTab === 'timeline' ? (
            <CaseTimelinePanel
              loading={timelineQuery.isLoading}
              events={mergedTimelineEvents}
            />
          ) : activeTab === 'funeral-day' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-100 shadow-sm flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Funeral Day</p>
                  <p className="text-lg font-semibold text-white">
                    {selectedEvent?.label || 'Upcoming day'}
                    {selectedEvent && selectedEvent.status ? ` · ${selectedEvent.status}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em]">
                  {funeralDayPayload.events.slice(0, 3).map((event) => (
                    <span
                      key={event.id}
                      className={`rounded-full px-3 py-1 ${
                        event.status === 'COMPLETED'
                          ? 'bg-emerald-500 text-white'
                          : event.status === 'DELAYED'
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-700 text-slate-100'
                      }`}
                    >
                      {event.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-4 space-y-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Event timeline</p>
                    <div className="mt-3 space-y-2">
                      {funeralDayPayload.events.map((event: FuneralEvent) => (
                        <button
                          key={event.id}
                          onClick={() => handleEventSelect(event.id)}
                          className={`w-full text-left rounded-xl border px-3 py-2 transition ${
                            selectedEvent?.id === event.id
                              ? 'border-amber-300 bg-amber-900/20'
                              : 'border-slate-800 bg-slate-950/40 hover:border-amber-500'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em]">
                            <span>{event.status}</span>
                            <span>{event.sequence_order}</span>
                          </div>
                      <div className="mt-2 text-sm font-semibold text-white">{event.label}</div>
                      <div className="text-[11px] text-slate-400">
                        {event.scheduled_start ? new Date(event.scheduled_start).toLocaleTimeString() : 'Scheduled TBD'} –{' '}
                        {event.scheduled_end ? new Date(event.scheduled_end).toLocaleTimeString() : 'End TBD'}
                      </div>
                      {eventComplianceWarnings[((event.code || event.label) ?? 'general').toUpperCase()]?.length ? (
                        <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-rose-300">
                          <span className="h-2 w-2 rounded-full bg-rose-400" />
                          Compliance flag
                        </div>
                      ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 space-y-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Active task</p>
                      {eventStatusLoading && <span className="text-[11px] text-slate-400">Updating…</span>}
                    </div>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {selectedEvent?.label || 'Select an event'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {selectedEvent?.notes || 'No notes provided yet.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['PENDING','IN_PROGRESS','COMPLETED','DELAYED'].map((status) => (
                        <button
                          key={status}
                          disabled={!selectedEvent || selectedEvent.status === status || eventStatusLoading}
                          onClick={() => selectedEvent && handleEventStatusChange(selectedEvent.id, { status })}
                          className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 space-y-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Tasks</p>
                      {selectedEventWarnings.length > 0 && (
                        <div className="mt-3 rounded-xl border border-amber-600 bg-amber-950/40 p-3 text-[11px] text-amber-200">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-amber-500">Stage compliance watch</p>
                          <ul className="mt-1 space-y-1">
                            {selectedEventWarnings.map((warning, idx) => (
                              <li key={`warning-${idx}`}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedTasks.map((task: FuneralTask) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200"
                        >
                          <div>
                            <p className="font-semibold text-slate-100">{task.label}</p>
                            <p className="text-[11px] text-slate-500">
                              {task.description || 'No details provided.'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[11px] uppercase tracking-wide ${
                              task.status === 'DONE' ? 'text-emerald-300' : 'text-amber-300'
                            }`}>
                              {task.status}
                            </span>
                            <div className="text-[11px] text-slate-500">
                              {task.assigned_staff_name || 'Unassigned'}
                            </div>
                            {task.metadata?.template_item_id && (
                              <div className="text-[10px] text-amber-200">Compliance task</div>
                            )}
                            <div className="flex gap-1">
                              <button
                                disabled={taskStatusLoading || task.status === 'DONE'}
                                onClick={() => handleTaskUpdate(task.id, 'DONE')}
                                className="rounded-full border border-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 disabled:opacity-50"
                              >
                                Mark done
                              </button>
                              <button
                                disabled={taskStatusLoading || task.status === 'SKIPPED'}
                                onClick={() => handleTaskUpdate(task.id, 'SKIPPED')}
                                className="rounded-full border border-amber-500 px-2 py-0.5 text-[10px] font-semibold text-amber-200 disabled:opacity-50"
                              >
                                Skip
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {!selectedTasks.length && (
                        <p className="text-xs text-slate-500">No tasks assigned to this event.</p>
                      )}
                    </div>
                    {eventAutomationAlerts.length > 0 && (
                      <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-[11px] text-slate-200">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400">Automation signals</p>
                        <ul className="mt-2 space-y-1">
                          {eventAutomationAlerts.slice(0, 2).map((alert) => (
                            <li key={alert.id || alert.title || alert.metadata?.id}>
                              <span className="font-semibold text-slate-100">
                                {alert.title || alert.metadata?.description || 'Automation event'}
                              </span>
                              <p className="text-[10px] text-slate-400">
                                {alert.slaDueAt ? `SLA due ${formatSlaCountdown(alert.slaDueAt)}` : 'No SLA'}
                              </p>
                              {alert.metadata?.reason && (
                                <p className="text-[10px] text-amber-300">{alert.metadata.reason}</p>
                              )}
                            </li>
                          ))}
                          {eventAutomationAlerts.length > 2 && (
                            <li className="text-[10px] text-slate-500">…and more automation signals</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <div className="lg:col-span-3 space-y-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Staff & pallbearers</p>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-emerald-400">editable</span>
                    </div>
                    <ul className="mt-3 space-y-3 text-[11px]">
                      {funeralDayPayload.staff.map((assignment: FuneralStaffAssignment, idx) => {
                        const editing = staffEditDraft?.id === assignment.id;
                        return (
                          <li
                            key={assignment.id || `${assignment.role || 'role'}-${assignment.staff_name || 'staff'}-${idx}`}
                            className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
                          >
                            {editing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={staffEditDraft.name_override || ''}
                                  onChange={(event) =>
                                    setStaffEditDraft((prev) =>
                                      prev ? { ...prev, name_override: event.target.value } : prev
                                    )
                                  }
                                  placeholder="Name or override"
                                  className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-white focus:border-amber-400 focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={staffEditDraft.role || ''}
                                  onChange={(event) =>
                                    setStaffEditDraft((prev) =>
                                      prev ? { ...prev, role: event.target.value } : prev
                                    )
                                  }
                                  placeholder="Role"
                                  className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-white focus:border-amber-400 focus:outline-none"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={saveStaffAssignment}
                                    className="flex-1 rounded-md border border-emerald-500 px-2 py-1 text-[10px] font-semibold text-emerald-200 transition hover:bg-emerald-700/60"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setStaffEditDraft(null)}
                                    className="flex-1 rounded-md border border-slate-600 px-2 py-1 text-[10px] font-semibold text-slate-200 transition hover:border-slate-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                    {assignment.role || 'Role TBD'}
                                  </p>
                                  <p className="text-sm text-slate-100">
                                    {assignment.name_override || assignment.staff_name || 'Unassigned'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => startStaffEdit(assignment)}
                                  className="rounded-full border border-slate-700 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-200 hover:border-amber-400 hover:text-white"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                      {!funeralDayPayload.staff.length && (
                        <li className="text-xs text-slate-500">No staff assigned yet.</li>
                      )}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Vehicles & routes</p>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-emerald-400">editable</span>
                    </div>
                    <ul className="mt-3 space-y-2 text-[11px]">
                      {funeralDayPayload.vehicles.map((vehicle: FuneralVehicle, idx) => {
                        const editing = vehicleEditDraft?.id === vehicle.id;
                        return (
                          <li
                            key={vehicle.id || `${vehicle.vehicle_type || 'vehicle'}-${vehicle.driver_name || 'driver'}-${idx}`}
                            className="rounded-xl border border-slate-800 bg-slate-950/60 p-2"
                          >
                            {editing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={vehicleEditDraft.driver_name || ''}
                                  onChange={(event) =>
                                    setVehicleEditDraft((prev) =>
                                      prev ? { ...prev, driver_name: event.target.value } : prev
                                    )
                                  }
                                  placeholder="Driver"
                                  className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-white focus:border-amber-400 focus:outline-none"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={saveVehicleAssignment}
                                    className="flex-1 rounded-md border border-emerald-500 px-2 py-1 text-[10px] font-semibold text-emerald-200 transition hover:bg-emerald-700/60"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setVehicleEditDraft(null)}
                                    className="flex-1 rounded-md border border-slate-600 px-2 py-1 text-[10px] font-semibold text-slate-200 transition hover:border-slate-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-slate-100">{vehicle.vehicle_type || 'Vehicle detail'}</p>
                                  <p className="text-[11px] text-slate-400">
                                    {vehicle.driver_name || 'Driver TBD'} · {vehicle.from_location || 'Start TBD'} →{' '}
                                    {vehicle.to_location || 'End TBD'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => startVehicleEdit(vehicle)}
                                  className="rounded-full border border-slate-700 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-200 hover:border-amber-400 hover:text-white"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                      {!funeralDayPayload.vehicles.length && (
                        <li className="text-xs text-slate-500">No vehicles scheduled yet.</li>
                      )}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Venues</p>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-emerald-400">editable</span>
                    </div>
                    <ul className="mt-3 space-y-2 text-[11px]">
                      {funeralDayPayload.venues.map((venue: FuneralVenue, idx) => {
                        const editing = venueEditDraft?.id === venue.id;
                        return (
                          <li
                            key={venue.id || `${venue.venue_type || 'venue'}-${venue.name || 'name'}-${idx}`}
                            className="rounded-xl border border-slate-800 bg-slate-950/60 p-2"
                          >
                            {editing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={venueEditDraft.name || ''}
                                  onChange={(event) =>
                                    setVenueEditDraft((prev) =>
                                      prev ? { ...prev, name: event.target.value } : prev
                                    )
                                  }
                                  placeholder="Venue name"
                                  className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-white focus:border-amber-400 focus:outline-none"
                                />
                                <textarea
                                  value={venueEditDraft.address || ''}
                                  onChange={(event) =>
                                    setVenueEditDraft((prev) =>
                                      prev ? { ...prev, address: event.target.value } : prev
                                    )
                                  }
                                  placeholder="Address"
                                  className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-white focus:border-amber-400 focus:outline-none"
                                  rows={2}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={saveVenueAssignment}
                                    className="flex-1 rounded-md border border-emerald-500 px-2 py-1 text-[10px] font-semibold text-emerald-200 transition hover:bg-emerald-700/60"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setVenueEditDraft(null)}
                                    className="flex-1 rounded-md border border-slate-600 px-2 py-1 text-[10px] font-semibold text-slate-200 transition hover:border-slate-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-slate-100">{venue.venue_type || 'Venue detail'}</p>
                                  <p className="text-[11px] text-slate-400">{venue.name || 'Name TBD'}</p>
                                  <p className="text-[11px] text-slate-400">{venue.address || 'Address TBD'}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => startVenueEdit(venue)}
                                  className="rounded-full border border-slate-700 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-200 hover:border-amber-400 hover:text-white"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                      {!funeralDayPayload.venues.length && (
                        <li className="text-xs text-slate-500">No venues added yet.</li>
                      )}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Compliance gate</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          complianceData.gate?.passed ? 'bg-emerald-700 text-emerald-100' : 'bg-rose-600 text-rose-100'
                        }`}
                      >
                        {complianceData.gate?.passed ? 'Passed' : 'Blocked'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {complianceData.gate
                        ? `${complianceData.gate.blockingChecklist.length} checklist · ${complianceData.gate.blockingDocuments.length} documents`
                        : 'No gate data yet.'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.3em] text-slate-400">
                      {automationSeverityKeyOrder.map((key) => {
                        const palette =
                          key === 'high'
                            ? 'bg-rose-600 text-white'
                            : key === 'medium'
                            ? 'bg-amber-400 text-amber-900'
                            : key === 'low'
                            ? 'bg-slate-600 text-slate-100'
                            : 'bg-slate-500 text-slate-100';
                        const count = automationSeverityCounts[key] || 0;
                        return (
                          <span key={key} className={`rounded-full px-2 py-0.5 font-semibold ${palette}`}>
                            {key} · {count}
                          </span>
                        );
                      })}
                    </div>
                    {selectedEventWarnings.length > 0 && (
                      <ul className="mt-3 space-y-1 rounded-md border border-amber-500/50 bg-amber-950/40 p-2 text-[11px] text-amber-200">
                        <li className="text-[10px] uppercase tracking-[0.3em] text-amber-400">Stage watch</li>
                        {selectedEventWarnings.slice(0, 3).map((warning, idx) => (
                          <li key={`compliance-card-warning-${idx}`}>{warning}</li>
                        ))}
                        {selectedEventWarnings.length > 3 && (
                          <li className="text-amber-200/70">...and {selectedEventWarnings.length - 3} more</li>
                        )}
                      </ul>
                    )}
                    {complianceAutomationAlerts.length > 0 && (
                      <div className="mt-3 space-y-1 rounded-xl border border-cyan-500/50 bg-cyan-950/30 p-3 text-[11px] text-cyan-200">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300">
                          Automation compliance signals
                        </p>
                        {complianceAutomationAlerts.slice(0, 3).map((alert, idx) => (
                          <p key={`auto-comp-${idx}`} className="text-xs">
                            {alert.title || alert.metadata?.description || 'Automation rule triggered'}
                          </p>
                        ))}
                        {complianceAutomationAlerts.length > 3 && (
                          <p className="text-amber-200/70 text-[10px]">
                            ...{complianceAutomationAlerts.length - 3} more automation notices
                          </p>
                        )}
                      </div>
                    )}
                    {complianceData.gate?.updated_at && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Last gate refresh:{' '}
                        {complianceData.gate.updated_at
                          ? new Date(complianceData.gate.updated_at).toLocaleString()
                          : 'pending'}
                      </p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">AI briefing</p>
                      <span className="text-[10px] text-slate-400">
                        Status:{' '}
                        {funeralBriefingError
                          ? 'Error'
                          : funeralBriefingLoading
                          ? 'Generating'
                          : funeralBriefing
                          ? 'Ready'
                          : 'Idle'}
                      </span>
                    </div>
                    {funeralBriefingTimestamp && (
                      <p className="text-[10px] text-slate-500">
                        Updated {new Date(funeralBriefingTimestamp).toLocaleString()}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-200">
                      {funeralBriefing?.briefing?.overview ||
                        'Briefing not generated yet. Tap the button to synthesize the day plan.'}
                    </p>
                    {Array.isArray(funeralBriefing?.briefing?.insights) && (
                      <p className="mt-2 text-[10px] text-slate-400">
                        {funeralBriefing.briefing.insights.slice(0, 3).join(' · ') ||
                          'Insights will appear here when ready.'}
                      </p>
                    )}
                    {funeralBriefingError && (
                      <p className="mt-2 text-xs text-rose-300">{funeralBriefingError}</p>
                    )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={generateFuneralBriefing}
                        disabled={funeralBriefingLoading}
                        className="rounded-full border border-emerald-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 hover:bg-emerald-700/80 disabled:opacity-60"
                      >
                        {funeralBriefingLoading ? 'Generating…' : 'Generate Today’s Briefing'}
                      </button>
                      {funeralBriefing && (
                        <span className="text-[10px] text-slate-500">
                          Confidence:{' '}
                          {Math.round(((funeralBriefing?.briefing?.confidence ?? 0) as number) * 100)}
                          %
                        </span>
                      )}
            </div>
            <div className="mt-6">
              <FuneralEquipmentPanel caseId={caseId} staffId={localStaffId} />
            </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'workflow' ? (
            <>
              <CaseWorkflowPanel
                workflow={workflowQuery.data}
                loading={workflowQuery.isLoading}
                error={
                  workflowQuery.isError && workflowQuery.error instanceof Error
                    ? workflowQuery.error.message
                    : undefined
                }
                transitioningStage={null}
                onTransition={(nextStage) => debugLog('Transition request', { nextStage })}
              />
              <div className="mt-4">
                <TombstoneWorkOrderPanel caseId={caseId} />
              </div>
            </>
          ) : activeTab === 'settings' ? (
            <CaseSettingsPanel
              assignedStaffName={assignedStaffName}
              notes={notesQuery.data}
              loading={notesQuery.isLoading}
              adding={addNoteMutation.isPending}
              error={
                notesQuery.isError && notesQuery.error instanceof Error
                  ? notesQuery.error.message
                  : undefined
              }
              onAddNote={(body) => addNoteMutation.mutate(body)}
            />
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
              <p className="text-lg font-semibold text-white">
                {sideTabs.find((t) => t.key === activeTab)?.label}
              </p>
              <p className="mt-2 text-slate-400">
                Workspace content for <span className="font-semibold">{activeTab}</span> will appear here as build phases
                progress.
              </p>
              <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">Case ID · {caseId}</p>
            </div>
          )}
          {activeTab === 'messages' && !draftReply && draftLoading && (
            <div className="mt-4 text-sm text-slate-400">Generating AI draft…</div>
          )}
          {activeTab === 'messages' && draftReply && (
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-slate-100">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                AI Draft Reply
              </h4>
              {isEditingDraft ? (
                <textarea
                  className="mt-2 w-full rounded-md border border-slate-600 bg-slate-800 p-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                  rows={4}
                  value={editedDraftText}
                  onChange={(event) => setEditedDraftText(event.target.value)}
                />
              ) : (
                <p className="mt-2 whitespace-pre-line text-base leading-6 text-slate-100">
                  {draftDisplayText || 'No draft text available.'}
                </p>
              )}

              {!isEditingDraft && draftReply?.reasoning && (
                <div className="mt-3 border-t border-slate-700 pt-2 text-sm leading-5 text-slate-400">
                  <span className="font-semibold text-slate-300">Why this reply:</span> {draftReply.reasoning}
                </div>
              )}

              {!isEditingDraft && draftReply?.confidence !== undefined && (
                <div className="mt-2 text-xs opacity-70">
                  Confidence: {Math.round((draftReply.confidence || 0) * 100)}%
                </div>
              )}

              {draftError && (
                <div className="mt-2 text-sm text-rose-400">{draftError}</div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-emerald-500/60 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400 hover:text-white"
                  onClick={onAcceptDraft}
                >
                  Accept Reply
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white"
                  onClick={onEditDraft}
                >
                  Edit Reply
                </button>
              </div>
              {isEditingDraft && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-amber-500/60 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-400 hover:text-white"
                    onClick={() => {
                      setDraftReply((prev: any) => {
                        if (!prev || typeof prev === 'string') {
                          return editedDraftText;
                        }
                        return { ...prev, reply: editedDraftText };
                      });
                      setIsEditingDraft(false);
                    }}
                  >
                    Save Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white"
                    onClick={() => setIsEditingDraft(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </CaseWorkspace>
        <div className="mt-4 px-6">
          <TrainingDashboard modules={trainingModules} progress={trainingProgress} />
        </div>
        </div>
      </div>
      <ToastStack toasts={intelligenceToasts} onDismiss={dismissIntelligenceToast} />
    </>
  );
}

