export async function listTrainingModules() {
  return [
    { id: 1, name: 'Equipment Allocation Basics', role: 'operations', description: 'How to allocate and return equipment safely' }
  ];
}

export async function fetchProgress(staffId?: string) {
  return {
    staffId: staffId || 'unknown',
    modulesCompleted: [],
    score: 0
  };
}

export async function upsertProgress(staffId: string | undefined, moduleId: number, score: number) {
  return {
    staffId,
    moduleId,
    score,
    completedAt: new Date().toISOString()
  };
}

export async function listScenarios() {
  return [
    { id: 1, title: 'Equipment Return Challenge', difficulty: 'medium', steps: ['Locate allocation', 'Mark damaged', 'Generate lesson'] }
  ];
}

