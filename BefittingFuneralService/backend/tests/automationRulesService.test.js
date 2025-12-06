import { jest } from '@jest/globals';

const poolMock = {
  __esModule: true,
  default: {
    query: jest.fn()
  }
};

const supabaseMock = {
  __esModule: true,
  logCaseEvent: jest.fn()
};

jest.unstable_mockModule('../src/db/database.js', () => poolMock);
jest.unstable_mockModule('../src/services/supabaseService.js', () => supabaseMock);

let persistAutomationAlerts;

beforeAll(async () => {
  ({ persistAutomationAlerts } = await import('../src/services/automationRulesService.js'));
});

const mockedPoolQuery = poolMock.default.query;
const mockedLogCaseEvent = supabaseMock.logCaseEvent;

describe('Automation alert persistence', () => {
  beforeEach(() => {
    mockedPoolQuery.mockReset();
    mockedLogCaseEvent.mockReset();
  });

  it('inserts new automation alerts and logs the event', async () => {
    mockedPoolQuery
      .mockResolvedValueOnce({ rows: [] }) // check existing
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-123',
            severity: 'high',
            title: 'Test alert',
            recommended_action: 'Do something',
            sla_due_at: '2025-01-01T00:00:00Z'
          }
        ]
      });

    await persistAutomationAlerts('case-1', [
      {
        key: 'TEST_ALERT',
        type: 'TEST',
        severity: 'high',
        title: 'Test alert',
        description: 'Needs attention',
        recommendedAction: 'Do something',
        slaDueAt: '2025-01-01T00:00:00Z'
      }
    ]);

    expect(mockedPoolQuery).toHaveBeenCalledTimes(2);
    expect(mockedLogCaseEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogCaseEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        case_id: 'case-1',
        event_type: 'AUTOMATION_ALERT'
      })
    );
  });

  it('skips duplicates when an open alert with the same key exists', async () => {
    mockedPoolQuery.mockResolvedValueOnce({
      rows: [{ id: 'alert-789' }]
    });

    await persistAutomationAlerts('case-2', [
      {
        key: 'DUPLICATE',
        type: 'TEST',
        severity: 'medium',
        title: 'Duplicate alert',
        description: 'Already exists',
        recommendedAction: 'No action'
      }
    ]);

    expect(mockedPoolQuery).toHaveBeenCalledTimes(1);
    expect(mockedLogCaseEvent).not.toHaveBeenCalled();
  });
});

