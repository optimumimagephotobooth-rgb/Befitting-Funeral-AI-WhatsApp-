# Deployment Guide - Befitting Funeral Service WhatsApp AI

## Deployment Options

### Option 1: Railway (Recommended - Easiest)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy from GitHub**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway auto-detects Node.js

3. **Add Environment Variables**
   - Go to Variables tab
   - Add all variables from `.env.example`
   - Railway provides HTTPS URL automatically

4. **Add PostgreSQL Database**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway provides `DATABASE_URL` automatically
   - Run schema: Connect via Railway CLI or use SQL tab

5. **Configure Webhook**
   - Copy Railway URL: `https://your-app.railway.app`
   - Set webhook URL in Meta Dashboard: `https://your-app.railway.app/webhook`

**Pros:** Free tier available, auto-deploy, built-in database  
**Cons:** Limited free tier resources

---

### Option 2: Render

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up

2. **Create Web Service**
   - New → Web Service
   - Connect GitHub repository
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node

3. **Add Environment Variables**
   - Go to Environment tab
   - Add all variables from `.env.example`

4. **Add PostgreSQL Database**
   - New → PostgreSQL
   - Render provides `DATABASE_URL` automatically
   - Run schema via Render SQL console

5. **Configure Webhook**
   - Render provides HTTPS URL automatically
   - Set webhook in Meta Dashboard

**Pros:** Free tier, easy setup, auto-deploy  
**Cons:** Free tier spins down after inactivity

---

### Option 3: Heroku

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   heroku login
   ```

2. **Create App**
   ```bash
   heroku create befitting-funeral-ai
   ```

3. **Add PostgreSQL**
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set OPENAI_API_KEY=your_key
   heroku config:set WHATSAPP_MODE=webhook
   # ... add all other variables
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

6. **Run Schema**
   ```bash
   heroku pg:psql < db/schema.sql
   ```

**Pros:** Well-established platform  
**Cons:** No free tier anymore

---

### Option 4: DigitalOcean App Platform

1. **Create Account**
   - Go to [digitalocean.com](https://digitalocean.com)

2. **Create App**
   - Apps → Create App
   - Connect GitHub repository
   - Auto-detects Node.js

3. **Add Database**
   - Add Managed Database → PostgreSQL
   - DigitalOcean provides connection string

4. **Configure Environment**
   - Add all environment variables
   - Set webhook URL

**Pros:** Reliable, scalable  
**Cons:** Paid (starts at $5/month)

---

### Option 5: AWS EC2 / Lightsail

1. **Launch Instance**
   - EC2 or Lightsail
   - Choose Ubuntu 22.04 LTS
   - Minimum: 1GB RAM

2. **SSH into Server**
   ```bash
   ssh ubuntu@your-server-ip
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Install PostgreSQL**
   ```bash
   sudo apt-get install postgresql postgresql-contrib
   ```

5. **Clone and Setup**
   ```bash
   git clone your-repo-url
   cd befitting-funeral-service
   npm install
   cp .env.example .env
   # Edit .env with your values
   ```

6. **Use PM2**
   ```bash
   npm install -g pm2
   pm2 start src/index.js --name befitting-ai
   pm2 save
   pm2 startup
   ```

7. **Setup Nginx (for HTTPS)**
   ```bash
   sudo apt-get install nginx certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

**Pros:** Full control, scalable  
**Cons:** More complex setup

---

## Environment Variables for Production

Make sure to set these in your hosting platform:

### Required:
- `OPENAI_API_KEY` - Your OpenAI API key
- `WHATSAPP_MODE=webhook` - Use webhook mode for production
- `WHATSAPP_PHONE_NUMBER_ID` - From Meta Dashboard
- `WHATSAPP_ACCESS_TOKEN` - From Meta Dashboard
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` - Your chosen token
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV=production`

### Recommended:
- `SERVICE_NAME` - Your service name
- `SERVICE_PHONE` - Your phone number
- `SERVICE_EMAIL` - Your email
- `SERVICE_ADDRESS` - Your address
- `BASE_URL` - Your production URL

---

## Database Setup in Production

### Option 1: Managed Database (Recommended)

Most platforms offer managed PostgreSQL:
- Railway: Built-in PostgreSQL
- Render: Managed PostgreSQL
- Heroku: Heroku Postgres
- DigitalOcean: Managed Databases
- AWS: RDS

### Option 2: Supabase (External)

1. Create Supabase project
2. Run `db/schema.sql` in SQL Editor
3. Get connection string from Settings
4. Add to environment variables

---

## Webhook Configuration

### Meta WhatsApp Cloud API Setup

1. **Get Credentials**
   - Go to [Meta for Developers](https://developers.facebook.com/)
   - Create app → Add WhatsApp product
   - Get Phone Number ID and Access Token

2. **Configure Webhook**
   - Go to WhatsApp → Configuration
   - Webhook URL: `https://your-domain.com/webhook`
   - Verify Token: (your `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
   - Subscribe to: `messages`

3. **Test Webhook**
   - Send test message
   - Check server logs for incoming webhook

---

## Monitoring & Logging

### Using PM2 (if self-hosting)

```bash
# View logs
pm2 logs befitting-ai

# Monitor
pm2 monit

# Restart
pm2 restart befitting-ai
```

### Using Platform Logs

Most platforms provide log viewing:
- Railway: Logs tab
- Render: Logs section
- Heroku: `heroku logs --tail`

---

## Health Checks

Your app includes a health endpoint:

```
GET /health
```

Returns:
```json
{
  "status": "ok",
  "service": "Befitting Funeral Service",
  "mode": "webhook",
  "version": "1.0.0"
}
```

Use this for:
- Health monitoring
- Uptime checks
- Load balancer health checks

---

## Scaling

### Horizontal Scaling

For high traffic:
1. Use load balancer
2. Deploy multiple instances
3. Use shared database
4. Use Redis for session storage (if needed)

### Vertical Scaling

Increase server resources:
- More RAM
- More CPU
- Better database tier

---

## Security Checklist

- [ ] Use HTTPS (required for webhooks)
- [ ] Keep environment variables secret
- [ ] Use strong webhook verify token
- [ ] Enable database SSL connections
- [ ] Regular dependency updates
- [ ] Monitor for security vulnerabilities
- [ ] Use rate limiting (consider adding)
- [ ] Backup database regularly

---

## Backup Strategy

### Database Backups

**Supabase:**
- Automatic daily backups
- Manual backups via dashboard

**Managed Databases:**
- Usually include automatic backups
- Check your provider's backup policy

**Self-hosted:**
```bash
# Daily backup script
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

---

## Troubleshooting Production Issues

### App Won't Start
- Check environment variables are set
- Verify database connection
- Check logs for errors

### Webhook Not Working
- Verify HTTPS is enabled
- Check webhook URL is accessible
- Verify token matches
- Check Meta Dashboard webhook status

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check database is accessible from server
- Verify SSL settings
- Check firewall rules

### High Memory Usage
- Consider upgrading server
- Check for memory leaks
- Optimize database queries
- Use connection pooling

---

## Support

For issues:
1. Check logs
2. Review [SETUP.md](./SETUP.md)
3. Check [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md)
4. Review [DATABASE.md](./DATABASE.md)

---

**Ready to deploy?** Choose a platform above and follow the steps! 🚀

