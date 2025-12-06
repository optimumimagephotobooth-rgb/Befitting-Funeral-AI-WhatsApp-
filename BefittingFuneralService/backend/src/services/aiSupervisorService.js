import pool from '../db/database.js';
import { logCaseEvent } from './supabaseService.js';

async function fetchCaseSnapshot(caseId) {
  const [caseResult, docResult, chargeResult] = await Promise.all([
    pool.query('SELECT * FROM cases WHERE id = $1', [caseId]),
    pool.query(
      `SELECT cd.*, dt.document_type
         FROM case_documents cd
         LEFT JOIN document_templates dt ON dt.id = cd.template_id
        WHERE cd.case_id = $1
        ORDER BY cd.created_at DESC
        LIMIT 5`,
      [caseId]
    ),
    pool.query(
      `SELECT *
         FROM case_charges
        WHERE case_id = $1
        ORDER BY created_at DESC`,
      [caseId]
    )
  ]);

  return {
    caseRecord: caseResult.rows[0],
    documents: docResult.rows,
    charges: chargeResult.rows
  };
}

export async function getAISupervisorHints(caseId) {
  const snapshot = await fetchCaseSnapshot(caseId);
  const hints = [];

  if (!snapshot.caseRecord) {
    return { hints };
  }

  if (!snapshot.caseRecord.funeral_date) {
    hints.push({
      type: 'missing_info',
      message: 'Funeral/service date missing. Confirm schedule with family.'
    });
  }

  if (snapshot.caseRecord.stage === 'DOCUMENTS' && snapshot.documents.length === 0) {
    hints.push({
      type: 'documents',
      message: 'No documents uploaded yet. Generate intake letter or statutory forms.'
    });
  }

  if (
    snapshot.caseRecord.stage === 'QUOTE' &&
    (snapshot.charges || []).length === 0
  ) {
    hints.push({
      type: 'charges',
      message: 'Quote stage without charges. Add line items or review packages.'
    });
  }

  if (snapshot.caseRecord.stage === 'SCHEDULED' && !snapshot.caseRecord.location) {
    hints.push({
      type: 'logistics',
      message: 'Scheduled stage missing venue information.'
    });
  }

  if (hints.length === 0) {
    hints.push({
      type: 'insight',
      message: 'Case looks steady. Continue monitoring timeline events.'
    });
  }

  return { caseId, hints };
}

export async function logSupervisorHints(caseId, hints) {
  if (!hints || hints.length === 0) {
    return;
  }
  await logCaseEvent({
    case_id: caseId,
    event_type: 'SUPERVISOR_HINT',
    stage: null,
    metadata: {
      hints
    }
  });
}

