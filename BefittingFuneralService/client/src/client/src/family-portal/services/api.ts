import axios from 'axios';

const portalClient = axios.create({
  baseURL: '/api/family',
  headers: {
    'Content-Type': 'application/json'
  }
});

portalClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('family_portal_token');
  if (token) {
    config.headers = {
      ...(config.headers || {}),
      'X-Family-Portal-Token': token
    };
  }
  return config;
});

const encodeCasePath = (caseReference: string) => encodeURIComponent(caseReference || '');

export async function requestFamilyPortalOtp(caseReference: string, contact: { phone?: string; email?: string }) {
  const res = await portalClient.post(`/${encodeCasePath(caseReference)}/login`, {
    contact
  });
  return res.data.data;
}

export async function verifyFamilyPortalOtp(caseReference: string, otp: string, token: string) {
  const res = await portalClient.post(`/${encodeCasePath(caseReference)}/token/verify`, {
    otp,
    token
  });
  return res.data.session;
}

export async function fetchFamilySummary(caseId: string) {
  const res = await portalClient.get(`/${caseId}/summary`);
  return res.data.summary;
}

export async function fetchFamilyDocuments(caseId: string) {
  const res = await portalClient.get(`/${caseId}/documents`);
  return res.data.documents;
}

export async function uploadFamilyDocument(caseId: string, payload: { title: string; description?: string; documentType?: string; file_url?: string }) {
  const res = await portalClient.post(`/${caseId}/documents`, payload);
  return res.data;
}

export async function fetchFamilyPayments(caseId: string) {
  const res = await portalClient.get(`/${caseId}/payments`);
  return res.data.payments;
}

export async function uploadFamilyPayment(caseId: string, payload: { amount: number; reference?: string; file_url?: string }) {
  const res = await portalClient.post(`/${caseId}/payments/upload`, payload);
  return res.data;
}

export async function fetchFamilySchedule(caseId: string) {
  const res = await portalClient.get(`/${caseId}/schedule`);
  return res.data.schedule;
}

export async function fetchFamilyChat(caseId: string) {
  const res = await portalClient.get(`/${caseId}/chat`);
  return res.data.chat;
}

export async function sendFamilyChat(caseId: string, message: string) {
  const res = await portalClient.post(`/${caseId}/chat`, {
    message
  });
  return res.data.message;
}

export async function generateFamilyAi(caseId: string, payload: { prompt: string; style?: string }) {
  const res = await portalClient.post(`/${caseId}/ai`, payload);
  return res.data.suggestion;
}

