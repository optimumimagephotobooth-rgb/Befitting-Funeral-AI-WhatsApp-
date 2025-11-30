import express from 'express';
import { WhatsAppService } from './whatsapp/whatsappService.js';
import { AIService } from './ai/aiService.js';
import { MessageHandler } from './services/messageHandler.js';
import { initializeDatabase } from './db/database.js';
import { migrationManager } from './db/migrations.js';
import { verifyWebhook, handleWebhook } from './whatsapp/webhook.js';
import { config, validateConfig } from './config/config.js';
import { logger } from './utils/logger.js';
import { errorMiddleware } from './utils/errorHandler.js';
import { rateLimitMiddleware } from './middleware/rateLimiter.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();
const PORT = config.app.port;

// Validate configuration
if (!validateConfig()) {
  logger.error('Invalid configuration. Please check your environment variables.');
  process.exit(1);
}

// Determine which WhatsApp integration to use
const USE_WEBHOOK = config.whatsapp.mode === 'webhook';

// Initialize services
let whatsappService = null;
let aiService = null;
let messageHandler = null;

if (!USE_WEBHOOK) {
  // Use whatsapp-web.js (WhatsApp Web)
  whatsappService = new WhatsAppService();
  aiService = new AIService();
  messageHandler = new MessageHandler(whatsappService, aiService);
} else {
  // Use webhook-based API (WhatsApp Business API)
  aiService = new AIService();
  // Create a webhook-compatible service wrapper
  const WebhookService = {
    sendMessage: async (phoneNumber, message) => {
      const { sendMessage } = await import('./whatsapp/webhook.js');
      return sendMessage(phoneNumber, message);
    }
  };
  messageHandler = new MessageHandler(WebhookService, aiService);
}

// Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimitMiddleware);

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: config.service.name,
    mode: USE_WEBHOOK ? 'webhook' : 'whatsapp-web',
    version: '1.0.0'
  });
});

// API routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// B2B Lead Generation routes
import leadRoutes from './routes/leads.js';
app.use('/api/leads', leadRoutes);

// WhatsApp Cloud API routes
import whatsappRoutes from './routes/whatsapp.js';
app.use('/whatsapp', whatsappRoutes);

// Error handling middleware (must be last)
app.use(errorMiddleware);

// Note: WhatsApp webhooks are now handled via /whatsapp/webhook route
// Legacy webhook endpoints (kept for backward compatibility)
app.get('/webhook', verifyWebhook);
app.post('/webhook', handleWebhook);

// Initialize WhatsApp connection
async function initialize() {
  try {
    logger.info('🚀 Starting Befitting Funeral Service WhatsApp AI...');
    
    // Run system check
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
    
    // Initialize database
    if (config.database.url) {
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
    } else {
      logger.warn('DATABASE_URL not set, running without database');
      logger.warn('Some features (case tracking, message history) will not be available.');
    }
    
    if (USE_WEBHOOK) {
      // Webhook mode - just start the server
      logger.info('📡 Starting in webhook mode (WhatsApp Business API)');
      logger.info(`🔗 Webhook URL: ${config.app.baseUrl}/webhook`);
      logger.success('Configure your WhatsApp Business API webhook to point to this URL');
    } else {
      // WhatsApp Web mode - initialize client
      logger.info('Initializing WhatsApp Web service...');
      await whatsappService.initialize();
      logger.success('WhatsApp Web service initialized');
      
      // Set up message handler
      whatsappService.onMessage((message) => {
        messageHandler.handleMessage(message).catch(error => {
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
      if (USE_WEBHOOK) {
        logger.info(`📋 Webhook verification token: ${config.whatsapp.verifyToken ? 'SET' : 'NOT SET'}`);
      }
      
      // Start scheduled jobs (optional - can be enabled via env)
      if (process.env.ENABLE_SCHEDULED_JOBS === 'true') {
        try {
          const leadJobModule = await import('./jobs/leadGenerationJob.js');
          const LeadGenerationJob = leadJobModule.default || leadJobModule.LeadGenerationJob;
          const leadJob = new LeadGenerationJob();
          // Schedule daily lead generation for funeral-related businesses
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

// Start the application
initialize();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('\n🛑 Shutting down gracefully...');
  if (whatsappService && !USE_WEBHOOK) {
    await whatsappService.disconnect();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('\n🛑 Shutting down gracefully (SIGTERM)...');
  if (whatsappService && !USE_WEBHOOK) {
    await whatsappService.disconnect();
  }
  process.exit(0);
});

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

