import pool from '../db/database.js';
import { WORKFLOW_STAGES } from './workflowService.js';

const STAGE_INDEX = WORKFLOW_STAGES.reduce((acc, stage, idx) => {
  acc[stage] = idx;
  return acc;
}, {});

function normalizeStage(stage) {
  return (stage || '').toUpperCase();
}

function isStageDue(requirementStage, targetStage) {
  const normalizedRequirement = normalizeStage(requirementStage);
  if (!normalizedRequirement || normalizedRequirement === 'ANY') {
    return true;
  }
  const normalizedTarget = normalizeStage(targetStage);
  const requirementIndex = STAGE_INDEX[normalizedRequirement];
  const targetIndex = STAGE_INDEX[normalizedTarget];
  if (requirementIndex === undefined || targetIndex === undefined) {
    return false;
  }
  return requirementIndex <= targetIndex;
}

function isChecklistSatisfied(item) {
  return item.status === 'completed' || item.status === 'waived';
}

function isDocumentSatisfied(record = {}) {
  if (record.status === 'verified' || record.status === 'waived') {
    return true;
  }
  if (record.metadata && record.metadata.waived) {
    return true;
  }
  return false;
}

export async function evaluateStageGate(caseId, targetStage) {
  const [checklistResult, documentsResult] = await Promise.all([
    pool.query(
      `SELECT id, category, item_key, description, required_stage, is_required, status
       FROM compliance_checklist_items
       WHERE case_id = $1`,
      [caseId]
    ),
    pool.query(
      `SELECT id, document_type, label, required_stage, is_required, status, metadata
       FROM required_documents_status
       WHERE case_id = $1`,
      [caseId]
    )
  ]);

  const checklist = checklistResult.rows || [];
  const documents = documentsResult.rows || [];

  const blockingChecklist = checklist.filter((item) => {
    if (item.is_required === false) return false;
    if (!isStageDue(item.required_stage, targetStage)) return false;
    return !isChecklistSatisfied(item);
  });

  const blockingDocuments = documents.filter((doc) => {
    if (doc.is_required === false) return false;
    if (!isStageDue(doc.required_stage, targetStage)) return false;
    return !isDocumentSatisfied(doc);
  });

  const passed = blockingChecklist.length === 0 && blockingDocuments.length === 0;

  return {
    passed,
    targetStage,
    blockingChecklist,
    blockingDocuments,
    totals: {
      checklistTotal: checklist.length,
      documentsTotal: documents.length
    }
  };
}

export async function assertStageGate(caseId, targetStage) {
  const gate = await evaluateStageGate(caseId, targetStage);
  if (!gate.passed) {
    const error = new Error('Stage requirements are not satisfied');
    error.status = 412;
    error.details = gate;
    throw error;
  }
  return gate;
}

