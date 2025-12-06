# WhatsApp Integration Setup Guide

This project supports **two different WhatsApp integration methods**:

1. **WhatsApp Web** (whatsapp-web.js) - For personal/testing use
2. **WhatsApp Business API** (Webhook) - For production use

## Option 1: WhatsApp Web (Development/Testing)

Best for: Development, testing, personal use

### Setup Steps:

1. **Set environment variables:**
   ```env
   WHATSAPP_MODE=  # Leave empty or don't set
   WHATSAPP_SESSION_PATH=./sessions
   ```

2. **Run the application:**
   ```bash
   npm start
   ```

3. **Scan QR Code:**
   - A QR code will appear in the terminal
   - Open WhatsApp on your phone
   - Go to Settings > Linked Devices
   - Scan the QR code

### Pros:
- ✅ Free to use
- ✅ Easy setup
- ✅ No API keys needed
- ✅ Good for development

### Cons:
- ❌ Not suitable for production
- ❌ Requires phone to stay connected
- ❌ Can be disconnected if phone goes offline

---

## Option 2: WhatsApp Business API (Production)

Best for: Production, business use, scalability

### Prerequisites:

You need a **Meta Business Account** and **WhatsApp Business API** access. You can get this through:

- **Meta (Facebook) directly** - [Meta for Developers](https://developers.facebook.com/docs/whatsapp)
- **Twilio** - [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)
- **Other providers** - Many cloud providers offer WhatsApp Business API

### Setup Steps:

#### Using Meta WhatsApp Cloud API:

1. **Create Meta App:**
   - Go to [Meta for Developers](https://developers.facebook.com/)
   - Create a new app
   - Add "WhatsApp" product
   - Get your Phone Number ID and Access Token

2. **Set up Webhook:**
   - In Meta App Dashboard, go to WhatsApp > Configuration
   - Set Webhook URL: `https://your-domain.com/webhook`
   - Set Verify Token: (choose a secure token)
   - Subscribe to `messages` field

3. **Set environment variables:**
   ```env
   WHATSAPP_MODE=webhook
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_ACCESS_TOKEN=your_access_token
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token_here
   WHATSAPP_API_VERSION=v18.0
   WEBHOOK_URL=https://your-domain.com/webhook
   ```

4. **Deploy your application:**
   - Deploy to a server with HTTPS (required for webhooks)
   - Make sure the webhook URL is publicly accessible
   - Meta will verify the webhook on first setup

#### Using Twilio:

1. **Set up Twilio Account:**
   - Create account at [Twilio](https://www.twilio.com/)
   - Get WhatsApp-enabled phone number
   - Get Account SID and Auth Token

2. **Configure Twilio Webhook:**
   - In Twilio Console, set webhook URL
   - Point to: `https://your-domain.com/webhook`

3. **Update webhook handler** to support Twilio format (if needed)

### Pros:
- ✅ Production-ready
- ✅ Scalable
- ✅ No phone connection required
- ✅ Official API support
- ✅ Better reliability

### Cons:
- ❌ Requires Meta Business Account
- ❌ May have costs (depends on provider)
- ❌ More complex setup
- ❌ Requires HTTPS domain

---

## Webhook Verification

When using webhook mode, Meta will verify your webhook:

1. **GET Request:** Meta sends a GET request to `/webhook` with:
   - `hub.mode=subscribe`
   - `hub.verify_token=your_token`
   - `hub.challenge=random_string`

2. **Response:** Your server must return the `hub.challenge` value

3. **Verification:** If tokens match, webhook is verified

The `verifyWebhook` function handles this automatically.

---

## Message Flow

### WhatsApp Web Mode:
```
User sends message → WhatsApp Web → whatsapp-web.js → MessageHandler → AI → Response
```

### Webhook Mode:
```
User sends message → WhatsApp Business API → Webhook → MessageHandler → AI → API → Response
```

---

## Testing Webhook Locally

For local development with webhooks, use a tunneling service:

1. **ngrok:**
   ```bash
   ngrok http 3000
   ```
   Use the HTTPS URL as your webhook URL

2. **localtunnel:**
   ```bash
   npx localtunnel --port 3000
   ```

3. **Cloudflare Tunnel:**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

---

## Environment Variables Summary

### For WhatsApp Web:
```env
# Leave WHATSAPP_MODE empty or don't set it
WHATSAPP_SESSION_PATH=./sessions
```

### For WhatsApp Business API:
```env
WHATSAPP_MODE=webhook
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAABwzLix...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=my_secure_token_123
WHATSAPP_API_VERSION=v18.0
WEBHOOK_URL=https://your-domain.com/webhook
```

---

## Troubleshooting

### WhatsApp Web Issues:

**QR Code not appearing:**
- Check internet connection
- Delete `sessions/` folder and restart
- Make sure port is not blocked

**Messages not received:**
- Verify phone is connected to internet
- Check WhatsApp is linked
- Restart the application

### Webhook Issues:

**Webhook verification failing:**
- Check `WHATSAPP_WEBHOOK_VERIFY_TOKEN` matches Meta settings
- Ensure server is accessible via HTTPS
- Check server logs for errors

**Messages not being received:**
- Verify webhook is subscribed to `messages` field
- Check webhook URL is correct in Meta dashboard
- Ensure server is running and accessible
- Check server logs for incoming requests

**Can't send messages:**
- Verify `WHATSAPP_ACCESS_TOKEN` is valid
- Check `WHATSAPP_PHONE_NUMBER_ID` is correct
- Ensure phone number is approved for sending
- Check API rate limits

---

## Switching Between Modes

To switch modes, simply change the `WHATSAPP_MODE` environment variable:

- **WhatsApp Web:** Don't set or set to empty
- **Webhook:** Set to `webhook`

The application will automatically use the correct integration method.

