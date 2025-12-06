# 🔄 TypeScript Migration Guide

## Current Structure (JavaScript)

**Type:** Single Repository  
**Language:** JavaScript (ES Modules)  
**Entry:** `src/index.js`  
**Structure:** Feature-based organization

---

## 📁 Current File Structure

```
src/
├── index.js                    # Entry point
├── config/
│   └── config.js
├── whatsapp/
│   ├── whatsappService.js
│   ├── webhook.js
│   └── messageRouter.js
├── ai/
│   ├── aiService.js
│   └── prompts.js
├── services/                   # Business logic
│   ├── messageHandler.js
│   ├── messageQueue.js
│   ├── stageLogic.js
│   ├── paymentService.js
│   ├── referralSystem.js
│   ├── languageService.js
│   ├── analyticsService.js
│   ├── griefSupportService.js
│   ├── documentService.js
│   ├── familyCoordinationService.js
│   ├── leadScraperService.js
│   ├── emailService.js
│   └── leadGenerationService.js
├── models/                     # Database models
│   ├── Contact.js
│   ├── Case.js
│   ├── Message.js
│   ├── Reminder.js
│   ├── Referral.js
│   └── B2BLead.js
├── routes/                     # API routes
│   ├── admin.js
│   ├── analytics.js
│   └── leads.js
├── middleware/                 # Express middleware
│   ├── rateLimiter.js
│   └── validation.js
├── utils/                      # Utilities
│   ├── logger.js
│   ├── errorHandler.js
│   └── systemCheck.js
├── db/                         # Database
│   ├── database.js
│   └── migrations.js
└── jobs/                       # Scheduled jobs
    └── leadGenerationJob.js
```

---

## 🎯 Proposed TypeScript Structure

```
src/
├── index.ts                    # Entry point
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
├── jobs/
│   └── ... (all .ts)
└── types/                      # NEW: Type definitions
    ├── contact.ts
    ├── case.ts
    ├── message.ts
    ├── config.ts
    ├── whatsapp.ts
    ├── database.ts
    └── index.ts
```

---

## 📝 Type Definitions Needed

### `src/types/contact.ts`
```typescript
export interface Contact {
  id: string;
  phone_number: string;
  name: string | null;
  created_at: Date;
}

export interface ContactCreateInput {
  phone_number: string;
  name?: string | null;
}
```

### `src/types/case.ts`
```typescript
export type CaseStatus = 
  | 'NEW' 
  | 'INTAKE' 
  | 'QUOTE' 
  | 'DEPOSIT' 
  | 'DETAILS' 
  | 'SUMMARY' 
  | 'FOLLOWUP' 
  | 'IN_PROGRESS';

export interface Case {
  id: string;
  contact_id: string;
  case_ref: string;
  status: CaseStatus;
  deceased_name: string | null;
  funeral_date: Date | null;
  location: string | null;
  package_name: string | null;
  total_amount: number | null;
  deposit_amount: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CaseCreateInput {
  contact_id: string;
  status?: CaseStatus;
  deceased_name?: string;
  funeral_date?: Date;
  location?: string;
  package_name?: string;
  total_amount?: number;
  deposit_amount?: number;
}
```

### `src/types/message.ts`
```typescript
export type MessageDirection = 'INBOUND' | 'OUTBOUND';

export interface Message {
  id: string;
  case_id: string | null;
  direction: MessageDirection;
  from_number: string;
  body: string;
  raw: Record<string, any> | null;
  created_at: Date;
}

export interface MessageCreateInput {
  case_id?: string | null;
  direction: MessageDirection;
  from_number: string;
  body: string;
  raw?: Record<string, any> | null;
}
```

### `src/types/whatsapp.ts`
```typescript
export interface WhatsAppMessage {
  from: string;
  to: string;
  body: string;
  timestamp: number;
  id: string;
  type: string;
  profileName?: string;
  contact?: {
    profile?: {
      name?: string;
    };
  };
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
```

### `src/types/config.ts`
```typescript
export interface WhatsAppConfig {
  mode: 'web' | 'webhook';
  verifyToken?: string;
  accessToken?: string;
  phoneNumberId?: string;
  apiVersion: string;
  sessionPath: string;
  phoneNumber?: string;
}

export interface AIConfig {
  openAiApiKey: string;
  model: string;
  temperature: number;
}

export interface DatabaseConfig {
  url?: string;
}

export interface AppConfig {
  port: number;
  baseUrl: string;
  nodeEnv: 'development' | 'production' | 'test';
}

export interface ServiceConfig {
  name: string;
  phone?: string;
  email: string;
  website: string;
  address: string;
  businessHours: string;
  momoNumber: string;
  momoName: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  bankBranch: string;
}

export interface EmailConfig {
  sendgridApiKey?: string;
  fromEmail: string;
  fromName: string;
}

export interface Config {
  whatsapp: WhatsAppConfig;
  ai: AIConfig;
  database: DatabaseConfig;
  app: AppConfig;
  service: ServiceConfig;
  email: EmailConfig;
}
```

### `src/types/database.ts`
```typescript
import { Pool } from 'pg';

export interface DatabasePool extends Pool {}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}
```

### `src/types/index.ts`
```typescript
export * from './contact';
export * from './case';
export * from './message';
export * from './whatsapp';
export * from './config';
export * from './database';
```

---

## 🔧 TypeScript Configuration

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 📦 Package.json Updates

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn src/index.ts",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/pg": "^8.10.9",
    "@types/node-cron": "^3.0.11",
    "typescript": "^5.3.3",
    "ts-node-dev": "^2.0.0"
  }
}
```

---

## 🔄 Migration Steps

1. **Install TypeScript dependencies**
   ```bash
   npm install -D typescript @types/node @types/express @types/pg ts-node-dev
   ```

2. **Create `tsconfig.json`** (see above)

3. **Create `src/types/` directory** with all type definitions

4. **Rename files** `.js` → `.ts` (one at a time)

5. **Add type annotations** to each file

6. **Update imports** to use `.js` extensions (TypeScript requirement)

7. **Build and test**
   ```bash
   npm run build
   npm start
   ```

---

## 📋 File-by-File Migration Checklist

- [ ] `src/index.ts`
- [ ] `src/config/config.ts`
- [ ] `src/whatsapp/whatsappService.ts`
- [ ] `src/whatsapp/webhook.ts`
- [ ] `src/whatsapp/messageRouter.ts`
- [ ] `src/ai/aiService.ts`
- [ ] `src/ai/prompts.ts`
- [ ] `src/services/messageHandler.ts`
- [ ] `src/services/messageQueue.ts`
- [ ] `src/services/stageLogic.ts`
- [ ] `src/services/paymentService.ts`
- [ ] `src/services/referralSystem.ts`
- [ ] `src/services/languageService.ts`
- [ ] `src/services/analyticsService.ts`
- [ ] `src/services/griefSupportService.ts`
- [ ] `src/services/documentService.ts`
- [ ] `src/services/familyCoordinationService.ts`
- [ ] `src/services/leadScraperService.ts`
- [ ] `src/services/emailService.ts`
- [ ] `src/services/leadGenerationService.ts`
- [ ] `src/models/Contact.ts`
- [ ] `src/models/Case.ts`
- [ ] `src/models/Message.ts`
- [ ] `src/models/Reminder.ts`
- [ ] `src/models/Referral.ts`
- [ ] `src/models/B2BLead.ts`
- [ ] `src/routes/admin.ts`
- [ ] `src/routes/analytics.ts`
- [ ] `src/routes/leads.ts`
- [ ] `src/middleware/rateLimiter.ts`
- [ ] `src/middleware/validation.ts`
- [ ] `src/utils/logger.ts`
- [ ] `src/utils/errorHandler.ts`
- [ ] `src/utils/systemCheck.ts`
- [ ] `src/db/database.ts`
- [ ] `src/db/migrations.ts`
- [ ] `src/jobs/leadGenerationJob.ts`

---

## 🎯 Key Conversion Points

1. **ES Modules stay the same** - TypeScript supports `import/export`
2. **Add type annotations** - Function parameters, return types
3. **Use interfaces** - For object shapes
4. **Use types** - For unions, intersections
5. **Keep `.js` in imports** - TypeScript requirement for ESM

---

## ✅ Benefits of TypeScript Migration

- ✅ Type safety
- ✅ Better IDE autocomplete
- ✅ Catch errors at compile time
- ✅ Self-documenting code
- ✅ Easier refactoring
- ✅ Better developer experience

---

**Ready for TypeScript conversion!** 🚀

