export type FamilyDocument = {
  id: string;
  title: string;
  file_url: string;
  metadata: Record<string, any>;
  created_at: string;
  status: string;
};

export type FamilyScheduleItem = {
  id: string;
  label: string;
  code?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  status: string;
  notes?: string;
};

export type FamilyCharge = {
  id: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
  metadata: Record<string, any>;
};

export type FamilyPaymentUpload = {
  id: string;
  amount: number;
  reference?: string;
  file_url?: string;
  status: string;
  created_at: string;
  metadata: Record<string, any>;
};

export type FamilyPayments = {
  charges: FamilyCharge[];
  uploads: FamilyPaymentUpload[];
  outstandingBalance: number;
};

export type FamilyAutomationAlert = {
  id: string;
  title: string;
  description?: string;
  severity?: string;
};

export type FamilyChatMessage = {
  id: string;
  sender: string;
  body: string;
  created_at: string;
};

export type FamilyCaseSummary = {
  id: string;
  case_ref: string;
  status: string;
  stage: string;
  deceased_name?: string;
  funeral_date?: string;
  package_name?: string;
  documents: FamilyDocument[];
  schedule: FamilyScheduleItem[];
  automationAlerts: FamilyAutomationAlert[];
  payments: FamilyPayments;
};

export type FamilyPortalSession = {
  caseId: string;
  caseRef: string;
  token: string;
  expiresAt: string;
};

export type FamilyPortalView = 'dashboard' | 'documents' | 'payments' | 'schedule' | 'chat';

