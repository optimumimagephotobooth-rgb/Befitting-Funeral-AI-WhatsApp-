import { apiClient } from './api';

export interface DocumentTemplate {
  id: string;
  name: string;
  documentType: string;
  description?: string | null;
  htmlTemplate: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export interface CaseDocumentRecord {
  id: string;
  title: string;
  templateName?: string;
  documentType?: string;
  createdAt: string;
  createdBy?: string | null;
  downloadUrl: string;
}

export async function listTemplates(includeInactive = false) {
  const response = await apiClient.get<{ success: boolean; data: DocumentTemplate[] }>(
    '/admin/document-templates',
    {
      params: { includeInactive }
    }
  );
  return response.data.data;
}

export async function createTemplate(payload: Partial<DocumentTemplate>) {
  const response = await apiClient.post<{ success: boolean; data: DocumentTemplate }>(
    '/admin/document-templates',
    payload
  );
  return response.data.data;
}

export async function updateTemplate(templateId: string, payload: Partial<DocumentTemplate>) {
  const response = await apiClient.put<{ success: boolean; data: DocumentTemplate }>(
    `/admin/document-templates/${templateId}`,
    payload
  );
  return response.data.data;
}

export async function deleteTemplate(templateId: string) {
  await apiClient.delete(`/admin/document-templates/${templateId}`);
}

export async function listCaseDocuments(caseId: string) {
  const response = await apiClient.get<{ success: boolean; data: CaseDocumentRecord[] }>(
    `/cases/${caseId}/documents`
  );
  const docs = response.data.data;
  return docs.map((doc) => ({
    ...doc,
    downloadUrl: `/api/cases/${caseId}/documents/${doc.id}/download`
  }));
}

export async function listCaseTemplates(caseId: string) {
  const response = await apiClient.get<{ success: boolean; data: DocumentTemplate[] }>(
    `/cases/${caseId}/documents/templates`
  );
  return response.data.data;
}

export async function previewCaseDocument(caseId: string, payload: { templateId: string; htmlOverride?: string }) {
  const response = await apiClient.post<{ success: boolean; data: { html: string } }>(
    `/cases/${caseId}/documents/preview`,
    payload
  );
  return response.data.data;
}

export async function generateCaseDocument(
  caseId: string,
  payload: { templateId: string; htmlOverride?: string; title?: string }
) {
  const response = await apiClient.post<{ success: boolean; data: CaseDocumentRecord }>(
    `/cases/${caseId}/documents`,
    payload
  );
  return response.data.data;
}

export async function downloadCaseDocument(caseId: string, documentId: string) {
  const response = await apiClient.get(`/cases/${caseId}/documents/${documentId}/download`, {
    responseType: 'blob'
  });
  return response.data as Blob;
}

export interface CaseCharge {
  id: string;
  caseId: string;
  description: string;
  amount: number;
  quantity: number;
  category?: string | null;
  createdAt: string;
}

export async function listCaseCharges(caseId: string) {
  const response = await apiClient.get<{ success: boolean; data: CaseCharge[] }>(
    `/cases/${caseId}/charges`
  );
  return response.data.data;
}

export async function createCaseCharge(
  caseId: string,
  payload: { description: string; amount: number; quantity?: number; category?: string }
) {
  const response = await apiClient.post<{ success: boolean; data: CaseCharge }>(
    `/cases/${caseId}/charges`,
    payload
  );
  return response.data.data;
}

export async function updateCaseCharge(
  caseId: string,
  chargeId: string,
  payload: Partial<{ description: string; amount: number; quantity: number; category: string }>
) {
  const response = await apiClient.put<{ success: boolean; data: CaseCharge }>(
    `/cases/${caseId}/charges/${chargeId}`,
    payload
  );
  return response.data.data;
}

export async function deleteCaseCharge(caseId: string, chargeId: string) {
  await apiClient.delete(`/cases/${caseId}/charges/${chargeId}`);
}

