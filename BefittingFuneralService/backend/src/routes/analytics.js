/**
 * Analytics API Routes
 * Provides endpoints for dashboard and analytics data
 */

import express from 'express';
import { AnalyticsService } from '../services/analyticsService.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { requireAnyRole, requireStaffOrApiKey } from '../middleware/auth.js';

const router = express.Router();
const analyticsService = new AnalyticsService();
const ANALYTICS_ROLES = ['admin', 'coordinator', 'director'];
const withAccess = [requireStaffOrApiKey, requireAnyRole(ANALYTICS_ROLES)];

router.get(
  '/stats',
  ...withAccess,
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const stats = await analyticsService.getOverallStats(startDate, endDate);
    res.json({ success: true, data: stats });
  })
);

router.get(
  '/stages',
  ...withAccess,
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const metrics = await analyticsService.getStageMetrics(startDate, endDate);
    res.json({ success: true, data: metrics });
  })
);

router.get(
  '/activity',
  ...withAccess,
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const activity = await analyticsService.getDailyActivity(days);
    res.json({ success: true, data: activity });
  })
);

router.get(
  '/peak-hours',
  ...withAccess,
  asyncHandler(async (req, res) => {
    const peakHours = await analyticsService.getPeakHours();
    res.json({ success: true, data: peakHours });
  })
);

router.get(
  '/questions',
  ...withAccess,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const questions = await analyticsService.getCommonQuestions(limit);
    res.json({ success: true, data: questions });
  })
);

router.get(
  '/referrals',
  ...withAccess,
  asyncHandler(async (req, res) => {
    const performance = await analyticsService.getReferralPerformance();
    res.json({ success: true, data: performance });
  })
);

router.get(
  '/packages',
  ...withAccess,
  asyncHandler(async (req, res) => {
    const distribution = await analyticsService.getPackageDistribution();
    res.json({ success: true, data: distribution });
  })
);

router.get(
  '/cases/forecast',
  ...withAccess,
  asyncHandler(async (_req, res) => {
    const forecastDashboard = await analyticsService.getForecastDashboard();
    res.json({ success: true, data: forecastDashboard });
  })
);

export default router;

