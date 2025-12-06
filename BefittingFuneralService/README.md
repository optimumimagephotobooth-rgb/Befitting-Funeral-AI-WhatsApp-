# Befitting Funeral Service - WhatsApp AI Assistant

A comprehensive WhatsApp AI integration for funeral service management, providing compassionate and efficient communication with families during their time of need.

## Features

### Core Features (Module A)
- 🤖 AI-powered WhatsApp chatbot
- 💬 Natural language processing for funeral inquiries
- 📋 Service information and pricing
- 📅 Appointment scheduling
- 📝 Service request management
- 💳 Payment processing integration
- 📊 Analytics and reporting

### Advanced Features (Module B)
- 🎥 Virtual consultations
- 📸 Memorial photo uploads
- 🌐 Multi-language support
- 📱 SMS fallback notifications
- 🔔 Automated reminders
- 📈 CRM integration
- 🎨 Customizable messaging templates

## Tech Stack

- **Backend**: Node.js with Express
- **WhatsApp API**: whatsapp-web.js
- **AI**: OpenAI GPT-4
- **Database**: PostgreSQL (with Supabase support)
- **ORM**: Native pg driver with model classes
- **Hosting**: Cloud-ready (AWS/GCP/Azure/Supabase)

## Project Structure

```
BefittingFuneralService/
├── src/
│   ├── index.js            # Main entry point
│   ├── whatsapp/           # WhatsApp integration
│   │   └── whatsappService.js
│   ├── ai/                 # AI service handlers
│   │   └── aiService.js
│   ├── services/           # Business logic
│   │   └── messageHandler.js
│   ├── models/             # Database models
│   │   ├── Contact.js
│   │   ├── Case.js
│   │   ├── Message.js
│   │   └── Reminder.js
│   └── db/                 # Database connection
│       └── database.js
├── db/
│   └── schema.sql          # PostgreSQL schema
├── .env.example            # Environment variables template
├── package.json            # Dependencies
├── README.md               # This file
├── SETUP.md                # Setup instructions
├── DATABASE.md             # Database guide
├── FEATURES.md             # Feature list
└── ROADMAP.md              # Development roadmap
```

## 🚀 Quick Start

**Get running in 5 minutes!** See [QUICK_START.md](./QUICK_START.md)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Run the app
npm start

# 4. Scan QR code (if using WhatsApp Web mode)
```

## 📚 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Get running in 5 minutes ⚡
- **[SETUP.md](./SETUP.md)** - Detailed setup instructions 📖
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide 🚀
- **[DATABASE.md](./DATABASE.md)** - Database setup guide 🗄️
- **[WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md)** - WhatsApp integration guide 💬
- **[FEATURES.md](./FEATURES.md)** - Complete feature list ✨
- **[ROADMAP.md](./ROADMAP.md)** - Development roadmap 🗺️
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Complete project overview 📋

## Monitoring

- **Dashboard**: visit `/dashboard` to see the health, WhatsApp status, and analytics snapshot in one place.  
- **Health check**: `/health` reports service, mode, and version for smoke tests.  
- **WhatsApp API**: `/whatsapp/status` and `/whatsapp/send-test` let you verify Cloud API connectivity.  
- **Admin APIs**: `/api/analytics/stats`, `/api/admin/dashboard`, and `/api/leads` expose the reporting endpoints already wired into the backend.

## 🎯 Key Features

- ✅ **Dual WhatsApp Integration** - Webhook (production) or WhatsApp Web (dev)
- ✅ **AI-Powered** - OpenAI GPT-4 with Ghana-specific prompts
- ✅ **Case Management** - Complete workflow tracking (NEW → FOLLOWUP)
- ✅ **Database Integration** - PostgreSQL with automatic schema
- ✅ **MoMo Support** - Mobile Money payment integration ready
- ✅ **Production Ready** - Deploy to Railway, Render, Heroku, etc.

## License

MIT

