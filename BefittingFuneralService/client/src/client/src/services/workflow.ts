import { apiClient } from './api';

export interface WorkflowSummary {
  stage: string;
  summary: {
    currentStage: string;
    label: string;
    description: string;
    requirements: string[];
    allowedTransitions: string[];
    aiSuggestions: string[];
    roles?: string[];
    stages: string[];
  };
}

export interface TransitionResponse {
  case: {
    id: string;
    stage: string;
    status: string;
  };
  workflow: WorkflowSummary['summary'];
  timelineEvent?: any;
}

export async function fetchCaseWorkflow(caseId: string): Promise<WorkflowSummary> {
  const response = await apiClient.get<{ success: boolean; data: WorkflowSummary }>(
    `/cases/${caseId}/workflow`
  );
  return response.data.data;
}

export async function transitionCaseStage(caseId: string, toStage: string) {
  const response = await apiClient.post<{
    success: boolean;
    data: { case: TransitionResponse['case']; workflow: WorkflowSummary['summary']; timelineEvent?: any };
  }>(`/cases/${caseId}/transition`, { toStage });

  return response.data.data;
}

