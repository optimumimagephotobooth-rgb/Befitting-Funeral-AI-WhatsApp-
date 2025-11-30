/**
 * Scheduled Lead Generation Job
 * Runs automated lead generation campaigns
 */

import cron from 'node-cron';
import { LeadGenerationService } from '../services/leadGenerationService.js';
import { logger } from '../utils/logger.js';

export class LeadGenerationJob {
  constructor() {
    this.service = new LeadGenerationService();
    this.jobs = [];
  }

  /**
   * Schedule daily lead generation
   */
  scheduleDailyLeadGeneration(queries = [], options = {}) {
    // Run at 9 AM every day
    const job = cron.schedule('0 9 * * *', async () => {
      logger.info('Running scheduled lead generation');
      
      for (const query of queries) {
        try {
          await this.service.runLeadGenerationCampaign(query, {
            ...options,
            sendEmails: false // Don't auto-send, review first
          });
        } catch (error) {
          logger.error(`Error in scheduled lead generation for: ${query}`, error);
        }
      }
    }, {
      scheduled: false
    });

    this.jobs.push({ name: 'daily-lead-generation', job });
    return job;
  }

  /**
   * Schedule weekly email campaign
   */
  scheduleWeeklyEmailCampaign(emailTemplate = 'default') {
    // Run every Monday at 10 AM
    const job = cron.schedule('0 10 * * 1', async () => {
      logger.info('Running scheduled email campaign');
      
      try {
        await this.service.sendEmailsToNewLeads(emailTemplate, 100);
      } catch (error) {
        logger.error('Error in scheduled email campaign', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.push({ name: 'weekly-email-campaign', job });
    return job;
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    this.jobs.forEach(({ name, job }) => {
      job.start();
      logger.info(`Started scheduled job: ${name}`);
    });
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      logger.info(`Stopped scheduled job: ${name}`);
    });
  }
}

export default LeadGenerationJob;

