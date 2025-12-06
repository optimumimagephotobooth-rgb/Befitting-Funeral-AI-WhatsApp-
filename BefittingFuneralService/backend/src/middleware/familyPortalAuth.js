import { resolveCaseIdentifier, validateFamilyPortalToken } from '../services/familyPortalService.js';

export async function withFamilyPortalAccess(req, res, next) {
  const caseIdentifier = req.params.caseId;
  const queryToken = Array.isArray(req.query.token) ? req.query.token[0] : req.query.token;
  const token =
    req.get('x-family-portal-token') || queryToken || req.body?.token || '';
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing family portal token' });
  }

  const caseRecord = await resolveCaseIdentifier(caseIdentifier);
  if (!caseRecord) {
    return res.status(404).json({ success: false, error: 'Case not found' });
  }

  const session = await validateFamilyPortalToken(caseRecord.id, token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  req.familyPortal = {
    caseId: caseRecord.id,
    caseRef: caseRecord.case_ref,
    token: session.token,
    expiresAt: session.expires_at
  };

  return next();
}

