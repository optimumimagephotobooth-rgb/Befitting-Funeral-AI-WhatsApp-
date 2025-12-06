import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { withAccess } from '../middleware/authMiddleware.js';
import {
  createTombstoneWorkOrder,
  listWorkOrdersByCase,
  updateWorkOrderStatus,
  ensureVendor,
  listVendorsByCategory,
  fetchWorkOrderById,
  generateWorkOrderCertificate
} from '../services/equipmentService.js';
import { buildWorkOrderPdf } from '../services/workOrderPdfService.js';

const router = express.Router();

router.post(
  '/',
  withAccess,
  asyncHandler(async (req, res) => {
    const { caseId, vendorId, status, scheduledDate, attachments, metadata, notes } = req.body;
    if (!caseId || !vendorId) {
      return res.status(400).json({ success: false, error: 'caseId and vendorId are required' });
    }
    const workOrder = await createTombstoneWorkOrder(caseId, vendorId, {
      status,
      scheduled_date: scheduledDate,
      attachments,
      metadata,
      notes,
      created_by: req.staff?.id
    });
    res.json({ success: true, workOrder });
  })
);

router.get(
  '/:caseId',
  withAccess,
  asyncHandler(async (req, res) => {
    const workOrders = await listWorkOrdersByCase(req.params.caseId);
    res.json({ success: true, workOrders });
  })
);

router.patch(
  '/:id/status',
  withAccess,
  asyncHandler(async (req, res) => {
    const { status, notes, metadata, certificateUrl } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }
    const workOrder = await updateWorkOrderStatus(req.params.id, status, {
      notes,
      metadata,
      certificate_url: certificateUrl
    });
    res.json({ success: true, workOrder });
  })
);

router.post(
  '/vendor',
  withAccess,
  asyncHandler(async (req, res) => {
    const { vendor } = req.body;
    if (!vendor?.name) {
      return res.status(400).json({ success: false, error: 'Vendor name is required' });
    }
    const saved = await ensureVendor('tombstone', {
      tenant_id: req.staff?.tenant_id,
      name: vendor.name,
      contact_name: vendor.contact_name,
      contact_phone: vendor.contact_phone,
      contact_email: vendor.contact_email,
      notes: vendor.notes,
      metadata: vendor.metadata
    });
    res.json({ success: true, vendor: saved });
  })
);

router.get(
  '/vendor',
  withAccess,
  asyncHandler(async (req, res) => {
    const vendors = await listVendorsByCategory('tombstone');
    res.json({ success: true, vendors });
  })
);

router.post(
  '/:id/certificate',
  withAccess,
  asyncHandler(async (req, res) => {
    const certificateUrl = await generateWorkOrderCertificate(req.params.id);
    res.json({ success: true, certificateUrl });
  })
);

router.post(
  '/:id/pdf',
  withAccess,
  asyncHandler(async (req, res) => {
    const buffer = await buildWorkOrderPdf(req.params.id);
    const base64 = buffer.toString('base64');
    res.json({ success: true, pdf: base64 });
  })
);

router.get(
  '/:id/certificate',
  withAccess,
  asyncHandler(async (req, res) => {
    const workOrder = await fetchWorkOrderById(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ success: false, error: 'Work order not found' });
    }
    let certificateUrl = workOrder.certificate_url;
    if (!certificateUrl) {
      certificateUrl = await generateWorkOrderCertificate(req.params.id);
    }
    const [, base64] = certificateUrl?.split(',') || [];
    if (!base64) {
      return res.status(404).json({ success: false, error: 'Certificate not available' });
    }
    const buffer = Buffer.from(base64, 'base64');
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="tombstone-${req.params.id}.pdf"`);
    res.send(buffer);
  })
);

router.get(
  '/:id/certificate',
  withAccess,
  asyncHandler(async (req, res) => {
    const workOrder = await fetchWorkOrderById(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ success: false, error: 'Work order not found' });
    }
    let certificateUrl = workOrder.certificate_url;
    if (!certificateUrl) {
      certificateUrl = await generateWorkOrderCertificate(req.params.id);
    }
    const [, base64] = certificateUrl?.split(',') || [];
    if (!base64) {
      return res.status(404).json({ success: false, error: 'Certificate not available' });
    }
    const buffer = Buffer.from(base64, 'base64');
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="tombstone-${req.params.id}.pdf"`);
    res.send(buffer);
  })
);

export default router;

