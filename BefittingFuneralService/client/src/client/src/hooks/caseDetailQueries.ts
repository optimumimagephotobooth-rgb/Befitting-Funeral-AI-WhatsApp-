import { useQuery } from '@tanstack/react-query';
import {
  fetchCaseDetails,
  fetchCaseTimeline,
  fetchCaseNotes,
  fetchCaseForecast,
  fetchCaseSupervisor
} from '../services/api';
import { listCaseDocuments, listCaseCharges } from '../services/documents';
import { fetchCaseWorkflow, WorkflowSummary } from '../services/workflow';

export interface CaseMessageRecord {
  id: string | number;
  direction: string;
  body: string;
  created_at: string;
  author?: string | null;
}

export interface CaseDetailRecord {
  case: {
    id: string;
    case_ref: string;
    status: string;
    stage?: string | null;
    funeral_date?: string | null;
    package_name?: string | null;
    total_amount?: number | null;
    deposit_amount?: number | null;
    service_amount?: number | null;
    contact?: {
      name?: string | null;
      phone_number?: string | null;
    };
  };
  contact?: {
    name?: string | null;
    phone_number?: string | null;
  };
  messages: CaseMessageRecord[];
}

export interface CaseEventRecord {
  id?: string | number;
  event_type: string;
  stage?: string | null;
  metadata?: Record<string, unknown> | string | null;
  created_at: string;
}

export function useCaseDetailQuery(caseId: string) {
  return useQuery<CaseDetailRecord>({
    queryKey: ['case-detail', caseId],
    queryFn: async () => {
      const response = await fetchCaseDetails(caseId);
      return response.data;
    },
    enabled: !!caseId
  });
}

export function useCaseDocumentsQuery(caseId: string) {
  return useQuery({
    queryKey: ['case-documents', caseId],
    queryFn: async () => {
      const docs = await listCaseDocuments(caseId);
      return docs;
    },
    enabled: !!caseId
  });
}

export function useCaseChargesQuery(caseId: string) {
  return useQuery({
    queryKey: ['case-charges', caseId],
    queryFn: async () => {
      const charges = await listCaseCharges(caseId);
      return charges;
    },
    enabled: !!caseId
  });
}

export function useCaseTimelineQuery(caseId: string) {
  return useQuery<CaseEventRecord[]>({
    queryKey: ['case-timeline', caseId],
    queryFn: async () => {
      const response = await fetchCaseTimeline(caseId, { limit: 50 });
      return response.data || [];
    },
    enabled: !!caseId
  });
}

export function useCaseWorkflowQuery(caseId: string) {
  return useQuery<WorkflowSummary>({
    queryKey: ['case-workflow', caseId],
    queryFn: async () => {
      const response = await fetchCaseWorkflow(caseId);
      return response.data;
    },
    enabled: !!caseId
  });
}

export function useCaseNotesQuery(caseId: string) {
  return useQuery({
    queryKey: ['case-notes', caseId],
    queryFn: async () => {
      const response = await fetchCaseNotes(caseId);
      return response.data || [];
    },
    enabled: !!caseId
  });
}

export function useCaseForecastQuery(caseId: string) {
  return useQuery({
    queryKey: ['case-forecast', caseId],
    queryFn: async () => {
      const response = await fetchCaseForecast(caseId);
      return response.data;
    },
    enabled: !!caseId,
    refetchInterval: 1000 * 60 * 5
  });
}

export function useCaseSupervisorQuery(caseId: string) {
  return useQuery({
    queryKey: ['case-supervisor', caseId],
    queryFn: async () => {
      const response = await fetchCaseSupervisor(caseId);
      return response.data;
    },
    enabled: !!caseId,
    refetchInterval: 1000 * 60 * 5
  });
}

