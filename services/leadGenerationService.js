/**
 * B2B Lead Generation Service
 * Orchestrates lead scraping and email sending
 */

import { LeadScraperService } from './leadScraperService.js';
import { EmailService } from './emailService.js';
import { B2BLead } from '../models/B2BLead.js';
import { logger } from '../utils/logger.js';

export class LeadGenerationService {
  constructor() {
    this.scraper = new LeadScraperService();
    this.emailService = new EmailService();
  }

  /**
   * Generate leads from search query
   */
  async generateLeads(query, options = {}) {
    try {
      logger.info(`Starting lead generation for: ${query}`);
      
      // Scrape leads
      const scrapedLeads = await this.scraper.scrapeLeads(query, options);
      
      if (scrapedLeads.length === 0) {
        logger.warn('No leads found');
        return {
          success: false,
          message: 'No leads found',
          leads: []
        };
      }

      // Enrich leads
      const enrichedLeads = await Promise.all(
        scrapedLeads.map(lead => this.scraper.enrichLead(lead))
      );

      // Save to database
      const savedLeads = await B2BLead.bulkCreate(enrichedLeads);
      
      logger.success(`Generated ${savedLeads.length} leads`);
      
      return {
        success: true,
        message: `Generated ${savedLeads.length} leads`,
        leads: savedLeads
      };
    } catch (error) {
      logger.error('Error generating leads', error);
      return {
        success: false,
        error: error.message,
        leads: []
      };
    }
  }

  /**
   * Send emails to leads
   */
  async sendEmailsToLeads(leadIds, emailTemplate = 'default') {
    try {
      logger.info(`Sending emails to ${leadIds.length} leads`);
      
      const results = [];
      
      for (const leadId of leadIds) {
        const lead = await B2BLead.findById(leadId);
        
        if (!lead) {
          results.push({
            leadId,
            success: false,
            error: 'Lead not found'
          });
          continue;
        }

        if (!lead.email) {
          results.push({
            leadId,
            success: false,
            error: 'No email address'
          });
          continue;
        }

        // Send email
        const emailResult = await this.emailService.sendLeadEmail(lead, emailTemplate);
        
        if (emailResult.success) {
          await B2BLead.markEmailSent(leadId, emailResult.messageId);
        }
        
        results.push({
          leadId,
          leadEmail: lead.email,
          ...emailResult
        });
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      const successCount = results.filter(r => r.success).length;
      logger.success(`Sent ${successCount} emails out of ${leadIds.length}`);
      
      return {
        success: true,
        sent: successCount,
        total: leadIds.length,
        results
      };
    } catch (error) {
      logger.error('Error sending emails to leads', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send emails to all new leads
   */
  async sendEmailsToNewLeads(emailTemplate = 'default', limit = 50) {
    try {
      const newLeads = await B2BLead.findAll({
        status: 'NEW',
        limit
      });

      const leadIds = newLeads
        .filter(lead => lead.email && !lead.email_sent)
        .map(lead => lead.id);

      if (leadIds.length === 0) {
        return {
          success: true,
          message: 'No new leads to email',
          sent: 0
        };
      }

      return await this.sendEmailsToLeads(leadIds, emailTemplate);
    } catch (error) {
      logger.error('Error sending emails to new leads', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Complete lead generation workflow
   */
  async runLeadGenerationCampaign(query, options = {}) {
    try {
      logger.info('Starting lead generation campaign', { query, options });
      
      // Step 1: Generate leads
      const generationResult = await this.generateLeads(query, options);
      
      if (!generationResult.success) {
        return generationResult;
      }

      // Step 2: Send emails (if requested)
      if (options.sendEmails !== false && generationResult.leads.length > 0) {
        const leadIds = generationResult.leads.map(lead => lead.id);
        const emailResult = await this.sendEmailsToLeads(
          leadIds,
          options.emailTemplate || 'default'
        );
        
        return {
          ...generationResult,
          emailResult
        };
      }

      return generationResult;
    } catch (error) {
      logger.error('Error running lead generation campaign', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default LeadGenerationService;

