/**
 * Referral System for Befitting Funeral Service
 * Features designed to generate referrals and word-of-mouth marketing
 */

import { Contact } from '../models/Contact.js';
import { Case } from '../models/Case.js';
import { config } from '../config/config.js';

/**
 * Generate referral message with personalized link
 */
export function generateReferralMessage(contactId, contactName) {
  const referralCode = generateReferralCode(contactId);
  const referralLink = `${config.service.website}/referral/${referralCode}`;
  
  return `🙏 Thank you for choosing Befitting Funeral Services!

We're grateful for your trust during this difficult time.

💝 *Refer a Friend Program*

Know someone who might need our services? Share this link and both you and your friend will benefit:

${referralLink}

Your referral code: *${referralCode}*

When someone uses your code, you'll receive:
• 5% discount on future services
• Priority support
• Special appreciation gift

Share with friends and family who might need our compassionate services. 🙏`;
}

/**
 * Generate referral code from contact ID
 */
function generateReferralCode(contactId) {
  // Use last 8 characters of UUID + contact phone last 4 digits
  const uuidPart = contactId.replace(/-/g, '').substring(0, 8).toUpperCase();
  return `REF-${uuidPart}`;
}

/**
 * Create shareable message for WhatsApp
 */
export function createShareableMessage(caseRef, deceasedName) {
  const shareText = `In loving memory of ${deceasedName || 'our loved one'}

We're working with Befitting Funeral Services for compassionate and professional funeral arrangements.

If you know someone who might need their services, please share:

🌐 ${config.service.website}
📱 WhatsApp: ${config.service.phone || 'Contact us'}
📧 ${config.service.email}

*Befitting Funeral Services*
📍 ${config.service.address}
💝 Compassionate care when you need it most

#BefittingFuneralServices #Accra #Ghana`;
  
  return shareText;
}

/**
 * Generate memorial sharing message
 */
export function createMemorialShareMessage(caseRef, deceasedName, funeralDate, location) {
  return `📅 *Memorial Service Invitation*

In loving memory of
*${deceasedName}*

📅 Date: ${funeralDate || 'TBA'}
📍 Location: ${location || 'TBA'}

Arranged by Befitting Funeral Services
🌐 ${config.service.website}

Please share with family and friends who would like to pay their respects. 🙏`;
}

/**
 * Create thank you message with referral incentive
 */
export function createThankYouWithReferral(caseRef, contactName) {
  const referralCode = generateReferralCode(caseRef);
  
  return `🙏 *Thank You, ${contactName || 'Valued Client'}!*

We're honored to have served you during this difficult time.

Your case reference: *${caseRef}*

💝 *Special Offer - Refer a Friend*

Share Befitting Funeral Services with others and receive:
• 5% discount on future services
• Priority booking
• Special appreciation

Your unique referral code: *${referralCode}*

Share this link: ${config.service.website}/referral/${referralCode}

Or simply tell friends to mention your name when they contact us!

Thank you for trusting us. 🙏`;
}

/**
 * Create social sharing message
 */
export function createSocialShareMessage() {
  return `🌟 *Befitting Funeral Services*

Compassionate funeral services in Accra, Ghana

✅ Professional & caring
✅ Transparent pricing
✅ Flexible payment options
✅ Complete service coordination

📱 WhatsApp: ${config.service.phone || 'Contact us'}
🌐 ${config.service.website}
📧 ${config.service.email}

*Share with anyone who might need our services*

#BefittingFuneralServices #Accra #Ghana #FuneralServices`;
}

/**
 * Generate QR code referral link
 */
export function generateQRReferralLink(contactId) {
  const referralCode = generateReferralCode(contactId);
  return {
    code: referralCode,
    link: `${config.service.website}/referral/${referralCode}`,
    whatsappLink: `https://wa.me/?text=${encodeURIComponent(`I recommend Befitting Funeral Services. Use my referral code: ${referralCode}. Visit: ${config.service.website}/referral/${referralCode}`)}`
  };
}

/**
 * Check if referral code is valid and track referral
 */
export async function processReferral(referralCode, newContactId) {
  try {
    // Extract contact ID from referral code
    // This is a simplified version - you'd want to store referral codes in DB
    const referrerId = extractContactIdFromCode(referralCode);
    
    if (referrerId) {
      // Track referral in database (would need referrals table)
      // await Referral.create({ referrerId, referredId: newContactId, code: referralCode });
      
      return {
        success: true,
        referrerId,
        message: "Referral code applied! Thank you for the referral."
      };
    }
    
    return { success: false, message: "Invalid referral code" };
  } catch (error) {
    console.error('Error processing referral:', error);
    return { success: false, message: "Error processing referral" };
  }
}

function extractContactIdFromCode(code) {
  // Simplified - in production, store codes in database
  // This would need proper implementation with database lookup
  return null;
}

export default {
  generateReferralMessage,
  createShareableMessage,
  createMemorialShareMessage,
  createThankYouWithReferral,
  createSocialShareMessage,
  generateQRReferralLink,
  processReferral
};

