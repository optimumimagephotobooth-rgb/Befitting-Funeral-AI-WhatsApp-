# Setup Guide - Befitting Funeral Service WhatsApp AI

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- WhatsApp account (personal or business)
- OpenAI API key (or alternative AI service)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_PHONE_NUMBER=your_phone_number

# AI Configuration
OPENAI_API_KEY=your_openai_api_key_here
AI_MODEL=gpt-4
AI_TEMPERATURE=0.7

# Service Configuration
SERVICE_NAME=Befitting Funeral Service
SERVICE_PHONE=+1234567890
SERVICE_EMAIL=befittingfuneralhome1@gmail.com
SERVICE_ADDRESS=123 Main Street, City, State ZIP
BUSINESS_HOURS=Monday - Friday: 9 AM - 5 PM\nSaturday: 10 AM - 2 PM\nSunday: Closed

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env` file

### 4. Run the Application

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

### 5. Connect WhatsApp

1. When you run the application, a QR code will appear in the terminal
2. Open WhatsApp on your phone
3. Go to Settings > Linked Devices
4. Tap "Link a Device"
5. Scan the QR code displayed in the terminal
6. Wait for "WhatsApp client is ready!" message

## Project Structure

```
BefittingFuneralService/
├── src/
│   ├── index.js                 # Main entry point
│   ├── whatsapp/
│   │   └── whatsappService.js   # WhatsApp integration
│   ├── ai/
│   │   └── aiService.js         # AI service handler
│   └── services/
│       └── messageHandler.js    # Message processing logic
├── config/                      # Configuration files (future)
├── docs/                        # Documentation (future)
├── sessions/                     # WhatsApp session data (auto-created)
├── .env                         # Environment variables (create from .env.example)
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies
├── README.md                    # Project overview
├── ROADMAP.md                   # Development roadmap
├── FEATURES.md                  # Feature list
└── SETUP.md                     # This file
```

## Testing

### Test the Connection

1. Send a message to the WhatsApp number connected to the bot
2. You should receive an automated response
3. Try asking: "Hello", "What services do you offer?", "What are your hours?"

### Test AI Responses

Try various questions:
- "Tell me about your services"
- "How much does cremation cost?"
- "I need to schedule a consultation"
- "What are your business hours?"

## Troubleshooting

### QR Code Not Appearing
- Make sure you have a stable internet connection
- Try deleting the `sessions/` folder and restarting
- Check that port 3000 is not already in use

### Messages Not Being Received
- Verify WhatsApp is properly connected (check terminal for "ready" message)
- Ensure the phone number sending messages is not blocked
- Check that the session is still valid

### AI Not Responding
- Verify your OpenAI API key is correct
- Check your OpenAI account has credits
- Review the error logs in the terminal

### Session Expired
- Delete the `sessions/` folder
- Restart the application
- Scan the QR code again

## Production Deployment

### Recommended Hosting Options

1. **Cloud Platforms**
   - AWS EC2 / Lambda
   - Google Cloud Platform
   - Azure
   - Heroku
   - Railway
   - Render

2. **VPS**
   - DigitalOcean
   - Linode
   - Vultr

### Environment Setup for Production

- Set `NODE_ENV=production`
- Use a process manager like PM2
- Set up proper logging
- Configure monitoring
- Use WhatsApp Business API for production (recommended)

### Using PM2

```bash
npm install -g pm2
pm2 start src/index.js --name "befitting-funeral-ai"
pm2 save
pm2 startup
```

## Security Considerations

- Never commit `.env` file to git
- Keep your OpenAI API key secure
- Use WhatsApp Business API for production
- Implement rate limiting
- Add authentication for webhook endpoints
- Regularly update dependencies

## Next Steps

1. Customize the AI system prompt in `src/ai/aiService.js`
2. Add your service information and pricing
3. Implement appointment scheduling (see ROADMAP.md)
4. Add payment integration
5. Set up analytics and reporting

## Support

For issues or questions:
- Check the ROADMAP.md for planned features
- Review FEATURES.md for available capabilities
- Check GitHub issues (if repository is public)

