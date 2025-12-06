# 🚀 Quick Start Guide - Befitting Funeral Service WhatsApp AI

Get up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- (Optional) PostgreSQL database or Supabase account

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
OPENAI_API_KEY=sk-your-key-here
```

## Step 3: Choose WhatsApp Integration Mode

### Option A: WhatsApp Web (Development/Testing)

Leave `WHATSAPP_MODE` empty or don't set it. This uses WhatsApp Web.

**Pros:** Free, easy setup, good for testing  
**Cons:** Requires phone connection, not for production

### Option B: WhatsApp Business API (Production)

Set in `.env`:
```env
WHATSAPP_MODE=webhook
WHATSAPP_PHONE_NUMBER_ID=your_number_id
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
```

**Pros:** Production-ready, scalable  
**Cons:** Requires Meta Business account

See [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md) for detailed setup.

## Step 4: (Optional) Set Up Database

### Using Supabase (Recommended - Free Tier Available)

1. Go to [supabase.com](https://supabase.com) and create account
2. Create new project
3. Go to SQL Editor
4. Copy contents of `db/schema.sql` and run it
5. Go to Settings > Database
6. Copy connection string
7. Add to `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   ```

### Using Local PostgreSQL

1. Install PostgreSQL
2. Create database: `CREATE DATABASE befitting_funeral_db;`
3. Add to `.env`:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/befitting_funeral_db
   ```

**Note:** App works without database, but case tracking and message history won't be saved.

## Step 5: Run the Application

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

## Step 6: Connect WhatsApp

### If using WhatsApp Web mode:

1. QR code will appear in terminal
2. Open WhatsApp on your phone
3. Go to Settings > Linked Devices
4. Tap "Link a Device"
5. Scan the QR code
6. Wait for "WhatsApp client is ready!" message

### If using Webhook mode:

1. Deploy your app to a server with HTTPS
2. Configure webhook in Meta Dashboard:
   - URL: `https://your-domain.com/webhook`
   - Verify Token: (your `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
   - Subscribe to `messages` field

## Step 7: Test It!

Send a WhatsApp message to your connected number:

- "Hello" - Should get a greeting
- "What services do you offer?" - Should get service information
- "How much does it cost?" - Should get pricing

## Troubleshooting

### QR Code Not Appearing
- Check internet connection
- Delete `sessions/` folder and restart
- Make sure port 3000 is available

### OpenAI API Errors
- Verify your API key is correct
- Check you have credits in your OpenAI account
- Try a different model (e.g., `gpt-3.5-turbo`)

### Database Connection Errors
- Verify DATABASE_URL is correct
- Check database is accessible
- For Supabase: Check password is URL-encoded

### Messages Not Received
- **WhatsApp Web:** Check phone is connected to internet
- **Webhook:** Verify webhook URL is accessible and verified

## Next Steps

- Customize service information in `.env`
- Add your MoMo and bank payment details
- Review [FEATURES.md](./FEATURES.md) for available features
- Check [ROADMAP.md](./ROADMAP.md) for planned enhancements

## Need Help?

- Check [SETUP.md](./SETUP.md) for detailed setup
- Review [DATABASE.md](./DATABASE.md) for database setup
- See [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md) for WhatsApp configuration

## Production Deployment

For production, see deployment options in [SETUP.md](./SETUP.md#production-deployment).

---

**That's it!** Your WhatsApp AI assistant is ready! 🎉

