import { jest } from '@jest/globals';

const poolMock = {
  __esModule: true,
  default: {
    query: jest.fn()
  }
};

jest.unstable_mockModule('../src/db/database.js', () => poolMock);

let evaluateStageGate;
let assertStageGate;
beforeAll(async () => {
  ({ evaluateStageGate, assertStageGate } = await import('../src/services/complianceGateService.js'));
});

const mockedQuery = poolMock.default.query;

describe('Compliance gate evaluation', () => {
  beforeEach(() => {
    mockedQuery.mockReset();
  });

  it('marks gate as blocked when a required checklist item remains pending', async () => {
    mockedQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'item-1',
            required_stage: 'DOCUMENTS',
            is_required: true,
            status: 'pending'
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] });

    const gate = await evaluateStageGate('case-123', 'DOCUMENTS');
    expect(gate.passed).toBe(false);
    expect(gate.blockingChecklist).toHaveLength(1);
    expect(gate.blockingDocuments).toHaveLength(0);
  });

  it('throws when assertStageGate sees blockers', async () => {
    mockedQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'item-1',
            required_stage: 'DOCUMENTS',
            is_required: true,
            status: 'pending'
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] });

    await expect(assertStageGate('case-123', 'DOCUMENTS')).rejects.toThrow('Stage requirements are not satisfied');
  });

  it('passes when all checklist items and documents satisfy requirements', async () => {
    mockedQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'item-2',
            required_stage: 'NEW',
            is_required: true,
            status: 'completed'
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'doc-1',
            required_stage: 'NEW',
            is_required: true,
            status: 'verified'
          }
        ]
      });

    const gate = await evaluateStageGate('case-456', 'SERVICE_DAY');
    expect(gate.passed).toBe(true);
    expect(gate.blockingChecklist).toHaveLength(0);
    expect(gate.blockingDocuments).toHaveLength(0);
  });
});

