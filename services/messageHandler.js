import { Contact } from '../models/Contact.js';
import { Case } from '../models/Case.js';
import { Message } from '../models/Message.js';
import { Referral } from '../models/Referral.js';
import { config } from '../config/config.js';
import { detectStage, getStageContext, getStageTransitionAction } from './stageLogic.js';
import { 
  createThankYouWithReferral, 
  createShareableMessage, 
  createMemorialShareMessage,
  generateQRReferralLink 
} from './referralSystem.js';
import { LanguageService } from './languageService.js';
import { PaymentService } from './paymentService.js';
import { GriefSupportService } from './griefSupportService.js';
import { DocumentService } from './documentService.js';
import { FamilyCoordinationService } from './familyCoordinationService.js';
import { logger } from '../utils/logger.js';
import { messageQueue } from './messageQueue.js';
import { WhatsAppError } from '../utils/errorHandler.js';

export class MessageHandler {
  constructor(whatsappService, aiService) {
    this.whatsappService = whatsappService;
    this.aiService = aiService;
    this.conversations = new Map(); // Store conversation history
    this.languageService = new LanguageService();
    this.paymentService = new PaymentService();
    this.griefSupportService = new GriefSupportService();
    this.documentService = new DocumentService();
    this.familyCoordinationService = new FamilyCoordinationService();
    this.contactLanguages = new Map(); // Cache language preferences
  }

  async handleMessage(message) {
    // Add to queue for processing (non-blocking)
    try {
      messageQueue.add(message, async (msg) => {
        await this.processMessage(msg);
      });
    } catch (error) {
      logger.error('Error adding message to queue', error);
      // Fallback: process directly if queue fails
      await this.processMessage(message).catch(err => {
        logger.error('Error processing message directly', err);
      });
    }
  }

  async processMessage(message) {
    try {
      const phoneNumber = message.from.replace('@c.us', '');
      const userMessage = message.body;
      
      logger.debug('Processing message', { phoneNumber, messageLength: userMessage.length });
      
      // Skip if message is from a group or status
      if (message.from.includes('@g.us') || message.from === 'status@broadcast') {
        return;
      }

      logger.info(`Received message from ${phoneNumber}`, { messageLength: userMessage.length });

      // Detect language
      const detectedLanguage = this.languageService.detectLanguage(userMessage);
      this.contactLanguages.set(phoneNumber, detectedLanguage);
      if (detectedLanguage === 'tw') {
        logger.info('Language detected: Twi', { phoneNumber });
      }

      // Get or create contact in database
      let contact = await Contact.findByPhoneNumber(phoneNumber);
      if (!contact) {
        // Use profile name if available
        const contactName = message.profileName || message.contact?.profile?.name || null;
        contact = await Contact.create(phoneNumber, contactName);
        logger.success(`Created new contact: ${phoneNumber}${contactName ? ` (${contactName})` : ''}`);
      } else if (message.profileName && !contact.name) {
        // Update contact name if we have it and it's missing
        contact = await Contact.updateName(phoneNumber, message.profileName);
      }

      // Get or create active case for this contact
      let activeCase = await Case.findByContactId(contact.id);
      activeCase = activeCase.find(c => 
        c.status === 'NEW' || 
        c.status === 'INTAKE' || 
        c.status === 'QUOTE' || 
        c.status === 'DEPOSIT' || 
        c.status === 'DETAILS' || 
        c.status === 'IN_PROGRESS'
      ) || null;
      
      if (!activeCase) {
        activeCase = await Case.create(contact.id, { status: 'NEW' });
        logger.success(`Created new case: ${activeCase.case_ref}`);
      }

      // Check for referral code in message
      const referralMatch = userMessage.match(/\bREF-[A-Z0-9]+\b/i);
      if (referralMatch && activeCase.status === 'NEW') {
        const referralCode = referralMatch[0].toUpperCase();
        const referral = await Referral.findByCode(referralCode);
        if (referral && referral.status === 'PENDING') {
          await Referral.markAsUsed(referralCode, contact.id);
          logger.success(`Referral code used: ${referralCode}`);
          
          // Notify the referrer about the successful referral
          await this.notifyReferrer(referral.referrer_contact_id, referralCode);
          
          // Send welcome message to new customer mentioning referral
          const welcomeMessage = `Welcome! Thank you for using referral code ${referralCode}.\n\nYou'll receive special attention, and your referrer will receive their reward. How can we assist you today? 🙏`;
          const recipientNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
          await this.whatsappService.sendMessage(recipientNumber, welcomeMessage);
        }
      }

      // Detect stage transition
      const currentStage = activeCase.status || 'NEW';
      const newStage = detectStage(currentStage, userMessage);
      
      // Update case status if stage changed
      if (newStage !== currentStage) {
        await Case.update(activeCase.id, { status: newStage });
        activeCase.status = newStage;
        logger.info(`Stage transition: ${currentStage} -> ${newStage}`, { caseId: activeCase.id });
        
        // Get transition action (if any)
        const transitionAction = getStageTransitionAction(currentStage, newStage);
        if (transitionAction) {
          logger.debug(`Transition action: ${transitionAction.type}`, { from: currentStage, to: newStage });
        }

        // Send referral message when case is completed
        if (newStage === 'FOLLOWUP') {
          await this.sendReferralMessage(contact, activeCase);
        }
      }

      // Save inbound message to database
      await Message.create({
        case_id: activeCase.id,
        direction: 'INBOUND',
        from_number: phoneNumber,
        body: userMessage,
        raw: message
      });

      // Get conversation history from database
      const dbHistory = await Message.getConversationHistory(phoneNumber, 10);
      
      // Convert to AI format
      const conversationHistory = dbHistory.map(msg => ({
        role: msg.direction === 'INBOUND' ? 'user' : 'assistant',
        content: msg.body
      }));

      // Detect intent for potential special handling
      const intent = await this.aiService.detectIntent(userMessage);

      // Get language preference
      const language = this.contactLanguages.get(phoneNumber) || 'en';

      // Handle special intents
      if (intent === 'greeting') {
        await this.handleGreeting(phoneNumber, language);
        return;
      }

      if (intent === 'contact') {
        await this.handleContactRequest(phoneNumber, language);
        return;
      }

      // Handle payment detection in DEPOSIT stage
      if (activeCase.status === 'DEPOSIT') {
        const paymentDetection = await this.paymentService.autoDetectPayment(
          phoneNumber,
          activeCase.deposit_amount || activeCase.total_amount
        );
        
        if (paymentDetection.verified) {
          await this.paymentService.confirmPayment(activeCase.id, {
            amount: paymentDetection.amount,
            method: paymentDetection.method,
            paymentType: 'deposit'
          });
          
          const confirmationMessage = language === 'tw'
            ? `✅ *Sika a wode bɛtua no gyee!*\n\nMedaase! Yɛgyee sika a wode bɛtua no (GHS ${paymentDetection.amount}) firi ${paymentDetection.method}.\n\nWo case reference: *${activeCase.case_ref}*\n\nYɛbɛyɛ adwuma no. 🙏`
            : `✅ *Payment Confirmed*\n\nThank you! We've received your payment of GHS ${paymentDetection.amount} via ${paymentDetection.method}.\n\nYour case reference: *${activeCase.case_ref}*\n\nWe'll proceed with your arrangements. 🙏`;
          
          const recipientNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
          await this.whatsappService.sendMessage(recipientNumber, confirmationMessage);
          return;
        }
      }

      // Handle referral requests
      if (intent === 'referral' || 
          userMessage.toLowerCase().includes('referral') || 
          userMessage.toLowerCase().includes('refer') ||
          userMessage.toLowerCase().includes('share') ||
          userMessage.toLowerCase().includes('recommend')) {
        await this.handleReferralRequest(phoneNumber);
        return;
      }

      // Handle grief support requests
      const lowerMessage = userMessage.toLowerCase();
      if (lowerMessage.includes('support') ||
          (lowerMessage.includes('help') && 
          (lowerMessage.includes('grief') || lowerMessage.includes('sad') || lowerMessage.includes('difficult')))) {
        await this.handleGriefSupport(phoneNumber, activeCase, language, userMessage);
        return;
      }

      // Handle document checklist requests
      if (lowerMessage.includes('document') ||
          lowerMessage.includes('checklist') ||
          lowerMessage.includes('what do i need') ||
          lowerMessage.includes('papers') ||
          lowerMessage.includes('what documents')) {
        await this.handleDocumentChecklist(phoneNumber, activeCase, language, userMessage);
        return;
      }

      // Handle family coordination requests
      if (lowerMessage.includes('family') ||
          lowerMessage.includes('add family') ||
          lowerMessage.includes('coordinate') ||
          lowerMessage.includes('family member')) {
        await this.handleFamilyCoordination(phoneNumber, activeCase, language, userMessage);
        return;
      }

      // Build case context for AI
      const caseContext = {
        caseId: activeCase.id,
        caseRef: activeCase.case_ref,
        packageName: activeCase.package_name,
        estimatedTotal: activeCase.total_amount,
        depositAmount: activeCase.deposit_amount,
        deceasedName: activeCase.deceased_name,
        funeralDate: activeCase.funeral_date,
        location: activeCase.location,
        customerName: contact.name,
        website: config.service.website,
        momoNumber: config.service.momoNumber,
        momoName: config.service.momoName,
        bankName: config.service.bankName,
        bankAccount: config.service.bankAccount,
        bankAccountName: config.service.bankAccountName,
        bankBranch: config.service.bankBranch
      };

      // Generate AI response with stage context
      const stageContext = activeCase.status;
      const aiResponse = await this.aiService.generateResponse(
        userMessage,
        conversationHistory,
        stageContext,
        caseContext
      );

      // Send response (phoneNumber is already formatted without @c.us)
      // For webhook mode, send as-is; for whatsapp-web mode, add @c.us
      const recipientNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
      const sendResult = await this.whatsappService.sendMessage(
        recipientNumber, 
        aiResponse
      );

      if (sendResult.success) {
        // Save outbound message to database
        await Message.create({
          case_id: activeCase.id,
          direction: 'OUTBOUND',
          from_number: phoneNumber,
          body: aiResponse,
          raw: { sent_at: new Date().toISOString() }
        });
        logger.success(`Sent response to ${phoneNumber}`);
      } else {
        logger.error(`Failed to send message: ${sendResult.error}`, { phoneNumber });
      }

    } catch (error) {
      logger.error('Error handling message:', error);
      await this.whatsappService.sendMessage(
        message.from,
        'I apologize, but I encountered an error. Please contact us directly for assistance.'
      );
    }
  }

  async handleGreeting(phoneNumber, language = 'en') {
    const greeting = this.languageService.getGreeting(language);
    const recipientNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
    await this.whatsappService.sendMessage(recipientNumber, greeting);
  }

  async handleContactRequest(phoneNumber, language = 'en') {
    const contactInfo = this.languageService.getContactInfo(language);
    const recipientNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
    await this.whatsappService.sendMessage(recipientNumber, contactInfo);
  }

  async sendReferralMessage(contact, activeCase) {
    try {
      // Generate referral code for this contact
      const referralLink = generateQRReferralLink(contact.id);
      
      // Create referral message
      const referralMessage = createThankYouWithReferral(
        activeCase.case_ref,
        contact.name
      );

      const recipientNumber = contact.phone_number.includes('@') 
        ? contact.phone_number 
        : `${contact.phone_number}@c.us`;
      
      await this.whatsappService.sendMessage(recipientNumber, referralMessage);

      // Store referral code in database
      await Referral.create({
        referrer_contact_id: contact.id,
        referral_code: referralLink.code,
        status: 'PENDING'
      });

      logger.success(`Referral message sent to ${contact.phone_number}`);
    } catch (error) {
      logger.error('Error sending referral message:', error);
    }
  }

  async handleReferralRequest(phoneNumber) {
    try {
      const contact = await Contact.findByPhoneNumber(phoneNumber.replace('@c.us', ''));
      if (!contact) {
        return;
      }

      const referralLink = generateQRReferralLink(contact.id);
      const shareMessage = createShareableMessage(null, null);
      
      // Get referral stats
      const stats = await Referral.getReferralStats(contact.id);
      
      const message = `💝 *Your Referral Link*

Share Befitting Funeral Services with friends and family:

${referralLink.link}

Your referral code: *${referralLink.code}*

📱 Share via WhatsApp:
${referralLink.whatsappLink}

📊 Your Referral Stats:
• Total referrals: ${stats.total_referrals || 0}
• Successful: ${stats.successful_referrals || 0}
• Rewards earned: ${stats.rewards_earned || 0}

When someone uses your code, you both benefit! 🙏`;

      const recipientNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
      await this.whatsappService.sendMessage(recipientNumber, message);
    } catch (error) {
      logger.error('Error handling referral request:', error);
    }
  }

  async notifyReferrer(referrerContactId, referralCode) {
    try {
      const referrer = await Contact.findById(referrerContactId);
      if (!referrer) {
        logger.warn(`Referrer contact not found: ${referrerContactId}`);
        return;
      }

      const notificationMessage = `🎉 *Great News!*

Your referral code *${referralCode}* was used!

Thank you for recommending Befitting Funeral Services. 🙏

*Your Reward:*
• 5% discount on your next service
• Priority booking status
• Special appreciation

We'll apply your discount automatically when you need our services again.

Thank you for your trust and support! 💝`;

      const recipientNumber = referrer.phone_number.includes('@') 
        ? referrer.phone_number 
        : `${referrer.phone_number}@c.us`;
      
      await this.whatsappService.sendMessage(recipientNumber, notificationMessage);
      logger.success(`Referral notification sent to ${referrer.phone_number}`);
    } catch (error) {
      logger.error('Error notifying referrer:', error);
    }
  }

  async handleGriefSupport(phoneNumber, activeCase, language = 'en', messageText = '') {
    try {
      // Detect what kind of support is needed
      const supportTypes = this.griefSupportService.suggestSupport(messageText);
      
      const context = {
        stage: activeCase.status,
        hasChildren: messageText.toLowerCase().includes('child') || messageText.toLowerCase().includes('kid'),
        religion: this.detectReligion(messageText),
        immediateNeed: messageText.toLowerCase().includes('crisis') || messageText.toLowerCase().includes('emergency')
      };

      const resources = this.griefSupportService.getSupportResources(context);
      const message = this.griefSupportService.formatResourcesMessage(resources, language);

      const recipientNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
      await this.whatsappService.sendMessage(recipientNumber, message);
    } catch (error) {
      logger.error('Error handling grief support:', error);
    }
  }

  async handleDocumentChecklist(phoneNumber, activeCase, language = 'en', messageText = '') {
    try {
      const checklist = await this.documentService.getDocumentChecklist(activeCase.id);
      if (!checklist) {
        return;
      }

      // Check if user mentioned a specific document
      const mentionedDoc = this.documentService.detectDocument(messageText);
      if (mentionedDoc) {
        // Document received - update checklist
        const updateMessage = language === 'tw'
          ? `✅ Yɛgye ${mentionedDoc.name} no. Medaase! 🙏`
          : `✅ Received ${mentionedDoc.name}. Thank you! 🙏`;
        
        const recipientNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
        await this.whatsappService.sendMessage(recipientNumber, updateMessage);
        return;
      }

      // Send full checklist
      const message = this.documentService.formatChecklistMessage(checklist, language);
      const recipientNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
      await this.whatsappService.sendMessage(recipientNumber, message);
    } catch (error) {
      logger.error('Error handling document checklist:', error);
    }
  }

  async handleFamilyCoordination(phoneNumber, activeCase, language = 'en', messageText = '') {
    try {
      // Get existing family members
      const members = this.familyCoordinationService.getFamilyMembers(activeCase.id);
      
      // Check if user wants to add a family member (look for phone number in message)
      const phoneMatch = messageText.match(/\b\d{10,}\b/);
      if (phoneMatch) {
        // Add family member
        const result = await this.familyCoordinationService.addFamilyMember(
          activeCase.id,
          phoneMatch[0]
        );
        
        if (result.success) {
          const message = language === 'tw'
            ? `✅ Yɛde abusua foforo kaa case yi ho. Wɔn bɛnya nkyerɛkyerɛmu. 🙏`
            : `✅ Family member added. They will receive case updates. 🙏`;
          
          const recipientNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
          await this.whatsappService.sendMessage(recipientNumber, message);
        }
        return;
      }

      // Show coordination options
      const message = this.familyCoordinationService.formatCoordinationMessage(
        activeCase.case_ref,
        language
      );
      
      // If family members exist, show list
      if (members.length > 0) {
        const memberList = this.familyCoordinationService.formatFamilyList(members, language);
        const fullMessage = `${message}\n\n${memberList}`;
        const recipientNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
        await this.whatsappService.sendMessage(recipientNumber, fullMessage);
      } else {
        const recipientNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
        await this.whatsappService.sendMessage(recipientNumber, message);
      }
    } catch (error) {
      logger.error('Error handling family coordination:', error);
    }
  }

  detectReligion(messageText) {
    const text = messageText.toLowerCase();
    if (text.includes('church') || text.includes('christian') || text.includes('jesus') || text.includes('god')) {
      return 'Christian';
    }
    if (text.includes('mosque') || text.includes('islam') || text.includes('muslim') || text.includes('allah')) {
      return 'Muslim';
    }
    if (text.includes('traditional') || text.includes('custom') || text.includes('elder')) {
      return 'Traditional';
    }
    return null;
  }

  async handleWebhook(webhookData) {
    // Handle webhook-based WhatsApp API (like Twilio, etc.)
    // This would be implemented based on the specific webhook format
    logger.debug('Webhook received', { webhookData });
  }
}

