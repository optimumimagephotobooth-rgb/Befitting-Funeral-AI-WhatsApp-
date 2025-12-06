import { createClient } from '@supabase/supabase-js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import { promises as fs } from 'fs';

const fallbackRoot = path.resolve(process.cwd(), 'storage', 'case-documents');

const bucketName = process.env.SUPABASE_STORAGE_BUCKET;
const storageClient =
  config.supabase.url && config.supabase.serviceKey
    ? createClient(config.supabase.url, config.supabase.serviceKey)
    : null;

const storageEnabled = Boolean(storageClient && bucketName);

async function ensureLocalDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export function isStorageEnabled() {
  if (!storageEnabled) {
    logger.warnOnce?.('Supabase storage disabled; falling back to local filesystem');
  }
  return storageEnabled;
}

export async function uploadPdf(caseId, documentId, buffer) {
  const storagePath = `cases/${caseId}/${documentId}.pdf`;

  if (storageEnabled) {
    const { error } = await storageClient.storage
      .from(bucketName)
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true
      });
    if (error) {
      logger.error('Failed to upload PDF to Supabase storage', error);
      throw error;
    }
    return storagePath;
  }

  const localDir = path.join(fallbackRoot, String(caseId));
  await ensureLocalDir(localDir);
  const localPath = path.join(localDir, `${documentId}.pdf`);
  await fs.writeFile(localPath, buffer);
  return localPath;
}

export async function downloadPdf(filePath) {
  if (storageEnabled && !filePath.startsWith('/')) {
    const { data, error } = await storageClient.storage.from(bucketName).download(filePath);
    if (error) {
      logger.error('Failed to download PDF from Supabase storage', error);
      throw error;
    }
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  return fs.readFile(filePath);
}

export async function createSignedPdfUrl(filePath, expiresIn = 60) {
  if (!storageEnabled || filePath.startsWith('/')) {
    return null;
  }

  const { data, error } = await storageClient.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    logger.warn('Unable to create signed URL for PDF', error);
    return null;
  }

  return data.signedUrl;
}

export async function checkStorageHealth() {
  if (!storageEnabled) {
    return false;
  }

  try {
    const { error } = await storageClient.storage.from(bucketName).list('', { limit: 1 });
    if (error) {
      logger.warn('Storage health check failed', error);
      return false;
    }
    return true;
  } catch (error) {
    logger.warn('Storage health check error', error);
    return false;
  }
}

