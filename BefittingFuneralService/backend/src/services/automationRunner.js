import pool from '../db/database.js';
import { buildCaseSummaryContext } from './aiCaseSummaryService.js';
import {
  evaluateAutomationRules,
  persistAutomationAlerts,
  markBreachedAlerts,
  evaluateInventoryAutomations,
  evaluateMortuaryAutomations,
  evaluateCemeteryAutomations,
  evaluateEquipmentAutomations
} from './automationRulesService.js';
import {
  evaluateComplianceAlerts,
  persistComplianceAlerts,
  markComplianceBreaches
} from './complianceRulesService.js';
import { logger } from '../utils/logger.js';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export async function runAutomationSweep() {
  try {
    await Promise.all([markBreachedAlerts(), markComplianceBreaches()]);
    const { rows } = await pool.query("SELECT id FROM cases WHERE stage != 'COMPLETED'");
      for (const row of rows) {
      try {
        const context = await buildCaseSummaryContext(row.id);
        const alerts = evaluateAutomationRules(context);
        await persistAutomationAlerts(row.id, alerts);

        const complianceAlerts = await evaluateComplianceAlerts(context.caseDetails || context.caseRecord || {});
        await persistComplianceAlerts(row.id, complianceAlerts);
      } catch (caseError) {
        logger.warn('Automation sweep failed for case', { caseId: row.id, error: caseError.message });
      }
    }
    await Promise.all([
      evaluateInventoryAutomations(),
      evaluateMortuaryAutomations(),
      evaluateCemeteryAutomations()
    ]);
      const equipmentAlerts = await evaluateEquipmentAutomations();
      for (const [caseId, caseAlerts] of equipmentAlerts.entries()) {
        await persistAutomationAlerts(caseId, caseAlerts);
      }
  } catch (err) {
    logger.error('Automation sweep failed', err);
  }
}

export function scheduleAutomationSweep(intervalMs = DEFAULT_INTERVAL_MS) {
  setTimeout(async function tick() {
    await runAutomationSweep();
    setTimeout(tick, intervalMs);
  }, intervalMs);
}


