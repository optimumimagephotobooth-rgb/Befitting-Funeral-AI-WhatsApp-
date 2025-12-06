import express from 'express';
import { WhatsAppService } from './whatsapp/whatsappService.js';
import { AIService } from '../../shared/ai/aiService.js';
import { MessageHandler } from './services/messageHandler.js';
import pool, { initializeDatabase } from './db/database.js';
import { migrationManager } from './db/migrations.js';
import { verifyWebhook, handleWebhook } from './whatsapp/webhook.js';
import { config, validateConfig } from './config/config.js';
import { logger } from './utils/logger.js';
import { errorMiddleware } from './utils/errorHandler.js';
import { rateLimitMiddleware } from './middleware/rateLimiter.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';
import dashboardRoutes from './routes/dashboard.js';
import leadRoutes from './routes/leads.js';
import leadAnalysisRoutes from './routes/leadAnalysisRoutes.js';
import whatsappRoutes from './routes/whatsapp.js';
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import caseSummaryRoutes from './routes/caseSummaryRoutes.js';
import caseAttentionRoutes from './routes/caseAttentionRoutes.js';
import casePdfRoutes from './routes/casePdfRoutes.js';
import complianceRoutes from './routes/complianceRoutes.js';
import caseBriefingRoutes from './routes/caseBriefingRoutes.js';
import messagesDraftRoutes from './routes/messagesDraftRoutes.js';
import automationRoutes from './routes/automationRoutes.js';
import dashboardAutomationRoutes from './routes/dashboardAutomationRoutes.js';
import supervisorIntelRoutes from './routes/supervisorIntelRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import paymentAuditRoutes from './routes/paymentAuditRoutes.js';
import funeralDayRoutes from './routes/funeralDayRoutes.js';
import mortuaryRoutes from './routes/mortuaryRoutes.js';
import cemeteryRoutes from './routes/cemeteryRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import familyPortalRoutes from './routes/familyPortalRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import workOrderRoutes from './routes/workOrderRoutes.js';
import supervisorAiRoutes from './routes/supervisorAiRoutes.js';
import trainingRoutes from './routes/trainingRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import { getSystemHealth } from './services/healthService.js';
import { scheduleAutomationSweep } from './services/automationRunner.js';

const app = express();
const PORT = config.app.port;
const WHATSAPP_MODE = config.whatsapp.mode;
const USE_WEBHOOK_MODE = WHATSAPP_MODE === 'webhook' || WHATSAPP_MODE === 'cloud';

// Validate configuration early
const configValidation = validateConfig();
if (!configValidation.ok) {
  logger.error('Invalid configuration. Please check your environment variables.');
  process.exit(1);
}

let whatsappService = null;
let aiService = null;
let messageHandler = null;

setupMiddleware();
setupRoutes();
scheduleAutomationSweep();

function setupMiddleware() {
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(rateLimitMiddleware);
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    next();
  });
}

function setupRoutes() {
  app.get('/health', async (req, res) => {
    const timestamp = new Date().toISOString();
    try {
      const [systems, metrics] = await Promise.all([
        getSystemHealth(),
        fetchHealthMetrics()
      ]);

      res.json({
        status: systems.api,
        service: config.service.name,
        mode: WHATSAPP_MODE,
        version: '1.0.0',
        timestamp,
        uptime: process.uptime(),
        systems,
        data: metrics
      });
    } catch (error) {
      logger.error('Health check failed', error);
      res.status(500).json({
        status: 'down',
        service: config.service.name,
        mode: WHATSAPP_MODE,
        version: '1.0.0',
        timestamp,
        uptime: process.uptime(),
        systems: {
          api: 'down',
          storage: 'down',
          realtime: 'down'
        }
      });
    }
  });

  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin', paymentAuditRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/dashboard', dashboardAutomationRoutes);
  app.use('/api/cases', documentRoutes);
  app.use('/api/cases', caseSummaryRoutes);
  app.use('/api/cases', caseAttentionRoutes);
  app.use('/api/cases', casePdfRoutes);
  app.use('/api/cases', complianceRoutes);
  app.use('/api/cases', caseBriefingRoutes);
  app.use('/api/cases', automationRoutes);
  app.use('/api/cases', paymentRoutes);
  app.use('/api/cases', funeralDayRoutes);
  app.use('/api/equipment', equipmentRoutes);
  app.use('/api/work-orders', workOrderRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api', mortuaryRoutes);
  app.use('/api', cemeteryRoutes);
  app.use('/api', inventoryRoutes);
  app.use('/api/messages', messagesDraftRoutes);
  app.use('/api/family', familyPortalRoutes);
  app.use('/api/ai/supervisor', supervisorAiRoutes);
  app.use('/api/training', trainingRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api/leads', leadAnalysisRoutes);
  app.use('/api/supervisor', supervisorIntelRoutes);
  app.use('/whatsapp', whatsappRoutes);
  app.use('/auth', authRoutes);
  app.use(errorMiddleware);
  registerLegacyWebhooks();
}

async function fetchHealthMetrics() {
  try {
    const [caseCountResult, messageCountResult] = await Promise.all([
      pool.query('SELECT COUNT(*)::integer as total FROM cases'),
      pool.query('SELECT COUNT(*)::integer as total FROM messages')
    ]);

    return {
      activeCases: caseCountResult.rows[0]?.total ?? 0,
      messagesProcessed: messageCountResult.rows[0]?.total ?? 0
    };
  } catch (error) {
    logger.warn('Unable to fetch health metrics', error);
    return null;
  }
}

function registerLegacyWebhooks() {
  app.get('/webhook', verifyWebhook);
  app.post('/webhook', handleWebhook);
}

function configureWhatsAppServices() {
  if (!USE_WEBHOOK_MODE) {
    whatsappService = new WhatsAppService();
    aiService = new AIService();
    messageHandler = new MessageHandler(whatsappService, aiService);
    return;
  }

  aiService = new AIService();
  const WebhookService = {
    sendMessage: async (phoneNumber, message) => {
      const { sendMessage } = await import('./whatsapp/webhook.js');
      return sendMessage(phoneNumber, message);
    }
  };
  messageHandler = new MessageHandler(WebhookService, aiService);
}

async function runSystemCheckIfNeeded() {
  try {
    const { SystemCheck } = await import('./utils/systemCheck.js');
    const systemCheck = new SystemCheck();
    const checkResult = await systemCheck.runAllChecks();
    systemCheck.printReport();

    if (!checkResult.passed) {
      logger.warn('Some configuration issues detected. System will continue but some features may be limited.');
    }
  } catch (error) {
    logger.warn('System check skipped:', error.message);
  }
}

async function initializeDatabaseLayer() {
  if (!config.database.url) {
    logger.warn('DATABASE_URL not set, running without database');
    logger.warn('Some features (case tracking, message history) will not be available.');
    return;
  }

  try {
    logger.info('Initializing database...');
    await initializeDatabase();
    logger.info('Running database migrations...');
    await migrationManager.runMigrations();
    logger.success('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed', error);
    logger.warn('Continuing without database. Some features may be limited.');
  }
}

async function startServer() {
  configureWhatsAppServices();

  try {
    logger.info('🚀 Starting Befitting Funeral Service WhatsApp AI...');
    await runSystemCheckIfNeeded();
    await initializeDatabaseLayer();

    if (USE_WEBHOOK_MODE) {
      logger.info('📡 Starting in webhook mode (WhatsApp Business API)');
      logger.info(`🔗 Webhook URL: ${config.app.baseUrl}/webhook`);
      logger.success('Configure your WhatsApp Business API webhook to point to this URL');
    } else {
      logger.info('Initializing WhatsApp Web service...');
      await whatsappService.initialize();
      logger.success('WhatsApp Web service initialized');
      whatsappService.onMessage((message) => {
        messageHandler.handleMessage(message).catch((error) => {
          logger.error('Error handling message', error);
        });
      });
    }

    app.listen(PORT, async () => {
      logger.success(`📡 Server running on port ${PORT}`);
      logger.success(`💬 WhatsApp AI is ready to receive messages`);
      logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
      logger.info(`📊 Analytics API: http://localhost:${PORT}/api/analytics/stats`);
      logger.info(`🔧 Admin API: http://localhost:${PORT}/api/admin/dashboard`);
      logger.info(`📧 Lead Generation API: http://localhost:${PORT}/api/leads`);

      if (USE_WEBHOOK_MODE) {
        logger.info(`📋 Webhook verification token: ${config.whatsapp.verifyToken ? 'SET' : 'NOT SET'}`);
      }

      if (process.env.ENABLE_SCHEDULED_JOBS === 'true') {
        try {
          const leadJobModule = await import('./jobs/leadGenerationJob.js');
          const LeadGenerationJob = leadJobModule.default || leadJobModule.LeadGenerationJob;
          const leadJob = new LeadGenerationJob();
          leadJob.scheduleDailyLeadGeneration([
            'funeral services',
            'hospitals',
            'churches',
            'insurance companies'
          ]);
          leadJob.start();
          logger.info('✅ Scheduled lead generation jobs started');
        } catch (error) {
          logger.warn('Could not start scheduled jobs', error.message);
        }
      }
    });
  } catch (error) {
    logger.error('Initialization error', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  void startServer();
}

process.on('SIGINT', async () => {
  logger.info('\n🛑 Shutting down gracefully...');
  if (whatsappService && !USE_WEBHOOK_MODE) {
    await whatsappService.disconnect();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('\n🛑 Shutting down gracefully (SIGTERM)...');
  if (whatsappService && !USE_WEBHOOK_MODE) {
    await whatsappService.disconnect();
  }
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

export { app, startServer };
export default startServer;

