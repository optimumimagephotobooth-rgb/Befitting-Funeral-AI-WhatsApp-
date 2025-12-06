# 📧 B2B Lead Generation System

## Overview
Complete B2B lead generation system with web scraping and SendGrid email integration.

---

## ✅ Features Implemented

### 1. **Lead Scraping** ✅
- Google Business search scraping
- Yellow Pages Ghana scraping
- Website email extraction
- Lead enrichment and deduplication
- Industry classification

### 2. **Email Service** ✅
- SendGrid integration
- HTML and text email templates
- Bulk email sending
- Email tracking (sent, opened, clicked)
- Rate limiting protection

### 3. **Lead Management** ✅
- Database storage
- Lead status tracking
- Email campaign management
- Statistics and analytics
- API endpoints for management

### 4. **Automation** ✅
- Scheduled lead generation
- Automated email campaigns
- Cron job support

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Add to `.env`:
```env
# SendGrid Configuration (REQUIRED for email)
SENDGRID_API_KEY=your_sendgrid_api_key_here
EMAIL_FROM=noreply@befittingfuneralservices.com
EMAIL_FROM_NAME=Befitting Funeral Services

# Optional: Enable scheduled jobs
ENABLE_SCHEDULED_JOBS=true
```

### 3. Get SendGrid API Key

1. Sign up at https://sendgrid.com
2. Create API key in Settings > API Keys
3. Add to `.env` file

---

## 📊 API Endpoints

### Generate Leads
```bash
POST /api/leads/generate
Headers: X-API-Key: your_admin_key
Body: {
  "query": "funeral services",
  "location": "Accra, Ghana",
  "maxResults": 20,
  "sources": ["google", "yellowpages"],
  "extractEmails": true,
  "sendEmails": false,
  "emailTemplate": "default"
}
```

### Get All Leads
```bash
GET /api/leads?status=NEW&limit=50
Headers: X-API-Key: your_admin_key
```

### Get Lead Statistics
```bash
GET /api/leads/stats/overview
Headers: X-API-Key: your_admin_key
```

### Send Emails to Leads
```bash
POST /api/leads/send-emails
Headers: X-API-Key: your_admin_key
Body: {
  "leadIds": ["uuid1", "uuid2"],
  "emailTemplate": "default"
}
```

### Send Emails to New Leads
```bash
POST /api/leads/send-emails/new
Headers: X-API-Key: your_admin_key
Body: {
  "emailTemplate": "default",
  "limit": 50
}
```

---

## 📧 Email Templates

### Available Templates:
1. **default** - General partnership opportunity
2. **partnership** - B2B partnership focus
3. **referral** - Referral program invitation

### Customize Templates:
Edit `src/services/emailService.js`:
- `getDefaultLeadEmailTemplate()`
- `getPartnershipEmailTemplate()`
- `getReferralEmailTemplate()`

---

## 🔄 Automated Campaigns

### Enable Scheduled Jobs

Add to `.env`:
```env
ENABLE_SCHEDULED_JOBS=true
```

### Scheduled Tasks:
- **Daily Lead Generation** - 9 AM daily
- **Weekly Email Campaign** - Monday 10 AM

### Customize Schedule:
Edit `src/jobs/leadGenerationJob.js`

---

## 📈 Lead Status Flow

```
NEW → CONTACTED → INTERESTED → CONVERTED
  ↓
NOT_INTERESTED
```

### Status Meanings:
- **NEW** - Just scraped, not contacted
- **CONTACTED** - Email sent
- **INTERESTED** - Showed interest
- **NOT_INTERESTED** - Not interested
- **CONVERTED** - Became a partner/client

---

## 🎯 Usage Examples

### Example 1: Generate Leads for Hospitals
```bash
curl -X POST http://localhost:3000/api/leads/generate \
  -H "X-API-Key: your_admin_key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "hospitals in Accra",
    "location": "Accra, Ghana",
    "maxResults": 30,
    "extractEmails": true,
    "sendEmails": false
  }'
```

### Example 2: Send Emails to New Leads
```bash
curl -X POST http://localhost:3000/api/leads/send-emails/new \
  -H "X-API-Key: your_admin_key" \
  -H "Content-Type: application/json" \
  -d '{
    "emailTemplate": "partnership",
    "limit": 50
  }'
```

### Example 3: Get Lead Statistics
```bash
curl http://localhost:3000/api/leads/stats/overview \
  -H "X-API-Key: your_admin_key"
```

---

## 📊 Database Schema

### Tables Created:
- **b2b_leads** - Lead information
- **email_campaigns** - Campaign tracking
- **email_logs** - Email delivery logs

### Key Fields:
- `email_sent` - Boolean
- `email_opened` - Boolean
- `email_clicked` - Boolean
- `status` - Lead status
- `source` - Where lead was found

---

## 🛡️ Best Practices

### 1. **Rate Limiting**
- SendGrid allows 100 emails/second
- Built-in delays prevent rate limiting
- Monitor SendGrid dashboard

### 2. **Email Compliance**
- Include unsubscribe option
- Respect opt-out requests
- Follow CAN-SPAM/GDPR guidelines

### 3. **Lead Quality**
- Review leads before sending
- Filter out invalid emails
- Enrich lead data

### 4. **Campaign Management**
- Start with small batches
- Test email templates
- Monitor open/click rates
- Adjust based on results

---

## 🔧 Configuration

### SendGrid Setup:
1. Verify sender email domain
2. Set up SPF/DKIM records
3. Create API key
4. Test email sending

### Scraping Sources:
Edit `src/services/leadScraperService.js`:
- Add new sources
- Customize scraping logic
- Adjust rate limits

---

## 📈 Analytics

### Track:
- Total leads generated
- Email sent count
- Email open rate
- Email click rate
- Conversion rate
- Source performance

### Access via API:
```bash
GET /api/leads/stats/overview
```

---

## 🚨 Troubleshooting

### No Leads Found?
- Check search query
- Verify scraping sources are accessible
- Check network connectivity
- Review logs

### Emails Not Sending?
- Verify SendGrid API key
- Check email format
- Review SendGrid dashboard
- Check rate limits

### Low Open Rates?
- Improve subject lines
- Personalize emails
- Test different templates
- Send at optimal times

---

## ✅ Features Summary

- ✅ **Web Scraping** - Google Business, Yellow Pages
- ✅ **Email Extraction** - From websites
- ✅ **SendGrid Integration** - Professional emails
- ✅ **Email Templates** - 3 ready-made templates
- ✅ **Lead Management** - Database storage
- ✅ **Campaign Tracking** - Email metrics
- ✅ **API Endpoints** - Full management API
- ✅ **Scheduled Jobs** - Automation support
- ✅ **Statistics** - Analytics and reporting

---

## 🎉 Ready to Use!

**Everything is built and integrated. Just:**
1. ✅ Add SendGrid API key
2. ✅ Configure email settings
3. ✅ Start generating leads
4. ✅ Send email campaigns

**Your B2B lead generation system is production-ready!** 🚀

