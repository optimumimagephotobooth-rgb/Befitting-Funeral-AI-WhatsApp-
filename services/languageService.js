/**
 * Multi-Language Support Service
 * Handles language detection and translation for English and Twi
 */

import { config } from '../config/config.js';

export class LanguageService {
  constructor() {
    this.supportedLanguages = ['en', 'tw']; // English, Twi
    this.defaultLanguage = 'en';
    
    // Common phrases in Twi
    this.translations = {
      tw: {
        greeting: "Akwaaba! Mepa wo kyɛw, ɛte sɛn?",
        thankYou: "Medaase",
        yes: "Aane",
        no: "Daabi",
        please: "Mepa wo kyɛw",
        sorry: "Kosrɛ",
        help: "Boa me",
        payment: "Sika a wode bɛtua",
        funeral: "Ayie",
        service: "Adwuma",
        price: "Titi",
        location: "Bea",
        date: "Ɛda",
        name: "Din",
        phone: "Fon",
        email: "Email",
        bank: "Bank",
        momo: "MoMo",
        deposit: "Sika a wode bɛtua",
        thankYouMessage: "Medaase sɛ wode wo sika maa yɛn. Yɛbɛyɛ adwuma no.",
        welcomeMessage: "Akwaaba wɔ Befitting Funeral Services mu. Yɛbɛboa wo.",
        paymentInstructions: "Sika a wode bɛtua no: MoMo: 0593240314 anaa Bank: Zenith Bank, Account: 6010820758"
      }
    };
  }

  /**
   * Detect language from message
   */
  detectLanguage(message) {
    if (!message || typeof message !== 'string') {
      return this.defaultLanguage;
    }

    const text = message.toLowerCase();
    
    // Twi keywords
    const twiKeywords = [
      'akwaaba', 'medaase', 'aane', 'daabi', 'mepa wo kyɛw',
      'kosrɛ', 'boa me', 'ayie', 'sika', 'titi', 'bea',
      'ɛda', 'din', 'fon', 'bank', 'momo'
    ];

    const twiCount = twiKeywords.filter(keyword => text.includes(keyword)).length;
    
    // If Twi keywords found, likely Twi
    if (twiCount >= 2) {
      return 'tw';
    }

    // Default to English
    return 'en';
  }

  /**
   * Translate common phrases
   */
  translate(phrase, language) {
    if (language === 'en' || !this.translations[language]) {
      return phrase;
    }

    const langTranslations = this.translations[language];
    return langTranslations[phrase.toLowerCase()] || phrase;
  }

  /**
   * Get language-specific greeting
   */
  getGreeting(language) {
    if (language === 'tw') {
      return "Akwaaba! Mepa wo kyɛw, ɛte sɛn?\n\nYɛyɛ Befitting Funeral Services. Yɛbɛboa wo wɔ bere a ɛyɛ den yi mu.\n\nWobɛtumi abisa yɛn fa:\n• Yɛn adwuma\n• Titi\n• Bere a ɛbɛyɛ\n• Bea\n\nYɛwɔ hɔ sɛ yɛbɛboa wo. 🙏";
    }
    
    return `Hello, and thank you for contacting Befitting Funeral Service. 

We understand this is a difficult time, and we're here to help you with compassion and care.

How can we assist you today? You can ask about:
• Our services (cremation, burial, memorial)
• Pricing and packages
• Scheduling a consultation
• Our location and hours
• Any other questions you may have

We're here to support you. 🙏`;
  }

  /**
   * Get language-specific payment instructions
   */
  getPaymentInstructions(amount, language) {
    if (language === 'tw') {
      return `💳 *Sika a wode bɛtua*

Sika a wode bɛtua: GHS ${amount}

*MoMo (Mobile Money):*
Nɔmba: ${config.service.momoNumber}
Din: ${config.service.momoName}

*Bank Transfer:*
Bank: ${config.service.bankName}
Account: ${config.service.bankAccount}
Din: ${config.service.bankAccountName}
Branch: ${config.service.bankBranch}

*Wɔ akyi no:*
1. Fa sika a wode bɛtua no kyerɛ yɛn
2. Ka sika a wode bɛtua no
3. Fa screenshot a (sɛ wopɛ)

Yɛbɛgye sika no na yɛbɛyɛ adwuma no. 🙏`;
    }

    return `💳 *Payment Instructions*

Amount: GHS ${amount}

*MoMo (Mobile Money):*
Number: ${config.service.momoNumber}
Name: ${config.service.momoName}

*Bank Transfer:*
Bank: ${config.service.bankName}
Account: ${config.service.bankAccount}
Name: ${config.service.bankAccountName}
Branch: ${config.service.bankBranch}

*After payment, please:*
1. Send payment confirmation message
2. Include amount paid
3. Send screenshot if possible (optional)

We'll confirm receipt and proceed with your arrangements. 🙏`;
  }

  /**
   * Get language-specific contact information
   */
  getContactInfo(language) {
    if (language === 'tw') {
      return `📞 *Nkyerɛkyerɛmu*

*${config.service.name}*
Fon: ${config.service.phone || '[Wo fon nɔmba]'}
Email: ${config.service.email}
🌐 ${config.service.website}

📍 *Bea*
${config.service.address}

🕐 *Bere a yɛyɛ adwuma*
${config.service.businessHours}

Yɛwɔ hɔ sɛ yɛbɛboa wo wɔ bere a ɛyɛ den yi mu. 🙏`;
    }

    return `📞 *Contact Information*

*${config.service.name}*
${config.service.phone || 'Phone: [Your Phone Number]'}
${config.service.email || 'Email: [Your Email]'}
🌐 ${config.service.website || 'Website: [Your Website]'}

📍 *Location*
${config.service.address || '[Your Address]'}

🕐 *Business Hours*
${config.service.businessHours}

We're here to help you during this difficult time. 🙏`;
  }

  /**
   * Store language preference for contact
   */
  async setLanguagePreference(contactId, language) {
    // TODO: Add language preference to contacts table
    // For now, store in conversation context
    return language;
  }

  /**
   * Get language preference for contact
   */
  async getLanguagePreference(contactId) {
    // TODO: Retrieve from database
    // For now, return default
    return this.defaultLanguage;
  }
}

export default LanguageService;

