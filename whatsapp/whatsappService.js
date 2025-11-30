import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { config } from '../config/config.js';

export class WhatsAppService {
  constructor() {
    this.client = null;
    this.messageHandlers = [];
  }

  async initialize() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: config.whatsapp.sessionPath
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    // QR code generation
    this.client.on('qr', (qr) => {
      console.log('📱 Scan this QR code with WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    // Ready event
    this.client.on('ready', () => {
      console.log('✅ WhatsApp client is ready!');
    });

    // Authentication
    this.client.on('authenticated', () => {
      console.log('✅ WhatsApp authenticated');
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      console.error('❌ Authentication failure:', msg);
    });

    // Disconnected
    this.client.on('disconnected', (reason) => {
      console.log('⚠️ WhatsApp disconnected:', reason);
    });

    // Message received
    this.client.on('message', async (message) => {
      // Ignore messages from status broadcasts
      if (message.from === 'status@broadcast') return;
      
      // Call all registered message handlers
      this.messageHandlers.forEach(handler => {
        handler(message);
      });
    });

    // Initialize the client
    await this.client.initialize();
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  async sendMessage(phoneNumber, message) {
    try {
      const chatId = phoneNumber.includes('@c.us') 
        ? phoneNumber 
        : `${phoneNumber}@c.us`;
      
      await this.client.sendMessage(chatId, message);
      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  async sendMessageWithOptions(phoneNumber, message, options = {}) {
    try {
      const chatId = phoneNumber.includes('@c.us') 
        ? phoneNumber 
        : `${phoneNumber}@c.us`;
      
      await this.client.sendMessage(chatId, message, options);
      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.destroy();
    }
  }

  isReady() {
    return this.client && this.client.info;
  }
}

