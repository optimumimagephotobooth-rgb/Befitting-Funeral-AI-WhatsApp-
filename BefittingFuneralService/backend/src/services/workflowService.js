export const WORKFLOW_STAGES = [
  'NEW',
  'INTAKE',
  'DOCUMENTS',
  'QUOTE',
  'SCHEDULED',
  'SERVICE_DAY',
  'COMPLETED'
];

const STAGE_CONFIG = {
  NEW: {
    label: 'New Lead',
    description: 'Initial WhatsApp outreach detected. Awaiting intake call back.',
    requirements: ['Confirm bereavement details', 'Capture contact preference'],
    allowedTransitions: ['INTAKE'],
    roles: ['admin', 'coordinator', 'director', 'agent'],
    aiSuggestions: [
      'Compose condolence introduction tailored to Ghanaian customs',
      'Offer prayer support and outline intake next steps'
    ]
  },
  INTAKE: {
    label: 'Intake',
    description: 'Collecting full family + deceased information.',
    requirements: ['Validate contact identity', 'Capture service expectations', 'Assign coordinator'],
    allowedTransitions: ['DOCUMENTS'],
    roles: ['admin', 'coordinator', 'director'],
    aiSuggestions: [
      'Draft intake summary for coordinator follow-up',
      'Suggest culturally appropriate visitation schedule'
    ]
  },
  DOCUMENTS: {
    label: 'Documents',
    description: 'Preparing statutory forms, letters and paperwork.',
    requirements: ['Generate intake letter', 'Upload ID + statutory docs', 'Share drafts for review'],
    allowedTransitions: ['QUOTE'],
    roles: ['admin', 'coordinator'],
    aiSuggestions: [
      'Draft condolence letter to family elders',
      'Prepare obituary outline referencing Akan naming conventions'
    ]
  },
  QUOTE: {
    label: 'Quote',
    description: 'Finalising the funeral estimate with charges + deposits.',
    requirements: ['Review case charges', 'Send estimate to family', 'Capture deposit approval'],
    allowedTransitions: ['SCHEDULED'],
    roles: ['admin', 'coordinator', 'director'],
    aiSuggestions: [
      'Summarise package differences for the family',
      'Draft payment guidance message referencing mobile money'
    ]
  },
  SCHEDULED: {
    label: 'Scheduled',
    description: 'Service date confirmed and logistics underway.',
    requirements: ['Confirm venue + transport', 'Notify suppliers', 'Share programme draft'],
    allowedTransitions: ['SERVICE_DAY'],
    roles: ['admin', 'coordinator', 'director'],
    aiSuggestions: [
      'Draft announcement for extended family WhatsApp group',
      'Generate programme checklist highlighting Ghanaian rites'
    ]
  },
  SERVICE_DAY: {
    label: 'Service Day',
    description: 'Funeral service is in progress.',
    requirements: ['Track on-site updates', 'Coordinate vehicle movements', 'Log key events'],
    allowedTransitions: ['COMPLETED'],
    roles: ['admin', 'coordinator'],
    aiSuggestions: [
      'Prepare gratitude message for clergy and pallbearers',
      'Draft live update template for family channels'
    ]
  },
  COMPLETED: {
    label: 'Completed',
    description: 'Service delivery concluded, ready for follow-up actions.',
    requirements: ['Send appreciation message', 'Archive documents', 'Close out charges'],
    allowedTransitions: [],
    roles: ['admin', 'coordinator', 'director'],
    aiSuggestions: [
      'Draft appreciation SMS to family head',
      'Summarise lessons learned for operations review'
    ]
  }
};

export function getStageConfig(stage) {
  return STAGE_CONFIG[stage] || STAGE_CONFIG.NEW;
}

export function getNextStages(stage) {
  return getStageConfig(stage).allowedTransitions;
}

export function validateTransition(currentStage, nextStage) {
  const allowed = getNextStages(currentStage);
  return allowed.includes(nextStage);
}

export function canRoleTransition(stage, role) {
  const { roles } = getStageConfig(stage);
  if (!roles || roles.length === 0) return true;
  return roles.includes(role);
}

export function getWorkflowSummary(stage) {
  const config = getStageConfig(stage);
  return {
    currentStage: stage,
    ...config,
    stages: WORKFLOW_STAGES
  };
}

