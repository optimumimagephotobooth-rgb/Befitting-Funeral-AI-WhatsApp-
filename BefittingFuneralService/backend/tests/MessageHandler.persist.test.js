import { jest } from '@jest/globals';
import { config } from '../src/config/config.js';

const supabaseMock = {
  __esModule: true,
  insertMessageToSupabase: jest.fn(),
  logCaseEvent: jest.fn(),
  logStaffEvent: jest.fn()
};

const messageMock = {
  __esModule: true,
  Message: {
    create: jest.fn()
  }
};

jest.unstable_mockModule('../src/services/supabaseService.js', () => supabaseMock);
jest.unstable_mockModule('../src/models/Message.js', () => messageMock);

let MessageHandler;
let insertMessageToSupabase;
let Message;

beforeAll(async () => {
  ({ MessageHandler } = await import('../src/services/messageHandler.js'));
  ({ insertMessageToSupabase } = await import('../src/services/supabaseService.js'));
  ({ Message } = await import('../src/models/Message.js'));
});

const createHandler = () => {
  const whatsappService = { sendMessage: jest.fn() };
  const aiService = { detectIntent: jest.fn(), generateResponse: jest.fn() };
  return new MessageHandler(whatsappService, aiService);
};

describe('MessageHandler.persistMessage', () => {
  const payload = {
    case_id: 1,
    direction: 'INBOUND',
    from_number: '233123456789',
    body: 'Hello',
    raw: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
    config.featureFlags.supabaseMessageStoreOnly = false;
  });

  it('writes to Postgres and Supabase when flag is false', async () => {
    const handler = createHandler();
    await handler.persistMessage(payload);

    expect(Message.create).toHaveBeenCalledWith(payload);
    expect(insertMessageToSupabase).toHaveBeenCalledWith(payload);
  });

  it('skips Postgres when Supabase-only flag is enabled', async () => {
    config.featureFlags.supabaseMessageStoreOnly = true;
    const handler = createHandler();

    await handler.persistMessage(payload);

    expect(Message.create).not.toHaveBeenCalled();
    expect(insertMessageToSupabase).toHaveBeenCalledWith(payload);
  });
});


