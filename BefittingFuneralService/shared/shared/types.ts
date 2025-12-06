export type DraftType = 'obituary' | 'announcement' | 'summary' | 'family_message';

export type DraftStatus = 'pending_review' | 'approved' | 'rejected';

export type CaseStage = {
  currentStage: WorkflowStageId;
  completedStages: WorkflowStageId[];
};

export type WorkflowStageId = 'intake' | 'documents' | 'obituary' | 'announcement' | 'logistics' | 'completed';



