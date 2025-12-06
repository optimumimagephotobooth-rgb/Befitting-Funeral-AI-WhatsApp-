/**
 * Payment Confirmation Service
 * Handles payment verification and confirmation for MoMo and Bank transfers
 */

import { Case } from '../models/Case.js';
import { Message } from '../models/Message.js';
import { Contact } from '../models/Contact.js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

export class PaymentService {
  /**
   * Verify MoMo payment (placeholder - integrate with actual MoMo API)
   * In production, integrate with:
   * - MTN Mobile Money API
   * - Vodafone Cash API
   * - AirtelTigo Money API
   */
  async verifyMoMoPayment(phoneNumber, amount, transactionId = null) {
    try {
      // TODO: Integrate with actual MoMo API
      // For now, this is a placeholder that checks for payment confirmation messages
      
      // Check if user sent payment confirmation
      const recentMessages = await Message.findByPhoneNumber(phoneNumber, 5);
      const paymentKeywords = ['paid', 'sent', 'transferred', 'payment done', 'momo sent'];
      
      for (const msg of recentMessages) {
        const lowerBody = msg.body.toLowerCase();
        if (paymentKeywords.some(keyword => lowerBody.includes(keyword))) {
          // Check if amount mentioned matches
          const amountMatch = lowerBody.match(/ghs?\s*(\d+[.,]?\d*)/i) || 
                             lowerBody.match(/(\d+[.,]?\d*)\s*ghs?/i);
          
          if (amountMatch) {
            const mentionedAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
            const expectedAmount = parseFloat(amount);
            
            // Allow 10% variance for rounding
            if (Math.abs(mentionedAmount - expectedAmount) <= expectedAmount * 0.1) {
              return {
                verified: true,
                amount: mentionedAmount,
                method: 'MoMo',
                transactionId: transactionId || 'MANUAL',
                verifiedAt: new Date()
              };
            }
          }
        }
      }
      
      return {
        verified: false,
        message: 'Payment not yet confirmed. Please send payment confirmation or screenshot.'
      };
    } catch (error) {
      logger.error('Error verifying MoMo payment:', error);
      return {
        verified: false,
        error: error.message
      };
    }
  }

  /**
   * Verify bank transfer payment
   */
  async verifyBankTransfer(phoneNumber, amount, referenceNumber = null) {
    try {
      // TODO: Integrate with bank API for automatic verification
      // For now, check for confirmation messages
      
      const recentMessages = await Message.findByPhoneNumber(phoneNumber, 5);
      const bankKeywords = ['bank transfer', 'transferred', 'sent to bank', 'bank payment'];
      
      for (const msg of recentMessages) {
        const lowerBody = msg.body.toLowerCase();
        if (bankKeywords.some(keyword => lowerBody.includes(keyword))) {
          const amountMatch = lowerBody.match(/ghs?\s*(\d+[.,]?\d*)/i) || 
                             lowerBody.match(/(\d+[.,]?\d*)\s*ghs?/i);
          
          if (amountMatch) {
            const mentionedAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
            const expectedAmount = parseFloat(amount);
            
            if (Math.abs(mentionedAmount - expectedAmount) <= expectedAmount * 0.1) {
              return {
                verified: true,
                amount: mentionedAmount,
                method: 'Bank Transfer',
                referenceNumber: referenceNumber || 'MANUAL',
                verifiedAt: new Date()
              };
            }
          }
        }
      }
      
      return {
        verified: false,
        message: 'Bank transfer not yet confirmed. Please provide transfer reference number.'
      };
    } catch (error) {
      logger.error('Error verifying bank transfer:', error);
      return {
        verified: false,
        error: error.message
      };
    }
  }

  /**
   * Request payment confirmation from customer
   */
  async requestPaymentConfirmation(caseId, amount, paymentType = 'deposit') {
    try {
      const activeCase = await Case.findById(caseId);
      if (!activeCase) {
        throw new Error('Case not found');
      }

      const contact = await Contact.findById(activeCase.contact_id);
      if (!contact) {
        throw new Error('Contact not found');
      }

      const paymentInstructions = this.getPaymentInstructions(amount, paymentType);
      
      return {
        success: true,
        message: paymentInstructions,
        amount,
        paymentType
      };
    } catch (error) {
      logger.error('Error requesting payment confirmation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get payment instructions based on payment type
   */
  getPaymentInstructions(amount, paymentType = 'deposit') {
    const momoInfo = config.service.momoNumber && config.service.momoName
      ? `*MoMo (Mobile Money):*\nNumber: ${config.service.momoNumber}\nName: ${config.service.momoName}`
      : '';
    
    const bankInfo = config.service.bankName && config.service.bankAccount
      ? `\n\n*Bank Transfer:*\nBank: ${config.service.bankName}\nAccount: ${config.service.bankAccount}\nName: ${config.service.bankAccountName}\nBranch: ${config.service.bankBranch}`
      : '';

    return `💳 *Payment Instructions*

${paymentType === 'deposit' ? `Deposit Amount: GHS ${amount}` : `Total Amount: GHS ${amount}`}

${momoInfo}${bankInfo}

*After payment, please:*
1. Send payment confirmation message
2. Include amount paid
3. Send screenshot if possible (optional)

We'll confirm receipt and proceed with your arrangements. 🙏`;
  }

  /**
   * Confirm payment and update case
   */
  async confirmPayment(caseId, paymentDetails) {
    try {
      const activeCase = await Case.findById(caseId);
      if (!activeCase) {
        throw new Error('Case not found');
      }

      // Update case with payment information
      const updateData = {};
      if (paymentDetails.paymentType === 'deposit') {
        updateData.deposit_amount = paymentDetails.amount;
      } else {
        updateData.total_amount = paymentDetails.amount;
      }

      await Case.update(caseId, updateData);
      logger.success(`Payment confirmed for case ${activeCase.case_ref}`);

      // Return confirmation message (will be sent by caller)
      const confirmationMessage = `✅ *Payment Confirmed*

Thank you! We've received your payment of GHS ${paymentDetails.amount} via ${paymentDetails.method}.

Your case reference: *${activeCase.case_ref}*

We'll proceed with your arrangements. You'll receive updates shortly.

If you have any questions, feel free to ask. 🙏`;

      return {
        success: true,
        message: confirmationMessage,
        caseRef: activeCase.case_ref
      };
    } catch (error) {
      logger.error('Error confirming payment', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check for payment in recent messages and auto-confirm
   */
  async autoDetectPayment(phoneNumber, expectedAmount) {
    try {
      // Try MoMo first
      const momoResult = await this.verifyMoMoPayment(phoneNumber, expectedAmount);
      if (momoResult.verified) {
        return momoResult;
      }

      // Try bank transfer
      const bankResult = await this.verifyBankTransfer(phoneNumber, expectedAmount);
      if (bankResult.verified) {
        return bankResult;
      }

      return {
        verified: false,
        message: 'Payment not detected. Please send confirmation.'
      };
    } catch (error) {
      logger.error('Error auto-detecting payment:', error);
      return {
        verified: false,
        error: error.message
      };
    }
  }
}

export default PaymentService;

