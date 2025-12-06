export async function evaluateSupervisorInsights(caseId: string) {
  return {
    caseId,
    riskScore: 42,
    summary: 'Risk detected in equipment allocation.',
    action: 'Reassign the allocation and notify the vendor.',
    tags: ['equipment', 'delay'],
    createdAt: new Date().toISOString()
  };
}

export async function listSupervisorInsights() {
  return [await evaluateSupervisorInsights('placeholder-case-id')];
}

