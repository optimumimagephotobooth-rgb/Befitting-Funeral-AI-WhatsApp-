/**
 * Analytics API Routes
 * Provides endpoints for dashboard and analytics data
 */

import express from 'express';
import { AnalyticsService } from '../services/analyticsService.js';

const router = express.Router();
const analyticsService = new AnalyticsService();

// Get overall statistics
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await analyticsService.getOverallStats(startDate, endDate);
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Get stage conversion metrics
router.get('/stages', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const metrics = await analyticsService.getStageMetrics(startDate, endDate);
    res.json(metrics);
  } catch (error) {
    console.error('Error getting stage metrics:', error);
    res.status(500).json({ error: 'Failed to get stage metrics' });
  }
});

// Get daily activity
router.get('/activity', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const activity = await analyticsService.getDailyActivity(days);
    res.json(activity);
  } catch (error) {
    console.error('Error getting activity:', error);
    res.status(500).json({ error: 'Failed to get activity data' });
  }
});

// Get peak hours
router.get('/peak-hours', async (req, res) => {
  try {
    const peakHours = await analyticsService.getPeakHours();
    res.json(peakHours);
  } catch (error) {
    console.error('Error getting peak hours:', error);
    res.status(500).json({ error: 'Failed to get peak hours' });
  }
});

// Get common questions
router.get('/questions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const questions = await analyticsService.getCommonQuestions(limit);
    res.json(questions);
  } catch (error) {
    console.error('Error getting common questions:', error);
    res.status(500).json({ error: 'Failed to get common questions' });
  }
});

// Get referral performance
router.get('/referrals', async (req, res) => {
  try {
    const performance = await analyticsService.getReferralPerformance();
    res.json(performance);
  } catch (error) {
    console.error('Error getting referral performance:', error);
    res.status(500).json({ error: 'Failed to get referral performance' });
  }
});

// Get package distribution
router.get('/packages', async (req, res) => {
  try {
    const distribution = await analyticsService.getPackageDistribution();
    res.json(distribution);
  } catch (error) {
    console.error('Error getting package distribution:', error);
    res.status(500).json({ error: 'Failed to get package distribution' });
  }
});

export default router;

