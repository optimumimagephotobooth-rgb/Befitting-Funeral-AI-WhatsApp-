# 📁 Backend Structure Documentation

## Current Architecture

**Type:** Single Repository (Not Monorepo)  
**Language:** JavaScript (ES Modules)  
**Framework:** Express.js  
**Database:** PostgreSQL  
**Structure:** Feature-based organization

---

## 📂 Directory Structure

```
BefittingFuneralService/
├── src/                          # Main source code
│   ├── index.js                  # Entry point (Express app initialization)
│   │
│   ├── config/                   # Configuration management
│   │   └── config.js            # Centralized config (env vars, defaults)
│   │
│   ├── whatsapp/                 # WhatsApp integration
│   │   ├── whatsappService.js   # WhatsApp Web.js client
│   │   ├── webhook.js           # Meta WhatsApp Cloud API webhook handler
│   │   └── messageRouter.js     # Routes incoming WhatsApp messages
│   │
│   ├── ai/                       # AI service
│   │   ├── aiService.js         # OpenAI GPT-4 integration
│   │   └── prompts.js           # Dynamic prompt builders
│   │
│   ├── services/                 # Business logic services
│   │   ├── messageHandler.js    # Core message processing orchestrator
│   │   ├── messageQueue.js      # Message queue with retry logic
│   │   ├── stageLogic.js        # Conversation stage state machine
│   │   ├── paymentService.js    # Payment detection & confirmation
│   │   ├── referralSystem.js    # Referral code generation & tracking
│   │   ├── languageService.js   # Language detection (EN/Twi)
│   │   ├── analyticsService.js  # Analytics & metrics tracking
│   │   ├── griefSupportService.js    # Grief support resources
│   │   ├── documentService.js   # Document checklist management
│   │   ├── familyCoordinationService.js  # Family member coordination
│   │   ├── leadScraperService.js        # B2B lead web scraping
│   │   ├── emailService.js      # SendGrid email integration
│   │   └── leadGenerationService.js     # B2B lead orchestration
│   │
│   ├── models/                   # Database models (ORM-like)
│   │   ├── Contact.js           # Contacts table operations
│   │   ├── Case.js              # Cases table operations
│   │   ├── Message.js           # Messages table operations
│   │   ├── Reminder.js          # Reminders table operations
│   │   ├── Referral.js          # Referrals table operations
│   │   └── B2BLead.js           # B2B leads table operations
│   │
│   ├── routes/                  # Express API routes
│   │   ├── admin.js             # Admin dashboard API
│   │   ├── analytics.js         # Analytics API endpoints
│   │   └── leads.js             # B2B lead generation API
│   │
│   ├── middleware/              # Express middleware
│   │   ├── rateLimiter.js      # Rate limiting
│   │   └── validation.js        # Input validation
│   │
│   ├── utils/                   # Utility functions
│   │   ├── logger.js            # Winston logging setup
│   │   ├── errorHandler.js     # Global error handling
│   │   └── systemCheck.js       # System verification utility
│   │
│   ├── db/                      # Database setup
│   │   ├── database.js          # PostgreSQL connection pool
│   │   └── migrations.js        # Database migration manager
│   │
│   └── jobs/                    # Scheduled jobs
│       └── leadGenerationJob.js  # Cron jobs for lead generation
│
├── db/                          # Database schema
│   └── schema.sql              # PostgreSQL schema (tables, indexes)
│
├── logs/                        # Application logs (auto-created)
│
├── sessions/                    # WhatsApp Web sessions (auto-created)
│
├── package.json                 # Dependencies & scripts
├── .env                         # Environment variables (not in repo)
├── .gitignore                   # Git ignore rules
│
└── Documentation files:
    ├── README.md
    ├── DEPLOYMENT_READY.md
    ├── PLUG_AND_PLAY_GUIDE.md
    └── ... (other docs)
```

---

## 🔧 Key Files & Their Roles

### Entry Point
- **`src/index.js`** - Express app setup, middleware, route registration, initialization

### Core Services
- **`src/services/messageHandler.js`** - Main orchestrator (handles all message processing)
- **`src/services/messageQueue.js`** - Queue system for async message processing
- **`src/ai/aiService.js`** - OpenAI integration
- **`src/whatsapp/whatsappService.js`** - WhatsApp Web.js client

### API Routes
- **`src/routes/admin.js`** - `/api/admin/*` endpoints
- **`src/routes/analytics.js`** - `/api/analytics/*` endpoints
- **`src/routes/leads.js`** - `/api/leads/*` endpoints

### Database
- **`src/db/database.js`** - PostgreSQL connection pool
- **`src/models/*.js`** - Database model classes (Contact, Case, Message, etc.)
- **`db/schema.sql`** - Database schema definition

---

## 📊 Module System

**Type:** ES Modules (ESM)  
**Syntax:** `import/export` (not CommonJS `require`)

**Example:**
```javascript
// Import
import { AIService } from './ai/aiService.js';
import { config } from './config/config.js';

// Export
export class MessageHandler { ... }
export default router;
```

---

## 🗄️ Database Structure

**Database:** PostgreSQL  
**ORM:** Custom model classes (not using Sequelize/TypeORM)

**Tables:**
- `contacts` - WhatsApp contacts
- `cases` - Funeral cases
- `messages` - Message history
- `reminders` - Scheduled reminders
- `referrals` - Referral tracking
- `b2b_leads` - B2B lead generation
- `email_campaigns` - Email campaigns
- `email_logs` - Email delivery logs
- `analytics_events` - Analytics events

---

## 🔌 API Structure

**Base URL:** `http://localhost:3000`

**Endpoints:**
- `GET /health` - Health check
- `GET /webhook` - WhatsApp webhook verification
- `POST /webhook` - WhatsApp webhook receiver
- `GET /api/analytics/*` - Analytics endpoints
- `GET /api/admin/*` - Admin endpoints
- `GET /api/leads/*` - Lead generation endpoints

---

## 📦 Dependencies

**Core:**
- `express` - Web framework
- `whatsapp-web.js` - WhatsApp Web client
- `openai` - OpenAI API client
- `pg` - PostgreSQL client
- `dotenv` - Environment variables

**Additional:**
- `@sendgrid/mail` - Email service
- `cheerio` - HTML parsing (web scraping)
- `puppeteer` - Browser automation
- `node-cron` - Scheduled jobs
- `winston` - Logging
- `express-rate-limit` - Rate limiting

---

## 🔄 Data Flow

```
WhatsApp Message
    ↓
src/whatsapp/whatsappService.js (or webhook.js)
    ↓
src/services/messageHandler.js
    ↓
src/services/messageQueue.js
    ↓
src/services/messageHandler.js (processMessage)
    ↓
src/models/Contact.js, Case.js (database)
    ↓
src/ai/aiService.js (generate response)
    ↓
src/whatsapp/whatsappService.js (send response)
    ↓
src/models/Message.js (log to database)
```

---

## 🎯 For TypeScript Conversion

If converting to TypeScript, here's the suggested structure:

```
src/
├── index.ts
├── config/
│   └── config.ts
├── whatsapp/
│   ├── whatsappService.ts
│   ├── webhook.ts
│   └── messageRouter.ts
├── ai/
│   ├── aiService.ts
│   └── prompts.ts
├── services/
│   └── ... (all .ts)
├── models/
│   └── ... (all .ts)
├── routes/
│   └── ... (all .ts)
├── middleware/
│   └── ... (all .ts)
├── utils/
│   └── ... (all .ts)
├── db/
│   └── ... (all .ts)
└── jobs/
    └── ... (all .ts)
```

**Type Definitions Needed:**
- `types/contact.ts` - Contact interface
- `types/case.ts` - Case interface
- `types/message.ts` - Message interface
- `types/config.ts` - Config types
- `types/whatsapp.ts` - WhatsApp message types

---

## 📝 Current File Extensions

- **All JavaScript:** `.js`
- **All SQL:** `.sql`
- **All Markdown:** `.md`
- **Config:** `.json` (package.json), `.env` (environment)

---

## 🔍 Key Patterns

1. **Service Pattern** - Business logic in `services/`
2. **Model Pattern** - Database operations in `models/`
3. **Route Pattern** - API endpoints in `routes/`
4. **Middleware Pattern** - Express middleware in `middleware/`
5. **Utility Pattern** - Shared utilities in `utils/`

---

## 🚀 Entry Point Flow

```javascript
// src/index.js
1. Import dependencies
2. Load config
3. Validate config
4. Initialize Express app
5. Register middleware
6. Register routes
7. Initialize database
8. Connect WhatsApp
9. Start server
```

---

## 📋 Summary

- **Repo Type:** Single repository (not monorepo)
- **Language:** JavaScript (ES Modules)
- **Framework:** Express.js
- **Structure:** Feature-based (services, models, routes)
- **Database:** PostgreSQL with custom models
- **API:** RESTful endpoints under `/api/*`
- **Entry:** `src/index.js`

**Ready for TypeScript conversion with proper type definitions!**

