import axios from 'axios';
import type { AxiosRequestHeaders } from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('staff_token');
  if (token) {
    const headers = (config.headers || {}) as AxiosRequestHeaders;
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers;
  }
  return config;
});

export async function fetchCases({
  page = 1,
  limit = 10,
  status
}: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const params: Record<string, string | number> = {
    offset: (page - 1) * limit,
    limit
  };

  if (status) {
    params.status = status;
  }

  const res = await apiClient.get('/admin/cases', {
    params: {
      ...params
    }
  });

  return res.data;
}

export async function fetchMessages({ limit = 20 }: { limit?: number }) {
  const res = await apiClient.get('/admin/messages', {
    params: {
      limit
    }
  });

  return res.data;
}

export async function fetchLeads({ limit = 20 }: { limit?: number }) {
  const res = await apiClient.get('/admin/leads', {
    params: {
      limit
    }
  });

  return res.data;
}

export async function fetchCaseDetails(caseId: string | number) {
  const res = await apiClient.get(`/admin/cases/${caseId}`);

  return res.data;
}

export async function fetchCaseEvents(caseId: string | number, { limit = 20 }: { limit?: number } = {}) {
  const res = await apiClient.get('/admin/case-events', {
    params: {
      caseId,
      limit
    }
  });

  return res.data;
}

export async function fetchCaseTimeline(caseId: string, { limit = 50 }: { limit?: number } = {}) {
  const res = await apiClient.get(`/cases/${caseId}/timeline`, {
    params: { limit }
  });
  return res.data;
}

export async function fetchCaseMessages(caseId: string) {
  const res = await apiClient.get(`/cases/${caseId}/messages`);
  return res.data;
}

export async function fetchCaseSummary(caseId: string) {
  const res = await apiClient.post(`/cases/${caseId}/summary`);
  return res.data;
}

export async function fetchCaseAttention(caseId: string) {
  const res = await apiClient.post(`/cases/${caseId}/attention`);
  return res.data;
}

export async function fetchCaseDeepBriefing(caseId: string) {
  const res = await apiClient.post(`/cases/${caseId}/briefing/deep`);
  return res.data;
}

export async function fetchLeadAnalysis(payload: { channel?: string; message: string; metadata?: any }) {
  const res = await apiClient.post('/leads/analysis', payload);
  return res.data;
}

export async function fetchDashboardAutomations() {
  const res = await apiClient.get('/dashboard/automations');
  return res.data;
}

export async function fetchSupervisorIntel() {
  const res = await apiClient.get('/supervisor/intel');
  return res.data;
}

export async function fetchSupervisorVoiceSummary() {
  const res = await apiClient.get('/supervisor/intel/voice');
  return res.data;
}

export async function resolveAutomationAlert(caseId: string, alertId: string) {
  const res = await apiClient.post(`/cases/${caseId}/automations/${alertId}/resolve`);
  return res.data;
}

export async function fetchCaseAutomations(caseId: string) {
  const res = await apiClient.get(`/cases/${caseId}/automations`);
  return res.data;
}

export async function requestPaymentConfirmation(caseId: string, amount: number, paymentType: string = 'deposit') {
  const res = await apiClient.post(`/cases/${caseId}/payments/request`, {
    amount,
    paymentType
  });
  return res.data;
}

export async function autoDetectPayment(caseId: string, phoneNumber: string, amount: number) {
  const res = await apiClient.post(`/cases/${caseId}/payments/auto-detect`, {
    phoneNumber,
    amount
  });
  return res.data;
}

export async function confirmPayment(caseId: string, payload: { method: string; amount: number; paymentType?: string }) {
  const res = await apiClient.post(`/cases/${caseId}/payments/confirm`, payload);
  return res.data;
}

export async function fetchDraftReply(messageText: string, caseContext: any = {}, stage: string = 'NEW') {
  const res = await apiClient.post('/messages/draft', {
    messageText,
    caseContext,
    stage
  });
  return res.data;
}

export async function fetchCaseCompliance(caseId: string) {
  const res = await apiClient.get(`/cases/${caseId}/compliance`);
  return res.data;
}

export async function fetchInventoryItems(params?: {
  category?: string;
  status?: string;
  search?: string;
}) {
  const res = await apiClient.get('/inventory/items', { params });
  return res.data;
}

export async function createInventoryItem(payload: {
  name: string;
  category: string;
  quantity?: number;
  unit_cost?: number;
  status?: string;
  metadata?: any;
  license_plate?: string;
  mileage?: number;
  last_service_date?: string;
}) {
  const res = await apiClient.post('/inventory/items', payload);
  return res.data;
}

export async function updateInventoryItem(id: string, payload: Record<string, any>) {
  const res = await apiClient.patch(`/inventory/items/${id}`, payload);
  return res.data;
}

export async function createInventoryReservation(payload: {
  item_id: string;
  case_id: string;
  reserved_quantity: number;
  reserved_from?: string;
  reserved_to?: string;
  created_by?: string;
  metadata?: any;
}) {
  const res = await apiClient.post('/inventory/reservations', payload);
  return res.data;
}

export async function checkoutInventoryReservation(id: string, payload: { staffId?: string; conditionOut?: string }) {
  const res = await apiClient.patch(`/inventory/reservations/${id}/checkout`, payload);
  return res.data;
}

export async function checkinInventoryReservation(id: string, payload: { staffId?: string; conditionIn?: string }) {
  const res = await apiClient.patch(`/inventory/reservations/${id}/checkin`, payload);
  return res.data;
}

export async function fetchCaseInventory(caseId: string) {
  const res = await apiClient.get(`/cases/${caseId}/inventory`);
  return res.data;
}

export async function fetchInventoryAlerts() {
  const res = await apiClient.get('/inventory/alerts');
  return res.data;
}

export async function fetchMortuaryBodies(filters?: { caseId?: string; status?: string }) {
  const res = await apiClient.get('/mortuary/bodies', { params: filters });
  return res.data;
}

export async function createMortuaryBody(payload: {
  case_id?: string;
  name: string;
  sex?: string;
  age?: number;
  condition_notes?: string;
}) {
  const res = await apiClient.post('/mortuary/bodies', payload);
  return res.data;
}

export async function updateMortuaryBody(id: string, updates: Record<string, any>) {
  const res = await apiClient.patch(`/mortuary/bodies/${id}`, updates);
  return res.data;
}

export async function releaseMortuaryBody(payload: { bodyId: string; metadata?: any }) {
  const res = await apiClient.post('/mortuary/release', payload);
  return res.data;
}

export async function fetchCemeteryPlots(filters?: { status?: string; section?: string }) {
  const res = await apiClient.get('/cemetery/plots', { params: filters });
  return res.data;
}

export async function fetchBurialAssignments(caseId: string) {
  const res = await apiClient.get(`/cases/${caseId}/burial`);
  return res.data;
}

export async function fetchAutomationAlerts() {
  const res = await apiClient.get('/automations/alerts');
  return res.data;
}

export async function fetchPaymentAudits(limit = 12) {
  const res = await apiClient.get('/admin/payments/audit', {
    params: { limit }
  });
  return res.data;
}

export async function fetchFuneralDay(caseId: string) {
  const res = await apiClient.get(`/cases/${caseId}/funeral-day`);
  return res.data;
}

export async function saveFuneralEvent(caseId: string, payload: any) {
  const res = await apiClient.post(`/cases/${caseId}/funeral-events`, payload);
  return res.data;
}

export async function updateFuneralEventStatus(eventId: string, payload: any) {
  const res = await apiClient.patch(`/cases/funeral-events/${eventId}/status`, payload);
  return res.data;
}

export async function updateFuneralEventTask(taskId: string, payload: any) {
  const res = await apiClient.patch(`/cases/funeral-event-tasks/${taskId}`, payload);
  return res.data;
}

export async function updateComplianceChecklistItem(
  caseId: string,
  itemId: string,
  payload: { status?: string; notes?: string; waivedReason?: string }
) {
  const res = await apiClient.patch(`/cases/${caseId}/compliance/checklist/${itemId}`, payload);
  return res.data;
}

export async function updateComplianceDocument(
  caseId: string,
  documentId: string,
  payload: { status?: string; notes?: string; waivedReason?: string }
) {
  const res = await apiClient.patch(`/cases/${caseId}/compliance/documents/${documentId}`, payload);
  return res.data;
}

export async function upsertFuneralStaff(caseId: string, payload: any) {
  const res = await apiClient.post(`/cases/${caseId}/funeral-staff`, payload);
  return res.data;
}

export async function upsertFuneralVehicle(caseId: string, payload: any) {
  const res = await apiClient.post(`/cases/${caseId}/funeral-vehicles`, payload);
  return res.data;
}

export async function upsertFuneralVenue(caseId: string, payload: any) {
  const res = await apiClient.post(`/cases/${caseId}/funeral-venues`, payload);
  return res.data;
}

export async function fetchFuneralBriefing(caseId: string) {
  const res = await apiClient.post(`/cases/${caseId}/funeral-briefing/ai`);
  return res.data;
}

export async function fetchCaseNotes(caseId: string) {
  const res = await apiClient.get(`/cases/${caseId}/notes`);
  return res.data;
}

export async function createCaseNote(caseId: string, payload: { body: string }) {
  const res = await apiClient.post(`/cases/${caseId}/notes`, payload);
  return res.data;
}

export async function fetchCaseForecast(caseId: string) {
  const res = await apiClient.get(`/cases/${caseId}/forecast`);
  return res.data;
}

export async function fetchCaseSupervisor(caseId: string) {
  const res = await apiClient.get(`/cases/${caseId}/supervisor`);
  return res.data;
}

export async function fetchForecastDashboard() {
  const res = await apiClient.get('/analytics/cases/forecast');
  return res.data;
}

export async function fetchEquipment(params?: {
  category?: string;
  subtype?: string;
  onlyAvailable?: boolean;
}) {
  const res = await apiClient.get('/equipment', {
    params
  });
  return res.data.equipment;
}

export async function allocateEquipment(payload: {
  itemId: string;
  caseId: string;
  staffId?: string;
  assignedFrom?: string;
  assignedTo?: string;
  notes?: string;
  metadata?: Record<string, any>;
}) {
  const res = await apiClient.post('/equipment/allocate', payload);
  return res.data.allocation;
}

export async function returnEquipment(payload: {
  allocationId: string;
  conditionStatus?: string;
  status?: string;
  notes?: string;
}) {
  const res = await apiClient.post('/equipment/return', payload);
  return res.data.allocation;
}

export async function fetchEquipmentAllocations(caseId: string) {
  const res = await apiClient.get(`/equipment/allocations/${caseId}`);
  return res.data.allocations;
}

export async function fetchTombstoneWorkOrders(caseId: string) {
  const res = await apiClient.get(`/work-orders/${caseId}`);
  return res.data.workOrders;
}

export async function createTombstoneWorkOrder(payload: {
  caseId: string;
  vendorId: string;
  scheduledDate?: string;
  attachments?: any[];
  metadata?: Record<string, any>;
  notes?: string;
}) {
  const res = await apiClient.post('/work-orders', payload);
  return res.data.workOrder;
}

export async function updateTombstoneWorkOrderStatus(workOrderId: string, payload: {
  status: string;
  notes?: string;
  metadata?: Record<string, any>;
  certificateUrl?: string;
}) {
  const res = await apiClient.patch(`/work-orders/${workOrderId}/status`, payload);
  return res.data.workOrder;
}

export async function fetchTombstoneVendors() {
  const res = await apiClient.get('/work-orders/vendor');
  return res.data.vendors || [];
}

export async function createTombstoneVendor(payload: {
  name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
  metadata?: Record<string, any>;
}) {
  const res = await apiClient.post('/work-orders/vendor', { vendor: payload });
  return res.data.vendor;
}

export async function generateTombstoneWorkOrderCertificate(workOrderId: string) {
  const res = await apiClient.post(`/work-orders/${workOrderId}/certificate`);
  return res.data.certificateUrl;
}

export async function generateWorkOrderPdf(workOrderId: string) {
  const res = await apiClient.post(`/work-orders/${workOrderId}/pdf`);
  return res.data.pdf;
}

export async function generateEquipmentAllocationPdf(allocationId: string) {
  const res = await apiClient.post(`/equipment/allocations/${allocationId}/pdf`);
  return res.data.pdf;
}

export function getTombstoneWorkOrderCertificateUrl(workOrderId: string) {
  return `/api/work-orders/${workOrderId}/certificate`;
}

export async function generateDraftMessage(caseId: string, payload: { prompt?: string; tone?: string }) {
  const res = await apiClient.post(`/cases/${caseId}/messages/draft`, payload);
  return res.data;
}

export async function sendDraftMessage(caseId: string, payload: { body: string }) {
  const res = await apiClient.post(`/cases/${caseId}/messages/send`, payload);
  return res.data;
}

export async function listAnnouncements({ limit = 20 }: { limit?: number }) {
  const res = await apiClient.get('/admin/announcements', {
    params: {
      limit
    }
  });

  return res.data;
}

export async function createAnnouncement(payload: { title: string; body: string; channel?: string; scheduledAt?: string }) {
  const res = await apiClient.post('/admin/announcements', payload, {
    params: {
    }
  });
  return res.data;
}



