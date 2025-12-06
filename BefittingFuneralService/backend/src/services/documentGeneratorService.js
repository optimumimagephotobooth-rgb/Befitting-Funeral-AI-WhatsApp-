import path from 'path';
import { promises as fs } from 'fs';
import handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { Case } from '../models/Case.js';
import { Contact } from '../models/Contact.js';
import pool from '../db/database.js';
import { logger } from '../utils/logger.js';
import { listCaseCharges } from './caseChargeService.js';
import { uploadPdf } from './storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const documentsRoot = path.resolve(__dirname, '..', '..', 'storage', 'case-documents');

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function buildCaseContext(caseId) {
  const caseRecord = await Case.findById(caseId);
  if (!caseRecord) {
    throw new Error('Case not found');
  }

  let contact = null;
  if (caseRecord.contact_id) {
    contact = await Contact.findById(caseRecord.contact_id);
  }

  const charges = await listCaseCharges(caseId);
  const formattedCharges = charges.map((charge) => ({
    id: charge.id,
    description: charge.description,
    amount: Number(charge.amount) || 0,
    quantity: charge.quantity || 1,
    total: (Number(charge.amount) || 0) * (charge.quantity || 1),
    category: charge.category || null
  }));

  const chargesSubtotal = formattedCharges.reduce((sum, item) => sum + item.total, 0);
  const caseTotal = caseRecord.total_amount != null ? Number(caseRecord.total_amount) : chargesSubtotal;
  const deposit = Number(caseRecord.deposit_amount) || 0;

  return {
    case: {
      id: caseRecord.id,
      case_ref: caseRecord.case_ref,
      deceased_full_name: caseRecord.deceased_name,
      service_date: caseRecord.funeral_date,
      location: caseRecord.location,
      package_name: caseRecord.package_name,
      status: caseRecord.status
    },
    family: {
      primary_contact_name: contact?.name || '',
      primary_contact_phone: contact?.phone_number || ''
    },
    charges: formattedCharges,
    totals: {
      charges_subtotal: chargesSubtotal,
      total_amount: caseTotal,
      deposit_amount: deposit,
      balance: caseTotal - deposit
    },
    account: {
      company_name: 'Befitting Funeral Service Ghana',
      email: 'support@befittingfuneral.com',
      phone: '+233 (0) 000 000',
      address: 'Accra, Ghana'
    }
  };
}

export function renderTemplate(templateHtml, context) {
  const compiled = handlebars.compile(templateHtml, { noEscape: true });
  return compiled(context);
}

export async function htmlToPdfBuffer(html) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '20mm', left: '15mm' }
    });
    await page.close();
    return buffer;
  } finally {
    await browser.close();
  }
}

export async function saveCaseDocument({
  caseId,
  templateId,
  title,
  htmlSnapshot,
  pdfBuffer,
  createdBy,
  metadata = {}
}) {
  const documentIdResult = await pool.query('SELECT gen_random_uuid() as id');
  const documentId = documentIdResult.rows[0].id;

  let storagePath;
  if (process.env.SUPABASE_STORAGE_BUCKET) {
    storagePath = await uploadPdf(caseId, documentId, pdfBuffer);
  } else {
    const caseDir = path.join(documentsRoot, String(caseId));
    await ensureDirectory(caseDir);
    storagePath = path.join(caseDir, `${documentId}.pdf`);
    await fs.writeFile(storagePath, pdfBuffer);
  }

  const insertResult = await pool.query(
    `
      INSERT INTO case_documents (id, case_id, template_id, title, file_path, html_snapshot, created_by, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [documentId, caseId, templateId, title, storagePath, htmlSnapshot, createdBy, metadata]
  );

  return insertResult.rows[0];
}

export async function listCaseDocuments(caseId) {
  const result = await pool.query(
    `
      SELECT cd.*, dt.name as template_name, dt.document_type
      FROM case_documents cd
      LEFT JOIN document_templates dt ON cd.template_id = dt.id
      WHERE cd.case_id = $1
      ORDER BY cd.created_at DESC
    `,
    [caseId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    templateName: row.template_name,
    documentType: row.document_type,
    createdAt: row.created_at,
    createdBy: row.created_by,
    filePath: row.file_path
  }));
}

export async function getCaseDocument(caseId, documentId) {
  const result = await pool.query(
    'SELECT * FROM case_documents WHERE id = $1 AND case_id = $2',
    [documentId, caseId]
  );
  return result.rows[0] || null;
}

export async function openCaseDocumentStream(filePath) {
  await ensureDirectory(path.dirname(filePath));
  return fs.readFile(filePath);
}

// Register basic helpers
handlebars.registerHelper('uppercase', function (value = '') {
  return String(value).toUpperCase();
});

handlebars.registerHelper('date', function (value) {
  if (!value) return '';
  const parsed = new Date(value);
  return parsed.toLocaleDateString();
});

handlebars.registerHelper('currency', function (value) {
  const amount = Number(value) || 0;
  return `GHS ${amount.toFixed(2)}`;
});

logger.info('Document generator service initialized');

