/**
 * Family Coordination Hub Service
 * Helps coordinate with multiple family members via WhatsApp
 * Respects family dynamics and sensitive situations
 */

import { Case } from '../models/Case.js';
import { Contact } from '../models/Contact.js';
import { Message } from '../models/Message.js';

export class FamilyCoordinationService {
  constructor() {
    // In-memory storage for family members per case
    // In production, store in database
    this.familyMembers = new Map(); // caseId -> [phoneNumbers]
    this.caseCoordinators = new Map(); // caseId -> primaryPhoneNumber
  }

  /**
   * Add family member to case
   */
  async addFamilyMember(caseId, phoneNumber, name = null, relationship = null) {
    try {
      if (!this.familyMembers.has(caseId)) {
        this.familyMembers.set(caseId, []);
      }

      const members = this.familyMembers.get(caseId);
      
      // Check if already added
      if (members.find(m => m.phoneNumber === phoneNumber)) {
        return {
          success: false,
          message: 'Family member already added'
        };
      }

      // Add family member
      members.push({
        phoneNumber,
        name,
        relationship,
        addedAt: new Date()
      });

      this.familyMembers.set(caseId, members);

      return {
        success: true,
        message: 'Family member added successfully',
        totalMembers: members.length
      };
    } catch (error) {
      console.error('Error adding family member:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get family members for a case
   */
  getFamilyMembers(caseId) {
    return this.familyMembers.get(caseId) || [];
  }

  /**
   * Set primary coordinator for case
   */
  setCoordinator(caseId, phoneNumber) {
    this.caseCoordinators.set(caseId, phoneNumber);
    return {
      success: true,
      coordinator: phoneNumber
    };
  }

  /**
   * Send update to all family members
   */
  async sendUpdateToFamily(caseId, updateMessage, whatsappService) {
    try {
      const members = this.getFamilyMembers(caseId);
      const activeCase = await Case.findById(caseId);

      if (!activeCase) {
        return {
          success: false,
          error: 'Case not found'
        };
      }

      const message = `📢 *Case Update: ${activeCase.case_ref}*\n\n${updateMessage}\n\nThis update has been sent to all family members involved in this case.`;

      // Send to all family members
      const results = [];
      for (const member of members) {
        try {
          const recipientNumber = member.phoneNumber.includes('@') 
            ? member.phoneNumber 
            : `${member.phoneNumber}@c.us`;
          
          await whatsappService.sendMessage(recipientNumber, message);
          results.push({
            phoneNumber: member.phoneNumber,
            success: true
          });
        } catch (error) {
          results.push({
            phoneNumber: member.phoneNumber,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        sentTo: results.filter(r => r.success).length,
        totalMembers: members.length,
        results
      };
    } catch (error) {
      console.error('Error sending family update:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format family coordination message
   */
  formatCoordinationMessage(caseRef, language = 'en') {
    if (language === 'tw') {
      return `👨‍👩‍👧‍👦 *Abusua Nhyɛmu*\n\nSɛ wopɛ sɛ wofrɛ abusua foforo a wɔn nso wɔ case yi ho, fa wɔn fon nɔmba kyerɛ yɛn.\n\nYɛbɛma wɔn nso nkyerɛkyerɛmu. 🙏`;
    }

    return `👨‍👩‍👧‍👦 *Family Coordination*\n\nWe can help coordinate with family members.\n\n*Options:*\n• Add family members to receive updates\n• Share case information with family\n• Coordinate decisions together\n• Track who's handling what\n\nTo add a family member, send their phone number and we'll add them to this case.\n\n*Privacy:* Only family members you approve will receive updates. 🙏`;
  }

  /**
   * Format family member list
   */
  formatFamilyList(members, language = 'en') {
    if (members.length === 0) {
      return language === 'tw'
        ? "Wonni abusua foforo a wɔn nso wɔ case yi ho."
        : "No additional family members added yet.";
    }

    if (language === 'tw') {
      let message = `👨‍👩‍👧‍👦 *Abusua a Wɔ Case Yi Ho*\n\n`;
      members.forEach((member, index) => {
        message += `${index + 1}. ${member.name || member.phoneNumber}`;
        if (member.relationship) {
          message += ` (${member.relationship})`;
        }
        message += `\n   📱 ${member.phoneNumber}\n\n`;
      });
      return message;
    }

    let message = `👨‍👩‍👧‍👦 *Family Members on This Case*\n\n`;
    members.forEach((member, index) => {
      message += `${index + 1}. ${member.name || 'Family Member'}`;
      if (member.relationship) {
        message += ` (${member.relationship})`;
      }
      message += `\n   📱 ${member.phoneNumber}\n\n`;
    });
    message += "All these family members will receive case updates. 🙏";

    return message;
  }

  /**
   * Track decision/approval
   */
  async trackDecision(caseId, decision, approvedBy, whatsappService) {
    try {
      const activeCase = await Case.findById(caseId);
      if (!activeCase) {
        return { success: false, error: 'Case not found' };
      }

      // Store decision (in production, use database)
      const decisionMessage = `✅ *Decision Recorded*\n\n*Decision:* ${decision}\n*Approved by:* ${approvedBy}\n*Case:* ${activeCase.case_ref}\n\nThis decision has been recorded and shared with the family.`;

      // Send to coordinator
      const coordinator = this.caseCoordinators.get(caseId);
      if (coordinator) {
        const recipientNumber = coordinator.includes('@') ? coordinator : `${coordinator}@c.us`;
        await whatsappService.sendMessage(recipientNumber, decisionMessage);
      }

      return {
        success: true,
        decision,
        approvedBy,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error tracking decision:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove family member (with permission)
   */
  async removeFamilyMember(caseId, phoneNumber, coordinatorPhone) {
    try {
      // Verify coordinator
      const coordinator = this.caseCoordinators.get(caseId);
      if (coordinator !== coordinatorPhone) {
        return {
          success: false,
          error: 'Only the case coordinator can remove family members'
        };
      }

      const members = this.familyMembers.get(caseId) || [];
      const filtered = members.filter(m => m.phoneNumber !== phoneNumber);
      this.familyMembers.set(caseId, filtered);

      return {
        success: true,
        message: 'Family member removed',
        remainingMembers: filtered.length
      };
    } catch (error) {
      console.error('Error removing family member:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default FamilyCoordinationService;

