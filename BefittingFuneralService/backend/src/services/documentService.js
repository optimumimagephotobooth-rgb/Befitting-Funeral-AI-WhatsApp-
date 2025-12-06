/**
 * Document Checklist & Management Service
 * Helps families stay organized during difficult times
 * Sensitive and supportive approach
 */

import { Case } from '../models/Case.js';
import { Message } from '../models/Message.js';

export class DocumentService {
  constructor() {
    this.requiredDocuments = {
      essential: [
        {
          name: "Death Certificate",
          description: "Official certificate from the hospital or medical facility",
          whereToGet: "Hospital or medical facility where death occurred",
          whyNeeded: "Required for all legal and administrative processes",
          priority: "HIGH"
        },
        {
          name: "ID of Deceased",
          description: "National ID card, passport, or driver's license",
          whereToGet: "Family records or personal documents",
          whyNeeded: "Required for identification and legal processes",
          priority: "HIGH"
        },
        {
          name: "Next of Kin ID",
          description: "National ID card of the person making arrangements",
          whereToGet: "Your personal ID card",
          whyNeeded: "Required to verify authority to make arrangements",
          priority: "HIGH"
        }
      ],
      important: [
        {
          name: "Medical Reports",
          description: "Medical records or cause of death certificate",
          whereToGet: "Hospital or attending physician",
          whyNeeded: "May be required for burial permits",
          priority: "MEDIUM"
        },
        {
          name: "Burial Permit",
          description: "Official permit for burial",
          whereToGet: "Local government office or hospital",
          whyNeeded: "Required before burial can proceed",
          priority: "HIGH"
        },
        {
          name: "Marriage Certificate",
          description: "If applicable, for spouse arrangements",
          whereToGet: "Marriage registry or family records",
          whyNeeded: "May be required for certain arrangements",
          priority: "MEDIUM"
        }
      ],
      optional: [
        {
          name: "Insurance Documents",
          description: "Life insurance or funeral insurance policies",
          whereToGet: "Insurance company or family records",
          whyNeeded: "For insurance claims",
          priority: "LOW"
        },
        {
          name: "Will or Testament",
          description: "If the deceased left a will",
          whereToGet: "Family records or lawyer",
          whyNeeded: "To understand wishes and legal requirements",
          priority: "LOW"
        }
      ]
    };
  }

  /**
   * Get document checklist for a case
   */
  async getDocumentChecklist(caseId) {
    try {
      const activeCase = await Case.findById(caseId);
      if (!activeCase) {
        return null;
      }

      // In a real implementation, you'd track which documents have been received
      // For now, return the full checklist
      return {
        caseRef: activeCase.case_ref,
        essential: this.requiredDocuments.essential,
        important: this.requiredDocuments.important,
        optional: this.requiredDocuments.optional,
        received: [], // Would track received documents
        pending: [...this.requiredDocuments.essential, ...this.requiredDocuments.important]
      };
    } catch (error) {
      console.error('Error getting document checklist:', error);
      return null;
    }
  }

  /**
   * Format checklist as WhatsApp message
   */
  formatChecklistMessage(checklist, language = 'en') {
    if (language === 'tw') {
      return this.formatChecklistMessageTwi(checklist);
    }

    let message = "📋 *Document Checklist*\n\n";
    message += `Case Reference: *${checklist.caseRef}*\n\n`;
    message += "Here's what you'll need. Don't worry - we'll help you through this step by step.\n\n";

    // Essential documents
    message += "*🔴 Essential Documents (Required):*\n";
    checklist.essential.forEach((doc, index) => {
      const status = checklist.received.includes(doc.name) ? "✅" : "⏳";
      message += `\n${status} ${doc.name}`;
      message += `\n   📝 ${doc.description}`;
      message += `\n   📍 Where to get: ${doc.whereToGet}`;
      message += `\n   💡 Why needed: ${doc.whyNeeded}`;
    });

    // Important documents
    if (checklist.important.length > 0) {
      message += "\n\n*🟡 Important Documents:\n";
      checklist.important.forEach((doc, index) => {
        const status = checklist.received.includes(doc.name) ? "✅" : "⏳";
        message += `\n${status} ${doc.name}`;
        message += `\n   📝 ${doc.description}`;
        message += `\n   📍 Where to get: ${doc.whereToGet}`;
      });
    }

    // Optional documents
    if (checklist.optional.length > 0) {
      message += "\n\n*🟢 Optional Documents:\n";
      message += "(These may be helpful but aren't required)\n";
      checklist.optional.forEach((doc, index) => {
        message += `\n• ${doc.name}`;
        message += `\n   📝 ${doc.description}`;
      });
    }

    message += "\n\n💡 *Tips:*\n";
    message += "• Start with essential documents first\n";
    message += "• Don't worry if you don't have everything immediately\n";
    message += "• We can help you obtain documents if needed\n";
    message += "• Take your time - there's no rush\n\n";
    message += "Reply with the name of a document when you have it, and we'll update your checklist. 🙏";

    return message;
  }

  formatChecklistMessageTwi(checklist) {
    let message = "📋 *Nkrataa a Wohia*\n\n";
    message += `Case Reference: *${checklist.caseRef}*\n\n`;
    message += "Hwɛ nneɛma a wohia. Mma wo werɛ nni - yɛbɛboa wo.\n\n";

    message += "*Nkrataa a Ɛsɛ (Essential):*\n";
    checklist.essential.forEach((doc) => {
      message += `\n• ${doc.name}`;
      message += `\n  ${doc.description}`;
      message += `\n  Bea a wobɛnya: ${doc.whereToGet}`;
    });

    message += "\n\nSɛ wonya nkrataa bi a, fa kyerɛ yɛn. 🙏";

    return message;
  }

  /**
   * Check if document mentioned in message
   */
  detectDocument(messageText) {
    const text = messageText.toLowerCase();
    const allDocs = [
      ...this.requiredDocuments.essential,
      ...this.requiredDocuments.important,
      ...this.requiredDocuments.optional
    ];

    for (const doc of allDocs) {
      const docNameLower = doc.name.toLowerCase();
      if (text.includes(docNameLower) || 
          text.includes(docNameLower.split(' ')[0])) {
        return doc;
      }
    }

    // Check for common variations
    const variations = {
      'death certificate': 'Death Certificate',
      'id card': 'ID of Deceased',
      'national id': 'ID of Deceased',
      'passport': 'ID of Deceased',
      'medical report': 'Medical Reports',
      'burial permit': 'Burial Permit',
      'marriage certificate': 'Marriage Certificate',
      'insurance': 'Insurance Documents'
    };

    for (const [key, value] of Object.entries(variations)) {
      if (text.includes(key)) {
        return allDocs.find(doc => doc.name === value);
      }
    }

    return null;
  }

  /**
   * Get document status summary
   */
  getStatusSummary(checklist) {
    const total = checklist.essential.length + checklist.important.length;
    const received = checklist.received.length;
    const pending = total - received;

    return {
      total,
      received,
      pending,
      percentage: total > 0 ? Math.round((received / total) * 100) : 0,
      status: pending === 0 ? 'complete' : pending <= 2 ? 'almost' : 'in_progress'
    };
  }

  /**
   * Send gentle reminder for pending documents
   */
  formatReminderMessage(checklist, language = 'en') {
    const summary = this.getStatusSummary(checklist);
    
    if (summary.pending === 0) {
      return language === 'tw' 
        ? "✅ Wo nkrataa nyinaa wɔ hɔ! Medaase. 🙏"
        : "✅ All your documents are in order! Thank you. 🙏";
    }

    if (language === 'tw') {
      return `📋 *Nkrataa a Wohia*\n\nWo nkrataa ${summary.received} firi ${summary.total} wɔ hɔ.\n\nNkrataa a wohia:\n${checklist.pending.map(doc => `• ${doc.name}`).join('\n')}\n\nMma wo werɛ nni - yɛbɛboa wo. 🙏`;
    }

    let message = "📋 *Gentle Reminder*\n\n";
    message += `You have ${summary.received} of ${summary.total} essential documents.\n\n`;
    message += "*Still needed:*\n";
    checklist.pending.forEach(doc => {
      message += `• ${doc.name}\n`;
    });
    message += "\n💡 Don't worry - take your time. We're here to help if you need assistance obtaining any documents. 🙏";

    return message;
  }
}

export default DocumentService;

