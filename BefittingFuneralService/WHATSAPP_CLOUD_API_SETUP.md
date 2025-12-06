# 📱 WhatsApp Cloud API Integration Guide

## ✅ Integration Complete!

Your WhatsApp Cloud API integration has been added to the existing system. The system now supports **three WhatsApp modes**:

1. **Web Mode** - WhatsApp Web.js (for development)
2. **Webhook Mode** - Meta WhatsApp Cloud API (existing)
3. **Cloud API Mode** - Direct Cloud API integration (NEW)

---

## 📁 Files Created/Updated

### New Files:
- ✅ `src/whatsapp/client.js` - WhatsApp Cloud API client
- ✅ `src/routes/whatsapp.js` - WhatsApp API routes

### Updated Files:
- ✅ `src/index.js` - Added WhatsApp routes
- ✅ `src/config/config.js` - Added WABA_ID config

---

## 🔧 Environment Variables

Add these to your `.env` file:

```env
# WhatsApp Cloud API Configuration
WHATSAPP_MODE=cloud                    # 'web', 'webhook', or 'cloud'
WHATSAPP_PHONE_NUMBER_ID=957595620760292
WHATSAPP_WABA_ID=1405376754332808
WHATSAPP_ACCESS_TOKEN=PASTE_YOUR_TOKEN_HERE
WHATSAPP_API_VERSION=v20.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=super_secret_token

# Server
PORT=3000
```

---

## 🌐 Webhook URL

**For Meta WhatsApp Cloud API Configuration:**

```
https://your-render-url.onrender.com/whatsapp/webhook
```

**Or for local testing (using ngrok):**

```
https://your-ngrok-url.ngrok.io/whatsapp/webhook
```

---

## 📡 API Endpoints

### 1. Webhook Verification
```
GET /whatsapp/webhook
```
Meta calls this to verify your webhook.

### 2. Webhook Receiver
```
POST /whatsapp/webhook
```
Meta sends incoming messages here.

### 3. Send Test Message
```
GET /whatsapp/send-test?to=233XXXXXXXXX&message=Hello
```
Test endpoint to send a WhatsApp message.

### 4. Send Message (API)
```
POST /whatsapp/send
Content-Type: application/json

{
  "to": "233XXXXXXXXX",
  "message": "Hello from API"
}
```

### 5. Status Check
```
GET /whatsapp/status
```
Check WhatsApp API configuration status.

---

## 🔄 Integration with Existing System

The WhatsApp Cloud API client integrates seamlessly with your existing message handler:

### When `WHATSAPP_MODE=cloud`:
- Uses `src/whatsapp/client.js` for sending messages
- Uses `src/routes/whatsapp.js` for webhook handling
- Messages are processed by `src/services/messageHandler.js`
- All existing features work (AI, database, analytics, etc.)

### Backward Compatibility:
- Legacy `/webhook` endpoints still work
- Existing webhook mode (`WHATSAPP_MODE=webhook`) still supported
- WhatsApp Web mode (`WHATSAPP_MODE=web`) still supported

---

## 📝 Usage Examples

### Send Message via API:
```bash
curl -X POST http://localhost:3000/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "233XXXXXXXXX",
    "message": "Hello from WhatsApp Cloud API"
  }'
```

### Test Endpoint:
```bash
curl "http://localhost:3000/whatsapp/send-test?to=233XXXXXXXXX&message=Test"
```

### Check Status:
```bash
curl http://localhost:3000/whatsapp/status
```

---

## 🔐 Security Notes

1. **Access Token**: Keep your `WHATSAPP_ACCESS_TOKEN` secure
2. **Verify Token**: Use a strong `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
3. **HTTPS**: Webhook URL must use HTTPS in production
4. **Rate Limiting**: Already implemented via middleware

---

## 🎯 Phone Number Format

The client automatically formats phone numbers:
- Removes all non-digits
- Adds Ghana country code (233) if missing
- Removes leading 0 and adds 233

**Examples:**
- `0593240314` → `233593240314`
- `233593240314` → `233593240314` (unchanged)
- `+233 59 324 0314` → `233593240314`

---

## ✅ Features Included

### Client Functions:
- ✅ `sendWhatsAppText()` - Send text messages
- ✅ `sendWhatsAppTemplate()` - Send template messages
- ✅ `sendWhatsAppMedia()` - Send media (image, video, audio, document)

### Routes:
- ✅ Webhook verification
- ✅ Webhook receiver
- ✅ Test endpoint
- ✅ Send message API
- ✅ Status check

### Integration:
- ✅ Works with existing message handler
- ✅ Database logging
- ✅ Analytics tracking
- ✅ Error handling
- ✅ Logging

---

## 🚀 Quick Start

1. **Add environment variables** to `.env`
2. **Configure webhook** in Meta Business Manager:
   - URL: `https://your-domain.com/whatsapp/webhook`
   - Verify Token: Your `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
3. **Start server**: `npm start`
4. **Test**: `GET /whatsapp/send-test?to=233XXXXXXXXX&message=Hello`

---

## 📊 System Flow

```
Meta WhatsApp Cloud API
    ↓
POST /whatsapp/webhook
    ↓
src/routes/whatsapp.js (handleWebhook)
    ↓
src/services/messageHandler.js
    ↓
AI Processing + Database
    ↓
Response via src/whatsapp/client.js
    ↓
Meta WhatsApp Cloud API
```

---

## 🔍 Troubleshooting

### Webhook Verification Fails:
- Check `WHATSAPP_WEBHOOK_VERIFY_TOKEN` matches Meta config
- Ensure webhook URL is accessible (HTTPS required)

### Messages Not Sending:
- Verify `WHATSAPP_ACCESS_TOKEN` is valid
- Check `WHATSAPP_PHONE_NUMBER_ID` is correct
- Ensure phone number format is correct

### 401 Unauthorized:
- Access token expired or invalid
- Regenerate token in Meta Business Manager

### 403 Forbidden:
- Phone number ID doesn't match
- Check WABA_ID configuration

---

## 📚 Additional Resources

- [Meta WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Webhook Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates)

---

## ✅ Integration Status

**Status:** ✅ **COMPLETE AND READY**

- ✅ Client created
- ✅ Routes created
- ✅ Webhook handlers updated
- ✅ Config updated
- ✅ Integration verified
- ✅ Documentation complete

**Your WhatsApp Cloud API integration is ready to use!** 🚀

