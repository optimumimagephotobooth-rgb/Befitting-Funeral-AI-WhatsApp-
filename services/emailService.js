/**
 * SendGrid Email Service
 * Handles email sending via SendGrid API
 */

import sgMail from '@sendgrid/mail';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

// SendGrid mail setup
const { setApiKey, send } = sgMail;

export class EmailService {
  constructor() {
    if (!config.email.sendgridApiKey) {
      logger.warn('SendGrid API key not configured. Email service will be limited.');
    } else {
      sgMail.setApiKey(config.email.sendgridApiKey);
    }
    
    this.fromEmail = config.email.fromEmail || 'noreply@befittingfuneralservices.com';
    this.fromName = config.email.fromName || 'Befitting Funeral Services';
  }

  /**
   * Send email to a single recipient
   */
  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      if (!config.email.sendgridApiKey) {
        throw new Error('SendGrid API key not configured');
      }

      const msg = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject,
        html: htmlContent,
        ...(textContent && { text: textContent })
      };

      const response = await sgMail.send(msg);
      
      logger.success(`Email sent to ${to}`, {
        messageId: response[0]?.headers?.['x-message-id']
      });
      
      return {
        success: true,
        messageId: response[0]?.headers?.['x-message-id'],
        statusCode: response[0]?.statusCode
      };
    } catch (error) {
      logger.error('Error sending email', error);
      
      if (error.response) {
        return {
          success: false,
          error: error.response.body?.errors?.[0]?.message || error.message,
          statusCode: error.code
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send email using SendGrid template
   */
  async sendTemplateEmail(to, templateId, dynamicTemplateData = {}) {
    try {
      if (!config.email.sendgridApiKey) {
        throw new Error('SendGrid API key not configured');
      }

      const msg = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        templateId,
        dynamicTemplateData
      };

      const response = await sgMail.send(msg);
      
      logger.success(`Template email sent to ${to}`, {
        templateId,
        messageId: response[0]?.headers?.['x-message-id']
      });
      
      return {
        success: true,
        messageId: response[0]?.headers?.['x-message-id'],
        templateId
      };
    } catch (error) {
      logger.error('Error sending template email', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(recipients, subject, htmlContent, textContent = null) {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await this.sendEmail(recipient, subject, htmlContent, textContent);
      results.push({
        recipient,
        ...result
      });
      
      // Rate limiting: SendGrid allows 100 emails/second
      // Add small delay to avoid hitting limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Send B2B lead generation email
   */
  async sendLeadEmail(lead, template = 'default') {
    const templates = {
      default: {
        subject: `Partnership Opportunity - ${config.service.name}`,
        html: this.getDefaultLeadEmailTemplate(lead),
        text: this.getDefaultLeadEmailText(lead)
      },
      partnership: {
        subject: `B2B Partnership Opportunity - ${config.service.name}`,
        html: this.getPartnershipEmailTemplate(lead),
        text: this.getPartnershipEmailText(lead)
      },
      referral: {
        subject: `Referral Partnership - ${config.service.name}`,
        html: this.getReferralEmailTemplate(lead),
        text: this.getReferralEmailText(lead)
      }
    };

    const selectedTemplate = templates[template] || templates.default;
    
    return await this.sendEmail(
      lead.email,
      selectedTemplate.subject,
      selectedTemplate.html,
      selectedTemplate.text
    );
  }

  /**
   * Default lead email template (HTML)
   */
  getDefaultLeadEmailTemplate(lead) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background-color: #27ae60; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${config.service.name}</h1>
    </div>
    <div class="content">
      <p>Dear ${lead.contactName || 'Business Partner'},</p>
      
      <p>I hope this email finds you well. I'm reaching out from <strong>${config.service.name}</strong>, a leading funeral service provider in Accra, Ghana.</p>
      
      <p>We specialize in providing compassionate and professional funeral services, and we're always looking to partner with businesses and organizations that serve families during difficult times.</p>
      
      <h3>Why Partner With Us?</h3>
      <ul>
        <li>✅ Professional and compassionate service</li>
        <li>✅ Transparent pricing and flexible payment options</li>
        <li>✅ Complete funeral coordination</li>
        <li>✅ 24/7 support and emergency services</li>
        <li>✅ Referral rewards program</li>
      </ul>
      
      <p>We believe that ${lead.companyName} could benefit from our services, and we'd love to discuss how we can work together.</p>
      
      <a href="${config.service.website}" class="button">Learn More About Us</a>
      
      <p>Would you be interested in a brief conversation to explore partnership opportunities?</p>
      
      <p>Best regards,<br>
      ${config.service.name} Team<br>
      📞 ${config.service.phone || 'Contact Us'}<br>
      📧 ${config.service.email}<br>
      🌐 ${config.service.website}</p>
    </div>
    <div class="footer">
      <p>This email was sent to ${lead.email}. If you no longer wish to receive emails, please reply with "UNSUBSCRIBE".</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Default lead email template (Text)
   */
  getDefaultLeadEmailText(lead) {
    return `
Dear ${lead.contactName || 'Business Partner'},

I hope this email finds you well. I'm reaching out from ${config.service.name}, a leading funeral service provider in Accra, Ghana.

We specialize in providing compassionate and professional funeral services, and we're always looking to partner with businesses and organizations that serve families during difficult times.

Why Partner With Us?
- Professional and compassionate service
- Transparent pricing and flexible payment options
- Complete funeral coordination
- 24/7 support and emergency services
- Referral rewards program

We believe that ${lead.companyName} could benefit from our services, and we'd love to discuss how we can work together.

Visit us at: ${config.service.website}

Would you be interested in a brief conversation to explore partnership opportunities?

Best regards,
${config.service.name} Team
Phone: ${config.service.phone || 'Contact Us'}
Email: ${config.service.email}
Website: ${config.service.website}

---
This email was sent to ${lead.email}. If you no longer wish to receive emails, please reply with "UNSUBSCRIBE".
    `;
  }

  /**
   * Partnership email template (HTML)
   */
  getPartnershipEmailTemplate(lead) {
    return this.getDefaultLeadEmailTemplate(lead).replace(
      'Partnership Opportunity',
      'B2B Partnership Opportunity'
    );
  }

  /**
   * Partnership email template (Text)
   */
  getPartnershipEmailText(lead) {
    return this.getDefaultLeadEmailText(lead);
  }

  /**
   * Referral email template (HTML)
   */
  getReferralEmailTemplate(lead) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background-color: #27ae60; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Referral Partnership Program</h1>
    </div>
    <div class="content">
      <p>Dear ${lead.contactName || 'Partner'},</p>
      
      <p>We're launching a <strong>Referral Partnership Program</strong> and would love ${lead.companyName} to be part of it!</p>
      
      <h3>How It Works:</h3>
      <ul>
        <li>Refer clients to ${config.service.name}</li>
        <li>Earn 5% commission on successful referrals</li>
        <li>Priority support for your referrals</li>
        <li>Marketing materials provided</li>
      </ul>
      
      <p>This is a great opportunity to provide additional value to your clients while earning extra income.</p>
      
      <a href="${config.service.website}" class="button">Join Our Referral Program</a>
      
      <p>Interested? Let's schedule a call to discuss!</p>
      
      <p>Best regards,<br>
      ${config.service.name} Team</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Referral email template (Text)
   */
  getReferralEmailText(lead) {
    return `
Dear ${lead.contactName || 'Partner'},

We're launching a Referral Partnership Program and would love ${lead.companyName} to be part of it!

How It Works:
- Refer clients to ${config.service.name}
- Earn 5% commission on successful referrals
- Priority support for your referrals
- Marketing materials provided

This is a great opportunity to provide additional value to your clients while earning extra income.

Visit: ${config.service.website}

Interested? Let's schedule a call to discuss!

Best regards,
${config.service.name} Team
    `;
  }
}

export default EmailService;

