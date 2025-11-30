/**
 * Grief Support & Resource Library Service
 * Provides emotional support resources for grieving families
 * Sensitive and respectful approach
 */

import { config } from '../config/config.js';

export class GriefSupportService {
  constructor() {
    this.resources = {
      immediate: {
        title: "Immediate Support",
        resources: [
          {
            type: "Crisis Helpline",
            name: "Ghana Mental Health Authority",
            contact: "0800-000-000",
            available: "24/7",
            description: "Free, confidential support for anyone in crisis"
          },
          {
            type: "Emergency",
            name: "Emergency Services",
            contact: "193",
            available: "24/7",
            description: "For immediate emergencies"
          }
        ]
      },
      griefSupport: {
        title: "Grief Support Resources",
        resources: [
          {
            type: "Support Group",
            name: "Grief Support Groups in Accra",
            description: "Connect with others who understand your loss",
            contact: "Contact local churches or community centers",
            online: true
          },
          {
            type: "Counseling",
            name: "Professional Grief Counseling",
            description: "Trained counselors specializing in grief",
            contact: "Ask your healthcare provider for referrals"
          },
          {
            type: "Online Resources",
            name: "Grief Support Websites",
            description: "Online resources and communities",
            links: [
              "www.grief.com",
              "www.whatsyourgrief.com"
            ]
          }
        ]
      },
      children: {
        title: "Supporting Children Through Grief",
        resources: [
          {
            type: "Books",
            name: "Children's Grief Books",
            description: "Age-appropriate books to help children understand loss",
            suggestions: [
              "The Invisible String by Patrice Karst",
              "The Memory Box by Joanna Rowland"
            ]
          },
          {
            type: "Activities",
            name: "Memory Activities",
            description: "Help children remember and honor their loved one",
            suggestions: [
              "Create a memory box",
              "Write letters or draw pictures",
              "Plant a memorial tree or flower"
            ]
          },
          {
            type: "Professional Help",
            name: "Child Grief Counseling",
            description: "Specialized support for children",
            contact: "Contact child psychologists or school counselors"
          }
        ]
      },
      religious: {
        title: "Religious & Spiritual Support",
        resources: [
          {
            type: "Christian",
            name: "Church Support",
            description: "Your local church can provide spiritual support and counseling",
            contact: "Contact your pastor or church leadership"
          },
          {
            type: "Muslim",
            name: "Islamic Support",
            description: "Local mosques offer support and guidance",
            contact: "Contact your local imam or mosque"
          },
          {
            type: "Traditional",
            name: "Traditional Support",
            description: "Elders and traditional leaders can provide guidance",
            contact: "Contact family elders or traditional leaders"
          }
        ]
      },
      practical: {
        title: "Practical Support",
        resources: [
          {
            type: "Legal",
            name: "Legal Assistance",
            description: "Help with wills, estates, and legal matters",
            contact: "Contact a lawyer specializing in estate law"
          },
          {
            type: "Financial",
            name: "Financial Planning",
            description: "Help managing finances after loss",
            contact: "Contact a financial advisor"
          },
          {
            type: "Documentation",
            name: "Document Assistance",
            description: "Help obtaining necessary documents",
            contact: "We can help guide you through required documents"
          }
        ]
      }
    };
  }

  /**
   * Get appropriate grief support resources based on context
   */
  getSupportResources(context = {}) {
    const { stage, hasChildren = false, religion = null, immediateNeed = false } = context;
    
    let resources = [];

    // Immediate crisis support
    if (immediateNeed) {
      resources.push(this.resources.immediate);
    }

    // General grief support
    resources.push(this.resources.griefSupport);

    // Children's resources if applicable
    if (hasChildren) {
      resources.push(this.resources.children);
    }

    // Religious support if specified
    if (religion) {
      const religiousResource = this.resources.religious.resources.find(
        r => r.type.toLowerCase() === religion.toLowerCase()
      );
      if (religiousResource) {
        resources.push({
          title: this.resources.religious.title,
          resources: [religiousResource]
        });
      }
    }

    // Practical support
    resources.push(this.resources.practical);

    return resources;
  }

  /**
   * Format resources as WhatsApp message
   */
  formatResourcesMessage(resources, language = 'en') {
    if (language === 'tw') {
      return this.formatResourcesMessageTwi(resources);
    }

    let message = "💝 *Grief Support Resources*\n\n";
    message += "We understand this is a difficult time. Here are resources that may help:\n\n";

    resources.forEach((section, index) => {
      message += `*${section.title}*\n`;
      
      section.resources.forEach(resource => {
        message += `\n• ${resource.name}`;
        if (resource.description) {
          message += `\n  ${resource.description}`;
        }
        if (resource.contact) {
          message += `\n  📞 ${resource.contact}`;
        }
        if (resource.available) {
          message += `\n  ⏰ ${resource.available}`;
        }
        if (resource.links) {
          resource.links.forEach(link => {
            message += `\n  🌐 ${link}`;
          });
        }
        message += "\n";
      });
      
      if (index < resources.length - 1) {
        message += "\n";
      }
    });

    message += "\n🙏 Remember: It's okay to ask for help. You don't have to go through this alone.\n\n";
    message += "If you need immediate support, please reach out to crisis helplines or emergency services.";

    return message;
  }

  formatResourcesMessageTwi(resources) {
    let message = "💝 *Boa a ɛfa Awerehɔ ho*\n\n";
    message += "Yɛte ase sɛ bere a ɛyɛ den yi. Hwɛ nneɛma a ɛbɛboa wo:\n\n";

    // Simplified Twi version - can be expanded
    message += "• Sɛ wohia boa a, fa nkɔm hyɛ yɛn\n";
    message += "• Wobɛtumi abisa yɛn fa nneɛma a wohia\n";
    message += "• Yɛwɔ hɔ sɛ yɛbɛboa wo\n\n";
    message += "🙏 Kae: Ɛyɛ fɛ sɛ wohia boa. Wonyɛ nkwa mu nko ara.";

    return message;
  }

  /**
   * Get stage-specific support
   */
  getStageSpecificSupport(stage) {
    const stageSupport = {
      NEW: {
        message: "We're here to support you through this difficult time. Take things one step at a time.",
        resources: ["immediate", "griefSupport"]
      },
      INTAKE: {
        message: "Gathering information can feel overwhelming. We're here to help make this process easier.",
        resources: ["practical", "griefSupport"]
      },
      QUOTE: {
        message: "Financial decisions during grief can be stressful. We offer flexible payment options.",
        resources: ["practical"]
      },
      DEPOSIT: {
        message: "You're making progress. We're here to support you every step of the way.",
        resources: ["griefSupport"]
      },
      DETAILS: {
        message: "Planning the service is an important way to honor your loved one.",
        resources: ["griefSupport", "religious"]
      },
      SUMMARY: {
        message: "You've done so much. We're here to ensure everything goes smoothly.",
        resources: ["griefSupport"]
      },
      FOLLOWUP: {
        message: "Grief doesn't end with the service. We're here for ongoing support.",
        resources: ["griefSupport", "children"]
      }
    };

    return stageSupport[stage] || stageSupport.NEW;
  }

  /**
   * Suggest support based on message content
   */
  suggestSupport(messageText) {
    const text = messageText.toLowerCase();
    const suggestions = [];

    if (text.includes('sad') || text.includes('difficult') || text.includes('hard') || text.includes('struggling')) {
      suggestions.push('griefSupport');
    }

    if (text.includes('child') || text.includes('kid') || text.includes('children')) {
      suggestions.push('children');
    }

    if (text.includes('crisis') || text.includes('emergency') || text.includes('urgent')) {
      suggestions.push('immediate');
    }

    if (text.includes('prayer') || text.includes('church') || text.includes('god') || text.includes('faith')) {
      suggestions.push('religious');
    }

    if (text.includes('money') || text.includes('payment') || text.includes('afford') || text.includes('cost')) {
      suggestions.push('practical');
    }

    return suggestions.length > 0 ? suggestions : ['griefSupport'];
  }
}

export default GriefSupportService;

