/**
 * Analytics Service
 * Tracks and analyzes key performance metrics for the WhatsApp AI
 */

import pool from '../db/database.js';
import { Case } from '../models/Case.js';
import { Message } from '../models/Message.js';
import { Contact } from '../models/Contact.js';
import { Referral } from '../models/Referral.js';

export class AnalyticsService {
  /**
   * Get overall statistics
   */
  async getOverallStats(startDate = null, endDate = null) {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);
      
      const [
        totalContacts,
        totalCases,
        totalMessages,
        activeCases,
        completedCases,
        totalReferrals
      ] = await Promise.all([
        this.getTotalContacts(dateFilter),
        this.getTotalCases(dateFilter),
        this.getTotalMessages(dateFilter),
        this.getActiveCases(dateFilter),
        this.getCompletedCases(dateFilter),
        this.getTotalReferrals(dateFilter)
      ]);

      return {
        contacts: {
          total: totalContacts,
          new: await this.getNewContacts(dateFilter)
        },
        cases: {
          total: totalCases,
          active: activeCases,
          completed: completedCases,
          conversionRate: totalCases > 0 ? ((completedCases / totalCases) * 100).toFixed(2) : 0
        },
        messages: {
          total: totalMessages,
          inbound: await this.getInboundMessages(dateFilter),
          outbound: await this.getOutboundMessages(dateFilter),
          averagePerCase: totalCases > 0 ? (totalMessages / totalCases).toFixed(2) : 0
        },
        referrals: {
          total: totalReferrals,
          used: await this.getUsedReferrals(dateFilter),
          conversionRate: totalReferrals > 0 ? ((await this.getUsedReferrals(dateFilter) / totalReferrals) * 100).toFixed(2) : 0
        }
      };
    } catch (error) {
      console.error('Error getting overall stats:', error);
      throw error;
    }
  }

  /**
   * Get stage conversion metrics
   */
  async getStageMetrics(startDate = null, endDate = null) {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate, 'created_at');
      
      const result = await pool.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM cases
        ${dateFilter.where}
        GROUP BY status
        ORDER BY count DESC
      `, dateFilter.params);

      const stages = {
        NEW: 0,
        INTAKE: 0,
        QUOTE: 0,
        DEPOSIT: 0,
        DETAILS: 0,
        SUMMARY: 0,
        FOLLOWUP: 0
      };

      result.rows.forEach(row => {
        stages[row.status] = parseInt(row.count);
      });

      // Calculate conversion rates
      const total = Object.values(stages).reduce((a, b) => a + b, 0);
      const conversions = {
        newToIntake: stages.NEW > 0 ? ((stages.INTAKE / stages.NEW) * 100).toFixed(2) : 0,
        intakeToQuote: stages.INTAKE > 0 ? ((stages.QUOTE / stages.INTAKE) * 100).toFixed(2) : 0,
        quoteToDeposit: stages.QUOTE > 0 ? ((stages.DEPOSIT / stages.QUOTE) * 100).toFixed(2) : 0,
        depositToDetails: stages.DEPOSIT > 0 ? ((stages.DETAILS / stages.DEPOSIT) * 100).toFixed(2) : 0,
        detailsToSummary: stages.DETAILS > 0 ? ((stages.SUMMARY / stages.DETAILS) * 100).toFixed(2) : 0,
        summaryToFollowup: stages.SUMMARY > 0 ? ((stages.FOLLOWUP / stages.SUMMARY) * 100).toFixed(2) : 0
      };

      return {
        stages,
        conversions,
        total
      };
    } catch (error) {
      console.error('Error getting stage metrics:', error);
      throw error;
    }
  }

  /**
   * Get daily message activity
   */
  async getDailyActivity(days = 7) {
    try {
      const result = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as message_count,
          COUNT(DISTINCT from_number) as unique_contacts
        FROM messages
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('Error getting daily activity:', error);
      throw error;
    }
  }

  /**
   * Get peak hours analysis
   */
  async getPeakHours() {
    try {
      const result = await pool.query(`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as message_count
        FROM messages
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `);

      return result.rows;
    } catch (error) {
      console.error('Error getting peak hours:', error);
      throw error;
    }
  }

  /**
   * Get most common questions/intents
   */
  async getCommonQuestions(limit = 10) {
    try {
      const result = await pool.query(`
        SELECT 
          body,
          COUNT(*) as frequency
        FROM messages
        WHERE direction = 'INBOUND'
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY body
        ORDER BY frequency DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      console.error('Error getting common questions:', error);
      throw error;
    }
  }

  /**
   * Get referral performance
   */
  async getReferralPerformance() {
    try {
      const result = await pool.query(`
        SELECT 
          r.referral_code,
          c.name as referrer_name,
          c.phone_number as referrer_phone,
          COUNT(r.id) as total_referrals,
          COUNT(CASE WHEN r.status = 'USED' THEN 1 END) as successful_referrals,
          COUNT(CASE WHEN r.reward_applied = true THEN 1 END) as rewards_applied
        FROM referrals r
        JOIN contacts c ON r.referrer_contact_id = c.id
        GROUP BY r.referral_code, c.name, c.phone_number
        ORDER BY successful_referrals DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('Error getting referral performance:', error);
      throw error;
    }
  }

  /**
   * Get package distribution
   */
  async getPackageDistribution() {
    try {
      const result = await pool.query(`
        SELECT 
          package_name,
          COUNT(*) as count,
          AVG(total_amount) as avg_amount,
          SUM(total_amount) as total_revenue
        FROM cases
        WHERE package_name IS NOT NULL
        GROUP BY package_name
        ORDER BY count DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('Error getting package distribution:', error);
      throw error;
    }
  }

  // Helper methods
  async getTotalContacts(dateFilter) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM contacts ${dateFilter.where}`,
      dateFilter.params
    );
    return parseInt(result.rows[0].count);
  }

  async getNewContacts(dateFilter) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM contacts ${dateFilter.where} AND created_at >= NOW() - INTERVAL '7 days'`,
      dateFilter.params
    );
    return parseInt(result.rows[0].count);
  }

  async getTotalCases(dateFilter) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM cases ${dateFilter.where}`,
      dateFilter.params
    );
    return parseInt(result.rows[0].count);
  }

  async getActiveCases(dateFilter) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM cases ${dateFilter.where} AND status NOT IN ('FOLLOWUP', 'COMPLETED')`,
      dateFilter.params
    );
    return parseInt(result.rows[0].count);
  }

  async getCompletedCases(dateFilter) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM cases ${dateFilter.where} AND status = 'FOLLOWUP'`,
      dateFilter.params
    );
    return parseInt(result.rows[0].count);
  }

  async getTotalMessages(dateFilter) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM messages ${dateFilter.where}`,
      dateFilter.params
    );
    return parseInt(result.rows[0].count);
  }

  async getInboundMessages(dateFilter) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM messages ${dateFilter.where} AND direction = 'INBOUND'`,
      dateFilter.params
    );
    return parseInt(result.rows[0].count);
  }

  async getOutboundMessages(dateFilter) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM messages ${dateFilter.where} AND direction = 'OUTBOUND'`,
      dateFilter.params
    );
    return parseInt(result.rows[0].count);
  }

  async getTotalReferrals(dateFilter) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM referrals ${dateFilter.where}`,
      dateFilter.params
    );
    return parseInt(result.rows[0].count);
  }

  async getUsedReferrals(dateFilter) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM referrals ${dateFilter.where} AND status = 'USED'`,
      dateFilter.params
    );
    return parseInt(result.rows[0].count);
  }

  buildDateFilter(startDate, endDate, column = 'created_at') {
    if (!startDate && !endDate) {
      return { where: '', params: [] };
    }

    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (startDate) {
      conditions.push(`${column} >= $${paramCount}`);
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      conditions.push(`${column} <= $${paramCount}`);
      params.push(endDate);
      paramCount++;
    }

    return {
      where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  }
}

export default AnalyticsService;

